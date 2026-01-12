import { UserPlus } from 'lucide-react';
import { ClaimMembersList } from '@/components/claims/claim-members-list';

export default function ClaimMembersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-deep-blue flex items-center gap-2">
          <UserPlus className="h-6 w-6" />
          Claim Members
        </h1>
        <p className="text-muted-foreground">
          Claim members you already know to keep them assigned to you through rotations
        </p>
      </div>

      {/* Member List */}
      <ClaimMembersList />
    </div>
  );
}
