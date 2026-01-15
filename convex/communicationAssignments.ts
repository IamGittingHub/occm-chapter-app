import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireCommitteeMember, isExampleEmail } from "./lib/auth";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { isSandboxMode, generateMockCommunicationAssignments } from "./lib/sandbox";

// Status validator
const statusValidator = v.union(
  v.literal("pending"),
  v.literal("successful"),
  v.literal("transferred")
);

// Helper to shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Helper to calculate days since a timestamp
function daysSince(timestamp: number): number {
  const now = Date.now();
  return Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
}

/**
 * Get communication assignments for the current user.
 */
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const assignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_committeeMember_isCurrent", (q) =>
        q.eq("committeeMemberId", committeeMember._id).eq("isCurrent", true)
      )
      .collect();

    // Join with members and communication logs
    const assignmentsWithDetails = await Promise.all(
      assignments.map(async (a) => {
        const member = await ctx.db.get(a.memberId);
        const logs = await ctx.db
          .query("communicationLogs")
          .withIndex("by_assignmentId", (q) => q.eq("assignmentId", a._id))
          .collect();
        const daysSinceAssigned = daysSince(a.assignedDate);
        return { ...a, member, communicationLogs: logs, daysSinceAssigned };
      })
    );

    // Sort by member last name
    return assignmentsWithDetails.sort((a, b) =>
      (a.member?.lastName || "").localeCompare(b.member?.lastName || "")
    );
  },
});

/**
 * Get all current communication assignments.
 */
export const listCurrent = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    const assignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .collect();

    // Join with details
    const withDetails = await Promise.all(
      assignments.map(async (a) => {
        const member = await ctx.db.get(a.memberId);
        const committeeMember = await ctx.db.get(a.committeeMemberId);
        const logs = await ctx.db
          .query("communicationLogs")
          .withIndex("by_assignmentId", (q) => q.eq("assignmentId", a._id))
          .collect();
        const daysSinceAssigned = daysSince(a.assignedDate);
        return { ...a, member, committeeMember, communicationLogs: logs, daysSinceAssigned };
      })
    );

    return withDetails;
  },
});

/**
 * Check if current assignments exist.
 */
export const existsCurrent = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    const assignment = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .first();

    return !!assignment;
  },
});

/**
 * Get stats for dashboard.
 */
export const getMyStats = query({
  args: {},
  handler: async (ctx) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const assignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_committeeMember_isCurrent", (q) =>
        q.eq("committeeMemberId", committeeMember._id).eq("isCurrent", true)
      )
      .collect();

    const pending = assignments.filter((a) => a.status === "pending").length;
    const successful = assignments.filter((a) => a.status === "successful").length;

    // Urgent: pending and 20-30 days since assigned
    const urgent = assignments.filter((a) => {
      if (a.status !== "pending") return false;
      const days = daysSince(a.assignedDate);
      return days >= 20 && days < 30;
    }).length;

    // Approaching threshold: pending and 25+ days
    const approaching = assignments.filter((a) => {
      if (a.status !== "pending") return false;
      return daysSince(a.assignedDate) >= 25;
    }).length;

    return { total: assignments.length, pending, successful, urgent, approaching };
  },
});

/**
 * Get global stats for communication assignments.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    const assignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .collect();

    return {
      total: assignments.length,
      pending: assignments.filter((a) => a.status === "pending").length,
      successful: assignments.filter((a) => a.status === "successful").length,
    };
  },
});

/**
 * Get assignments for the current user (with member and log details).
 * In sandbox mode (test mode + developer/overseer), returns mock data.
 */
