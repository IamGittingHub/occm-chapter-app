import { CommitteeMember } from '@/types/database';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = any;

/**
 * Gets the current committee member, with auto-linking fallback.
 * If user is authenticated but not linked, attempts to link them automatically.
 */
export async function getCurrentCommitteeMember(
  supabase: SupabaseClientType
): Promise<CommitteeMember | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // First, try to find by user_id (already linked)
  const { data: linkedMember } = await supabase
    .from('committee_members')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (linkedMember) {
    return linkedMember;
  }

  // Not linked yet - try to auto-link by email
  const userEmail = user.email?.toLowerCase().trim();
  if (!userEmail) return null;

  console.log('Auto-link attempt for:', userEmail);

  // Use service role client to bypass RLS
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find pending committee member with matching email
  const { data: pendingMember, error: findError } = await adminClient
    .from('committee_members')
    .select('*')
    .ilike('email', userEmail)
    .is('user_id', null)
    .maybeSingle();

  if (findError) {
    console.error('Auto-link: Error finding pending member:', findError.message);
    return null;
  }

  if (pendingMember) {
    console.log('Auto-link: Found pending member, linking...', pendingMember.id);

    // Link the user
    const { error: updateError } = await adminClient
      .from('committee_members')
      .update({
        user_id: user.id,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pendingMember.id);

    if (updateError) {
      console.error('Auto-link: Error linking user:', updateError.message);
      return null;
    }

    console.log('Auto-link: Successfully linked user');

    // Return the now-linked member
    return {
      ...pendingMember,
      user_id: user.id,
      is_active: true,
    } as CommitteeMember;
  }

  // Check if there's a member with this email but already linked to someone else
  const { data: existingMember } = await adminClient
    .from('committee_members')
    .select('*')
    .ilike('email', userEmail)
    .maybeSingle();

  if (existingMember && existingMember.user_id === user.id) {
    // Already linked to this user but maybe is_active is false
    if (!existingMember.is_active) {
      await adminClient
        .from('committee_members')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', existingMember.id);

      return { ...existingMember, is_active: true } as CommitteeMember;
    }
    return existingMember;
  }

  console.log('Auto-link: No pending invite found for:', userEmail);
  return null;
}
