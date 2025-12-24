import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { Database } from '@/types/database';

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

// POST - Resend invite to a committee member
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is active committee member
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentMember } = await (supabase as any)
      .from('committee_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!currentMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the member to resend invite to
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member, error: memberError } = await (supabase as any)
      .from('committee_members')
      .select('*')
      .eq('id', id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Committee member not found' }, { status: 404 });
    }

    // Check if member is already active
    if (member.is_active) {
      return NextResponse.json(
        { error: 'This member is already active' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Check if user exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(u => u.email === member.email);

    if (existingAuthUser) {
      // User exists, just update the committee member link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('committee_members')
        .update({
          user_id: existingAuthUser.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        message: `${member.email} already has an account. They can sign in with Google or their existing credentials.`,
      });
    }

    // Send new invite
    const { error: invErr } = await adminClient.auth.admin.inviteUserByEmail(member.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard`,
      data: {
        first_name: member.first_name,
        last_name: member.last_name,
      },
    });

    if (invErr) {
      return NextResponse.json({
        success: true,
        emailSent: false,
        message: `Could not send email invite. ${member.first_name} can still sign in with Google using ${member.email}.`,
      });
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      message: `Invitation resent to ${member.email}`,
    });
  } catch (error) {
    console.error('Resend invite error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resend invite' },
      { status: 500 }
    );
  }
}