export const getMyAssignments = query({
  args: {},
  handler: async (ctx) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    // Check if sandbox mode is active
    const sandboxActive = await isSandboxMode(ctx, committeeMember);
    if (sandboxActive) {
      // Return mock data for developers/overseers in test mode
      const mockAssignments = await generateMockCommunicationAssignments(
        ctx,
        committeeMember._id
      );
      return mockAssignments.sort((a, b) =>
        (a.member?.lastName || "").localeCompare(b.member?.lastName || "")
      );
    }

    const assignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_committeeMember_isCurrent", (q) =>
        q.eq("committeeMemberId", committeeMember._id).eq("isCurrent", true)
      )
      .collect();

    // Join with members and logs
    const assignmentsWithDetails = await Promise.all(
      assignments.map(async (a) => {
        const member = await ctx.db.get(a.memberId);
        const logs = await ctx.db
          .query("communicationLogs")
          .withIndex("by_assignmentId", (q) => q.eq("assignmentId", a._id))
          .collect();
        const daysSinceAssigned = daysSince(a.assignedDate);
        return { ...a, member, logs, daysSinceAssigned };
      })
    );

    // Sort by member last name
    return assignmentsWithDetails.sort((a, b) =>
      (a.member?.lastName || "").localeCompare(b.member?.lastName || "")
    );
  },
});

/**
 * Generate initial communication assignments.
 */
export const generateInitial = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    // Check if current assignments already exist
    const existing = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .first();

    if (existing) {
      throw new Error("Communication assignments already exist");
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
    let createdCount = 0;

    // Assign male members to male committee (round-robin)
    if (maleCommittee.length > 0) {
      for (let i = 0; i < maleMembers.length; i++) {
        const committeeMember = maleCommittee[i % maleCommittee.length];
        await ctx.db.insert("communicationAssignments", {
          memberId: maleMembers[i]._id,
          committeeMemberId: committeeMember._id,
          assignedDate: now,
          status: "pending",
          isCurrent: true,
          isClaimed: false,
          createdAt: now,
          updatedAt: now,
        });
        createdCount++;
      }
    }

    // Assign female members to female committee (round-robin)
    if (femaleCommittee.length > 0) {
      for (let i = 0; i < femaleMembers.length; i++) {
        const committeeMember = femaleCommittee[i % femaleCommittee.length];
        await ctx.db.insert("communicationAssignments", {
          memberId: femaleMembers[i]._id,
          committeeMemberId: committeeMember._id,
          assignedDate: now,
          status: "pending",
          isCurrent: true,
          isClaimed: false,
          createdAt: now,
          updatedAt: now,
        });
        createdCount++;
      }
    }

    return { count: createdCount };
  },
});

/**
 * Assign a new member for communication (finds committee with fewest assignments).
 */
export const assignNewMember = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    // Get the member
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }
    if (!member.isActive || member.isGraduated) {
      throw new Error("Member is not active or is graduated");
    }

    // Check if already has current assignment
    const existing = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_member_isCurrent", (q) =>
        q.eq("memberId", args.memberId).eq("isCurrent", true)
      )
      .first();

    if (existing) {
      throw new Error("Member already has a current communication assignment");
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

    // Count pending assignments per committee member
    const assignmentCounts: Record<string, number> = {};
    for (const cm of sameGenderCommittee) {
      assignmentCounts[cm._id] = 0;
    }

    const currentAssignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_status_isCurrent", (q) =>
        q.eq("status", "pending").eq("isCurrent", true)
      )
      .collect();

    for (const ca of currentAssignments) {
      if (assignmentCounts[ca.committeeMemberId] !== undefined) {
        assignmentCounts[ca.committeeMemberId]++;
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

    const now = Date.now();

    // Create assignment
    await ctx.db.insert("communicationAssignments", {
      memberId: args.memberId,
      committeeMemberId: selectedCommitteeMember._id,
      assignedDate: now,
      status: "pending",
      isCurrent: true,
      isClaimed: false,
      createdAt: now,
      updatedAt: now,
    });

    return { committeeMemberId: selectedCommitteeMember._id };
  },
});

/**
 * Mark an assignment as successful.
 * In sandbox mode with mock IDs, returns success without writing to database.
 */
