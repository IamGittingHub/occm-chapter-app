'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { MemberTable } from '@/components/members/member-table';
import { AddMemberDialog } from '@/components/members/add-member-dialog';
import { CSVImport } from '@/components/members/csv-import';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';

export default function MembersPage() {
  const members = useQuery(api.members.list);

  if (members === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-deep-blue" />
      </div>
    );
  }

  // Convert Convex data format to match component expectations
  const formattedMembers = members.map(m => ({
    id: m._id as string,
    first_name: m.firstName,
    last_name: m.lastName,
    gender: m.gender,
    grade: m.grade,
    major: m.major || null,
    minor: m.minor || null,
    church: m.church || null,
    date_of_birth: m.dateOfBirth || null,
    email: m.email || null,
    phone: m.phone || null,
    student_id: m.studentId || null,
    is_new_member: m.isNewMember || false,
    expected_graduation: m.expectedGraduation || null,
    wants_mentor: m.wantsMentor || false,
    wants_to_mentor: m.wantsToMentor || false,
    notes: m.notes || null,
    is_graduated: m.isGraduated,
    is_active: m.isActive,
    created_at: new Date(m.createdAt).toISOString(),
    updated_at: new Date(m.updatedAt).toISOString(),
    // Keep _id for Convex operations
    _id: m._id,
  }));

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
            <p className="text-2xl font-bold">{members.length}</p>
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
              {members.filter((m) => m.isActive && !m.isGraduated).length}
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
              {members.filter((m) => m.isNewMember).length}
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
              {members.filter((m) => m.isGraduated).length}
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
              {members.filter((m) => m.gender === 'male').length}M /{' '}
              {members.filter((m) => m.gender === 'female').length}F
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Member Table */}
      {members.length > 0 ? (
        <MemberTable members={formattedMembers} />
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
