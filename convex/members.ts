import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireCommitteeMember } from "./lib/auth";
import { Doc, Id } from "./_generated/dataModel";
import { Gender, Grade } from "./schema";

// Validators
const genderValidator = v.union(v.literal("male"), v.literal("female"));
const gradeValidator = v.union(
  v.literal("freshman"),
  v.literal("sophomore"),
  v.literal("junior"),
  v.literal("senior"),
  v.literal("grad"),
  v.literal("unknown")
);

/**
 * List all members, ordered by last name.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    const members = await ctx.db.query("members").collect();

    // Sort by lastName (Convex doesn't support ORDER BY in queries directly)
    return members.sort((a, b) => a.lastName.localeCompare(b.lastName));
  },
});

/**
 * List active, non-graduated members.
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    const members = await ctx.db
      .query("members")
      .withIndex("by_isActive_isGraduated", (q) =>
        q.eq("isActive", true).eq("isGraduated", false)
      )
      .collect();

    return members.sort((a, b) => a.lastName.localeCompare(b.lastName));
  },
});

/**
 * List active members by gender.
 */
export const listActiveByGender = query({
  args: { gender: genderValidator },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const members = await ctx.db
      .query("members")
      .withIndex("by_gender_isActive_isGraduated", (q) =>
        q.eq("gender", args.gender).eq("isActive", true).eq("isGraduated", false)
      )
      .collect();

    return members.sort((a, b) => a.lastName.localeCompare(b.lastName));
  },
});

/**
 * Get a single member by ID.
 */
export const getById = query({
  args: { id: v.id("members") },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);
    return await ctx.db.get(args.id);
  },
});

/**
 * Get member counts/stats.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    const allMembers = await ctx.db.query("members").collect();

    const total = allMembers.length;
    const active = allMembers.filter(
      (m) => m.isActive && !m.isGraduated
    ).length;
    const newMembers = allMembers.filter(
      (m) => m.isNewMember && m.isActive && !m.isGraduated
    ).length;
    const graduated = allMembers.filter((m) => m.isGraduated).length;
    const male = allMembers.filter(
      (m) => m.gender === "male" && m.isActive && !m.isGraduated
    ).length;
    const female = allMembers.filter(
      (m) => m.gender === "female" && m.isActive && !m.isGraduated
    ).length;

    return { total, active, newMembers, graduated, male, female };
  },
});

/**
 * Create a new member.
 */
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    gender: genderValidator,
    grade: gradeValidator,
    major: v.optional(v.string()),
    minor: v.optional(v.string()),
    church: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    studentId: v.optional(v.string()),
    isNewMember: v.optional(v.boolean()),
    expectedGraduation: v.optional(v.string()),
    wantsMentor: v.optional(v.boolean()),
    wantsToMentor: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const now = Date.now();

    const memberId = await ctx.db.insert("members", {
      firstName: args.firstName,
      lastName: args.lastName,
      gender: args.gender,
      grade: args.grade,
      major: args.major,
      minor: args.minor,
      church: args.church,
      dateOfBirth: args.dateOfBirth,
      email: args.email,
      phone: args.phone,
      studentId: args.studentId,
      isNewMember: args.isNewMember ?? false,
      expectedGraduation: args.expectedGraduation,
      wantsMentor: args.wantsMentor ?? false,
      wantsToMentor: args.wantsToMentor ?? false,
      notes: args.notes,
      isGraduated: false,
      isActive: true,
      isCommitteeMember: false, // Default - will be synced if they're a committee member
      createdAt: now,
      updatedAt: now,
    });

    return memberId;
  },
});

/**
 * Bulk create members (for CSV import).
 */
export const bulkCreate = mutation({
  args: {
    members: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        gender: genderValidator,
        grade: gradeValidator,
        major: v.optional(v.string()),
        minor: v.optional(v.string()),
        church: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        studentId: v.optional(v.string()),
        isNewMember: v.optional(v.boolean()),
        expectedGraduation: v.optional(v.string()),
        wantsMentor: v.optional(v.boolean()),
        wantsToMentor: v.optional(v.boolean()),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const now = Date.now();
    const createdIds: Id<"members">[] = [];

    for (const member of args.members) {
      const memberId = await ctx.db.insert("members", {
        firstName: member.firstName,
        lastName: member.lastName,
        gender: member.gender,
        grade: member.grade,
        major: member.major,
        minor: member.minor,
        church: member.church,
        dateOfBirth: member.dateOfBirth,
        email: member.email,
        phone: member.phone,
        studentId: member.studentId,
        isNewMember: member.isNewMember ?? false,
        expectedGraduation: member.expectedGraduation,
        wantsMentor: member.wantsMentor ?? false,
        wantsToMentor: member.wantsToMentor ?? false,
        notes: member.notes,
        isGraduated: false,
        isActive: true,
        isCommitteeMember: false, // Default - will be synced if they're a committee member
        createdAt: now,
        updatedAt: now,
      });
      createdIds.push(memberId);
    }

    return { count: createdIds.length, ids: createdIds };
  },
});

