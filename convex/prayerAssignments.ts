import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireCommitteeMember, isExampleEmail } from "./lib/auth";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Helper to get period dates for a given month
function getPeriodDates(date: Date): { periodStart: string; periodEnd: string } {
  const year = date.getFullYear();
  const month = date.getMonth();

  // First day of month
  const start = new Date(year, month, 1);
  // Last day of month
  const end = new Date(year, month + 1, 0);

  const periodStart = start.toISOString().split("T")[0];
  const periodEnd = end.toISOString().split("T")[0];

  return { periodStart, periodEnd };
}

// Helper to shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get prayer assignments for the current user for a given period.
 */
export const getMine = query({
  args: { periodStart: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    // Default to current month
    const period = args.periodStart || getPeriodDates(new Date()).periodStart;

    const assignments = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_committeeMember_periodStart", (q) =>
        q.eq("committeeMemberId", committeeMember._id).eq("periodStart", period)
      )
      .collect();

    // Join with members
    const assignmentsWithMembers = await Promise.all(
      assignments.map(async (a) => {
        const member = await ctx.db.get(a.memberId);
        return { ...a, member };
      })
    );

    // Sort by member last name
    return assignmentsWithMembers.sort((a, b) =>
      (a.member?.lastName || "").localeCompare(b.member?.lastName || "")
    );
  },
});

/**
 * Get all prayer assignments for a period.
 */
export const listByPeriod = query({
  args: { periodStart: v.string() },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const assignments = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_periodStart", (q) => q.eq("periodStart", args.periodStart))
      .collect();

    // Join with members and committee members
    const withDetails = await Promise.all(
      assignments.map(async (a) => {
        const member = await ctx.db.get(a.memberId);
        const committeeMember = await ctx.db.get(a.committeeMemberId);
        return { ...a, member, committeeMember };
      })
    );

    return withDetails;
  },
});

/**
 * Check if assignments exist for a period.
 */
export const existsForPeriod = query({
  args: { periodStart: v.string() },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const assignment = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_periodStart", (q) => q.eq("periodStart", args.periodStart))
      .first();

    return !!assignment;
  },
});

/**
 * Generate initial prayer assignments for a month.
 * Gender-matches members to committee members and assigns bucket numbers.
 */
export const generateInitial = mutation({
  args: { targetDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const targetDateObj = args.targetDate ? new Date(args.targetDate) : new Date();
    const { periodStart, periodEnd } = getPeriodDates(targetDateObj);

    // Check if assignments already exist
    const existing = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_periodStart", (q) => q.eq("periodStart", periodStart))
      .first();

    if (existing) {
      throw new Error(`Prayer assignments already exist for ${periodStart}`);
    }

    // Get active, non-graduated members
    const members = await ctx.db
      .query("members")
      .withIndex("by_isActive_isGraduated", (q) =>
        q.eq("isActive", true).eq("isGraduated", false)
      )
      .collect();

    // Get active committee members (excluding example accounts)
    const allCommittee = await ctx.db
      .query("committeeMembers")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    const committeeMembers = allCommittee.filter((c) => !isExampleEmail(c.email));

    if (members.length === 0) {
      throw new Error("No active members to assign");
    }
    if (committeeMembers.length === 0) {
      throw new Error("No active committee members to assign to");
    }

    // Separate by gender
    const maleMembers = shuffleArray(members.filter((m) => m.gender === "male"));
    const femaleMembers = shuffleArray(members.filter((m) => m.gender === "female"));
    const maleCommittee = committeeMembers.filter((c) => c.gender === "male");
    const femaleCommittee = committeeMembers.filter((c) => c.gender === "female");

    const now = Date.now();
    const assignments: Array<{
      memberId: Id<"members">;
      committeeMemberId: Id<"committeeMembers">;
      bucketNumber: number;
      periodStart: string;
      periodEnd: string;
      isClaimed: boolean;
      createdAt: number;
    }> = [];

    // Assign male members to male committee
    if (maleCommittee.length > 0) {
      maleMembers.forEach((member, index) => {
        const bucketNumber = (index % maleCommittee.length) + 1;
        const committeeMember = maleCommittee[index % maleCommittee.length];
        assignments.push({
          memberId: member._id,
          committeeMemberId: committeeMember._id,
          bucketNumber,
          periodStart,
          periodEnd,
          isClaimed: false,
          createdAt: now,
        });
      });
    }

    // Assign female members to female committee
    if (femaleCommittee.length > 0) {
      femaleMembers.forEach((member, index) => {
        const bucketNumber = (index % femaleCommittee.length) + 1;
        const committeeMember = femaleCommittee[index % femaleCommittee.length];
        assignments.push({
          memberId: member._id,
          committeeMemberId: committeeMember._id,
          bucketNumber,
          periodStart,
          periodEnd,
          isClaimed: false,
          createdAt: now,
        });
      });
    }

    // Insert all assignments
    for (const assignment of assignments) {
      await ctx.db.insert("prayerAssignments", assignment);
    }

    return { count: assignments.length };
  },
});