export const markSuccessful = mutation({
  args: {
    assignmentId: v.id("communicationAssignments"),
    notes: v.optional(v.string()),
    contactMethod: v.optional(
      v.union(
        v.literal("text"),
        v.literal("call"),
        v.literal("email"),
        v.literal("in_person"),
        v.literal("other")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    // Check for sandbox mode mock ID
    const idStr = args.assignmentId as string;
    if (idStr.startsWith("mock_")) {
      // Sandbox mode - return success without writing
      return { success: true, sandbox: true };
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.committeeMemberId !== committeeMember._id) {
      throw new Error("You can only mark your own assignments as successful");
    }

    const now = Date.now();

    // Log the successful contact
    await ctx.db.insert("communicationLogs", {
      assignmentId: args.assignmentId,
      committeeMemberId: committeeMember._id,
      contactDate: now,
      contactMethod: args.contactMethod,
      notes: args.notes,
      wasSuccessful: true,
      createdAt: now,
    });

    // Update assignment status
    await ctx.db.patch(args.assignmentId, {
      status: "successful",
      lastContactAttempt: now,
      updatedAt: now,
    });

    return { success: true, sandbox: false };
  },
});

/**
 * Transfer an unresponsive member to next available committee member.
 * In sandbox mode with mock IDs, returns success without writing to database.
 */
export const transfer = mutation({
  args: { assignmentId: v.id("communicationAssignments") },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    // Check for sandbox mode mock ID
    const idStr = args.assignmentId as string;
    if (idStr.startsWith("mock_")) {
      // Sandbox mode - return success without writing
      return { toCommitteeMemberId: "mock_committee_0" as any, sandbox: true };
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.status !== "pending") {
      throw new Error("Only pending assignments can be transferred");
    }
    if (!assignment.isCurrent) {
      throw new Error("Assignment is not current");
    }
    if (assignment.isClaimed) {
      throw new Error("Claimed assignments cannot be transferred");
    }

    const member = await ctx.db.get(assignment.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Get committee members of same gender
    const allCommittee = await ctx.db
      .query("committeeMembers")
      .withIndex("by_gender_isActive", (q) =>
        q.eq("gender", member.gender).eq("isActive", true)
      )
      .collect();
    const sameGenderCommittee = allCommittee.filter((c) => !isExampleEmail(c.email));

    if (sameGenderCommittee.length <= 1) {
      throw new Error("No other committee members to transfer to");
    }

    // Get transfer history for this member
    const transferHistory = await ctx.db
      .query("transferHistory")
      .withIndex("by_memberId", (q) => q.eq("memberId", assignment.memberId))
      .collect();

    const triedCommitteeIds = new Set(
      transferHistory.map((t) => t.fromCommitteeMemberId)
    );
    triedCommitteeIds.add(assignment.committeeMemberId); // Add current

    // Find next committee member who hasn't tried
    let nextCommitteeMember = sameGenderCommittee.find(
      (cm) => !triedCommitteeIds.has(cm._id)
    );

    // If all have tried, find one with fewest attempts
    if (!nextCommitteeMember) {
      const attemptCounts: Record<string, number> = {};
      for (const cm of sameGenderCommittee) {
        attemptCounts[cm._id] = 0;
      }
      for (const t of transferHistory) {
        if (attemptCounts[t.fromCommitteeMemberId] !== undefined) {
          attemptCounts[t.fromCommitteeMemberId]++;
        }
      }

      let minAttempts = Infinity;
      for (const cm of sameGenderCommittee) {
        if (cm._id !== assignment.committeeMemberId) {
          if (attemptCounts[cm._id] < minAttempts) {
            minAttempts = attemptCounts[cm._id];
            nextCommitteeMember = cm;
          }
        }
      }
    }

    if (!nextCommitteeMember) {
      throw new Error("Could not find a committee member to transfer to");
    }

    const now = Date.now();

    // Mark old assignment as transferred
    await ctx.db.patch(args.assignmentId, {
      status: "transferred",
      isCurrent: false,
      updatedAt: now,
    });

    // Create new assignment
    await ctx.db.insert("communicationAssignments", {
      memberId: assignment.memberId,
      committeeMemberId: nextCommitteeMember._id,
      assignedDate: now,
      status: "pending",
      isCurrent: true,
      isClaimed: false,
      createdAt: now,
      updatedAt: now,
    });

    // Log the transfer
    await ctx.db.insert("transferHistory", {
      memberId: assignment.memberId,
      fromCommitteeMemberId: assignment.committeeMemberId,
      toCommitteeMemberId: nextCommitteeMember._id,
      reason: "manual_transfer",
      transferredAt: now,
    });

    return { toCommitteeMemberId: nextCommitteeMember._id };
  },
});

/**
 * Process auto-transfers for unresponsive members (30-day threshold).
 * Called by cron job.
 */
export const processAutoTransfers = internalMutation({
  args: { thresholdDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // Get threshold from settings or use default
    let threshold = args.thresholdDays ?? 30;

    const thresholdSetting = await ctx.db
      .query("appSettings")
      .withIndex("by_settingKey", (q) =>
        q.eq("settingKey", "unresponsive_threshold_days")
      )
      .first();

    if (thresholdSetting) {
      threshold = parseInt(thresholdSetting.settingValue, 10) || 30;
    }

    // Get all pending, current, non-claimed assignments
    const pendingAssignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_status_isCurrent", (q) =>
        q.eq("status", "pending").eq("isCurrent", true)
      )
      .collect();

    const eligibleForTransfer = pendingAssignments.filter(
      (a) => !a.isClaimed && daysSince(a.assignedDate) >= threshold
    );

    let transferredCount = 0;

    for (const assignment of eligibleForTransfer) {
      const member = await ctx.db.get(assignment.memberId);
      if (!member || !member.isActive || member.isGraduated) {
        continue; // Skip inactive members
      }

      // Get committee members of same gender
      const allCommittee = await ctx.db
        .query("committeeMembers")
        .withIndex("by_gender_isActive", (q) =>
          q.eq("gender", member.gender).eq("isActive", true)
        )
        .collect();
      const sameGenderCommittee = allCommittee.filter((c) => !isExampleEmail(c.email));

      if (sameGenderCommittee.length <= 1) {
        continue; // No one to transfer to
      }

      // Get transfer history
      const transferHistory = await ctx.db
        .query("transferHistory")
        .withIndex("by_memberId", (q) => q.eq("memberId", assignment.memberId))
        .collect();

      const triedCommitteeIds = new Set(
        transferHistory.map((t) => t.fromCommitteeMemberId)
      );
      triedCommitteeIds.add(assignment.committeeMemberId);

      // Find next committee member
      let nextCommitteeMember = sameGenderCommittee.find(
        (cm) => !triedCommitteeIds.has(cm._id)
      );

      if (!nextCommitteeMember) {
        // All have tried, find one with fewest attempts
        const attemptCounts: Record<string, number> = {};
        for (const cm of sameGenderCommittee) {
          attemptCounts[cm._id] = 0;
        }
        for (const t of transferHistory) {
          if (attemptCounts[t.fromCommitteeMemberId] !== undefined) {
            attemptCounts[t.fromCommitteeMemberId]++;
          }
        }

        let minAttempts = Infinity;
        for (const cm of sameGenderCommittee) {
          if (cm._id !== assignment.committeeMemberId) {
            if (attemptCounts[cm._id] < minAttempts) {
              minAttempts = attemptCounts[cm._id];
              nextCommitteeMember = cm;
            }
          }
        }
      }

      if (!nextCommitteeMember) {
        continue;
      }

      const now = Date.now();

      // Mark old assignment as transferred
      await ctx.db.patch(assignment._id, {
        status: "transferred",
        isCurrent: false,
        updatedAt: now,
      });

      // Create new assignment
      await ctx.db.insert("communicationAssignments", {
        memberId: assignment.memberId,
        committeeMemberId: nextCommitteeMember._id,
        assignedDate: now,
        status: "pending",
        isCurrent: true,
        isClaimed: false,
        createdAt: now,
        updatedAt: now,
      });

      // Log the transfer
      await ctx.db.insert("transferHistory", {
        memberId: assignment.memberId,
        fromCommitteeMemberId: assignment.committeeMemberId,
        toCommitteeMemberId: nextCommitteeMember._id,
        reason: "unresponsive_30_days",
        transferredAt: now,
      });

      transferredCount++;
    }

    return { transferred: transferredCount };
  },
});

/**
 * Manual trigger for auto-transfers.
 */
export const triggerAutoTransfers = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    await ctx.scheduler.runAfter(0, internal.communicationAssignments.processAutoTransfers, {});

    return { scheduled: true };
  },
});

