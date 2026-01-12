import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireCommitteeMember, isExampleEmail } from "./lib/auth";
import { Doc, Id } from "./_generated/dataModel";

// Helper to get period dates for current month
function getPeriodDates(date: Date): { periodStart: string; periodEnd: string } {
  const year = date.getFullYear();
  const month = date.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  const periodStart = start.toISOString().split("T")[0];
  const periodEnd = end.toISOString().split("T")[0];

  return { periodStart, periodEnd };
}

/**
 * Get members available for claiming.
 * Returns active, non-graduated members with their assignment status.
 */
export const getMembersForClaiming = query({
  args: {
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("all"))),
    search: v.optional(v.string()),
    onlyClaimable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    // Get active, non-graduated members
    let members = await ctx.db
      .query("members")
      .withIndex("by_isActive_isGraduated", (q) =>
        q.eq("isActive", true).eq("isGraduated", false)
      )
      .collect();

    // Filter by gender if specified
    if (args.gender && args.gender !== "all") {
      members = members.filter((m) => m.gender === args.gender);
    }

    // Filter by search term
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      members = members.filter(
        (m) =>
          m.firstName.toLowerCase().includes(searchLower) ||
          m.lastName.toLowerCase().includes(searchLower) ||
          (m.email && m.email.toLowerCase().includes(searchLower))
      );
    }

    // Get current period
    const { periodStart } = getPeriodDates(new Date());

    // Get current prayer assignments
    const prayerAssignments = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_periodStart", (q) => q.eq("periodStart", periodStart))
      .collect();

    // Get current communication assignments
    const commAssignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_isCurrent", (q) => q.eq("isCurrent", true))
      .collect();

    // Build assignment map
    const prayerMap = new Map<string, Doc<"prayerAssignments">>();
    for (const pa of prayerAssignments) {
      prayerMap.set(pa.memberId, pa);
    }

    const commMap = new Map<string, Doc<"communicationAssignments">>();
    for (const ca of commAssignments) {
      commMap.set(ca.memberId, ca);
    }

    // Enrich members with claim info
    const enrichedMembers = members.map((member) => {
      const prayerAssignment = prayerMap.get(member._id);
      const commAssignment = commMap.get(member._id);

      const prayerClaimed = prayerAssignment?.isClaimed ?? false;
      const commClaimed = commAssignment?.isClaimed ?? false;
      const prayerAssignedToMe =
        prayerAssignment?.committeeMemberId === committeeMember._id;
      const commAssignedToMe =
        commAssignment?.committeeMemberId === committeeMember._id;

      // Claimable if:
      // - Same gender as committee member
      // - Not claimed by someone else (unless assigned to me)
      const canClaimPrayer =
        member.gender === committeeMember.gender &&
        (!prayerClaimed || prayerAssignedToMe);
      const canClaimComm =
        member.gender === committeeMember.gender &&
        (!commClaimed || commAssignedToMe);

      return {
        ...member,
        prayerAssignment: prayerAssignment
          ? {
              id: prayerAssignment._id,
              isClaimed: prayerClaimed,
              isAssignedToMe: prayerAssignedToMe,
              committeeMemberId: prayerAssignment.committeeMemberId,
            }
          : null,
        communicationAssignment: commAssignment
          ? {
              id: commAssignment._id,
              isClaimed: commClaimed,
              isAssignedToMe: commAssignedToMe,
              status: commAssignment.status,
              committeeMemberId: commAssignment.committeeMemberId,
            }
          : null,
        canClaimPrayer,
        canClaimCommunication: canClaimComm,
      };
    });

    // Filter to only claimable if requested
    let result = enrichedMembers;
    if (args.onlyClaimable) {
      result = enrichedMembers.filter(
        (m) => m.canClaimPrayer || m.canClaimCommunication
      );
    }

    // Sort by last name
    return result.sort((a, b) => a.lastName.localeCompare(b.lastName));
  },
});

/**
 * Get members that I have claimed.
 */
export const getMyClaimedMembers = query({
  args: {},
  handler: async (ctx) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const { periodStart } = getPeriodDates(new Date());

    // Get my claimed prayer assignments
    const myPrayerAssignments = await ctx.db
      .query("prayerAssignments")
      .withIndex("by_committeeMember_periodStart", (q) =>
        q.eq("committeeMemberId", committeeMember._id).eq("periodStart", periodStart)
      )
      .collect();

    const claimedPrayer = myPrayerAssignments.filter((pa) => pa.isClaimed);

    // Get my claimed communication assignments
    const myCommAssignments = await ctx.db
      .query("communicationAssignments")
      .withIndex("by_committeeMember_isCurrent", (q) =>
        q.eq("committeeMemberId", committeeMember._id).eq("isCurrent", true)
      )
      .collect();

    const claimedComm = myCommAssignments.filter((ca) => ca.isClaimed);

    // Get unique member IDs
    const memberIds = new Set<Id<"members">>();
    claimedPrayer.forEach((pa) => memberIds.add(pa.memberId));
    claimedComm.forEach((ca) => memberIds.add(ca.memberId));

    // Fetch members
    const members = await Promise.all(
      Array.from(memberIds).map(async (id) => {
        const member = await ctx.db.get(id);
        if (!member) return null;

        const prayerAssignment = claimedPrayer.find(
          (pa) => pa.memberId === id
        );
        const commAssignment = claimedComm.find((ca) => ca.memberId === id);

        return {
          ...member,
          claimedForPrayer: !!prayerAssignment,
          claimedForCommunication: !!commAssignment,
          prayerAssignmentId: prayerAssignment?._id,
          communicationAssignmentId: commAssignment?._id,
        };
      })
    );

    return members
      .filter((m) => m !== null)
      .sort((a, b) => a!.lastName.localeCompare(b!.lastName));
  },
});

