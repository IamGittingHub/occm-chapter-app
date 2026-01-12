import { QueryCtx, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "../_generated/dataModel";

/**
 * Get the authenticated user ID or throw if not authenticated.
 * Replaces Supabase's auth.getUser() check.
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthenticated: Please sign in to continue");
  }
  return userId;
}

/**
 * Get the authenticated committee member or throw if not an active member.
 * This replaces Supabase's is_active_committee_member() RLS function.
 */
export async function requireCommitteeMember(
  ctx: QueryCtx | MutationCtx
): Promise<{
  userId: Id<"users">;
  committeeMember: Doc<"committeeMembers">;
}> {
  const userId = await requireAuth(ctx);

  const committeeMember = await ctx.db
    .query("committeeMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (!committeeMember) {
    throw new Error(
      "Access denied: You are not registered as a committee member"
    );
  }

  if (!committeeMember.isActive) {
    throw new Error("Access denied: Your committee membership is inactive");
  }

  return { userId, committeeMember };
}

/**
 * Get committee member if authenticated, or null if not.
 * Used for optional auth checks (e.g., auto-linking on login).
 */
export async function getCommitteeMemberIfExists(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"committeeMembers"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  return await ctx.db
    .query("committeeMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

/**
 * Auto-link a user to a pending committee member invite by email.
 * This is called during the auth callback to activate pending invites.
 *
 * Returns the committee member if found and linked, null otherwise.
 */
export async function autoLinkCommitteeMemberByEmail(
  ctx: MutationCtx,
  userId: Id<"users">,
  email: string
): Promise<Doc<"committeeMembers"> | null> {
  // Normalize email to lowercase for case-insensitive matching
  const normalizedEmail = email.toLowerCase().trim();

  // Skip example accounts (used for testing)
  if (normalizedEmail.includes("@example.com")) {
    return null;
  }

  // Check if user is already linked to a committee member
  const existingLink = await ctx.db
    .query("committeeMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  if (existingLink) {
    return existingLink;
  }

  // Find pending invite by email (case-insensitive)
  // We need to scan by email since Convex doesn't have case-insensitive indexes
  const allMembersByEmail = await ctx.db
    .query("committeeMembers")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .collect();

  // If no exact match, try finding by lowercase comparison
  let pendingInvite = allMembersByEmail.find(
    (m) => !m.userId && m.email.toLowerCase() === normalizedEmail
  );

  if (!pendingInvite) {
    // Fallback: scan all unlinked committee members for email match
    const unlinkedMembers = await ctx.db
      .query("committeeMembers")
      .filter((q) => q.eq(q.field("userId"), undefined))
      .collect();

    pendingInvite = unlinkedMembers.find(
      (m) => m.email.toLowerCase() === normalizedEmail
    );
  }

  if (!pendingInvite) {
    return null;
  }

  // Link the user to the committee member and activate
  await ctx.db.patch(pendingInvite._id, {
    userId: userId,
    isActive: true,
    updatedAt: Date.now(),
  });

  // Return the updated committee member
  return await ctx.db.get(pendingInvite._id);
}

/**
 * Verify that the current user is not trying to act on themselves
 * (e.g., delete their own account).
 */
export function requireNotSelf(
  currentCommitteeMemberId: Id<"committeeMembers">,
  targetCommitteeMemberId: Id<"committeeMembers">,
  action: string = "perform this action"
): void {
  if (currentCommitteeMemberId === targetCommitteeMemberId) {
    throw new Error(`You cannot ${action} on your own account`);
  }
}

/**
 * Check if an email belongs to an example/test account.
 */
export function isExampleEmail(email: string): boolean {
  return email.toLowerCase().includes("@example.com");
}
