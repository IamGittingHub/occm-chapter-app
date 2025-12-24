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

  // This now auto-links users if they have a pending invite
  const committeeMember = await getCurrentCommitteeMember(supabase);

  // If user is authenticated but not a committee member, show unauthorized
  if (!committeeMember) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don&apos;t have an active invitation to this chapter.
            Please contact your chapter administrator to request access.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Signed in as: {user.email}
          </p>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full bg-deep-blue text-white py-2 px-4 rounded-md hover:bg-deep-blue/90 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    );
  }

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
