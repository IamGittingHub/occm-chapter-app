import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Enum validators for type safety
const genderValidator = v.union(v.literal("male"), v.literal("female"));
const gradeValidator = v.union(
  v.literal("freshman"),
  v.literal("sophomore"),
  v.literal("junior"),
  v.literal("senior"),
  v.literal("grad"),
  v.literal("unknown")
);
const contactMethodValidator = v.union(
  v.literal("text"),
  v.literal("call"),
  v.literal("email"),
  v.literal("in_person"),
  v.literal("other")
);
const communicationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("successful"),
  v.literal("transferred")
);

// Committee member roles
const roleValidator = v.union(
  v.literal("developer"),       // Can see everything, test all features
  v.literal("overseer"),        // Overview dashboard, doesn't do outreach
  v.literal("president"),       // Team overview + receives assignments
  v.literal("youth_outreach"),  // Team overview + receives assignments
  v.literal("committee_member") // Regular active member doing outreach
);

// Member priority for outreach (high = needs more attention, low = regular attender)
const priorityValidator = v.union(
  v.literal("high"),   // Not attending regularly - higher priority to contact
  v.literal("normal"), // Default priority
  v.literal("low")     // Regular attender - lower priority
);

export default defineSchema({
  // Auth tables from @convex-dev/auth
  ...authTables,

  // Organizations - Multi-chapter support for different OCCM chapters
  organizations: defineTable({
    name: v.string(), // "OCCM Georgia Tech"
    slug: v.string(), // "gatech" - URL-friendly identifier
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    settings: v.object({
      rotationDay: v.number(), // Day of month for prayer rotation (1-28)
      autoTransferDays: v.number(), // Days before auto-transfer (default 30)
      timezone: v.optional(v.string()), // e.g., "America/New_York"
    }),
    isActive: v.boolean(),
    createdAt: v.number(), // Epoch ms
    updatedAt: v.number(), // Epoch ms
  })
    .index("by_slug", ["slug"])
    .index("by_isActive", ["isActive"]),

  // Organization Memberships - Users can belong to multiple organizations
  organizationMemberships: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    role: v.union(v.literal("admin"), v.literal("member")), // admin can manage org settings
    joinedAt: v.number(), // Epoch ms
  })
    .index("by_userId", ["userId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_userId_organizationId", ["userId", "organizationId"]),

  // Committee Members - Leaders managing prayer/outreach
  committeeMembers: defineTable({
    // Link to auth users table (nullable until invite accepted)
    userId: v.optional(v.id("users")),
    // Organization this committee member belongs to (optional for backward compat)
    organizationId: v.optional(v.id("organizations")),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    gender: genderValidator,
    phone: v.optional(v.string()),
    // Role determines what features the member can access
    // Optional for backward compat - defaults to "committee_member" in code
    role: v.optional(roleValidator),
    isActive: v.boolean(),
    createdAt: v.number(), // Epoch ms
    updatedAt: v.number(), // Epoch ms
    // For migration - original Supabase UUID
    legacyId: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"])
    .index("by_isActive", ["isActive"])
    .index("by_gender_isActive", ["gender", "isActive"])
    .index("by_legacyId", ["legacyId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_organizationId_isActive", ["organizationId", "isActive"]),

  // Members - Students being prayed for/contacted
  members: defineTable({
    // Organization this member belongs to (optional for backward compat)
    organizationId: v.optional(v.id("organizations")),
    firstName: v.string(),
    lastName: v.string(),
    gender: genderValidator,
    grade: gradeValidator,
    major: v.optional(v.string()),
    minor: v.optional(v.string()),
    church: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()), // Keep as ISO string
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
    // Track if this member is also a committee member (excludes from communication assignments)
    isCommitteeMember: v.optional(v.boolean()),
    // Outreach priority - high for non-attenders, low for regular attenders
    priority: v.optional(priorityValidator),
    createdAt: v.number(), // Epoch ms
    updatedAt: v.number(), // Epoch ms
    // For migration - original Supabase UUID
    legacyId: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_gender", ["gender"])
    .index("by_isActive", ["isActive"])
    .index("by_isActive_isGraduated", ["isActive", "isGraduated"])
    .index("by_gender_isActive_isGraduated", ["gender", "isActive", "isGraduated"])
    .index("by_lastName", ["lastName"])
    .index("by_legacyId", ["legacyId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_organizationId_isActive", ["organizationId", "isActive"]),

  // Prayer Assignments - Monthly prayer rotation tracking
  prayerAssignments: defineTable({
    memberId: v.id("members"),
    committeeMemberId: v.id("committeeMembers"),
    bucketNumber: v.number(),
    periodStart: v.string(), // ISO date string (YYYY-MM-DD)
    periodEnd: v.string(), // ISO date string (YYYY-MM-DD)
    isClaimed: v.boolean(),
    claimedAt: v.optional(v.number()), // Epoch ms
    createdAt: v.number(), // Epoch ms
    // For migration
    legacyId: v.optional(v.string()),
    legacyMemberId: v.optional(v.string()),
    legacyCommitteeMemberId: v.optional(v.string()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_committeeMemberId", ["committeeMemberId"])
    .index("by_periodStart", ["periodStart"])
    .index("by_committeeMember_periodStart", ["committeeMemberId", "periodStart"])
    .index("by_member_periodStart", ["memberId", "periodStart"])
    .index("by_bucketNumber", ["bucketNumber"])
    .index("by_legacyId", ["legacyId"]),

  // Communication Assignments - Outreach tracking with 30-day auto-transfer
  communicationAssignments: defineTable({
    memberId: v.id("members"),
    committeeMemberId: v.id("committeeMembers"),
    assignedDate: v.number(), // Epoch ms - determines 30-day threshold
    status: communicationStatusValidator,
    lastContactAttempt: v.optional(v.number()), // Epoch ms
    isCurrent: v.boolean(), // False when transferred
    isClaimed: v.boolean(), // Prevents auto-transfer
    claimedAt: v.optional(v.number()), // Epoch ms
    createdAt: v.number(), // Epoch ms
    updatedAt: v.number(), // Epoch ms
    // For migration
    legacyId: v.optional(v.string()),
    legacyMemberId: v.optional(v.string()),
    legacyCommitteeMemberId: v.optional(v.string()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_committeeMemberId", ["committeeMemberId"])
    .index("by_isCurrent", ["isCurrent"])
    .index("by_status", ["status"])
    .index("by_committeeMember_isCurrent", ["committeeMemberId", "isCurrent"])
    .index("by_member_isCurrent", ["memberId", "isCurrent"])
    .index("by_status_isCurrent", ["status", "isCurrent"])
    .index("by_legacyId", ["legacyId"]),

  // Communication Logs - History of all contact attempts
  communicationLogs: defineTable({
    assignmentId: v.id("communicationAssignments"),
    committeeMemberId: v.id("committeeMembers"),
    contactDate: v.number(), // Epoch ms
    contactMethod: v.optional(contactMethodValidator),
    notes: v.optional(v.string()),
    wasSuccessful: v.boolean(),
    createdAt: v.number(), // Epoch ms
    // For migration
    legacyId: v.optional(v.string()),
    legacyAssignmentId: v.optional(v.string()),
    legacyCommitteeMemberId: v.optional(v.string()),
  })
    .index("by_assignmentId", ["assignmentId"])
    .index("by_committeeMemberId", ["committeeMemberId"])
    .index("by_legacyId", ["legacyId"]),

  // Transfer History - Audit trail for auto-transfers
  transferHistory: defineTable({
    memberId: v.id("members"),
    fromCommitteeMemberId: v.id("committeeMembers"),
    toCommitteeMemberId: v.id("committeeMembers"),
    reason: v.optional(v.string()),
    transferredAt: v.number(), // Epoch ms
    // For migration
    legacyId: v.optional(v.string()),
    legacyMemberId: v.optional(v.string()),
    legacyFromCommitteeMemberId: v.optional(v.string()),
    legacyToCommitteeMemberId: v.optional(v.string()),
  })
    .index("by_memberId", ["memberId"])
    .index("by_fromCommitteeMemberId", ["fromCommitteeMemberId"])
    .index("by_toCommitteeMemberId", ["toCommitteeMemberId"])
    .index("by_legacyId", ["legacyId"]),

  // Assignment Repair Logs - Audit trail for prayer assignment repairs
  assignmentRepairLogs: defineTable({
    performedByCommitteeMemberId: v.id("committeeMembers"),
    periodStart: v.string(),
    createdAt: v.number(), // Epoch ms
    backfilledCount: v.number(),
    reassignedCount: v.number(),
    zeroBefore: v.number(),
    zeroAfter: v.number(),
    skippedReasons: v.array(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_periodStart", ["periodStart"])
    .index("by_performedBy", ["performedByCommitteeMemberId"])
    .index("by_createdAt", ["createdAt"]),

  // App Settings - Configuration key-value store (org-scoped or global)
  appSettings: defineTable({
    // Organization this setting belongs to (null for global settings)
    organizationId: v.optional(v.id("organizations")),
    settingKey: v.string(),
    settingValue: v.string(),
    updatedAt: v.number(), // Epoch ms
    // For migration
    legacyId: v.optional(v.string()),
  })
    .index("by_settingKey", ["settingKey"])
    .index("by_legacyId", ["legacyId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_organizationId_settingKey", ["organizationId", "settingKey"]),
});

// Export types for use in functions
export type Gender = "male" | "female";
export type Grade = "freshman" | "sophomore" | "junior" | "senior" | "grad" | "unknown";
export type ContactMethod = "text" | "call" | "email" | "in_person" | "other";
export type CommunicationStatus = "pending" | "successful" | "transferred";
export type Role = "developer" | "overseer" | "president" | "youth_outreach" | "committee_member";
export type Priority = "high" | "normal" | "low";
