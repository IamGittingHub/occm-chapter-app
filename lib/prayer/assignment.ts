import { PrayerAssignmentInsert, Member, CommitteeMember } from '@/types/database';
import { startOfMonth, endOfMonth, format } from 'date-fns';

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
 * Generates initial prayer assignments for all active members
 * - Gender-matches members to committee members
 * - Assigns bucket numbers for rotation tracking
 * - Creates records for the specified month
 */
export async function generateInitialPrayerAssignments(
  supabase: SupabaseClientType,
  targetDate: Date = new Date()
): Promise<AssignmentResult> {
  const periodStart = startOfMonth(targetDate);
  const periodEnd = endOfMonth(targetDate);
  const periodStartStr = format(periodStart, 'yyyy-MM-dd');
  const periodEndStr = format(periodEnd, 'yyyy-MM-dd');

  // Check if assignments already exist for this period
  const { data: existingAssignments } = await supabase
    .from('prayer_assignments')
    .select('id')
    .eq('period_start', periodStartStr)
    .limit(1);

  if (existingAssignments && existingAssignments.length > 0) {
    return {
      success: false,
      message: `Prayer assignments already exist for ${format(periodStart, 'MMMM yyyy')}. Use rotation instead.`,
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

  // Get active committee members (excluding example/admin accounts)
  const { data: committeeMembersData, error: committeeError } = await supabase
    .from('committee_members')
    .select('*')
    .eq('is_active', true)
    .not('email', 'like', '%@example.com');

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

  const assignments: PrayerAssignmentInsert[] = [];

  // Assign male members
  maleMembers.forEach((member, index) => {
    const bucketNumber = (index % maleCommittee.length) + 1;
    const committeeIndex = index % maleCommittee.length;
    assignments.push({
      member_id: member.id,
      committee_member_id: maleCommittee[committeeIndex].id,
      bucket_number: bucketNumber,
      period_start: periodStartStr,
      period_end: periodEndStr,
    });
  });

  // Assign female members
  femaleMembers.forEach((member, index) => {
    const bucketNumber = (index % femaleCommittee.length) + 1;
    const committeeIndex = index % femaleCommittee.length;
    assignments.push({
      member_id: member.id,
      committee_member_id: femaleCommittee[committeeIndex].id,
      bucket_number: bucketNumber,
      period_start: periodStartStr,
      period_end: periodEndStr,
    });
  });

  // Insert all assignments
  const { error: insertError } = await supabase.from('prayer_assignments').insert(assignments);

  if (insertError) {
    return { success: false, message: `Error creating assignments: ${insertError.message}` };
  }

  return {
    success: true,
    message: `Created ${assignments.length} prayer assignments for ${format(periodStart, 'MMMM yyyy')}.`,
    assignmentsCreated: assignments.length,
  };
}

/**
 * Assigns a new member to a committee member (for mid-month additions)
 * Assigns to the committee member with the fewest current assignments of the same gender
 */
export async function assignNewMemberForPrayer(
  supabase: SupabaseClientType,
  memberId: string,
  targetDate: Date = new Date()
): Promise<AssignmentResult> {
  const periodStart = startOfMonth(targetDate);
  const periodEnd = endOfMonth(targetDate);
  const periodStartStr = format(periodStart, 'yyyy-MM-dd');
  const periodEndStr = format(periodEnd, 'yyyy-MM-dd');

  // Get the member
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('id', memberId)
    .single();

  if (memberError || !member) {
    return { success: false, message: 'Member not found.' };
  }

  // Check if already assigned this period
  const { data: existingAssignment } = await supabase
    .from('prayer_assignments')
    .select('id')
    .eq('member_id', memberId)
    .eq('period_start', periodStartStr)
    .single();

  if (existingAssignment) {
    return { success: false, message: 'Member already has a prayer assignment for this period.' };
  }

  // Get same-gender committee members with their assignment counts (excluding example/admin accounts)
  const { data: committeeMembers, error: committeeError } = await supabase
    .from('committee_members')
    .select(`
      *,
      prayer_assignments!inner(id)
    `)
    .eq('is_active', true)
    .eq('gender', member.gender)
    .eq('prayer_assignments.period_start', periodStartStr)
    .not('email', 'like', '%@example.com');

  if (committeeError) {
    return { success: false, message: `Error fetching committee: ${committeeError.message}` };
  }

  // If no assignments exist yet, get all committee members
  let targetCommittee = committeeMembers;
  if (!targetCommittee || targetCommittee.length === 0) {
    const { data: allCommittee } = await supabase
      .from('committee_members')
      .select('*')
      .eq('is_active', true)
      .eq('gender', member.gender)
      .not('email', 'like', '%@example.com');
    targetCommittee = allCommittee?.map(c => ({ ...c, prayer_assignments: [] })) || [];
  }

  if (targetCommittee.length === 0) {
    return { success: false, message: `No ${member.gender} committee members available.` };
  }

  // Find committee member with fewest assignments
  const committeeMemberWithFewest = targetCommittee.reduce((min, current) => {
    const currentCount = Array.isArray(current.prayer_assignments)
      ? current.prayer_assignments.length
      : 0;
    const minCount = Array.isArray(min.prayer_assignments)
      ? min.prayer_assignments.length
      : 0;
    return currentCount < minCount ? current : min;
  });

  // Get the max bucket number for this gender's committee
  const maxBucket = targetCommittee.length;
  const newBucket = (Array.isArray(committeeMemberWithFewest.prayer_assignments)
    ? committeeMemberWithFewest.prayer_assignments.length
    : 0) % maxBucket + 1;

  // Create the assignment
  const { error: insertError } = await supabase.from('prayer_assignments').insert({
    member_id: memberId,
    committee_member_id: committeeMemberWithFewest.id,
    bucket_number: newBucket,
    period_start: periodStartStr,
    period_end: periodEndStr,
  });

  if (insertError) {
    return { success: false, message: `Error creating assignment: ${insertError.message}` };
  }

  return {
    success: true,
    message: `Assigned ${member.first_name} ${member.last_name} to ${committeeMemberWithFewest.first_name} ${committeeMemberWithFewest.last_name} for prayer.`,
    assignmentsCreated: 1,
  };
}