/**
 * Claim a communication assignment.
 * In sandbox mode with mock IDs, returns success without writing to database.
 */
export const claim = mutation({
  args: { assignmentId: v.id("communicationAssignments") },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    // Check for sandbox mode mock ID
    const idStr = args.assignmentId as string;
    if (idStr.startsWith("mock_")) {
      // Sandbox mode - return success without writing
      return { success: true, sandbox: true };
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.committeeMemberId !== committeeMember._id) {
      throw new Error("You can only claim your own assignments");
    }

    if (assignment.isClaimed) {
      throw new Error("Assignment is already claimed");
    }

    await ctx.db.patch(args.assignmentId, {
      isClaimed: true,
      claimedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, sandbox: false };
  },
});

/**
 * Release a communication assignment claim.
 * In sandbox mode with mock IDs, returns success without writing to database.
 */
export const releaseClaim = mutation({
  args: { assignmentId: v.id("communicationAssignments") },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    // Check for sandbox mode mock ID
    const idStr = args.assignmentId as string;
    if (idStr.startsWith("mock_")) {
      // Sandbox mode - return success without writing
      return { success: true, sandbox: true };
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.committeeMemberId !== committeeMember._id) {
      throw new Error("You can only release claims on your own assignments");
    }

    if (!assignment.isClaimed) {
      throw new Error("Assignment is not claimed");
    }

    await ctx.db.patch(args.assignmentId, {
      isClaimed: false,
      claimedAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, sandbox: false };
  },
});

