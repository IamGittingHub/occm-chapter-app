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

  const roleLabel = role === 'developer' ? 'Developer' :
                    role === 'overseer' ? 'Overseer' : null;

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

        {/* Role Badge Banner (for developers/overseers not in sandbox) */}
        {roleLabel && !isSandboxActive && (
          <div className="bg-purple-100 border-b border-purple-200 px-4 py-2">
            <div className="flex items-center justify-center gap-2 text-purple-800">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm font-medium">
                {roleLabel} Mode - {role === 'developer' ? 'Full access enabled' : 'Overview access only'}
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