/**
 * Assign a new member mid-month (finds committee member with fewest assignments).
 */
export const assignNewMember = mutation({
  args: { memberId: v.id("members"), targetDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const targetDateObj = args.targetDate ? new Date(args.targetDate) : new Date();
    const { periodStart, periodEnd } = getPeriodDates(targetDateObj);

    // Get the member
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }
    if (!member.isActive || member.isGraduated) {
      throw new Error("Member is not active or is graduated");
    }

    // Check if already assigned this period
    const existing = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_member_periodStart", (q) =>
        q.eq("memberId", args.memberId).eq("periodStart", periodStart)
      )
      .first();

    if (existing) {
      throw new Error("Member is already assigned for this period");
    }

    // Get active committee members of same gender
    const allCommittee = await ctx.db
      .query("committeeMembers")
      .withIndex("by_gender_isActive", (q) =>
        q.eq("gender", member.gender).eq("isActive", true)
      )
      .collect();
    const sameGenderCommittee = allCommittee.filter((c) => !isExampleEmail(c.email));

    if (sameGenderCommittee.length === 0) {
      throw new Error(`No active ${member.gender} committee members available`);
    }

    // Get current assignments for this period and gender
    const periodAssignments = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_periodStart", (q) => q.eq("periodStart", periodStart))
      .collect();

    // Count assignments per committee member
    const assignmentCounts: Record<string, number> = {};
    for (const cm of sameGenderCommittee) {
      assignmentCounts[cm._id] = 0;
    }
    for (const pa of periodAssignments) {
      if (assignmentCounts[pa.committeeMemberId] !== undefined) {
        assignmentCounts[pa.committeeMemberId]++;
      }
    }

    // Find committee member with fewest assignments
    let minCount = Infinity;
    let selectedCommitteeMember = sameGenderCommittee[0];
    for (const cm of sameGenderCommittee) {
      if (assignmentCounts[cm._id] < minCount) {
        minCount = assignmentCounts[cm._id];
        selectedCommitteeMember = cm;
      }
    }

    // Determine bucket number
    const bucketNumber = minCount + 1;

    // Create assignment
    await ctx.db.insert("prayerAssignments", {
      memberId: args.memberId,
      committeeMemberId: selectedCommitteeMember._id,
      bucketNumber,
      periodStart,
      periodEnd,
      isClaimed: false,
      createdAt: Date.now(),
    });

    return { committeeMemberId: selectedCommitteeMember._id, bucketNumber };
  },
});

/**
 * Rotate prayer buckets to a new month.
 * Bucket N -> N+1, wraps around, claimed assignments stay with same committee member.
 */
