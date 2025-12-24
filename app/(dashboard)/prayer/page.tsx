import { createClient } from '@/lib/supabase/server';
import { getCurrentCommitteeMember } from '@/lib/supabase/get-current-committee-member';
import { PrayerList } from '@/components/prayer/prayer-list';
import { GenerateAssignmentsButton } from '@/components/prayer/generate-assignments-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { PrayerAssignment, Member } from '@/types/database';

type AssignmentWithMember = PrayerAssignment & {
  member: Member;
};

export default async function PrayerPage() {
  const supabase = await createClient();
  const committeeMember = await getCurrentCommitteeMember(supabase);

  const now = new Date();
  const periodStart = format(startOfMonth(now), 'yyyy-MM-dd');

  // Get my prayer assignments for this month
  const { data, error: myError } = committeeMember
    ? await supabase
        .from('prayer_assignments')
        .select(`
          *,
          member:members(*)
        `)
        .eq('committee_member_id', committeeMember.id)
        .eq('period_start', periodStart)
        .order('created_at', { ascending: true })
    : { data: null, error: null };

  const myAssignments = data as AssignmentWithMember[] | null;

  // Get total assignment count for stats
  const { count: totalAssignments } = await supabase
    .from('prayer_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('period_start', periodStart);

  // Check if assignments exist
  const hasAssignments = (totalAssignments || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-deep-blue flex items-center gap-2">
            <Heart className="h-6 w-6 text-gold" />
            Prayer List
          </h1>
          <p className="text-muted-foreground">
            Members you are praying for this month
          </p>
        </div>
        {!hasAssignments && <GenerateAssignmentsButton />}
      </div>

      {/* Current Month */}
      <Card className="bg-deep-blue text-white">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-gold" />
            <div>
              <p className="text-sm text-deep-blue-200">Current Prayer Period</p>
              <p className="text-2xl font-bold">{format(now, 'MMMM yyyy')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              My Prayer List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{myAssignments?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalAssignments || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Days Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Math.ceil((endOfMonth(now).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prayer List */}
      {myError ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-destructive">Error loading prayer list: {myError.message}</p>
          </CardContent>
        </Card>
      ) : !hasAssignments ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No prayer assignments yet</CardTitle>
            <CardDescription className="mb-4">
              Prayer assignments haven&apos;t been generated for this month yet.
              Click the button above to generate initial assignments.
            </CardDescription>
          </CardContent>
        </Card>
      ) : myAssignments && myAssignments.length > 0 ? (
        <PrayerList assignments={myAssignments} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No members assigned to you</CardTitle>
            <CardDescription>
              You don&apos;t have any members assigned for prayer this month.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
