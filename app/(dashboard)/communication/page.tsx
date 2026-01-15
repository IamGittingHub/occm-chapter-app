'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { CommunicationList } from '@/components/communication/communication-list';
import { GenerateCommunicationButton } from '@/components/communication/generate-communication-button';
import { RotationCountdown } from '@/components/dashboard/rotation-countdown';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { MessageSquare, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';

export default function CommunicationPage() {
  const myAssignments = useQuery(api.communicationAssignments.getMyAssignments);
  const stats = useQuery(api.communicationAssignments.getStats);

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
      assigned_date: new Date(a.assignedDate).toISOString(),
      status: a.status,
      last_contact_attempt: a.lastContactAttempt ? new Date(a.lastContactAttempt).toISOString() : null,
      is_current: a.isCurrent,
      is_claimed: a.isClaimed,
      claimed_at: a.claimedAt ? new Date(a.claimedAt).toISOString() : null,
      created_at: new Date(a.createdAt).toISOString(),
      updated_at: new Date(a.updatedAt).toISOString(),
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
        expected_graduation: null,
        is_new_member: a.member!.isNewMember || false,
        wants_mentor: false,
        wants_to_mentor: false,
        notes: null,
        is_graduated: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      communication_logs: (a.communicationLogs || []).map(l => ({
        id: l._id as string,
        assignment_id: l.assignmentId as string,
        committee_member_id: l.committeeMemberId as string,
        contact_date: new Date(l.contactDate).toISOString(),
        contact_method: l.contactMethod || null,
        notes: l.notes || null,
        was_successful: l.wasSuccessful,
        created_at: new Date(l.createdAt).toISOString(),
      })),
      // Include days since assigned for urgency calculations
      daysSinceAssigned: a.daysSinceAssigned,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;

  // Calculate stats from assignments
  const pending = myAssignments.filter((a) => a.status === 'pending');
  const successful = myAssignments.filter((a) => a.status === 'successful');
  const approachingThreshold = pending.filter((a) => a.daysSinceAssigned >= 20 && a.daysSinceAssigned < 30).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-1">
          <div>
            <h1 className="text-2xl font-bold text-deep-blue flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-soft-blue" />
              Communication Tracking
            </h1>
            <p className="text-muted-foreground">
              Track your outreach efforts with chapter members
            </p>
          </div>
          {stats.total === 0 && <GenerateCommunicationButton />}
        </div>
        <div className="w-full lg:w-80">
          <RotationCountdown />
        </div>
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
                <p className="text-2xl font-bold">{myAssignments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Communication List */}
      {stats.total === 0 ? (
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
      ) : myAssignments.length > 0 ? (
        <CommunicationList assignments={formattedAssignments} />
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
