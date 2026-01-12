'use client';

import { ConvexDashboardLayout } from '@/components/dashboard/convex-dashboard-layout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConvexDashboardLayout>{children}</ConvexDashboardLayout>;
}
