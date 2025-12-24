import { PrayerAssignmentInsert } from '@/types/database';
import { startOfMonth, endOfMonth, format, addMonths } from 'date-fns';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientType = any;

interface RotationResult {
  success: boolean;
  message: string;
  assignmentsCreated?: number;
}

/**
 * Rotates prayer bucket assignments to the next month
 * - Gets previous month's assignments
 * - Rotates bucket numbers: bucket N becomes bucket N+1, last bucket becomes bucket 1
 * - Reassigns members to committee members based on new bucket numbers
 * - Creates new records for the new month
 */
export async function rotatePrayerBuckets(
  supabase: SupabaseClientType,
  targetDate: Date = new Date()
): Promise<RotationResult> {
  const newPeriodStart = startOfMonth(targetDate);
  const newPeriodEnd = endOfMonth(targetDate);
  const newPeriodStartStr = format(newPeriodStart, 'yyyy-MM-dd');
  const newPeriodEndStr = format(newPeriodEnd, 'yyyy-MM-dd');

  // Get previous month
  const previousMonth = addMonths(newPeriodStart, -1);
  const prevPeriodStartStr = format(startOfMonth(previousMonth), 'yyyy-MM-dd');

  // Check if assignments already exist for new period
  const { data: existingAssignments } = await supabase
    .from('prayer_assignments')
    .select('id')
    .eq('period_start', newPeriodStartStr)
    .limit(1);

  if (existingAssignments && existingAssignments.length > 0) {
    return {
      success: false,
      message: `Prayer assignments already exist for ${format(newPeriodStart, 'MMMM yyyy')}.`,
    };
  }

  // Get previous month's assignments with member and committee info
  const { data: prevAssignments, error: prevError } = await supabase
    .from('prayer_assignments')
    .select(`
      *,
      member:members(*),
      committee_member:committee_members(*)
    `)
    .eq('period_start', prevPeriodStartStr);

  if (prevError) {
    return { success: false, message: `Error fetching previous assignments: ${prevError.message}` };
  }

  if (!prevAssignments || prevAssignments.length === 0) {
    return {
      success: false,
      message: `No prayer assignments found for ${format(previousMonth, 'MMMM yyyy')}. Generate initial assignments first.`,
    };
  }

  // Get active committee members
  const { data: activeCommittee, error: committeeError } = await supabase
    .from('committee_members')
    .select('*')
    .eq('is_active', true);

  if (committeeError) {
    return { success: false, message: `Error fetching committee: ${committeeError.message}` };
  }

  // Separate committee by gender
  const maleCommittee = activeCommittee?.filter((c) => c.gender === 'male') || [];
  const femaleCommittee = activeCommittee?.filter((c) => c.gender === 'female') || [];

  // Sort by some consistent order (e.g., by id) to maintain rotation
  maleCommittee.sort((a, b) => a.id.localeCompare(b.id));
  femaleCommittee.sort((a, b) => a.id.localeCompare(b.id));

  const newAssignments: PrayerAssignmentInsert[] = [];

  // Process each previous assignment
  for (const prev of prevAssignments) {
    // Skip if member is no longer active or has graduated
    if (!prev.member || !prev.member.is_active || prev.member.is_graduated) {
      continue;
    }

    const gender = prev.member.gender;
    const committee = gender === 'male' ? maleCommittee : femaleCommittee;

    if (committee.length === 0) {
      continue; // Skip if no committee members of this gender
    }

    // Rotate bucket: increment by 1, wrap around
    const maxBucket = committee.length;
    const newBucket = prev.bucket_number >= maxBucket ? 1 : prev.bucket_number + 1;

    // Map new bucket to committee member (bucket 1 -> committee[0], bucket 2 -> committee[1], etc.)
    const newCommitteeMember = committee[(newBucket - 1) % committee.length];

    newAssignments.push({
      member_id: prev.member_id,
      committee_member_id: newCommitteeMember.id,
      bucket_number: newBucket,
      period_start: newPeriodStartStr,
      period_end: newPeriodEndStr,
    });
  }

  if (newAssignments.length === 0) {
    return {
      success: false,
      message: 'No active members to assign for the new period.',
    };
  }

  // Insert new assignments
  const { error: insertError } = await supabase.from('prayer_assignments').insert(newAssignments);

  if (insertError) {
    return { success: false, message: `Error creating new assignments: ${insertError.message}` };
  }

  // Update app settings with current rotation month
  await supabase
    .from('app_settings')
    .upsert({
      setting_key: 'current_rotation_month',
      setting_value: format(newPeriodStart, 'yyyy-MM'),
      updated_at: new Date().toISOString(),
    });

  return {
    success: true,
    message: `Rotated prayer assignments for ${format(newPeriodStart, 'MMMM yyyy')}. Created ${newAssignments.length} assignments.`,
    assignmentsCreated: newAssignments.length,
  };
}