export const rotateBuckets = internalMutation({
  args: { targetDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const targetDateObj = args.targetDate ? new Date(args.targetDate) : new Date();
    const { periodStart: newPeriodStart, periodEnd: newPeriodEnd } =
      getPeriodDates(targetDateObj);

    // Get previous month
    const prevMonth = new Date(targetDateObj);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const { periodStart: prevPeriodStart } = getPeriodDates(prevMonth);

    // Check if new period already has assignments
    const existingNew = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_periodStart", (q) => q.eq("periodStart", newPeriodStart))
      .first();

    if (existingNew) {
      console.log(`Prayer assignments already exist for ${newPeriodStart}`);
      return { skipped: true, reason: "Already exists" };
    }

    // Get previous period assignments
    const prevAssignments = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_periodStart", (q) => q.eq("periodStart", prevPeriodStart))
      .collect();

    if (prevAssignments.length === 0) {
      console.log(`No previous assignments to rotate from ${prevPeriodStart}`);
      return { skipped: true, reason: "No previous assignments" };
    }

    // Get active committee members (excluding example accounts)
    const allCommittee = await ctx.db
      .query("committeeMembers")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    const activeCommittee = allCommittee.filter((c) => !isExampleEmail(c.email));

    // Separate by gender and sort by ID for consistent ordering
    const maleCommittee = activeCommittee
      .filter((c) => c.gender === "male")
      .sort((a, b) => a._id.localeCompare(b._id));
    const femaleCommittee = activeCommittee
      .filter((c) => c.gender === "female")
      .sort((a, b) => a._id.localeCompare(b._id));

    const now = Date.now();
    let createdCount = 0;

    for (const prevAssignment of prevAssignments) {
      // Get the member
      const member = await ctx.db.get(prevAssignment.memberId);
      if (!member || !member.isActive || member.isGraduated) {
        continue; // Skip inactive/graduated members
      }

      const sameGenderCommittee =
        member.gender === "male" ? maleCommittee : femaleCommittee;

      if (sameGenderCommittee.length === 0) {
        continue; // No committee members of this gender
      }

      let newBucketNumber: number;
      let newCommitteeMemberId: Id<"committeeMembers">;

      if (prevAssignment.isClaimed) {
        // Claimed: keep same committee member and bucket
        newBucketNumber = prevAssignment.bucketNumber;
        newCommitteeMemberId = prevAssignment.committeeMemberId;

        // Verify the committee member is still active
        const cm = await ctx.db.get(prevAssignment.committeeMemberId);
        if (!cm || !cm.isActive) {
          // Committee member no longer active, reassign
          const maxBucket = sameGenderCommittee.length;
          newBucketNumber = ((prevAssignment.bucketNumber - 1 + 1) % maxBucket) + 1;
          newCommitteeMemberId = sameGenderCommittee[newBucketNumber - 1]._id;
        }
      } else {
        // Not claimed: rotate bucket
        const maxBucket = sameGenderCommittee.length;
        newBucketNumber = ((prevAssignment.bucketNumber - 1 + 1) % maxBucket) + 1;
        newCommitteeMemberId = sameGenderCommittee[newBucketNumber - 1]._id;
      }

      await ctx.db.insert("prayerAssignments", {
        memberId: prevAssignment.memberId,
        committeeMemberId: newCommitteeMemberId,
        bucketNumber: newBucketNumber,
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
        isClaimed: prevAssignment.isClaimed,
        claimedAt: prevAssignment.isClaimed ? prevAssignment.claimedAt : undefined,
        createdAt: now,
      });

      createdCount++;
    }

    // Update app settings with current rotation month
    const existingSetting = await ctx.db
      .query("appSettings")
      .withIndex("by_settingKey", (q) => q.eq("settingKey", "current_rotation_month"))
      .first();

    if (existingSetting) {
      await ctx.db.patch(existingSetting._id, {
        settingValue: newPeriodStart.substring(0, 7), // YYYY-MM
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("appSettings", {
        settingKey: "current_rotation_month",
        settingValue: newPeriodStart.substring(0, 7),
        updatedAt: now,
      });
    }

    return { created: createdCount };
  },
});

/**
 * Manual rotation trigger (calls internal mutation).
 */
export const triggerRotation = mutation({
  args: { targetDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    // Schedule the internal mutation
    const result = await ctx.scheduler.runAfter(0, internal.prayerAssignments.rotateBuckets, {
      targetDate: args.targetDate,
    });

    return { scheduled: true };
  },
});

/**
 * Claim a prayer assignment (prevents rotation away from this committee member).
 */
export const claim = mutation({
  args: { assignmentId: v.id("prayerAssignments") },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Verify it's the user's own assignment
    if (assignment.committeeMemberId !== committeeMember._id) {
      throw new Error("You can only claim your own assignments");
    }

    if (assignment.isClaimed) {
      throw new Error("Assignment is already claimed");
    }

    await ctx.db.patch(args.assignmentId, {
      isClaimed: true,
      claimedAt: Date.now(),
    });
  },
});

/**
 * Release a prayer assignment claim.
 */
export const releaseClaim = mutation({
  args: { assignmentId: v.id("prayerAssignments") },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Verify it's the user's own assignment
    if (assignment.committeeMemberId !== committeeMember._id) {
      throw new Error("You can only release claims on your own assignments");
    }

    if (!assignment.isClaimed) {
      throw new Error("Assignment is not claimed");
    }

    await ctx.db.patch(args.assignmentId, {
      isClaimed: false,
      claimedAt: undefined,
    });
  },
});

/**
 * Reset all prayer assignments (admin action).
 */
export const resetAll = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    // Delete all prayer assignments
    const assignments = await ctx.db.query("prayerAssignments").collect();
    for (const a of assignments) {
      await ctx.db.delete(a._id);
    }

    return { deletedAssignments: assignments.length };
  },
});

/**
 * Get stats for prayer assignments.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    // Get current period
    const { periodStart } = getPeriodDates(new Date());

    // Check if assignments exist for current period
    const currentAssignments = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_periodStart", (q) => q.eq("periodStart", periodStart))
      .collect();

    return {
      total: currentAssignments.length,
      currentPeriod: periodStart,
    };
  },
});

/**
 * Get assignments for the current user (with member details).
 */
export const getMyAssignments = query({
  args: {},
  handler: async (ctx) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    // Get current period
    const { periodStart } = getPeriodDates(new Date());

    const assignments = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_committeeMember_periodStart", (q) =>
        q.eq("committeeMemberId", committeeMember._id).eq("periodStart", periodStart)
      )
      .collect();

    // Join with members
    const assignmentsWithMembers = await Promise.all(
      assignments.map(async (a) => {
        const member = await ctx.db.get(a.memberId);
        return { ...a, member };
      })
    );

    // Sort by member last name
    return assignmentsWithMembers.sort((a, b) =>
      (a.member?.lastName || "").localeCompare(b.member?.lastName || "")
    );
  },
});
