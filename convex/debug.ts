import { query } from "./_generated/server";

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
