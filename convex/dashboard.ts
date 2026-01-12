import { query } from "./_generated/server";
import { requireCommitteeMember, isExampleEmail } from "./lib/auth";

// Helper to get period dates for current month
function getPeriodDates(date: Date): { periodStart: string; periodEnd: string } {
  const year = date.getFullYear();
  const month = date.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  const periodStart = start.toISOString().split("T")[0];
  const periodEnd = end.toISOString().split("T")[0];

  return { periodStart, periodEnd };
}

// Helper to calculate days since a timestamp
function daysSince(timestamp: number): number {
  const now = Date.now();
  return Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
}

/**
 * Get comprehensive dashboard stats for current user.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const { periodStart } = getPeriodDates(new Date());

    // Get my prayer assignments
    const myPrayerAssignments = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_committeeMember_periodStart", (q) =>
        q.eq("committeeMemberId", committeeMember._id).eq("periodStart", periodStart)
      )
      .collect();

    // Get my communication assignments
    const myCommAssignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_committeeMember_isCurrent", (q) =>
        q.eq("committeeMemberId", committeeMember._id).eq("isCurrent", true)
      )
      .collect();

    // Communication stats
    const pendingComm = myCommAssignments.filter((a) => a.status === "pending");
    const successfulComm = myCommAssignments.filter((a) => a.status === "successful");

    // Urgent: pending and 20-30 days
    const urgentComm = pendingComm.filter((a) => {
      const days = daysSince(a.assignedDate);
      return days >= 20 && days < 30;
    });

    // Approaching threshold: 25+ days
    const approachingComm = pendingComm.filter((a) => daysSince(a.assignedDate) >= 25);

    // Total active members
    const allMembers = await ctx.db
      .query("members")
      .withIndex("by_isActive_isGraduated", (q) =>
        q.eq("isActive", true).eq("isGraduated", false)
      )
      .collect();

    return {
      prayer: {
        total: myPrayerAssignments.length,
        claimed: myPrayerAssignments.filter((a) => a.isClaimed).length,
      },
      communication: {
        total: myCommAssignments.length,
        pending: pendingComm.length,
        successful: successfulComm.length,
        urgent: urgentComm.length,
        approaching: approachingComm.length,
      },
      totalActiveMembers: allMembers.length,
    };
  },
});

/**
 * Get dashboard data with assignment details.
 */
export const getData = query({
  args: {},
  handler: async (ctx) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const { periodStart } = getPeriodDates(new Date());

    // Get my prayer assignments with members
    const myPrayerAssignments = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_committeeMember_periodStart", (q) =>
        q.eq("committeeMemberId", committeeMember._id).eq("periodStart", periodStart)
      )
      .collect();

    const prayerWithMembers = await Promise.all(
      myPrayerAssignments.map(async (pa) => {
        const member = await ctx.db.get(pa.memberId);
        return { ...pa, member };
      })
    );

    // Get my communication assignments with members and logs
    const myCommAssignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_committeeMember_isCurrent", (q) =>
        q.eq("committeeMemberId", committeeMember._id).eq("isCurrent", true)
      )
      .collect();

    const commWithDetails = await Promise.all(
      myCommAssignments.map(async (ca) => {
        const member = await ctx.db.get(ca.memberId);
        const logs = await ctx.db
          .query("communicationLogs")
          .withIndex("by_assignmentId", (q) => q.eq("assignmentId", ca._id))
          .collect();
        const daysSinceAssigned = daysSince(ca.assignedDate);
        return { ...ca, member, communicationLogs: logs, daysSinceAssigned };
      })
    );

    // Get total member count
    const totalMembers = await ctx.db
      .query("members")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const activeMemberCount = totalMembers.filter((m) => !m.isGraduated).length;

    return {
      prayerAssignments: prayerWithMembers.sort((a, b) =>
        (a.member?.lastName || "").localeCompare(b.member?.lastName || "")
      ),
      communicationAssignments: commWithDetails.sort((a, b) =>
        (a.member?.lastName || "").localeCompare(b.member?.lastName || "")
      ),
      activeMemberCount,
      periodStart,
    };
  },
});

/**
 * Get rotation countdown info.
 */
export const getRotationInfo = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    // Get current rotation month setting
    const currentRotationSetting = await ctx.db
      .query("appSettings")
      .withIndex("by_settingKey", (q) => q.eq("settingKey", "current_rotation_month"))
      .first();

    // Get rotation day setting
    const rotationDaySetting = await ctx.db
      .query("appSettings")
      .withIndex("by_settingKey", (q) => q.eq("settingKey", "rotation_day_of_month"))
      .first();

    const rotationDay = rotationDaySetting
      ? parseInt(rotationDaySetting.settingValue, 10)
      : 1;

    const currentMonth = new Date().toISOString().substring(0, 7);
    const lastRotation = currentRotationSetting?.settingValue || null;

    // Calculate next rotation date
    const now = new Date();
    let nextRotation = new Date(now.getFullYear(), now.getMonth(), rotationDay);

    if (nextRotation <= now) {
      // Next rotation is next month
      nextRotation = new Date(now.getFullYear(), now.getMonth() + 1, rotationDay);
    }

    const daysUntilRotation = Math.ceil(
      (nextRotation.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      currentMonth,
      lastRotation,
      nextRotationDate: nextRotation.toISOString().split("T")[0],
      daysUntilRotation,
      rotationDay,
    };
  },
});
