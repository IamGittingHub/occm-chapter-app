import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Use the configured app URL for redirects (handles proxy correctly)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://occm.srv1165028.hstgr.cloud';

  if (code) {
    // Use regular client for session exchange (needs cookies)
    const supabase = await createClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback - session exchange error:', error.message);
      return NextResponse.redirect(`${appUrl}/login?error=auth`);
    }

    if (sessionData?.user) {
      const user = sessionData.user;
      const userEmail = user.email?.toLowerCase().trim();

      console.log('Auth callback - User logged in:', {
        userId: user.id,
        email: userEmail
      });

      if (userEmail) {
        // Use service role client to bypass RLS for database updates
        const adminClient = createServiceClient();

        try {
          // Find committee member with matching email (case-insensitive)
          const { data: pendingMember, error: findError } = await adminClient
            .from('committee_members')
            .select('id, user_id, is_active, email')
            .ilike('email', userEmail)
            .is('user_id', null)
            .maybeSingle();

          if (findError) {
            console.error('Auth callback - Error finding pending member:', findError.message);
          }

          if (pendingMember) {
            console.log('Auth callback - Found pending member to link:', {
              memberId: pendingMember.id,
              memberEmail: pendingMember.email
            });

            // Link the user to the committee member and activate them
            const { error: updateError } = await adminClient
              .from('committee_members')
              .update({
                user_id: user.id,
                is_active: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', pendingMember.id);

            if (updateError) {
              console.error('Auth callback - Error linking user:', updateError.message);
            } else {
              console.log('Auth callback - Successfully linked user to committee member');
            }
          } else {
            console.log('Auth callback - No pending member found for email:', userEmail);

            // Check if already linked (user might be logging in again)
            const { data: existingMember } = await adminClient
              .from('committee_members')
              .select('id, is_active')
              .eq('user_id', user.id)
              .maybeSingle();

            if (existingMember) {
              console.log('Auth callback - User already linked to member:', existingMember.id);

              // Ensure they're active
              if (!existingMember.is_active) {
                await adminClient
                  .from('committee_members')
                  .update({
                    is_active: true,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingMember.id);
              }
            } else {
              console.log('Auth callback - User not found in committee_members, they may not have been invited');
            }
          }
        } catch (err) {
          console.error('Auth callback - Unexpected error:', err);
        }
      }

      return NextResponse.redirect(`${appUrl}${next}`);
    }
  }

  // Return the user to an error page with some instructions
  console.error('Auth callback - No code or session data');
  return NextResponse.redirect(`${appUrl}/login?error=auth`);
}