/**
 * DRY RUN: Preview what initial communication assignments would look like without creating them.
 * This is used for testing/sandbox mode.
 */
export const generateInitialDryRun = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    // Check if current assignments already exist
    const existing = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .first();

    if (existing) {
      return {
        wouldSucceed: false,
        reason: "Communication assignments already exist",
        assignments: [],
      };
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
      return {
        wouldSucceed: false,
        reason: "No active members to assign",
        assignments: [],
      };
    }
    if (committeeMembers.length === 0) {
      return {
        wouldSucceed: false,
        reason: "No active committee members to assign to",
        assignments: [],
      };
    }

    // Separate by gender (use deterministic sort for preview consistency)
    const maleMembers = members
      .filter((m) => m.gender === "male")
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
    const femaleMembers = members
      .filter((m) => m.gender === "female")
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
    const maleCommittee = committeeMembers
      .filter((c) => c.gender === "male")
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
    const femaleCommittee = committeeMembers
      .filter((c) => c.gender === "female")
      .sort((a, b) => a.lastName.localeCompare(b.lastName));

    const previewAssignments: Array<{
      memberName: string;
      memberGender: string;
      committeeMemberName: string;
    }> = [];

    // Preview male assignments
    if (maleCommittee.length > 0) {
      maleMembers.forEach((member, index) => {
        const committeeMember = maleCommittee[index % maleCommittee.length];
        previewAssignments.push({
          memberName: `${member.firstName} ${member.lastName}`,
          memberGender: "male",
          committeeMemberName: `${committeeMember.firstName} ${committeeMember.lastName}`,
        });
      });
    }

    // Preview female assignments
    if (femaleCommittee.length > 0) {
      femaleMembers.forEach((member, index) => {
        const committeeMember = femaleCommittee[index % femaleCommittee.length];
        previewAssignments.push({
          memberName: `${member.firstName} ${member.lastName}`,
          memberGender: "female",
          committeeMemberName: `${committeeMember.firstName} ${committeeMember.lastName}`,
        });
      });
    }

    return {
      wouldSucceed: true,
      reason: null,
      summary: {
        totalMembers: members.length,
        maleMembers: maleMembers.length,
        femaleMembers: femaleMembers.length,
        maleCommittee: maleCommittee.length,
        femaleCommittee: femaleCommittee.length,
      },
      assignments: previewAssignments,
    };
  },
});

