import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData?.user) {
      const user = sessionData.user;

      // Check if this user's email matches a pending committee member invitation
      // (committee member exists with this email but no user_id linked yet)
      if (user.email) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: pendingMember } = await (supabase as any)
          .from('committee_members')
          .select('id, user_id, is_active')
          .eq('email', user.email)
          .is('user_id', null)
          .maybeSingle();

        if (pendingMember) {
          // Link the user to the committee member and activate them
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('committee_members')
            .update({
              user_id: user.id,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', pendingMember.id);
        }
      }

      // Also check if user is already linked but not active (edge case)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingMember } = await (supabase as any)
        .from('committee_members')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('is_active', false)
        .maybeSingle();

      if (existingMember) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('committee_members')
          .update({
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingMember.id);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
