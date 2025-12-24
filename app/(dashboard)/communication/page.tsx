import { createClient } from '@/lib/supabase/server';
import { getCurrentCommitteeMember } from '@/lib/supabase/get-current-committee-member';
import { CommunicationList } from '@/components/communication/communication-list';
import { GenerateCommunicationButton } from '@/components/communication/generate-communication-button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { MessageSquare, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { CommunicationAssignment, CommunicationLog, Member } from '@/types/database';

type AssignmentWithDetails = CommunicationAssignment & {
  member: Member;
  communication_logs: CommunicationLog[];
};

export default async function CommunicationPage() {
  const supabase = await createClient();
  const committeeMember = await getCurrentCommitteeMember(supabase);

  // Get my communication assignments
  const { data, error: myError } = committeeMember
    ? await supabase
        .from('communication_assignments')
        .select(`
          *,
          member:members(*),
          communication_logs(*)
        `)
        .eq('committee_member_id', committeeMember.id)
        .eq('is_current', true)
        .order('assigned_date', { ascending: true })
    : { data: null, error: null };

  const myAssignments = data as AssignmentWithDetails[] | null;

  // Get total counts
  const { count: totalAssignments } = await supabase
    .from('communication_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('is_current', true);

  const hasAssignments = (totalAssignments || 0) > 0;

  // Calculate stats
  const pending = myAssignments?.filter((a) => a.status === 'pending') || [];
  const successful = myAssignments?.filter((a) => a.status === 'successful') || [];

  // Count approaching threshold (20+ days)
  const now = new Date();
  const approachingThreshold = pending.filter((a) => {
    const daysSince = differenceInDays(now, new Date(a.assigned_date));
    return daysSince >= 20 && daysSince < 30;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-deep-blue flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-soft-blue" />
            Communication Tracking
          </h1>
          <p className="text-muted-foreground">
            Track your outreach efforts with chapter members
          </p>
        </div>
        {!hasAssignments && <GenerateCommunicationButton />}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pending.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold">{successful.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-orange-100">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
                <p className="text-2xl font-bold">{approachingThreshold}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-gray-100">
                <MessageSquare className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Mine</p>
                <p className="text-2xl font-bold">{myAssignments?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Communication List */}
      {myError ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive">Error loading assignments: {myError.message}</p>
          </CardContent>
        </Card>
      ) : !hasAssignments ? (
        <Card>
          <CardContent className="py-10 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No communication assignments yet</CardTitle>
            <CardDescription className="mb-4">
              Communication assignments haven&apos;t been generated yet.
              Click the button above to generate initial assignments.
            </CardDescription>
          </CardContent>
        </Card>
      ) : myAssignments && myAssignments.length > 0 ? (
        <CommunicationList assignments={myAssignments} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No members assigned to you</CardTitle>
            <CardDescription>
              You don&apos;t have any members assigned for communication outreach.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
