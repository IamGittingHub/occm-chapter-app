'use client';

import { ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AuthGuard } from '@/components/auth/auth-guard';
import { ConvexSidebar } from './convex-sidebar';
import { ConvexHeader } from './convex-header';
import { Toaster } from '@/components/ui/toaster';
import { Loader2, FlaskConical, ShieldCheck } from 'lucide-react';

interface ConvexDashboardLayoutProps {
  children: ReactNode;
}

export function ConvexDashboardLayout({ children }: ConvexDashboardLayoutProps) {
  return (
    <AuthGuard>
      <DashboardContent>{children}</DashboardContent>
    </AuthGuard>
  );
}

function DashboardContent({ children }: { children: ReactNode }) {
  const committeeMember = useQuery(api.committeeMembers.getCurrentMember);
  const roleInfo = useQuery(api.committeeMembers.getMyRole);
  const testModeSetting = useQuery(api.appSettings.getByKey, { key: "test_mode" });

  if (committeeMember === undefined) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-deep-blue mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!committeeMember) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <p className="text-gray-600">Unable to load profile</p>
      </div>
    );
  }

  // Calculate sandbox status from existing APIs
  const role = roleInfo?.role;
  const isDevOrOverseer = role === 'developer' || role === 'overseer';
  const testModeEnabled = testModeSetting === 'true';
  const isSandboxActive = testModeEnabled && isDevOrOverseer;

  // Role labels and descriptions for banner
  const roleConfig: Record<string, { label: string; description: string; color: string }> = {
    developer: { label: 'Developer', description: 'Full access enabled', color: 'purple' },
    overseer: { label: 'Overseer', description: 'Overview access only', color: 'purple' },
    president: { label: 'President', description: 'Team overview + outreach', color: 'blue' },
    youth_outreach: { label: 'Youth Outreach', description: 'Team overview + outreach', color: 'blue' },
  };
  const roleInfo_config = role ? roleConfig[role] : null;

  return (
    <div className="min-h-screen bg-warm-white">
      <ConvexSidebar />
      <div className="md:pl-64">
        <ConvexHeader committeeMember={committeeMember} />

        {/* Sandbox Mode Banner */}
        {isSandboxActive && (
          <div className="bg-amber-100 border-b border-amber-200 px-4 py-2">
            <div className="flex items-center justify-center gap-2 text-amber-800">
              <FlaskConical className="h-4 w-4" />
              <span className="text-sm font-medium">
                Sandbox Mode - Viewing mock data for testing
              </span>
            </div>
          </div>
        )}

        {/* Role Badge Banner (for special roles not in sandbox) */}
        {roleInfo_config && !isSandboxActive && (
          <div className={`${roleInfo_config.color === 'purple' ? 'bg-purple-100 border-purple-200 text-purple-800' : 'bg-blue-100 border-blue-200 text-blue-800'} border-b px-4 py-2`}>
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm font-medium">
                {roleInfo_config.label} Mode - {roleInfo_config.description}
              </span>
            </div>
          </div>
        )}

        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
