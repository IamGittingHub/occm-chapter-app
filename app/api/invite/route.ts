import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { Database, Gender } from '@/types/database';

// Create admin client with service role for sending invites
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
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

    // Check if user is an active committee member
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: committeeMember } = await (supabase as any)
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
    // Normalize email to lowercase to ensure consistent matching
    const email = body.email?.toLowerCase().trim();

    if (!email || !first_name || !last_name || !gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check if committee member with this email already exists (case-insensitive)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingMember } = await (supabase as any)
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
      // If exists but not active, we'll update it
    }

    // Try to send invite via Supabase Auth Admin API
    let authUser: { id: string } | null = null;
    let inviteError: Error | null = null;

    // First check if user already exists in auth (case-insensitive)
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email);

    if (existingAuthUser) {
      // User already exists in auth, just create/update committee member
      authUser = existingAuthUser;
    } else {
      // Try to invite new user
      const { data: inviteData, error: invErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard`,
        data: {
          first_name,
          last_name,
        },
      });

      if (invErr) {
        inviteError = invErr;
        // If invite fails, we'll still create the committee member
        // They can sign in with Google instead
      } else {
        authUser = inviteData?.user ?? null;
      }
    }

    // Create or update committee member record
    if (existingMember) {
      // Update existing inactive member
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from('committee_members')
        .update({
          first_name,
          last_name,
          gender,
          phone: phone || null,
          user_id: authUser?.id || existingMember.user_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMember.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // Create new committee member
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from('committee_members')
        .insert({
          email,
          first_name,
          last_name,
          gender,
          phone: phone || null,
          user_id: authUser?.id || null,
          is_active: false,
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
    }

    // Return success with info about whether email was sent
    if (inviteError) {
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: `Committee member created. Email invite could not be sent, but they can sign in with Google using ${email}.`,
      });
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      message: `Invitation sent to ${email}. They can also sign in with Google.`,
    });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invite' },
      { status: 500 }
    );
  }
}