/**
 * Claim a member for prayer and/or communication.
 */
export const claimMember = mutation({
  args: {
    memberId: v.id("members"),
    forPrayer: v.optional(v.boolean()),
    forCommunication: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
    }

    // Gender matching enforcement
    if (member.gender !== committeeMember.gender) {
      throw new Error(
        "You can only claim members of the same gender"
      );
    }

    if (!member.isActive || member.isGraduated) {
      throw new Error("Cannot claim inactive or graduated members");
    }

    const forPrayer = args.forPrayer ?? true;
    const forCommunication = args.forCommunication ?? true;

    if (!forPrayer && !forCommunication) {
      throw new Error("Must claim for at least prayer or communication");
    }

    const now = Date.now();
    const { periodStart, periodEnd } = getPeriodDates(new Date());

    // Handle prayer claim
    if (forPrayer) {
      // Find existing prayer assignment
      const existingPrayer = await ctx.db
        .query("prayerAssignments")
        .withIndex("by_member_periodStart", (q) =>
          q.eq("memberId", args.memberId).eq("periodStart", periodStart)
        )
        .first();

      if (existingPrayer) {
        if (existingPrayer.isClaimed && existingPrayer.committeeMemberId !== committeeMember._id) {
          throw new Error("This member is already claimed for prayer by someone else");
        }

        // Update existing assignment to be claimed by me
        await ctx.db.patch(existingPrayer._id, {
          committeeMemberId: committeeMember._id,
          isClaimed: true,
          claimedAt: now,
        });
      } else {
        // Create new claimed assignment
        await ctx.db.insert("prayerAssignments", {
          memberId: args.memberId,
          committeeMemberId: committeeMember._id,
          bucketNumber: 1, // Claimed assignments don't really use bucket
          periodStart,
          periodEnd,
          isClaimed: true,
          claimedAt: now,
          createdAt: now,
        });
      }
    }

    // Handle communication claim
    if (forCommunication) {
      // Find existing current assignment
      const existingComm = await ctx.db
        .query("communicationAssignments")
        .withIndex("by_member_isCurrent", (q) =>
          q.eq("memberId", args.memberId).eq("isCurrent", true)
        )
        .first();

      if (existingComm) {
        if (existingComm.isClaimed && existingComm.committeeMemberId !== committeeMember._id) {
          throw new Error("This member is already claimed for communication by someone else");
        }

        // If reassigning, mark old as not current and create new
        if (existingComm.committeeMemberId !== committeeMember._id) {
          await ctx.db.patch(existingComm._id, {
            isCurrent: false,
            updatedAt: now,
          });

          await ctx.db.insert("communicationAssignments", {
            memberId: args.memberId,
            committeeMemberId: committeeMember._id,
            assignedDate: now,
            status: "pending",
            isCurrent: true,
            isClaimed: true,
            claimedAt: now,
            createdAt: now,
            updatedAt: now,
          });
        } else {
          // Just mark as claimed
          await ctx.db.patch(existingComm._id, {
            isClaimed: true,
            claimedAt: now,
            updatedAt: now,
          });
        }
      } else {
        // Create new claimed assignment
        await ctx.db.insert("communicationAssignments", {
          memberId: args.memberId,
          committeeMemberId: committeeMember._id,
          assignedDate: now,
          status: "pending",
          isCurrent: true,
          isClaimed: true,
          claimedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Release a claim on a member.
 */
export const releaseClaim = mutation({
  args: {
    memberId: v.id("members"),
    forPrayer: v.optional(v.boolean()),
    forCommunication: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { committeeMember } = await requireCommitteeMember(ctx);

    const forPrayer = args.forPrayer ?? true;
    const forCommunication = args.forCommunication ?? true;

    const { periodStart } = getPeriodDates(new Date());
    const now = Date.now();

    // Release prayer claim
    if (forPrayer) {
      const prayerAssignment = await ctx.db
        .query("prayerAssignments")
        .withIndex("by_member_periodStart", (q) =>
          q.eq("memberId", args.memberId).eq("periodStart", periodStart)
        )
        .first();

      if (prayerAssignment) {
        if (prayerAssignment.committeeMemberId !== committeeMember._id) {
          throw new Error("You can only release claims on your own assignments");
        }

        if (prayerAssignment.isClaimed) {
          await ctx.db.patch(prayerAssignment._id, {
            isClaimed: false,
            claimedAt: undefined,
          });
        }
      }
    }

    // Release communication claim
    if (forCommunication) {
      const commAssignment = await ctx.db
        .query("communicationAssignments")
        .withIndex("by_member_isCurrent", (q) =>
          q.eq("memberId", args.memberId).eq("isCurrent", true)
        )
        .first();

      if (commAssignment) {
        if (commAssignment.committeeMemberId !== committeeMember._id) {
          throw new Error("You can only release claims on your own assignments");
        }

        if (commAssignment.isClaimed) {
          await ctx.db.patch(commAssignment._id, {
            isClaimed: false,
            claimedAt: undefined,
            updatedAt: now,
          });
        }
      }
    }

    return { success: true };
  },
});