/**
 * DRY RUN: Preview what auto-transfers would happen without making changes.
 * This is used for testing/sandbox mode.
 */
export const processAutoTransfersDryRun = query({
  args: { thresholdDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    // Get threshold from settings or use default
    let threshold = args.thresholdDays ?? 30;

    const thresholdSetting = await ctx.db
      .query("appSettings")
      .withIndex("by_settingKey", (q) =>
        q.eq("settingKey", "unresponsive_threshold_days")
      )
      .first();

    if (thresholdSetting) {
      threshold = parseInt(thresholdSetting.settingValue, 10) || 30;
    }

    // Get all pending, current, non-claimed assignments
    const pendingAssignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_status_isCurrent", (q) =>
        q.eq("status", "pending").eq("isCurrent", true)
      )
      .collect();

    const eligibleForTransfer = pendingAssignments.filter(
      (a) => !a.isClaimed && daysSince(a.assignedDate) >= threshold
    );

    const previewTransfers: Array<{
      memberName: string;
      fromCommitteeMember: string;
      toCommitteeMember: string;
      daysSinceAssigned: number;
      action: string;
    }> = [];

    for (const assignment of eligibleForTransfer) {
      const member = await ctx.db.get(assignment.memberId);
      if (!member || !member.isActive || member.isGraduated) {
        continue;
      }

      const fromCommittee = await ctx.db.get(assignment.committeeMemberId);
      const fromName = fromCommittee
        ? `${fromCommittee.firstName} ${fromCommittee.lastName}`
        : "Unknown";

      // Get committee members of same gender
      const allCommittee = await ctx.db
        .query("committeeMembers")
        .withIndex("by_gender_isActive", (q) =>
          q.eq("gender", member.gender).eq("isActive", true)
        )
        .collect();
      const sameGenderCommittee = allCommittee.filter((c) => !isExampleEmail(c.email));

      if (sameGenderCommittee.length <= 1) {
        previewTransfers.push({
          memberName: `${member.firstName} ${member.lastName}`,
          fromCommitteeMember: fromName,
          toCommitteeMember: "N/A",
          daysSinceAssigned: daysSince(assignment.assignedDate),
          action: "SKIPPED (no one else to transfer to)",
        });
        continue;
      }

      // Get transfer history
      const transferHistory = await ctx.db
        .query("transferHistory")
        .withIndex("by_memberId", (q) => q.eq("memberId", assignment.memberId))
        .collect();

      const triedCommitteeIds = new Set(
        transferHistory.map((t) => t.fromCommitteeMemberId)
      );
      triedCommitteeIds.add(assignment.committeeMemberId);

      // Find next committee member
      let nextCommitteeMember = sameGenderCommittee.find(
        (cm) => !triedCommitteeIds.has(cm._id)
      );

      let action = "TRANSFERS";

      if (!nextCommitteeMember) {
        // All have tried, find one with fewest attempts
        const attemptCounts: Record<string, number> = {};
        for (const cm of sameGenderCommittee) {
          attemptCounts[cm._id] = 0;
        }
        for (const t of transferHistory) {
          if (attemptCounts[t.fromCommitteeMemberId] !== undefined) {
            attemptCounts[t.fromCommitteeMemberId]++;
          }
        }

        let minAttempts = Infinity;
        for (const cm of sameGenderCommittee) {
          if (cm._id !== assignment.committeeMemberId) {
            if (attemptCounts[cm._id] < minAttempts) {
              minAttempts = attemptCounts[cm._id];
              nextCommitteeMember = cm;
            }
          }
        }

        if (nextCommitteeMember) {
          action = "TRANSFERS (all have tried, picking least attempts)";
        }
      }

      if (!nextCommitteeMember) {
        previewTransfers.push({
          memberName: `${member.firstName} ${member.lastName}`,
          fromCommitteeMember: fromName,
          toCommitteeMember: "N/A",
          daysSinceAssigned: daysSince(assignment.assignedDate),
          action: "SKIPPED (could not find committee member)",
        });
        continue;
      }

      const toName = `${nextCommitteeMember.firstName} ${nextCommitteeMember.lastName}`;

      previewTransfers.push({
        memberName: `${member.firstName} ${member.lastName}`,
        fromCommitteeMember: fromName,
        toCommitteeMember: toName,
        daysSinceAssigned: daysSince(assignment.assignedDate),
        action,
      });
    }

    const transferCount = previewTransfers.filter((t) =>
      t.action.startsWith("TRANSFERS")
    ).length;
    const skippedCount = previewTransfers.filter((t) =>
      t.action.startsWith("SKIPPED")
    ).length;

    return {
      wouldSucceed: true,
      thresholdDays: threshold,
      summary: {
        totalPending: pendingAssignments.length,
        eligibleForTransfer: eligibleForTransfer.length,
        wouldTransfer: transferCount,
        wouldSkip: skippedCount,
      },
      transfers: previewTransfers,
    };
  },
});

