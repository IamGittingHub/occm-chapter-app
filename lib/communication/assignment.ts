import { CommunicationAssignmentInsert, Member, CommitteeMember, CommunicationAssignment } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = any;

interface AssignmentResult {
  success: boolean;
  message: string;
  assignmentsCreated?: number;
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generates initial communication assignments for all active members
 * - Gender-matches members to committee members
 * - Creates pending assignments for outreach tracking
 */
export async function generateInitialCommunicationAssignments(
  supabase: SupabaseClientType
): Promise<AssignmentResult> {
  // Check if assignments already exist
  const { data: existingAssignments } = await supabase
    .from('communication_assignments')
    .select('id')
    .eq('is_current', true)
    .limit(1);

  if (existingAssignments && existingAssignments.length > 0) {
    return {
      success: false,
      message: 'Communication assignments already exist. Use the reset option in settings if you want to regenerate.',
    };
  }

  // Get active, non-graduated members
  const { data: membersData, error: membersError } = await supabase
    .from('members')
    .select('*')
    .eq('is_active', true)
    .eq('is_graduated', false);

  if (membersError) {
    return { success: false, message: `Error fetching members: ${membersError.message}` };
  }

  const members = membersData as Member[] | null;

  if (!members || members.length === 0) {
    return { success: false, message: 'No active members found to assign.' };
  }

  // Get active committee members
  const { data: committeeMembersData, error: committeeError } = await supabase
    .from('committee_members')
    .select('*')
    .eq('is_active', true);

  if (committeeError) {
    return { success: false, message: `Error fetching committee: ${committeeError.message}` };
  }

  const committeeMembers = committeeMembersData as CommitteeMember[] | null;

  if (!committeeMembers || committeeMembers.length === 0) {
    return { success: false, message: 'No active committee members found.' };
  }

  // Separate by gender
  const maleMembers = shuffleArray(members.filter((m: Member) => m.gender === 'male'));
  const femaleMembers = shuffleArray(members.filter((m: Member) => m.gender === 'female'));
  const maleCommittee = committeeMembers.filter((c: CommitteeMember) => c.gender === 'male');
  const femaleCommittee = committeeMembers.filter((c: CommitteeMember) => c.gender === 'female');

  if (maleMembers.length > 0 && maleCommittee.length === 0) {
    return { success: false, message: 'No male committee members to assign male members to.' };
  }

  if (femaleMembers.length > 0 && femaleCommittee.length === 0) {
    return { success: false, message: 'No female committee members to assign female members to.' };
  }

  const assignments: CommunicationAssignmentInsert[] = [];

  // Assign male members (round-robin)
  maleMembers.forEach((member, index) => {
    const committeeIndex = index % maleCommittee.length;
    assignments.push({
      member_id: member.id,
      committee_member_id: maleCommittee[committeeIndex].id,
      status: 'pending',
      is_current: true,
    });
  });

  // Assign female members (round-robin)
  femaleMembers.forEach((member, index) => {
    const committeeIndex = index % femaleCommittee.length;
    assignments.push({
      member_id: member.id,
      committee_member_id: femaleCommittee[committeeIndex].id,
      status: 'pending',
      is_current: true,
    });
  });

  // Insert all assignments
  const { error: insertError } = await supabase.from('communication_assignments').insert(assignments);

  if (insertError) {
    return { success: false, message: `Error creating assignments: ${insertError.message}` };
  }

  return {
    success: true,
    message: `Created ${assignments.length} communication assignments.`,
    assignmentsCreated: assignments.length,
  };
}

/**
 * Assigns a new member for communication (for mid-cycle additions)
 * Assigns to the committee member with the fewest current pending assignments of the same gender
 */
export async function assignNewMemberForCommunication(
  supabase: SupabaseClientType,
  memberId: string
): Promise<AssignmentResult> {
  // Get the member
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single();

  const member = memberData as Member | null;

  if (memberError || !member) {
    return { success: false, message: 'Member not found.' };
  }

  // Check if already has a current assignment
  const { data: existingAssignment } = await supabase
    .from('communication_assignments')
    .select('id')
    .eq('member_id', memberId)
    .eq('is_current', true)
    .single();

  if (existingAssignment) {
    return { success: false, message: 'Member already has a communication assignment.' };
  }

  // Get same-gender committee members with their assignment counts
  const { data: committeeMembersData, error: committeeError } = await supabase
    .from('committee_members')
    .select('*')
    .eq('is_active', true)
    .eq('gender', member.gender);

  if (committeeError) {
    return { success: false, message: `Error fetching committee: ${committeeError.message}` };
  }

  const committeeMembers = committeeMembersData as CommitteeMember[] | null;

  if (!committeeMembers || committeeMembers.length === 0) {
    return { success: false, message: `No ${member.gender} committee members available.` };
  }

  // Get assignment counts for each committee member
  const committeeCounts = await Promise.all(
    committeeMembers.map(async (cm: CommitteeMember) => {
      const { count } = await supabase
        .from('communication_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('committee_member_id', cm.id)
        .eq('is_current', true)
        .eq('status', 'pending');

      return { committeeMember: cm, count: count || 0 };
    })
  );

  // Find committee member with fewest pending assignments
  const committeeMemberWithFewest = committeeCounts.reduce((min, current) =>
    current.count < min.count ? current : min
  );

  // Create the assignment
  const assignmentData: CommunicationAssignmentInsert = {
    member_id: memberId,
    committee_member_id: committeeMemberWithFewest.committeeMember.id,
    status: 'pending',
    is_current: true,
  };

  const { error: insertError } = await supabase.from('communication_assignments').insert(assignmentData as never);

  if (insertError) {
    return { success: false, message: `Error creating assignment: ${insertError.message}` };
  }

  return {
    success: true,
    message: `Assigned ${member.first_name} ${member.last_name} to ${committeeMemberWithFewest.committeeMember.first_name} ${committeeMemberWithFewest.committeeMember.last_name} for communication.`,
    assignmentsCreated: 1,
  };
}
