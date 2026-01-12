import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireCommitteeMember } from "./lib/auth";
import { Id } from "./_generated/dataModel";

// Contact method validator
const contactMethodValidator = v.union(
  v.literal("text"),
  v.literal("call"),
  v.literal("email"),
  v.literal("in_person"),
  v.literal("other")
);

/**
 * Get logs for a specific assignment.
 */
export const getByAssignment = query({
  args: { assignmentId: v.id("communicationAssignments") },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const logs = await ctx.db
      .query("communicationLogs")
      .withIndex("by_assignmentId", (q) => q.eq("assignmentId", args.assignmentId))
      .collect();

    // Sort by contact date descending (most recent first)
    return logs.sort((a, b) => b.contactDate - a.contactDate);
  },
});

/**
 * Get logs by committee member.
 */
export const getByCommitteeMember = query({
  args: { committeeMemberId: v.id("committeeMembers") },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const logs = await ctx.db
      .query("communicationLogs")
      .withIndex("by_committeeMemberId", (q) =>
        q.eq("committeeMemberId", args.committeeMemberId)
      )
      .collect();

    return logs.sort((a, b) => b.contactDate - a.contactDate);
  },
});

/**
 * Get my recent logs (current user).
 */
export const getMyRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const logs = await ctx.db
      .query("communicationLogs")
      .withIndex("by_committeeMemberId", (q) =>
        q.eq("committeeMemberId", committeeMember._id)
      )
      .collect();

    // Sort and limit
    const sorted = logs.sort((a, b) => b.contactDate - a.contactDate);
    const limit = args.limit ?? 10;
    return sorted.slice(0, limit);
  },
});

/**
 * Create a new communication log entry.
 */
export const create = mutation({
  args: {
    assignmentId: v.id("communicationAssignments"),
    contactMethod: v.optional(contactMethodValidator),
    notes: v.optional(v.string()),
    wasSuccessful: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    // Verify assignment exists and belongs to user
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    if (assignment.committeeMemberId !== committeeMember._id) {
      throw new Error("You can only log contact for your own assignments");
    }

    const now = Date.now();

    // Create the log
    const logId = await ctx.db.insert("communicationLogs", {
      assignmentId: args.assignmentId,
      committeeMemberId: committeeMember._id,
      contactDate: now,
      contactMethod: args.contactMethod,
      notes: args.notes,
      wasSuccessful: args.wasSuccessful ?? false,
      createdAt: now,
    });

    // Update assignment's last contact attempt
    await ctx.db.patch(args.assignmentId, {
      lastContactAttempt: now,
      updatedAt: now,
    });

    // If successful, update assignment status
    if (args.wasSuccessful) {
      await ctx.db.patch(args.assignmentId, {
        status: "successful",
        updatedAt: now,
      });
    }

    return logId;
  },
});

/**
 * Update a log entry.
 */
export const update = mutation({
  args: {
    id: v.id("communicationLogs"),
    contactMethod: v.optional(contactMethodValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const log = await ctx.db.get(args.id);
    if (!log) {
      throw new Error("Log not found");
    }

    if (log.committeeMemberId !== committeeMember._id) {
      throw new Error("You can only update your own logs");
    }

    const { id, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length > 0) {
      await ctx.db.patch(id, filteredUpdates);
    }
  },
});

/**
 * Delete a log entry.
 */
export const remove = mutation({
  args: { id: v.id("communicationLogs") },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const log = await ctx.db.get(args.id);
    if (!log) {
      throw new Error("Log not found");
    }

    if (log.committeeMemberId !== committeeMember._id) {
      throw new Error("You can only delete your own logs");
    }

    await ctx.db.delete(args.id);
  },
});
