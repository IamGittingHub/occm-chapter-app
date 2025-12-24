import { createClient } from '@/lib/supabase/server';
import { getCurrentCommitteeMember } from '@/lib/supabase/get-current-committee-member';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, MessageSquare, Users, AlertTriangle } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const committeeMember = await getCurrentCommitteeMember(supabase);

  // TODO: Fetch actual stats once tables are populated
  const stats = {
    prayerCount: 0,
    pendingCommunication: 0,
    totalMembers: 0,
    approachingDeadline: 0,
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-deep-blue">
          Welcome back{committeeMember ? `, ${committeeMember.first_name}` : ''}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your chapter&apos;s prayer and communication assignments.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Prayer List</CardTitle>
            <Heart className="h-4 w-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prayerCount}</div>
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
            <div className="text-2xl font-bold">{stats.pendingCommunication}</div>
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
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              Active chapter members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approachingDeadline}</div>
            <p className="text-xs text-muted-foreground">
              Approaching 30-day threshold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks for managing your chapter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/prayer"
              className="flex items-center p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <Heart className="h-5 w-5 mr-3 text-gold" />
              <div>
                <p className="font-medium">View Prayer List</p>
                <p className="text-sm text-muted-foreground">
                  See who you&apos;re praying for this month
                </p>
              </div>
            </a>
            <a
              href="/communication"
              className="flex items-center p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <MessageSquare className="h-5 w-5 mr-3 text-soft-blue" />
              <div>
                <p className="font-medium">Log Contact</p>
                <p className="text-sm text-muted-foreground">
                  Record an outreach attempt
                </p>
              </div>
            </a>
            <a
              href="/members"
              className="flex items-center p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <Users className="h-5 w-5 mr-3 text-deep-blue" />
              <div>
                <p className="font-medium">Add New Member</p>
                <p className="text-sm text-muted-foreground">
                  Register a new chapter member
                </p>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Set up your chapter management system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">Import Members</p>
                  <p className="text-sm text-muted-foreground">
                    Upload your member list via CSV or add them manually
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Add Committee Members</p>
                  <p className="text-sm text-muted-foreground">
                    Invite other committee members to the system
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Generate Assignments</p>
                  <p className="text-sm text-muted-foreground">
                    Run the initial prayer and communication assignments
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
