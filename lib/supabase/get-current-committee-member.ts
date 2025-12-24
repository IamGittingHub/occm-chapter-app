import { CommitteeMember } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = any;

export async function getCurrentCommitteeMember(
  supabase: SupabaseClientType
): Promise<CommitteeMember | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: committeeMember } = await supabase
    .from('committee_members')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  return committeeMember;
}
