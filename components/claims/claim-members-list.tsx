'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Search, Users, Loader2 } from 'lucide-react';
import { ClaimMemberCard } from './claim-member-card';
import { Gender } from '@/types/database';

export function ClaimMembersList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<Gender | 'all'>('all');
  const [currentTab, setCurrentTab] = useState('available');

  // Get current committee member info
  const currentMember = useQuery(api.committeeMembers.getCurrentMember);

  // Get members for claiming with filters
  const membersData = useQuery(api.claims.getMembersForClaiming, {
    gender: genderFilter === 'all' ? undefined : genderFilter,
    search: searchQuery || undefined,
    onlyClaimable: currentTab === 'available',
  });

  // Get my claimed members
  const myClaimsData = useQuery(api.claims.getMyClaimedMembers);

  // Convert Convex format to component format
  const members = useMemo(() => {
    if (!membersData) return [];
    return membersData.map(m => ({
      id: m._id,
      first_name: m.firstName,
      last_name: m.lastName,
      gender: m.gender,
      grade: m.grade,
      major: m.major,
      church: m.church,
      email: m.email,
      phone: m.phone,
      is_new_member: m.isNewMember,
      prayerAssignment: m.prayerAssignment ? {
        id: m.prayerAssignment.id,
        isClaimed: m.prayerAssignment.isClaimed,
        isYours: m.prayerAssignment.isAssignedToMe,
        committeeMemberId: m.prayerAssignment.committeeMemberId,
      } : null,
      communicationAssignment: m.communicationAssignment ? {
        id: m.communicationAssignment.id,
        isClaimed: m.communicationAssignment.isClaimed,
        isYours: m.communicationAssignment.isAssignedToMe,
        status: m.communicationAssignment.status,
        committeeMemberId: m.communicationAssignment.committeeMemberId,
      } : null,
      canClaimPrayer: m.canClaimPrayer,
      canClaimCommunication: m.canClaimCommunication,
    }));
  }, [membersData]);

  const myClaims = useMemo(() => {
    if (!myClaimsData) return [];
    return myClaimsData.map(m => ({
      id: m._id,
      first_name: m.firstName,
      last_name: m.lastName,
      gender: m.gender,
      grade: m.grade,
      major: m.major,
      church: m.church,
      email: m.email,
      phone: m.phone,
      is_new_member: m.isNewMember,
      prayerAssignment: m.claimedForPrayer ? {
        id: m.prayerAssignmentId,
        isClaimed: true,
        isYours: true,
        committeeMemberId: null,
      } : null,
      communicationAssignment: m.claimedForCommunication ? {
        id: m.communicationAssignmentId,
        isClaimed: true,
        isYours: true,
        status: 'pending',
        committeeMemberId: null,
      } : null,
      canClaimPrayer: false,
      canClaimCommunication: false,
    }));
  }, [myClaimsData]);

  const isLoading = membersData === undefined || myClaimsData === undefined || currentMember === undefined;
  const currentGender = currentMember?.gender;

  const displayMembers = currentTab === 'my-claims' ? myClaims : members;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, church, major..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={genderFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setGenderFilter('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={genderFilter === 'male' ? 'default' : 'outline'}
            onClick={() => setGenderFilter('male')}
            size="sm"
            className={genderFilter === 'male' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            Male
          </Button>
          <Button
            variant={genderFilter === 'female' ? 'default' : 'outline'}
            onClick={() => setGenderFilter('female')}
            size="sm"
            className={genderFilter === 'female' ? 'bg-pink-600 hover:bg-pink-700' : ''}
          >
            Female
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList>
          <TabsTrigger value="available">
            Available ({members.length})
          </TabsTrigger>
          <TabsTrigger value="my-claims">
            My Claims ({myClaims.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-4">
          {currentGender && (
            <p className="text-sm text-muted-foreground mb-4">
              Showing {currentGender === 'male' ? 'male' : 'female'} members you can claim
              (matching your gender)
            </p>
          )}
        </TabsContent>

        <TabsContent value="my-claims" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Members you have claimed will stay with you through rotations
          </p>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            View all members and their current assignments
          </p>
        </TabsContent>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : displayMembers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayMembers.map((member) => (
            <ClaimMemberCard
              key={member.id}
              member={member}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">
              {currentTab === 'my-claims' ? 'No claims yet' : 'No members found'}
            </CardTitle>
            <CardDescription>
              {currentTab === 'my-claims'
                ? 'Browse available members and claim ones you know personally.'
                : 'Try adjusting your search or filter criteria.'}
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
