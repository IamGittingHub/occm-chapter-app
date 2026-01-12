import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireCommitteeMember, requireNotSelf, isExampleEmail, autoLinkCommitteeMemberByEmail } from "./lib/auth";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

// Validators
const genderValidator = v.union(v.literal("male"), v.literal("female"));

/**
 * List all committee members, ordered by active status then last name.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    const members = await ctx.db.query("committeeMembers").collect();

    // Sort by isActive DESC, then lastName ASC
    return members.sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return b.isActive ? 1 : -1; // Active first
      }
      return a.lastName.localeCompare(b.lastName);
    });
  },
});

/**
 * List only active committee members.
 */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    const members = await ctx.db
      .query("committeeMembers")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    // Filter out example accounts
    const filtered = members.filter((m) => !isExampleEmail(m.email));

    return filtered.sort((a, b) => a.lastName.localeCompare(b.lastName));
  },
});

/**
 * List active committee members by gender.
 */
export const listActiveByGender = query({
  args: { gender: genderValidator },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const members = await ctx.db
      .query("committeeMembers")
      .withIndex("by_gender_isActive", (q) =>
        q.eq("gender", args.gender).eq("isActive", true)
      )
      .collect();

    // Filter out example accounts
    const filtered = members.filter((m) => !isExampleEmail(m.email));

    return filtered.sort((a, b) => a.lastName.localeCompare(b.lastName));
  },
});

/**
 * Get a single committee member by ID.
 */
export const getById = query({
  args: { id: v.id("committeeMembers") },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);
    return await ctx.db.get(args.id);
  },
});

/**
 * Get the current user's committee member profile.
 */
export const getCurrentMember = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    return await ctx.db
      .query("committeeMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

/**
 * Get committee member stats.
 */
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireCommitteeMember(ctx);

    const allMembers = await ctx.db.query("committeeMembers").collect();

    // Filter out example accounts for stats
    const realMembers = allMembers.filter((m) => !isExampleEmail(m.email));

    const total = realMembers.length;
    const active = realMembers.filter((m) => m.isActive && m.userId).length;
    const pendingInvites = realMembers.filter(
      (m) => !m.userId && !m.isActive
    ).length;
    const inactive = realMembers.filter((m) => m.userId && !m.isActive).length;

    return { total, active, pendingInvites, inactive };
  },
});

/**
 * Invite a new committee member (creates pending invite).
 */
export const invite = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    gender: genderValidator,
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCommitteeMember(ctx);

    const normalizedEmail = args.email.toLowerCase().trim();

    // Check if email already exists as active committee member
    const existingActive = await ctx.db
      .query("committeeMembers")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existingActive && existingActive.isActive) {
      throw new Error("A committee member with this email already exists");
    }

    const now = Date.now();

    // If there's an existing inactive member, update them
    if (existingActive) {
      await ctx.db.patch(existingActive._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        gender: args.gender,
        phone: args.phone,
        updatedAt: now,
      });
      return {
        success: true,
        message: `Invite updated for ${args.firstName} ${args.lastName}. They should visit the app and sign in with Google using ${normalizedEmail}.`,
      };
    }

    // Create new pending invite (no userId, not active)
    await ctx.db.insert("committeeMembers", {
      email: normalizedEmail,
      firstName: args.firstName,
      lastName: args.lastName,
      gender: args.gender,
      phone: args.phone,
      userId: undefined,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      message: `Invite created for ${args.firstName} ${args.lastName}. They should visit the app and sign in with Google using ${normalizedEmail}.`,
    };
  },
});

/**
 * Update a committee member's profile.
 */
export const update = mutation({
  args: {
    id: v.id("committeeMembers"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    gender: v.optional(genderValidator),
    phone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const { id, ...updates } = args;

    // Verify the target exists
    const target = await ctx.db.get(id);
    if (!target) {
      throw new Error("Committee member not found");
    }

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
 * Delete a committee member.
 */
export const remove = mutation({
  args: { id: v.id("committeeMembers") },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    // Prevent self-deletion
    requireNotSelf(committeeMember._id, args.id, "delete");

    // Verify the target exists
    const target = await ctx.db.get(args.id);
    if (!target) {
      throw new Error("Committee member not found");
    }

    // Delete the committee member
    // Note: Related assignments are NOT deleted - they're historical records
    await ctx.db.delete(args.id);
  },
});

/**
 * Auto-link user on authentication (called from auth callback).
 * This links a user to a pending invite by email.
 */
export const tryAutoLink = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    return await autoLinkCommitteeMemberByEmail(ctx, userId, args.email);
  },
});

/**
 * Link the current authenticated user to their pending committee member invite.
 * Reads the user's email from the auth system and auto-links.
 */
export const linkCurrentUserByEmail = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user email from the users table
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("User email not found");
    }

    const result = await autoLinkCommitteeMemberByEmail(ctx, userId, user.email);
    if (!result) {
      throw new Error("No pending invite found for your email");
    }

    return result;
  },
});

/**
 * Internal mutation for auto-linking during auth flow.
 * Called by the auth system after successful authentication.
 */
export const internalAutoLink = internalMutation({
  args: { userId: v.id("users"), email: v.string() },
  handler: async (ctx, args) => {
    return await autoLinkCommitteeMemberByEmail(ctx, args.userId, args.email);
  },
});

/**
 * Check if a user has committee member access (for auth guards).
 * Also checks by email for pending invites that need to be linked.
 */
export const hasAccess = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { hasAccess: false, reason: "Not authenticated" };
    }

    // First, check by userId (already linked)
    let member = await ctx.db
      .query("committeeMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (member) {
      if (!member.isActive) {
        return { hasAccess: false, reason: "Account is inactive" };
      }
      return { hasAccess: true, member };
    }

    // Not linked by userId - check if there's a pending invite by email
    // Get user email from the users table
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      return { hasAccess: false, reason: "Not a committee member", needsLink: true };
    }

    const normalizedEmail = user.email.toLowerCase().trim();

    // Find pending invite by email
    const pendingByEmail = await ctx.db
      .query("committeeMembers")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (pendingByEmail && !pendingByEmail.userId) {
      // Found a pending invite - user needs to complete linking
      return {
        hasAccess: false,
        reason: "Pending invite found - linking required",
        needsLink: true,
        pendingMemberId: pendingByEmail._id
      };
    }

    return { hasAccess: false, reason: "Not a committee member" };
  },
});

/**
 * Create a committee member from migration data.
 * Used by the migration script to import from Supabase.
 */
export const createFromMigration = mutation({
  args: {
    legacyId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    gender: genderValidator,
    phone: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if already migrated (by legacyId or email)
    const existingByLegacy = await ctx.db
      .query("committeeMembers")
      .withIndex("by_legacyId", (q) => q.eq("legacyId", args.legacyId))
      .first();

    if (existingByLegacy) {
      return existingByLegacy._id; // Already migrated
    }

    const existingByEmail = await ctx.db
      .query("committeeMembers")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingByEmail) {
      // Update with legacy ID for reference
      await ctx.db.patch(existingByEmail._id, { legacyId: args.legacyId });
      return existingByEmail._id;
    }

    // Create new committee member
    return await ctx.db.insert("committeeMembers", {
      legacyId: args.legacyId,
      email: args.email.toLowerCase(),
      firstName: args.firstName,
      lastName: args.lastName,
      gender: args.gender,
      phone: args.phone,
      userId: undefined,
      isActive: args.isActive,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
    });
  },
});
