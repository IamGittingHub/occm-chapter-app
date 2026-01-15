'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { InviteCommitteeDialog } from '@/components/committee/invite-dialog';
import { CommitteeMemberCard } from '@/components/committee/committee-member-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog, Users, Loader2 } from 'lucide-react';

export default function CommitteePage() {
  const committeeMembers = useQuery(api.committeeMembers.list);
  const currentUser = useQuery(api.committeeMembers.getCurrentMember);
  const stats = useQuery(api.committeeMembers.getStats);

  if (committeeMembers === undefined || currentUser === undefined || stats === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-deep-blue" />
      </div>
    );
  }

  // Convert to expected format for components
  const formattedMembers = committeeMembers.map(m => ({
    id: m._id as string,
    user_id: (m.userId as string) || null,
    email: m.email,
    first_name: m.firstName,
    last_name: m.lastName,
    gender: m.gender,
    phone: m.phone || null,
    is_active: m.isActive,
    created_at: new Date(m.createdAt).toISOString(),
    updated_at: new Date(m.updatedAt).toISOString(),
    _id: m._id,
    role: m.role ?? 'committee_member',
  }));

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
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Invites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{stats.pendingInvites}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inactive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
          </CardContent>
        </Card>
      </div>

      {/* Committee List */}
      {committeeMembers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {formattedMembers.map((member) => {
            const isCurrentUser = currentUser?._id === member._id;

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
