'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

/**
 * Custom hooks for common Convex operations.
 * These provide a simpler interface for frequently used queries/mutations.
 */

// Dashboard
export function useDashboardStats() {
  return useQuery(api.dashboard.getStats);
}

export function useDashboardData() {
  return useQuery(api.dashboard.getData);
}

export function useRotationInfo() {
  return useQuery(api.dashboard.getRotationInfo);
}

// Committee Members
export function useCurrentMember() {
  return useQuery(api.committeeMembers.getCurrentMember);
}

export function useCommitteeMembers() {
  return useQuery(api.committeeMembers.list);
}

export function useActiveCommitteeMembers() {
  return useQuery(api.committeeMembers.listActive);
}

export function useCommitteeStats() {
  return useQuery(api.committeeMembers.getStats);
}

// Members
export function useMembers() {
  return useQuery(api.members.list);
}

export function useActiveMembers() {
  return useQuery(api.members.listActive);
}

export function useMemberStats() {
  return useQuery(api.members.getStats);
}

// Prayer Assignments
export function useMyPrayerAssignments(periodStart?: string) {
  return useQuery(api.prayerAssignments.getMine, periodStart ? { periodStart } : {});
}

export function usePrayerAssignmentsExist(periodStart: string) {
  return useQuery(api.prayerAssignments.existsForPeriod, { periodStart });
}

// Communication Assignments
export function useMyCommunicationAssignments() {
  return useQuery(api.communicationAssignments.getMine);
}

export function useCommunicationStats() {
  return useQuery(api.communicationAssignments.getMyStats);
}

export function useCommunicationAssignmentsExist() {
  return useQuery(api.communicationAssignments.existsCurrent);
}

// Claims
export function useMembersForClaiming(options?: {
  gender?: 'male' | 'female' | 'all';
  search?: string;
  onlyClaimable?: boolean;
}) {
  return useQuery(api.claims.getMembersForClaiming, options || {});
}

export function useMyClaimedMembers() {
  return useQuery(api.claims.getMyClaimedMembers);
}

// App Settings
export function useAppSettings() {
  return useQuery(api.appSettings.getAsMap);
}
