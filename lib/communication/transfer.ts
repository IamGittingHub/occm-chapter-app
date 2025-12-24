import { differenceInDays } from 'date-fns';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = any;

interface TransferResult {
  success: boolean;
  message: string;
  transfersCompleted?: number;
}

/**
 * Transfers an unresponsive member to the next committee member
 * - Marks current assignment as transferred
 * - Creates new assignment with next available committee member
 * - Logs transfer in transfer_history
 */
export async function transferUnresponsiveMember(
  supabase: SupabaseClientType,
  assignmentId: string
): Promise<TransferResult> {
  // Get the current assignment with member info
  const { data: currentAssignment, error: assignmentError } = await supabase
    .from('communication_assignments')
    .select(`
      *,
      member:members(*),
      committee_member:committee_members(*)
    `)
    .eq('id', assignmentId)
    .single();

  if (assignmentError || !currentAssignment) {
    return { success: false, message: 'Assignment not found.' };
  }

  if (currentAssignment.status !== 'pending' || !currentAssignment.is_current) {
    return { success: false, message: 'Only current pending assignments can be transferred.' };
  }

  const member = currentAssignment.member;
  if (!member) {
    return { success: false, message: 'Member not found.' };
  }

  // Get all same-gender committee members (excluding example/admin accounts)
  const { data: allCommittee, error: committeeError } = await supabase
    .from('committee_members')
    .select('*')
    .eq('is_active', true)
    .eq('gender', member.gender)
    .not('email', 'like', '%@example.com');

  if (committeeError || !allCommittee || allCommittee.length === 0) {
    return { success: false, message: 'No committee members available for transfer.' };
  }

  // Get all committee members who have already tried this member
  const { data: transferHistory } = await supabase
    .from('transfer_history')
    .select('from_committee_member_id')
    .eq('member_id', member.id);

  const triedCommitteeIds = new Set([
    currentAssignment.committee_member_id,
    ...(transferHistory?.map((t) => t.from_committee_member_id) || []),
  ]);

  // Find next committee member who hasn't tried yet
  let nextCommitteeMember = allCommittee.find((c) => !triedCommitteeIds.has(c.id));

  // If all have tried, reset and start from the beginning (round-robin)
  if (!nextCommitteeMember) {
    // Get the committee member with fewest total attempts on this member
    const attemptCounts = allCommittee.map((c) => {
      const count = transferHistory?.filter((t) => t.from_committee_member_id === c.id).length || 0;
      return { committeeMember: c, count };
    });

    const minAttempts = Math.min(...attemptCounts.map((a) => a.count));
    const candidatesWithMinAttempts = attemptCounts.filter((a) => a.count === minAttempts);
    nextCommitteeMember = candidatesWithMinAttempts[0]?.committeeMember;

    if (!nextCommitteeMember || nextCommitteeMember.id === currentAssignment.committee_member_id) {
      // If still the same person, pick someone else
      nextCommitteeMember = allCommittee.find((c) => c.id !== currentAssignment.committee_member_id);
    }
  }

  if (!nextCommitteeMember) {
    return { success: false, message: 'No committee member available for transfer.' };
  }

  // Mark current assignment as transferred
  const { error: updateError } = await supabase
    .from('communication_assignments')
    .update({
      status: 'transferred',
      is_current: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId);

  if (updateError) {
    return { success: false, message: `Error updating assignment: ${updateError.message}` };
  }

  // Create new assignment
  const { error: insertError } = await supabase.from('communication_assignments').insert({
    member_id: member.id,
    committee_member_id: nextCommitteeMember.id,
    status: 'pending',
    is_current: true,
  });

  if (insertError) {
    return { success: false, message: `Error creating new assignment: ${insertError.message}` };
  }

  // Log transfer in history
  await supabase.from('transfer_history').insert({
    member_id: member.id,
    from_committee_member_id: currentAssignment.committee_member_id,
    to_committee_member_id: nextCommitteeMember.id,
    reason: 'unresponsive_30_days',
  });

  return {
    success: true,
    message: `Transferred ${member.first_name} ${member.last_name} from ${currentAssignment.committee_member?.first_name} to ${nextCommitteeMember.first_name}.`,
    transfersCompleted: 1,
  };
}

/**
 * Finds all assignments that need to be auto-transferred (30+ days unresponsive)
 * and performs the transfers
 */
export async function processAutoTransfers(
  supabase: SupabaseClientType,
  thresholdDays: number = 30
): Promise<TransferResult> {
  // Get threshold from settings
  const { data: setting } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'unresponsive_threshold_days')
    .single();

  const threshold = setting ? parseInt(setting.setting_value) : thresholdDays;

  // Get all pending, current assignments
  const { data: pendingAssignments, error } = await supabase
    .from('communication_assignments')
    .select('*')
    .eq('status', 'pending')
    .eq('is_current', true);

  if (error) {
    return { success: false, message: `Error fetching assignments: ${error.message}` };
  }

  if (!pendingAssignments || pendingAssignments.length === 0) {
    return { success: true, message: 'No pending assignments to process.', transfersCompleted: 0 };
  }

  const now = new Date();
  let transfersCompleted = 0;
  const errors: string[] = [];

  for (const assignment of pendingAssignments) {
    const assignedDate = new Date(assignment.assigned_date);
    const daysSinceAssigned = differenceInDays(now, assignedDate);

    if (daysSinceAssigned >= threshold) {
      const result = await transferUnresponsiveMember(supabase, assignment.id);
      if (result.success) {
        transfersCompleted++;
      } else {
        errors.push(result.message);
      }
    }
  }

  if (errors.length > 0) {
    return {
      success: transfersCompleted > 0,
      message: `Completed ${transfersCompleted} transfers with ${errors.length} errors.`,
      transfersCompleted,
    };
  }

  return {
    success: true,
    message: `Completed ${transfersCompleted} auto-transfers.`,
    transfersCompleted,
  };
}
