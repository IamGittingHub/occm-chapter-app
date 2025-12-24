import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { Database, Gender } from '@/types/database';

// Create admin client with service role
function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface InviteRequestBody {
  email: string;
  first_name: string;
  last_name: string;
  gender: Gender;
  phone?: string;
}

export async function POST(request: Request) {
  try {
    // Verify the user is authenticated and is an active committee member
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Check if user is an active committee member (use admin client to bypass RLS)
    const { data: committeeMember } = await adminClient
      .from('committee_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!committeeMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: InviteRequestBody = await request.json();
    const { first_name, last_name, gender, phone } = body;
    const email = body.email?.toLowerCase().trim();

    if (!email || !first_name || !last_name || !gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if committee member with this email already exists
    const { data: existingMember } = await adminClient
      .from('committee_members')
      .select('id, is_active, user_id')
      .ilike('email', email)
      .maybeSingle();

    if (existingMember) {
      if (existingMember.is_active) {
        return NextResponse.json(
          { error: 'A committee member with this email already exists and is active.' },
          { status: 400 }
        );
      }

      // Update existing inactive member
      const { error: updateError } = await adminClient
        .from('committee_members')
        .update({
          first_name,
          last_name,
          gender,
          phone: phone || null,
          is_active: false, // Will be activated when they sign in
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMember.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Updated invite for ${first_name} ${last_name}. Tell them to sign in with Google at the app URL.`,
      });
    }

    // Create new committee member (pending invite)
    const { error: insertError } = await adminClient
      .from('committee_members')
      .insert({
        email,
        first_name,
        last_name,
        gender,
        phone: phone || null,
        user_id: null, // Will be linked when they sign in
        is_active: false, // Will be activated when they sign in
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'A committee member with this email already exists.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Added ${first_name} ${last_name}. Tell them to sign in with Google using ${email} at the app URL.`,
    });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invite' },
      { status: 500 }
    );
  }
}
