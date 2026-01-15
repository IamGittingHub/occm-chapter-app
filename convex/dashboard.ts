import { query } from "./_generated/server";
import { requireCommitteeMember, isExampleEmail, requireOverseerOrAbove, getEffectiveRole } from "./lib/auth";
import { isSandboxMode, generateMockDashboardStats, generateMockPrayerAssignments, generateMockCommunicationAssignments } from "./lib/sandbox";

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
 * In sandbox mode (test mode + developer/overseer), returns mock data.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    // Check if sandbox mode is active
    const sandboxActive = await isSandboxMode(ctx, committeeMember);
    if (sandboxActive) {
      return generateMockDashboardStats();
    }

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
 * In sandbox mode (test mode + developer/overseer), returns mock data.
 */
export const getData = query({
  args: {},
  handler: async (ctx) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const { periodStart, periodEnd } = getPeriodDates(new Date());

    // Check if sandbox mode is active
    const sandboxActive = await isSandboxMode(ctx, committeeMember);
    if (sandboxActive) {
      // Return mock data for developers/overseers in test mode
      const mockPrayer = await generateMockPrayerAssignments(
        ctx,
        committeeMember._id,
        periodStart,
        periodEnd
      );
      const mockComm = await generateMockCommunicationAssignments(
        ctx,
        committeeMember._id
      );

      // Get total member count (real data for context)
      const totalMembers = await ctx.db
        .query("members")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .collect();
      const activeMemberCount = totalMembers.filter((m) => !m.isGraduated).length;

      return {
        prayerAssignments: mockPrayer.sort((a, b) =>
          (a.member?.lastName || "").localeCompare(b.member?.lastName || "")
        ),
        communicationAssignments: mockComm.sort((a, b) =>
          (a.member?.lastName || "").localeCompare(b.member?.lastName || "")
        ),
        activeMemberCount,
        periodStart,
      };
    }

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

/**
 * Get overseer dashboard - shows all committee members' progress.
 * Only accessible by overseers and developers.
 */
export const getOverseerDashboard = query({
  args: {},
  handler: async (ctx) => {
    await requireOverseerOrAbove(ctx);

    const { periodStart } = getPeriodDates(new Date());

    // Get all active committee members (excluding example accounts)
    const allCommitteeMembers = await ctx.db
      .query("committeeMembers")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    // Filter out example accounts
    const realCommitteeMembers = allCommitteeMembers.filter(
      (m) => !isExampleEmail(m.email)
    );

    // For Committee Progress list, only include regular committee members
    // (not developers or overseers who don't do outreach)
    const outreachMembers = realCommitteeMembers.filter((m) => {
      const role = getEffectiveRole(m);
      return role === "committee_member";
    });

    // Keep all members for count purposes
    const committeeMembers = realCommitteeMembers;

    // Get all current communication assignments
    const allCommAssignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .collect();

    // Get all prayer assignments for current period
    const allPrayerAssignments = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_periodStart", (q) => q.eq("periodStart", periodStart))
      .collect();

    // Build committee member progress data (only for outreach members)
    const committeeProgress = await Promise.all(
      outreachMembers.map(async (cm) => {
        // Get this member's communication assignments
        const commAssignments = allCommAssignments.filter(
          (a) => a.committeeMemberId === cm._id
        );
        const pendingComm = commAssignments.filter((a) => a.status === "pending");
        const successfulComm = commAssignments.filter((a) => a.status === "successful");

        // Calculate urgent contacts (20-30 days)
        const urgentComm = pendingComm.filter((a) => {
          const days = daysSince(a.assignedDate);
          return days >= 20 && days < 30;
        });

        // Calculate overdue contacts (30+ days)
        const overdueComm = pendingComm.filter((a) => daysSince(a.assignedDate) >= 30);

        // Get this member's prayer assignments
        const prayerAssignments = allPrayerAssignments.filter(
          (a) => a.committeeMemberId === cm._id
        );

        return {
          committeeMember: {
            _id: cm._id,
            firstName: cm.firstName,
            lastName: cm.lastName,
            email: cm.email,
            gender: cm.gender,
            role: getEffectiveRole(cm),
          },
          communication: {
            total: commAssignments.length,
            pending: pendingComm.length,
            successful: successfulComm.length,
            urgent: urgentComm.length,
            overdue: overdueComm.length,
            successRate:
              commAssignments.length > 0
                ? Math.round((successfulComm.length / commAssignments.length) * 100)
                : 0,
          },
          prayer: {
            total: prayerAssignments.length,
            claimed: prayerAssignments.filter((a) => a.isClaimed).length,
          },
        };
      })
    );

    // Sort by name
    committeeProgress.sort((a, b) =>
      a.committeeMember.lastName.localeCompare(b.committeeMember.lastName)
    );

    // Get members that haven't been contacted in 20+ days (across all committee members)
    const uncontactedMembers = await Promise.all(
      allCommAssignments
        .filter((a) => a.status === "pending" && daysSince(a.assignedDate) >= 20)
        .map(async (a) => {
          const member = await ctx.db.get(a.memberId);
          const assignedTo = committeeMembers.find(
            (cm) => cm._id === a.committeeMemberId
          );
          return {
            member,
            assignedTo: assignedTo
              ? `${assignedTo.firstName} ${assignedTo.lastName}`
              : "Unknown",
            daysSinceAssigned: daysSince(a.assignedDate),
            status: a.status,
          };
        })
    );

    // Sort by days since assigned (most overdue first)
    uncontactedMembers.sort((a, b) => b.daysSinceAssigned - a.daysSinceAssigned);

    // Overall stats
    const totalPending = allCommAssignments.filter((a) => a.status === "pending").length;
    const totalSuccessful = allCommAssignments.filter((a) => a.status === "successful").length;
    const totalUrgent = allCommAssignments.filter((a) => {
      const days = daysSince(a.assignedDate);
      return a.status === "pending" && days >= 20 && days < 30;
    }).length;
    const totalOverdue = allCommAssignments.filter(
      (a) => a.status === "pending" && daysSince(a.assignedDate) >= 30
    ).length;

    return {
      committeeProgress,
      uncontactedMembers: uncontactedMembers.slice(0, 20), // Limit to top 20
      overallStats: {
        // Count of members who do outreach (excludes developers/overseers)
        totalCommitteeMembers: outreachMembers.length,
        totalCommunicationAssignments: allCommAssignments.length,
        totalPending,
        totalSuccessful,
        totalUrgent,
        totalOverdue,
        overallSuccessRate:
          allCommAssignments.length > 0
            ? Math.round((totalSuccessful / allCommAssignments.length) * 100)
            : 0,
        totalPrayerAssignments: allPrayerAssignments.length,
      },
      periodStart,
    };
  },
});
