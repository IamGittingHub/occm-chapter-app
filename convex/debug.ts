import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Seed a committee member for testing (no auth required)
export const seedCommitteeMember = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    gender: v.union(v.literal("male"), v.literal("female")),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.toLowerCase().trim();

    // Check if already exists
    const existing = await ctx.db
      .query("committeeMembers")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing) {
      // Update to active if not already
      if (!existing.isActive) {
        await ctx.db.patch(existing._id, { isActive: false });
      }
      return { success: true, message: "Committee member already exists", id: existing._id };
    }

    const now = Date.now();
    const id = await ctx.db.insert("committeeMembers", {
      email: normalizedEmail,
      firstName: args.firstName,
      lastName: args.lastName,
      gender: args.gender,
      userId: undefined,
      isActive: false, // Will be activated when they sign in
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, message: "Committee member created", id };
  },
});

// Temporary debug query to check users table structure
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(10);
    return users;
  },
});

export const listCommitteeMembers = query({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query("committeeMembers").take(10);
    return members;
  },
});
