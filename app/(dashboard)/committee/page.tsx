import { createClient } from '@/lib/supabase/server';
import { getCurrentCommitteeMember } from '@/lib/supabase/get-current-committee-member';
import { InviteCommitteeDialog } from '@/components/committee/invite-dialog';
import { CommitteeMemberCard } from '@/components/committee/committee-member-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog, Users } from 'lucide-react';
import { CommitteeMember } from '@/types/database';

export default async function CommitteePage() {
  const supabase = await createClient();
  const currentUser = await getCurrentCommitteeMember(supabase);

  const { data, error } = await supabase
    .from('committee_members')
    .select('*')
    .order('is_active', { ascending: false })
    .order('last_name', { ascending: true });

  const committeeMembers = data as CommitteeMember[] | null;

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive">Error loading committee members: {error.message}</p>
      </div>
    );
  }

  const totalCount = committeeMembers?.length || 0;
  const activeCount = committeeMembers?.filter((m) => m.is_active).length || 0;
  const pendingCount = committeeMembers?.filter((m) => !m.is_active && !m.user_id).length || 0;
  const inactiveCount = committeeMembers?.filter((m) => !m.is_active && m.user_id).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-deep-blue flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            Committee Members
          </h1>
          <p className="text-muted-foreground">
            Manage your chapter&apos;s leadership team
          </p>
        </div>
        <InviteCommitteeDialog />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Committee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Invites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inactive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">{inactiveCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Committee List */}
      {committeeMembers && committeeMembers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {committeeMembers.map((member) => {
            const isCurrentUser = currentUser?.id === member.id;

            return (
              <CommitteeMemberCard
                key={member.id}
                member={member}
                isCurrentUser={isCurrentUser}
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No committee members yet</CardTitle>
            <CardDescription className="mb-4">
              Start by inviting committee members to help manage the chapter.
            </CardDescription>
            <InviteCommitteeDialog />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
