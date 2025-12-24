import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentCommitteeMember } from '@/lib/supabase/get-current-committee-member';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Toaster } from '@/components/ui/toaster';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const committeeMember = await getCurrentCommitteeMember(supabase);

  return (
    <div className="min-h-screen bg-warm-white">
      <Sidebar />
      <div className="md:pl-64">
        <Header committeeMember={committeeMember} />
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
