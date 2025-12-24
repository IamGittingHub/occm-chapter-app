import { createClient } from '@/lib/supabase/server';
import { MemberTable } from '@/components/members/member-table';
import { AddMemberDialog } from '@/components/members/add-member-dialog';
import { CSVImport } from '@/components/members/csv-import';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { Member } from '@/types/database';

export default async function MembersPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('last_name', { ascending: true });

  const members = data as Member[] | null;

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive">Error loading members: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-deep-blue flex items-center gap-2">
            <Users className="h-6 w-6" />
            Members
          </h1>
          <p className="text-muted-foreground">
            Manage your chapter members
          </p>
        </div>
        <div className="flex gap-2">
          <CSVImport />
          <AddMemberDialog />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{members?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {members?.filter((m) => m.is_active && !m.is_graduated).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {members?.filter((m) => m.is_new_member).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Graduated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {members?.filter((m) => m.is_graduated).length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gender Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {members?.filter((m) => m.gender === 'male').length || 0}M /{' '}
              {members?.filter((m) => m.gender === 'female').length || 0}F
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Member Table */}
      {members && members.length > 0 ? (
        <MemberTable members={members} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">No members yet</CardTitle>
            <CardDescription className="mb-4">
              Get started by adding your first member or importing from a CSV file.
            </CardDescription>
            <div className="flex justify-center gap-2">
              <CSVImport />
              <AddMemberDialog />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
