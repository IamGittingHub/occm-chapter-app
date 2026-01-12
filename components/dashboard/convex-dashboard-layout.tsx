'use client';

import { ReactNode } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AuthGuard } from '@/components/auth/auth-guard';
import { ConvexSidebar } from './convex-sidebar';
import { ConvexHeader } from './convex-header';
import { Toaster } from '@/components/ui/toaster';
import { Loader2 } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-warm-white">
      <ConvexSidebar />
      <div className="md:pl-64">
        <ConvexHeader committeeMember={committeeMember} />
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
