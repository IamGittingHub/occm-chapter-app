import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const testAccess = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { authenticated: false };
    }

    const user = await ctx.db.get(userId);
    
    const memberByUserId = await ctx.db
      .query("committeeMembers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return {
      authenticated: true,
      userId,
      userEmail: user?.email,
      memberByUserId: memberByUserId ? {
        _id: memberByUserId._id,
        email: memberByUserId.email,
        isActive: memberByUserId.isActive,
        userId: memberByUserId.userId
      } : null
    };
  },
});
