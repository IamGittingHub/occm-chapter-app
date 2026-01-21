import { QueryCtx, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "../_generated/dataModel";
import { Role } from "../schema";
import { internal } from "../_generated/api";

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

  // Trigger sync to update isCommitteeMember flag in members table
  await ctx.scheduler.runAfter(
    0,
    internal.committeeMemberSync.onCommitteeMemberStatusChange,
    { committeeMemberId: pendingInvite._id }
  );

  // Auto-add committee member to members list (if they have committee_member role)
  await ctx.scheduler.runAfter(
    0,
    internal.committeeMemberSync.ensureCommitteeMemberInMembersList,
    { committeeMemberId: pendingInvite._id }
  );

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

// ============================================================================
// Role-Based Access Control
// ============================================================================

/**
 * Get the effective role for a committee member.
 * Returns "committee_member" if role is undefined (backward compatibility).
 */
export function getEffectiveRole(committeeMember: Doc<"committeeMembers">): Role {
  return committeeMember.role ?? "committee_member";
}

/**
 * Check if a role has developer-level access.
 */
export function isDeveloper(role: Role): boolean {
  return role === "developer";
}

/**
 * Check if a role has overseer-level access (overseer or developer).
 * Note: President and Youth Outreach also have team overview access - use hasTeamOverviewAccess() for that.
 */
export function isOverseerOrAbove(role: Role): boolean {
  return role === "developer" || role === "overseer";
}

/**
 * Check if a role has team overview access (can see all members and their progress).
 * This includes: developer, overseer, president, youth_outreach
 */
export function hasTeamOverviewAccess(role: Role): boolean {
  return role === "developer" || role === "overseer" || role === "president" || role === "youth_outreach";
}

/**
 * Check if a role receives prayer/communication assignments.
 * This includes: committee_member, president, youth_outreach
 * Excludes: developer (for testing), overseer (view only)
 */
export function receivesAssignments(role: Role): boolean {
  return role === "committee_member" || role === "president" || role === "youth_outreach";
}

/**
 * Require the current user to be a developer.
 * Throws if the user doesn't have developer role.
 */
export async function requireDeveloper(
  ctx: QueryCtx | MutationCtx
): Promise<{
  userId: Id<"users">;
  committeeMember: Doc<"committeeMembers">;
}> {
  const { userId, committeeMember } = await requireCommitteeMember(ctx);
  const role = getEffectiveRole(committeeMember);

  if (!isDeveloper(role)) {
    throw new Error("Access denied: This action requires developer privileges");
  }

  return { userId, committeeMember };
}

/**
 * Require the current user to be an overseer or developer.
 * Throws if the user doesn't have sufficient privileges.
 */
export async function requireOverseerOrAbove(
  ctx: QueryCtx | MutationCtx
): Promise<{
  userId: Id<"users">;
  committeeMember: Doc<"committeeMembers">;
}> {
  const { userId, committeeMember } = await requireCommitteeMember(ctx);
  const role = getEffectiveRole(committeeMember);

  if (!isOverseerOrAbove(role)) {
    throw new Error("Access denied: This action requires overseer or developer privileges");
  }

  return { userId, committeeMember };
}

/**
 * Require the current user to have team overview access.
 * This includes: developer, overseer, president, youth_outreach
 */
export async function requireTeamOverviewAccess(
  ctx: QueryCtx | MutationCtx
): Promise<{
  userId: Id<"users">;
  committeeMember: Doc<"committeeMembers">;
}> {
  const { userId, committeeMember } = await requireCommitteeMember(ctx);
  const role = getEffectiveRole(committeeMember);

  if (!hasTeamOverviewAccess(role)) {
    throw new Error("Access denied: This action requires team overview privileges");
  }

  return { userId, committeeMember };
}

/**
 * Check if a committee member can edit another committee member.
 * - Developers can edit anyone
 * - Overseers cannot edit anyone (view only)
 * - Committee members can only edit themselves
 */
export function canEditCommitteeMember(
  editorMember: Doc<"committeeMembers">,
  targetMemberId: Id<"committeeMembers">
): boolean {
  const role = getEffectiveRole(editorMember);

  // Developers can edit anyone
  if (role === "developer") {
    return true;
  }

  // Overseers cannot edit (view only)
  if (role === "overseer") {
    return false;
  }

  // Committee members can only edit themselves
  return editorMember._id === targetMemberId;
}

/**
 * Check if a committee member can assign roles.
 * Only developers can assign roles.
 */
export function canAssignRoles(committeeMember: Doc<"committeeMembers">): boolean {
  return getEffectiveRole(committeeMember) === "developer";
}
