'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MemberDetail } from '@/components/members/member-detail';
import { Loader2 } from 'lucide-react';

export default function MemberPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const edit = searchParams.get('edit');

  const member = useQuery(api.members.getById, { id: id as Id<"members"> });

  useEffect(() => {
    if (member === null) {
      router.replace('/members');
    }
  }, [member, router]);

  if (member === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-soft-blue" />
      </div>
    );
  }

  if (member === null) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
        Member not found. Redirecting...
      </div>
    );
  }

  // Transform Convex member to the expected Member type format
  const memberData = {
    id: member._id,
    first_name: member.firstName,
    last_name: member.lastName,
    gender: member.gender,
    grade: member.grade,
    major: member.major || null,
    minor: member.minor || null,
    church: member.church || null,
    email: member.email || null,
    phone: member.phone || null,
    student_id: member.studentId || null,
    date_of_birth: member.dateOfBirth || null,
    expected_graduation: member.expectedGraduation || null,
    is_new_member: member.isNewMember || false,
    wants_mentor: member.wantsMentor || false,
    wants_to_mentor: member.wantsToMentor || false,
    notes: member.notes || null,
    is_graduated: member.isGraduated,
    is_active: member.isActive,
    is_committee_member: member.isCommitteeMember || false,
    priority: member.priority || null,
    created_at: new Date(member.createdAt).toISOString(),
    updated_at: new Date(member.updatedAt).toISOString(),
  };

  return <MemberDetail member={memberData} editMode={edit === 'true'} />;
}
