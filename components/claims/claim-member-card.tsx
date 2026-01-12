'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, UserMinus, Check, Phone, Mail, GraduationCap, Church } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';

interface MemberWithClaimInfo {
  id: string;
  first_name: string;
  last_name: string;
  gender: 'male' | 'female';
  grade?: string | null;
  major?: string | null;
  church?: string | null;
  email?: string | null;
  phone?: string | null;
  is_new_member?: boolean;
  prayerAssignment?: {
    id?: string;
    isClaimed: boolean;
    isYours: boolean;
    committeeMemberId?: string | null;
    committeeName?: string;
  } | null;
  communicationAssignment?: {
    id?: string;
    isClaimed: boolean;
    isYours: boolean;
    status?: string;
    committeeMemberId?: string | null;
    committeeName?: string;
  } | null;
  canClaimPrayer?: boolean;
  canClaimCommunication?: boolean;
}

interface ClaimMemberCardProps {
  member: MemberWithClaimInfo;
}

export function ClaimMemberCard({ member }: ClaimMemberCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const claimMember = useMutation(api.claims.claimMember);
  const releaseClaim = useMutation(api.claims.releaseClaim);

  const handleClaim = async () => {
    setIsLoading(true);
    try {
      await claimMember({
        memberId: member.id as Id<"members">,
        forPrayer: true,
        forCommunication: true,
      });

      toast({
        title: 'Success',
        description: `Claimed ${member.first_name} ${member.last_name}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to claim member',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRelease = async () => {
    setIsLoading(true);
    try {
      await releaseClaim({
        memberId: member.id as Id<"members">,
        forPrayer: true,
        forCommunication: true,
      });

      toast({
        title: 'Success',
        description: `Released ${member.first_name} ${member.last_name}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to release claim',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initials = `${member.first_name[0]}${member.last_name[0]}`.toUpperCase();
  const isClaimedByYou = member.prayerAssignment?.isYours && member.prayerAssignment?.isClaimed;
  const isAssignedToYou = member.prayerAssignment?.isYours && !member.prayerAssignment?.isClaimed;
  const isClaimedByOther = member.prayerAssignment?.isClaimed && !member.prayerAssignment?.isYours;
  const isAssignedToOther = !member.prayerAssignment?.isYours && member.prayerAssignment && !member.prayerAssignment.isClaimed;

  const getStatusBadge = () => {
    if (isClaimedByYou) {
      return <Badge className="bg-green-100 text-green-700 border-green-300">Claimed by you</Badge>;
    }
    if (isAssignedToYou) {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Auto-assigned to you</Badge>;
    }
    if (isClaimedByOther) {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300">
          Claimed by {member.prayerAssignment?.committeeName || 'other'}
        </Badge>
      );
    }
    if (isAssignedToOther) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Assigned to {member.prayerAssignment?.committeeName || 'other'}
        </Badge>
      );
    }
    return <Badge variant="outline" className="text-muted-foreground">Unassigned</Badge>;
  };

  const canClaim = !isClaimedByOther && !isClaimedByYou;
  const canRelease = isClaimedByYou;

  return (
    <Card className={`transition-all hover:shadow-md ${isClaimedByYou ? 'ring-2 ring-green-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12">
            <AvatarFallback className={member.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}>
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-deep-blue truncate">
                {member.first_name} {member.last_name}
              </h3>
              {getStatusBadge()}
            </div>

            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {member.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <span>{member.phone}</span>
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{member.email}</span>
                </div>
              )}
              <div className="flex items-center gap-4">
                {member.grade && (
                  <div className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    <span className="capitalize">{member.grade}</span>
                  </div>
                )}
                {member.church && (
                  <div className="flex items-center gap-1">
                    <Church className="h-3 w-3" />
                    <span className="truncate">{member.church}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {canClaim && (
              <Button
                size="sm"
                onClick={handleClaim}
                disabled={isLoading}
                className="bg-deep-blue hover:bg-deep-blue/90"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Claim
              </Button>
            )}
            {canRelease && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRelease}
                disabled={isLoading}
              >
                <UserMinus className="h-4 w-4 mr-1" />
                Release
              </Button>
            )}
            {isClaimedByOther && (
              <Button size="sm" variant="ghost" disabled className="text-muted-foreground">
                <Check className="h-4 w-4 mr-1" />
                Claimed
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
