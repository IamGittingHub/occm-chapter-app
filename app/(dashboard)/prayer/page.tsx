'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { PrayerList } from '@/components/prayer/prayer-list';
import { GenerateAssignmentsButton } from '@/components/prayer/generate-assignments-button';
import { RotationCountdown } from '@/components/dashboard/rotation-countdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function PrayerPage() {
  const myAssignments = useQuery(api.prayerAssignments.getMyAssignments);
  const stats = useQuery(api.prayerAssignments.getStats);

  const now = new Date();

  if (myAssignments === undefined || stats === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-deep-blue" />
      </div>
    );
  }

  // Convert Convex format to match component expectations
  // Filter out assignments with no member and transform the data
  const formattedAssignments = myAssignments
    .filter(a => a.member !== null)
    .map(a => ({
      id: a._id as string,
      member_id: a.memberId as string,
      committee_member_id: a.committeeMemberId as string,
      bucket_number: a.bucketNumber,
      period_start: a.periodStart,
      period_end: a.periodEnd,
      is_claimed: a.isClaimed,
      claimed_at: a.claimedAt ? new Date(a.claimedAt).toISOString() : null,
      created_at: new Date(a.createdAt).toISOString(),
      member: {
        id: a.member!._id as string,
        first_name: a.member!.firstName,
        last_name: a.member!.lastName,
        gender: a.member!.gender,
        grade: a.member!.grade,
        major: a.member!.major || null,
        minor: null,
        church: a.member!.church || null,
        date_of_birth: null,
        email: a.member!.email || null,
        phone: a.member!.phone || null,
        student_id: null,
        is_new_member: a.member!.isNewMember || false,
        expected_graduation: null,
        wants_mentor: false,
        wants_to_mentor: false,
        notes: null,
        is_graduated: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;

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
        {stats.total === 0 && <GenerateAssignmentsButton />}
      </div>

      {/* Current Month & Countdown */}
      <div className="grid gap-4 md:grid-cols-2">
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
        <RotationCountdown />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              My Prayer List
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{myAssignments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Prayer List */}
      {stats.total === 0 ? (
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
      ) : myAssignments.length > 0 ? (
        <PrayerList assignments={formattedAssignments} />
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
