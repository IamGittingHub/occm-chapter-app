import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

/**
 * Migration helper: Update foreign key references after base table import.
 *
 * After importing base tables (members, committeeMembers) with legacyId,
 * this updates the foreign key references in dependent tables.
 */
export const updatePrayerAssignmentRefs = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all prayer assignments with legacy IDs
    const assignments = await ctx.db.query("prayerAssignments").collect();

    let updatedCount = 0;

    for (const assignment of assignments) {
      if (!assignment.legacyMemberId && !assignment.legacyCommitteeMemberId) {
        continue; // Already migrated or no legacy refs
      }

      const updates: Record<string, unknown> = {};

      // Find member by legacy ID
      if (assignment.legacyMemberId) {
        const member = await ctx.db
          .query("members")
          .withIndex("by_legacyId", (q) =>
            q.eq("legacyId", assignment.legacyMemberId)
          )
          .first();

        if (member) {
          updates.memberId = member._id;
        }
      }

      // Find committee member by legacy ID
      if (assignment.legacyCommitteeMemberId) {
        const committeeMember = await ctx.db
          .query("committeeMembers")
          .withIndex("by_legacyId", (q) =>
            q.eq("legacyId", assignment.legacyCommitteeMemberId)
          )
          .first();

        if (committeeMember) {
          updates.committeeMemberId = committeeMember._id;
        }
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(assignment._id, updates);
        updatedCount++;
      }
    }

    return { updated: updatedCount };
  },
});

export const updateCommunicationAssignmentRefs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const assignments = await ctx.db.query("communicationAssignments").collect();

    let updatedCount = 0;

    for (const assignment of assignments) {
      if (!assignment.legacyMemberId && !assignment.legacyCommitteeMemberId) {
        continue;
      }

      const updates: Record<string, unknown> = {};

      if (assignment.legacyMemberId) {
        const member = await ctx.db
          .query("members")
          .withIndex("by_legacyId", (q) =>
            q.eq("legacyId", assignment.legacyMemberId)
          )
          .first();

        if (member) {
          updates.memberId = member._id;
        }
      }

      if (assignment.legacyCommitteeMemberId) {
        const committeeMember = await ctx.db
          .query("committeeMembers")
          .withIndex("by_legacyId", (q) =>
            q.eq("legacyId", assignment.legacyCommitteeMemberId)
          )
          .first();

        if (committeeMember) {
          updates.committeeMemberId = committeeMember._id;
        }
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(assignment._id, updates);
        updatedCount++;
      }
    }

    return { updated: updatedCount };
  },
});

export const updateCommunicationLogRefs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("communicationLogs").collect();

    let updatedCount = 0;

    for (const log of logs) {
      if (!log.legacyAssignmentId && !log.legacyCommitteeMemberId) {
        continue;
      }

      const updates: Record<string, unknown> = {};

      if (log.legacyAssignmentId) {
        const assignment = await ctx.db
          .query("communicationAssignments")
          .withIndex("by_legacyId", (q) =>
            q.eq("legacyId", log.legacyAssignmentId)
          )
          .first();

        if (assignment) {
          updates.assignmentId = assignment._id;
        }
      }

      if (log.legacyCommitteeMemberId) {
        const committeeMember = await ctx.db
          .query("committeeMembers")
          .withIndex("by_legacyId", (q) =>
            q.eq("legacyId", log.legacyCommitteeMemberId)
          )
          .first();

        if (committeeMember) {
          updates.committeeMemberId = committeeMember._id;
        }
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(log._id, updates);
        updatedCount++;
      }
    }

    return { updated: updatedCount };
  },
});

export const updateTransferHistoryRefs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const transfers = await ctx.db.query("transferHistory").collect();

    let updatedCount = 0;

    for (const transfer of transfers) {
      if (
        !transfer.legacyMemberId &&
        !transfer.legacyFromCommitteeMemberId &&
        !transfer.legacyToCommitteeMemberId
      ) {
        continue;
      }

      const updates: Record<string, unknown> = {};

      if (transfer.legacyMemberId) {
        const member = await ctx.db
          .query("members")
          .withIndex("by_legacyId", (q) =>
            q.eq("legacyId", transfer.legacyMemberId)
          )
          .first();

        if (member) {
          updates.memberId = member._id;
        }
      }

      if (transfer.legacyFromCommitteeMemberId) {
        const fromCm = await ctx.db
          .query("committeeMembers")
          .withIndex("by_legacyId", (q) =>
            q.eq("legacyId", transfer.legacyFromCommitteeMemberId)
          )
          .first();

        if (fromCm) {
          updates.fromCommitteeMemberId = fromCm._id;
        }
      }

      if (transfer.legacyToCommitteeMemberId) {
        const toCm = await ctx.db
          .query("committeeMembers")
          .withIndex("by_legacyId", (q) =>
            q.eq("legacyId", transfer.legacyToCommitteeMemberId)
          )
          .first();

        if (toCm) {
          updates.toCommitteeMemberId = toCm._id;
        }
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(transfer._id, updates);
        updatedCount++;
      }
    }

    return { updated: updatedCount };
  },
});