/**
 * Reset all communication assignments (admin action).
 */
export const resetAll = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    // Delete all communication logs
    const logs = await ctx.db.query("communicationLogs").collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }

    // Delete all transfer history
    const transfers = await ctx.db.query("transferHistory").collect();
    for (const t of transfers) {
      await ctx.db.delete(t._id);
    }

    // Delete all communication assignments
    const assignments = await ctx.db.query("communicationAssignments").collect();
    for (const a of assignments) {
      await ctx.db.delete(a._id);
    }

    return {
      deletedLogs: logs.length,
      deletedTransfers: transfers.length,
      deletedAssignments: assignments.length,
    };
  },
});

/**
 * Reset and regenerate communication assignments.
 * This deletes existing current assignments and creates new ones with current committee members.
 * Only regular committee members (not developers/overseers) receive assignments.
 */
export const resetAndRegenerate = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    // Delete existing current assignments
    const existingAssignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .collect();

    for (const a of existingAssignments) {
      await ctx.db.patch(a._id, {
        isCurrent: false,
        updatedAt: Date.now(),
      });
    }

    // Get active, non-graduated members
    const members = await ctx.db
      .query("members")
      .withIndex("by_isActive_isGraduated", (q) =>
        q.eq("isActive", true).eq("isGraduated", false)
      )
      .collect();

    // Get active committee members who do outreach (exclude developers/overseers)
    const allCommittee = await ctx.db
      .query("committeeMembers")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    // Filter: only committee_member role (not developer or overseer)
    const committeeMembers = allCommittee.filter((c) => {
      if (isExampleEmail(c.email)) return false;
      const role = c.role ?? "committee_member";
      return role === "committee_member";
    });

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
    let createdCount = 0;

    // Assign male members to male committee (round-robin)
    if (maleCommittee.length > 0) {
      for (let i = 0; i < maleMembers.length; i++) {
        const committeeMember = maleCommittee[i % maleCommittee.length];
        await ctx.db.insert("communicationAssignments", {
          memberId: maleMembers[i]._id,
          committeeMemberId: committeeMember._id,
          assignedDate: now,
          status: "pending",
          isCurrent: true,
          isClaimed: false,
          createdAt: now,
          updatedAt: now,
        });
        createdCount++;
      }
    }

    // Assign female members to female committee (round-robin)
    if (femaleCommittee.length > 0) {
      for (let i = 0; i < femaleMembers.length; i++) {
        const committeeMember = femaleCommittee[i % femaleCommittee.length];
        await ctx.db.insert("communicationAssignments", {
          memberId: femaleMembers[i]._id,
          committeeMemberId: committeeMember._id,
          assignedDate: now,
          status: "pending",
          isCurrent: true,
          isClaimed: false,
          createdAt: now,
          updatedAt: now,
        });
        createdCount++;
      }
    }

    return {
      deletedCount: existingAssignments.length,
      createdCount,
      maleAssignments: maleMembers.length,
      femaleAssignments: femaleMembers.length,
      committeeMembers: committeeMembers.map((c) => `${c.firstName} ${c.lastName}`),
    };
  },
});
