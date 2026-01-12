'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Heart, MessageSquare, Users, AlertTriangle, CheckCircle, ArrowRight, Clock, Loader2 } from 'lucide-react';
import { RotationCountdown } from '@/components/dashboard/rotation-countdown';

export default function DashboardPage() {
  const stats = useQuery(api.dashboard.getStats);
  const data = useQuery(api.dashboard.getData);
  const currentMember = useQuery(api.committeeMembers.getCurrentMember);

  if (stats === undefined || data === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-deep-blue" />
      </div>
    );
  }

  const now = new Date();

  // Calculate urgent contacts (20+ days)
  const urgentContacts = data.communicationAssignments
    .filter(a => a.status === 'pending' && a.daysSinceAssigned >= 20)
    .sort((a, b) => b.daysSinceAssigned - a.daysSinceAssigned);

  const pendingComm = data.communicationAssignments.filter(a => a.status === 'pending');
  const successfulComm = data.communicationAssignments.filter(a => a.status === 'successful');

  // Calculate progress percentage
  const commProgress = data.communicationAssignments.length > 0
    ? Math.round((successfulComm.length / data.communicationAssignments.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome & Countdown */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-deep-blue">
            Welcome back{currentMember ? `, ${currentMember.firstName}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what needs your attention today.
          </p>
        </div>
        <div className="md:w-80">
          <RotationCountdown />
        </div>
      </div>

      {/* Urgent Actions */}
      {urgentContacts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Urgent: Members Approaching Deadline
            </CardTitle>
            <CardDescription>
              These members need to be contacted soon to avoid auto-transfer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgentContacts.slice(0, 3).map((assignment) => {
                const member = assignment.member;
                const isOverdue = assignment.daysSinceAssigned >= 30;

                return (
                  <div
                    key={assignment._id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}>
                          {member?.firstName?.[0]}{member?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member?.firstName} {member?.lastName}</p>
                        <p className="text-sm text-muted-foreground">{member?.major || 'No major listed'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={isOverdue ? 'destructive' : 'outline'} className={!isOverdue ? 'border-orange-400 text-orange-600' : ''}>
                        {assignment.daysSinceAssigned} days
                      </Badge>
                      <Button size="sm" asChild>
                        <Link href="/communication">
                          Contact Now
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
              {urgentContacts.length > 3 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/communication">
                    View All {urgentContacts.length} Urgent <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Prayer List</CardTitle>
            <Heart className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prayer.total}</div>
            <p className="text-xs text-muted-foreground">
              Members to pray for this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Contacts</CardTitle>
            <MessageSquare className="h-4 w-4 text-soft-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.communication.pending}</div>
            <p className="text-xs text-muted-foreground">
              Members awaiting outreach
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-deep-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActiveMembers}</div>
            <p className="text-xs text-muted-foreground">
              Active chapter members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Contacts</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.communication.successful}</div>
            <p className="text-xs text-muted-foreground">
              Members you&apos;ve connected with
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress & Lists */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Communication Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-soft-blue" />
              Communication Progress
            </CardTitle>
            <CardDescription>
              Your outreach completion for current assignments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{successfulComm.length} of {data.communicationAssignments.length}</span>
              </div>
              <Progress value={commProgress} className="h-2" />
            </div>
            {pendingComm.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Next to contact:</p>
                {pendingComm.slice(0, 2).map((assignment) => (
                  <div
                    key={assignment._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-soft-blue text-white">
                          {assignment.member?.firstName?.[0]}{assignment.member?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {assignment.member?.firstName} {assignment.member?.lastName}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {assignment.daysSinceAssigned}d
                    </Badge>
                  </div>
                ))}
              </div>
            ) : data.communicationAssignments.length > 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">All contacts completed!</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No communication assignments yet
              </p>
            )}
            <Button className="w-full" variant="outline" asChild>
              <Link href="/communication">
                View All Communications <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Prayer List Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-gold" />
              My Prayer List
            </CardTitle>
            <CardDescription>
              Members you are praying for this month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.prayerAssignments.length > 0 ? (
              <div className="space-y-2">
                {data.prayerAssignments.slice(0, 4).map((assignment) => (
                  <div
                    key={assignment._id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-gold text-deep-blue">
                          {assignment.member?.firstName?.[0]}{assignment.member?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-sm font-medium">
                          {assignment.member?.firstName} {assignment.member?.lastName}
                        </span>
                        {assignment.member?.church && (
                          <p className="text-xs text-muted-foreground">{assignment.member.church}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {data.prayerAssignments.length > 4 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{data.prayerAssignments.length - 4} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No prayer assignments yet. Generate assignments from the Prayer List page.
              </p>
            )}
            <Button className="w-full" variant="outline" asChild>
              <Link href="/prayer">
                View Full Prayer List <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link href="/communication">
                <MessageSquare className="h-5 w-5 mr-3 text-soft-blue" />
                <div className="text-left">
                  <p className="font-medium">Log Contact</p>
                  <p className="text-xs text-muted-foreground">Record an outreach</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link href="/members">
                <Users className="h-5 w-5 mr-3 text-deep-blue" />
                <div className="text-left">
                  <p className="font-medium">Add Member</p>
                  <p className="text-xs text-muted-foreground">Register someone new</p>
                </div>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start" asChild>
              <Link href="/prayer">
                <Heart className="h-5 w-5 mr-3 text-gold" />
                <div className="text-left">
                  <p className="font-medium">Prayer List</p>
                  <p className="text-xs text-muted-foreground">See who to pray for</p>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