/**
 * Run all foreign key reference updates.
 */
export const runAllRefUpdates = internalMutation({
  args: {},
  handler: async (ctx) => {
    // This would need to be split into separate scheduled runs
    // due to Convex function timeout limits
    console.log("Run migrations separately using scheduler");
    return { message: "Use scheduler to run migrations" };
  },
});

/**
 * Verify migration: Check for any records with missing references.
 */
export const verifyMigration = mutation({
  args: {},
  handler: async (ctx) => {
    const issues: string[] = [];

    // Check prayer assignments
    const prayerAssignments = await ctx.db.query("prayerAssignments").collect();
    for (const pa of prayerAssignments) {
      const member = await ctx.db.get(pa.memberId);
      const cm = await ctx.db.get(pa.committeeMemberId);
      if (!member) {
        issues.push(`PrayerAssignment ${pa._id} has missing member`);
      }
      if (!cm) {
        issues.push(`PrayerAssignment ${pa._id} has missing committee member`);
      }
    }

    // Check communication assignments
    const commAssignments = await ctx.db.query("communicationAssignments").collect();
    for (const ca of commAssignments) {
      const member = await ctx.db.get(ca.memberId);
      const cm = await ctx.db.get(ca.committeeMemberId);
      if (!member) {
        issues.push(`CommunicationAssignment ${ca._id} has missing member`);
      }
      if (!cm) {
        issues.push(`CommunicationAssignment ${ca._id} has missing committee member`);
      }
    }

    // Check communication logs
    const logs = await ctx.db.query("communicationLogs").collect();
    for (const log of logs) {
      const assignment = await ctx.db.get(log.assignmentId);
      const cm = await ctx.db.get(log.committeeMemberId);
      if (!assignment) {
        issues.push(`CommunicationLog ${log._id} has missing assignment`);
      }
      if (!cm) {
        issues.push(`CommunicationLog ${log._id} has missing committee member`);
      }
    }

    // Check transfer history
    const transfers = await ctx.db.query("transferHistory").collect();
    for (const t of transfers) {
      const member = await ctx.db.get(t.memberId);
      const fromCm = await ctx.db.get(t.fromCommitteeMemberId);
      const toCm = await ctx.db.get(t.toCommitteeMemberId);
      if (!member) {
        issues.push(`TransferHistory ${t._id} has missing member`);
      }
      if (!fromCm) {
        issues.push(`TransferHistory ${t._id} has missing fromCommitteeMember`);
      }
      if (!toCm) {
        issues.push(`TransferHistory ${t._id} has missing toCommitteeMember`);
      }
    }

    return {
      valid: issues.length === 0,
      issueCount: issues.length,
      issues: issues.slice(0, 50), // Limit to first 50 issues
    };
  },
});

/**
 * Get migration stats: record counts per table.
 */
export const getMigrationStats = mutation({
  args: {},
  handler: async (ctx) => {
    const committeeMembers = await ctx.db.query("committeeMembers").collect();
    const members = await ctx.db.query("members").collect();
    const prayerAssignments = await ctx.db.query("prayerAssignments").collect();
    const commAssignments = await ctx.db.query("communicationAssignments").collect();
    const commLogs = await ctx.db.query("communicationLogs").collect();
    const transfers = await ctx.db.query("transferHistory").collect();
    const settings = await ctx.db.query("appSettings").collect();

    return {
      committeeMembers: committeeMembers.length,
      members: members.length,
      prayerAssignments: prayerAssignments.length,
      communicationAssignments: commAssignments.length,
      communicationLogs: commLogs.length,
      transferHistory: transfers.length,
      appSettings: settings.length,
    };
  },
});

/**
 * Clean up legacy ID fields after migration is verified.
 * WARNING: Only run this after verifying all data is correct!
 */
export const removeLegacyIds = internalMutation({
  args: { tableName: v.string() },
  handler: async (ctx, args) => {
    // This is a placeholder - in practice you would update the schema
    // to remove the legacy fields, then run a migration
    console.log(`Would remove legacy IDs from ${args.tableName}`);
    return { message: "Update schema to remove legacy fields" };
  },
});

