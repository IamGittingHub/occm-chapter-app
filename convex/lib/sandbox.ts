import { QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { getEffectiveRole } from "./auth";

/**
 * Check if sandbox mode is active for the current user.
 * Sandbox mode is enabled when:
 * 1. test_mode setting is "true"
 * 2. Current user is a developer or overseer (who don't have real assignments)
 */
export async function isSandboxMode(
  ctx: QueryCtx,
  committeeMember: Doc<"committeeMembers">
): Promise<boolean> {
  // Check if test mode is enabled
  const testModeSetting = await ctx.db
    .query("appSettings")
    .withIndex("by_settingKey", (q) => q.eq("settingKey", "test_mode"))
    .first();

  if (testModeSetting?.settingValue !== "true") {
    return false;
  }

  // Check if user is developer or overseer
  const role = getEffectiveRole(committeeMember);
  return role === "developer" || role === "overseer";
}

/**
 * Generate mock prayer assignments for sandbox mode.
 */
export async function generateMockPrayerAssignments(
  ctx: QueryCtx,
  committeeMemberId: Id<"committeeMembers">,
  periodStart: string,
  periodEnd: string
): Promise<Array<{
  _id: Id<"prayerAssignments">;
  memberId: Id<"members">;
  committeeMemberId: Id<"committeeMembers">;
  bucketNumber: number;
  periodStart: string;
  periodEnd: string;
  isClaimed: boolean;
  claimedAt?: number;
  createdAt: number;
  member: Doc<"members"> | null;
}>> {
  // Get some real members to create realistic mock assignments
  const members = await ctx.db
    .query("members")
    .withIndex("by_isActive_isGraduated", (q) =>
      q.eq("isActive", true).eq("isGraduated", false)
    )
    .take(15); // Get 15 members for mock prayer list

  const committeeMember = await ctx.db.get(committeeMemberId);

  // Filter by gender to match the committee member
  const genderMatchedMembers = members.filter(
    (m) => m.gender === committeeMember?.gender
  );

  // Take up to 8 members for realistic prayer list size
  const selectedMembers = genderMatchedMembers.slice(0, 8);

  const now = Date.now();

  return selectedMembers.map((member, index) => ({
    // Use member ID as fake assignment ID (prefixed to indicate mock)
    _id: `mock_prayer_${index}` as Id<"prayerAssignments">,
    memberId: member._id,
    committeeMemberId,
    bucketNumber: (index % 4) + 1,
    periodStart,
    periodEnd,
    isClaimed: index < 2, // First 2 are claimed for demo
    claimedAt: index < 2 ? now - 86400000 * 5 : undefined,
    createdAt: now - 86400000 * 10,
    member,
  }));
}

/**
 * Generate mock communication assignments for sandbox mode.
 */
export async function generateMockCommunicationAssignments(
  ctx: QueryCtx,
  committeeMemberId: Id<"committeeMembers">
): Promise<Array<{
  _id: Id<"communicationAssignments">;
  memberId: Id<"members">;
  committeeMemberId: Id<"committeeMembers">;
  assignedDate: number;
  status: "pending" | "successful" | "transferred";
  lastContactAttempt?: number;
  isCurrent: boolean;
  isClaimed: boolean;
  claimedAt?: number;
  createdAt: number;
  updatedAt: number;
  member: Doc<"members"> | null;
  communicationLogs: Array<Doc<"communicationLogs">>;
  daysSinceAssigned: number;
}>> {
  // Get some real members
  const members = await ctx.db
    .query("members")
    .withIndex("by_isActive_isGraduated", (q) =>
      q.eq("isActive", true).eq("isGraduated", false)
    )
    .take(20);

  const committeeMember = await ctx.db.get(committeeMemberId);

  // Filter by gender
  const genderMatchedMembers = members.filter(
    (m) => m.gender === committeeMember?.gender
  );

  // Take up to 10 members for realistic outreach list
  const selectedMembers = genderMatchedMembers.slice(0, 10);

  const now = Date.now();
  const dayMs = 86400000;

  return selectedMembers.map((member, index) => {
    // Vary the status and timing for realistic data
    let status: "pending" | "successful" | "transferred" = "pending";
    let assignedDaysAgo = 5 + index * 2; // Spread out assignment dates
    let lastContactAttempt: number | undefined;

    if (index < 3) {
      // First 3 are successful
      status = "successful";
      lastContactAttempt = now - dayMs * 2;
    } else if (index >= 7) {
      // Last 3 are urgent (20+ days)
      assignedDaysAgo = 22 + (index - 7) * 3;
    }

    const assignedDate = now - dayMs * assignedDaysAgo;

    return {
      _id: `mock_comm_${index}` as Id<"communicationAssignments">,
      memberId: member._id,
      committeeMemberId,
      assignedDate,
      status,
      lastContactAttempt,
      isCurrent: true,
      isClaimed: index === 0, // First one is claimed
      claimedAt: index === 0 ? now - dayMs * 3 : undefined,
      createdAt: assignedDate,
      updatedAt: now,
      member,
      communicationLogs: [], // Empty logs for simplicity
      daysSinceAssigned: assignedDaysAgo,
    };
  });
}

/**
 * Generate mock dashboard stats for sandbox mode.
 */
export function generateMockDashboardStats() {
  return {
    prayer: {
      total: 8,
      claimed: 2,
    },
    communication: {
      total: 10,
      pending: 7,
      successful: 3,
      urgent: 3,
      approaching: 2,
    },
    totalActiveMembers: 230,
  };
}