/**
 * Update a member.
 */
export const update = mutation({
  args: {
    id: v.id("members"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    gender: v.optional(genderValidator),
    grade: v.optional(gradeValidator),
    major: v.optional(v.string()),
    minor: v.optional(v.string()),
    church: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    studentId: v.optional(v.string()),
    isNewMember: v.optional(v.boolean()),
    expectedGraduation: v.optional(v.string()),
    wantsMentor: v.optional(v.boolean()),
    wantsToMentor: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    isGraduated: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const { id, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return; // No updates to apply
    }

    filteredUpdates.updatedAt = Date.now();

    await ctx.db.patch(id, filteredUpdates);
  },
});

/**
 * Mark a member as graduated.
 */
export const markGraduated = mutation({
  args: { id: v.id("members") },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    await ctx.db.patch(args.id, {
      isGraduated: true,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Toggle member active status.
 */
export const toggleActive = mutation({
  args: { id: v.id("members") },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new Error("Member not found");
    }

    await ctx.db.patch(args.id, {
      isActive: !member.isActive,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Set a member's outreach priority.
 * High priority = not attending regularly, needs more attention
 * Normal = default priority
 * Low priority = regular attender, lower outreach priority
 */
export const setPriority = mutation({
  args: {
    memberId: v.id("members"),
    priority: v.union(v.literal("high"), v.literal("normal"), v.literal("low")),
  },
  handler: async (ctx, { memberId, priority }) => {
    await requireCommitteeMember(ctx);

    const member = await ctx.db.get(memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    await ctx.db.patch(memberId, {
      priority,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a member permanently.
 */
export const remove = mutation({
  args: { id: v.id("members") },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    // Check if member exists
    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new Error("Member not found");
    }

    // Delete related records first (maintain referential integrity)
    // Note: In production, you might want to soft-delete instead

    // Delete prayer assignments
    const prayerAssignments = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.id))
      .collect();
    for (const pa of prayerAssignments) {
      await ctx.db.delete(pa._id);
    }

    // Delete communication logs for this member's assignments
    const commAssignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.id))
      .collect();
    for (const ca of commAssignments) {
      const logs = await ctx.db
        .query("communicationLogs")
        .withIndex("by_assignmentId", (q) => q.eq("assignmentId", ca._id))
        .collect();
      for (const log of logs) {
        await ctx.db.delete(log._id);
      }
      await ctx.db.delete(ca._id);
    }

    // Delete transfer history
    const transfers = await ctx.db
      .query("transferHistory")
      .withIndex("by_memberId", (q) => q.eq("memberId", args.id))
      .collect();
    for (const t of transfers) {
      await ctx.db.delete(t._id);
    }

    // Finally delete the member
    await ctx.db.delete(args.id);
  },
});

/**
 * Search members by name or email.
 */
export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const searchLower = args.searchTerm.toLowerCase();

    const allMembers = await ctx.db.query("members").collect();

    // Filter by search term (name or email)
    return allMembers.filter(
      (m) =>
        m.firstName.toLowerCase().includes(searchLower) ||
        m.lastName.toLowerCase().includes(searchLower) ||
        (m.email && m.email.toLowerCase().includes(searchLower))
    );
  },
});

/**
 * Create a member from migration data.
 * Used by the migration script to import from Supabase.
 */
export const createFromMigration = mutation({
  args: {
    legacyId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    gender: genderValidator,
    grade: gradeValidator,
    major: v.optional(v.string()),
    minor: v.optional(v.string()),
    church: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    studentId: v.optional(v.string()),
    isNewMember: v.boolean(),
    expectedGraduation: v.optional(v.string()),
    wantsMentor: v.boolean(),
    wantsToMentor: v.boolean(),
    notes: v.optional(v.string()),
    isGraduated: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if already migrated (by legacyId)
    const existing = await ctx.db
      .query("members")
      .withIndex("by_legacyId", (q) => q.eq("legacyId", args.legacyId))
      .first();

    if (existing) {
      return existing._id; // Already migrated
    }

    // Create new member
    return await ctx.db.insert("members", {
      legacyId: args.legacyId,
      firstName: args.firstName,
      lastName: args.lastName,
      gender: args.gender,
      grade: args.grade,
      major: args.major,
      minor: args.minor,
      church: args.church,
      dateOfBirth: args.dateOfBirth,
      email: args.email,
      phone: args.phone,
      studentId: args.studentId,
      isNewMember: args.isNewMember,
      expectedGraduation: args.expectedGraduation,
      wantsMentor: args.wantsMentor,
      wantsToMentor: args.wantsToMentor,
      notes: args.notes,
      isGraduated: args.isGraduated,
      isActive: args.isActive,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
  },
});