// ============================================
// BULK IMPORT MUTATIONS (handle FK resolution)
// ============================================

/**
 * Import prayer assignments with legacy ID resolution.
 * Call this after importing members and committeeMembers base tables.
 */
export const importPrayerAssignments = internalMutation({
  args: {
    data: v.array(v.object({
      legacyId: v.optional(v.string()),
      legacyMemberId: v.string(),
      legacyCommitteeMemberId: v.string(),
      bucketNumber: v.number(),
      periodStart: v.string(),
      periodEnd: v.string(),
      isClaimed: v.boolean(),
      claimedAt: v.optional(v.number()),
      createdAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Build lookup maps for efficient FK resolution
    const members = await ctx.db.query("members").collect();
    const memberMap = new Map(members.map(m => [m.legacyId, m._id]));

    const committeeMembers = await ctx.db.query("committeeMembers").collect();
    const cmMap = new Map(committeeMembers.map(cm => [cm.legacyId, cm._id]));

    let inserted = 0;
    let skipped = 0;

    for (const row of args.data) {
      const memberId = memberMap.get(row.legacyMemberId);
      const committeeMemberId = cmMap.get(row.legacyCommitteeMemberId);

      if (!memberId || !committeeMemberId) {
        console.log(`Skipping prayer assignment - missing FK: member=${row.legacyMemberId}, cm=${row.legacyCommitteeMemberId}`);
        skipped++;
        continue;
      }

      await ctx.db.insert("prayerAssignments", {
        legacyId: row.legacyId,
        legacyMemberId: row.legacyMemberId,
        legacyCommitteeMemberId: row.legacyCommitteeMemberId,
        memberId,
        committeeMemberId,
        bucketNumber: row.bucketNumber,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        isClaimed: row.isClaimed,
        claimedAt: row.claimedAt,
        createdAt: row.createdAt,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});

/**
 * Import communication assignments with legacy ID resolution.
 */
export const importCommunicationAssignments = internalMutation({
  args: {
    data: v.array(v.object({
      legacyId: v.optional(v.string()),
      legacyMemberId: v.string(),
      legacyCommitteeMemberId: v.string(),
      assignedDate: v.number(),
      status: v.union(v.literal("pending"), v.literal("successful"), v.literal("transferred")),
      lastContactAttempt: v.optional(v.number()),
      isCurrent: v.boolean(),
      isClaimed: v.boolean(),
      claimedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db.query("members").collect();
    const memberMap = new Map(members.map(m => [m.legacyId, m._id]));

    const committeeMembers = await ctx.db.query("committeeMembers").collect();
    const cmMap = new Map(committeeMembers.map(cm => [cm.legacyId, cm._id]));

    let inserted = 0;
    let skipped = 0;

    for (const row of args.data) {
      const memberId = memberMap.get(row.legacyMemberId);
      const committeeMemberId = cmMap.get(row.legacyCommitteeMemberId);

      if (!memberId || !committeeMemberId) {
        console.log(`Skipping comm assignment - missing FK: member=${row.legacyMemberId}, cm=${row.legacyCommitteeMemberId}`);
        skipped++;
        continue;
      }

      await ctx.db.insert("communicationAssignments", {
        legacyId: row.legacyId,
        legacyMemberId: row.legacyMemberId,
        legacyCommitteeMemberId: row.legacyCommitteeMemberId,
        memberId,
        committeeMemberId,
        assignedDate: row.assignedDate,
        status: row.status,
        lastContactAttempt: row.lastContactAttempt,
        isCurrent: row.isCurrent,
        isClaimed: row.isClaimed,
        claimedAt: row.claimedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});

/**
 * Import communication logs with legacy ID resolution.
 */
export const importCommunicationLogs = internalMutation({
  args: {
    data: v.array(v.object({
      legacyId: v.optional(v.string()),
      legacyAssignmentId: v.string(),
      legacyCommitteeMemberId: v.string(),
      contactDate: v.number(),
      contactMethod: v.optional(v.string()),
      notes: v.optional(v.string()),
      wasSuccessful: v.boolean(),
      createdAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const assignments = await ctx.db.query("communicationAssignments").collect();
    const assignmentMap = new Map(assignments.map(a => [a.legacyId, a._id]));

    const committeeMembers = await ctx.db.query("committeeMembers").collect();
    const cmMap = new Map(committeeMembers.map(cm => [cm.legacyId, cm._id]));

    let inserted = 0;
    let skipped = 0;

    for (const row of args.data) {
      const assignmentId = assignmentMap.get(row.legacyAssignmentId);
      const committeeMemberId = cmMap.get(row.legacyCommitteeMemberId);

      if (!assignmentId || !committeeMemberId) {
        console.log(`Skipping comm log - missing FK: assignment=${row.legacyAssignmentId}, cm=${row.legacyCommitteeMemberId}`);
        skipped++;
        continue;
      }

      // Cast contactMethod to the proper type
      const contactMethod = row.contactMethod as "text" | "call" | "email" | "in_person" | "other" | undefined;

      await ctx.db.insert("communicationLogs", {
        legacyId: row.legacyId,
        legacyAssignmentId: row.legacyAssignmentId,
        legacyCommitteeMemberId: row.legacyCommitteeMemberId,
        assignmentId,
        committeeMemberId,
        contactDate: row.contactDate,
        contactMethod,
        notes: row.notes,
        wasSuccessful: row.wasSuccessful,
        createdAt: row.createdAt,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});

/**
 * Import transfer history with legacy ID resolution.
 */
export const importTransferHistory = internalMutation({
  args: {
    data: v.array(v.object({
      legacyId: v.optional(v.string()),
      legacyMemberId: v.string(),
      legacyFromCommitteeMemberId: v.string(),
      legacyToCommitteeMemberId: v.string(),
      reason: v.optional(v.string()),
      transferredAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db.query("members").collect();
    const memberMap = new Map(members.map(m => [m.legacyId, m._id]));

    const committeeMembers = await ctx.db.query("committeeMembers").collect();
    const cmMap = new Map(committeeMembers.map(cm => [cm.legacyId, cm._id]));

    let inserted = 0;
    let skipped = 0;

    for (const row of args.data) {
      const memberId = memberMap.get(row.legacyMemberId);
      const fromCommitteeMemberId = cmMap.get(row.legacyFromCommitteeMemberId);
      const toCommitteeMemberId = cmMap.get(row.legacyToCommitteeMemberId);

      if (!memberId || !fromCommitteeMemberId || !toCommitteeMemberId) {
        console.log(`Skipping transfer - missing FK: member=${row.legacyMemberId}`);
        skipped++;
        continue;
      }

      await ctx.db.insert("transferHistory", {
        legacyId: row.legacyId,
        legacyMemberId: row.legacyMemberId,
        legacyFromCommitteeMemberId: row.legacyFromCommitteeMemberId,
        legacyToCommitteeMemberId: row.legacyToCommitteeMemberId,
        memberId,
        fromCommitteeMemberId,
        toCommitteeMemberId,
        reason: row.reason,
        transferredAt: row.transferredAt,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});

// ============================================
// PUBLIC MUTATION WRAPPERS (for migration script)
// ============================================
// These are public mutations that wrap the internal ones
// They are only used during migration and can be removed after

export const importPrayerAssignmentsPublic = mutation({
  args: {
    data: v.array(v.object({
      legacyId: v.optional(v.string()),
      legacyMemberId: v.string(),
      legacyCommitteeMemberId: v.string(),
      bucketNumber: v.number(),
      periodStart: v.string(),
      periodEnd: v.string(),
      isClaimed: v.boolean(),
      claimedAt: v.optional(v.number()),
      createdAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Build lookup maps for efficient FK resolution
    const members = await ctx.db.query("members").collect();
    const memberMap = new Map(members.map(m => [m.legacyId, m._id]));

    const committeeMembers = await ctx.db.query("committeeMembers").collect();
    const cmMap = new Map(committeeMembers.map(cm => [cm.legacyId, cm._id]));

    let inserted = 0;
    let skipped = 0;

    for (const row of args.data) {
      const memberId = memberMap.get(row.legacyMemberId);
      const committeeMemberId = cmMap.get(row.legacyCommitteeMemberId);

      if (!memberId || !committeeMemberId) {
        skipped++;
        continue;
      }

      await ctx.db.insert("prayerAssignments", {
        legacyId: row.legacyId,
        legacyMemberId: row.legacyMemberId,
        legacyCommitteeMemberId: row.legacyCommitteeMemberId,
        memberId,
        committeeMemberId,
        bucketNumber: row.bucketNumber,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        isClaimed: row.isClaimed,
        claimedAt: row.claimedAt,
        createdAt: row.createdAt,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});

export const importCommunicationAssignmentsPublic = mutation({
  args: {
    data: v.array(v.object({
      legacyId: v.optional(v.string()),
      legacyMemberId: v.string(),
      legacyCommitteeMemberId: v.string(),
      assignedDate: v.number(),
      status: v.string(),
      lastContactAttempt: v.optional(v.number()),
      isCurrent: v.boolean(),
      isClaimed: v.boolean(),
      claimedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db.query("members").collect();
    const memberMap = new Map(members.map(m => [m.legacyId, m._id]));

    const committeeMembers = await ctx.db.query("committeeMembers").collect();
    const cmMap = new Map(committeeMembers.map(cm => [cm.legacyId, cm._id]));

    let inserted = 0;
    let skipped = 0;

    for (const row of args.data) {
      const memberId = memberMap.get(row.legacyMemberId);
      const committeeMemberId = cmMap.get(row.legacyCommitteeMemberId);

      if (!memberId || !committeeMemberId) {
        skipped++;
        continue;
      }

      // Cast status to the proper type
      const status = row.status as "pending" | "successful" | "transferred";

      await ctx.db.insert("communicationAssignments", {
        legacyId: row.legacyId,
        legacyMemberId: row.legacyMemberId,
        legacyCommitteeMemberId: row.legacyCommitteeMemberId,
        memberId,
        committeeMemberId,
        assignedDate: row.assignedDate,
        status,
        lastContactAttempt: row.lastContactAttempt,
        isCurrent: row.isCurrent,
        isClaimed: row.isClaimed,
        claimedAt: row.claimedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});

export const importCommunicationLogsPublic = mutation({
  args: {
    data: v.array(v.object({
      legacyId: v.optional(v.string()),
      legacyAssignmentId: v.string(),
      legacyCommitteeMemberId: v.string(),
      contactDate: v.number(),
      contactMethod: v.optional(v.string()),
      notes: v.optional(v.string()),
      wasSuccessful: v.boolean(),
      createdAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const assignments = await ctx.db.query("communicationAssignments").collect();
    const assignmentMap = new Map(assignments.map(a => [a.legacyId, a._id]));

    const committeeMembers = await ctx.db.query("committeeMembers").collect();
    const cmMap = new Map(committeeMembers.map(cm => [cm.legacyId, cm._id]));

    let inserted = 0;
    let skipped = 0;

    for (const row of args.data) {
      const assignmentId = assignmentMap.get(row.legacyAssignmentId);
      const committeeMemberId = cmMap.get(row.legacyCommitteeMemberId);

      if (!assignmentId || !committeeMemberId) {
        skipped++;
        continue;
      }

      // Cast contactMethod to the proper type
      const contactMethod = row.contactMethod as "text" | "call" | "email" | "in_person" | "other" | undefined;

      await ctx.db.insert("communicationLogs", {
        legacyId: row.legacyId,
        legacyAssignmentId: row.legacyAssignmentId,
        legacyCommitteeMemberId: row.legacyCommitteeMemberId,
        assignmentId,
        committeeMemberId,
        contactDate: row.contactDate,
        contactMethod,
        notes: row.notes,
        wasSuccessful: row.wasSuccessful,
        createdAt: row.createdAt,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});

export const importTransferHistoryPublic = mutation({
  args: {
    data: v.array(v.object({
      legacyId: v.optional(v.string()),
      legacyMemberId: v.string(),
      legacyFromCommitteeMemberId: v.string(),
      legacyToCommitteeMemberId: v.string(),
      reason: v.optional(v.string()),
      transferredAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db.query("members").collect();
    const memberMap = new Map(members.map(m => [m.legacyId, m._id]));

    const committeeMembers = await ctx.db.query("committeeMembers").collect();
    const cmMap = new Map(committeeMembers.map(cm => [cm.legacyId, cm._id]));

    let inserted = 0;
    let skipped = 0;

    for (const row of args.data) {
      const memberId = memberMap.get(row.legacyMemberId);
      const fromCommitteeMemberId = cmMap.get(row.legacyFromCommitteeMemberId);
      const toCommitteeMemberId = cmMap.get(row.legacyToCommitteeMemberId);

      if (!memberId || !fromCommitteeMemberId || !toCommitteeMemberId) {
        skipped++;
        continue;
      }

      await ctx.db.insert("transferHistory", {
        legacyId: row.legacyId,
        legacyMemberId: row.legacyMemberId,
        legacyFromCommitteeMemberId: row.legacyFromCommitteeMemberId,
        legacyToCommitteeMemberId: row.legacyToCommitteeMemberId,
        memberId,
        fromCommitteeMemberId,
        toCommitteeMemberId,
        reason: row.reason,
        transferredAt: row.transferredAt,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});
