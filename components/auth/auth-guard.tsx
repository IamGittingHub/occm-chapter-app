'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useConvexAuth, useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const [isLinking, setIsLinking] = useState(false);
  const [linkAttempted, setLinkAttempted] = useState(false);

  const accessCheck = useQuery(
    api.committeeMembers.hasAccess,
    isAuthenticated ? {} : 'skip'
  );

  const linkByEmail = useMutation(api.committeeMembers.linkCurrentUserByEmail);

  // Auto-link when pending invite is found
  useEffect(() => {
    async function tryLink() {
      if (
        accessCheck &&
        !accessCheck.hasAccess &&
        'needsLink' in accessCheck &&
        accessCheck.needsLink &&
        'pendingMemberId' in accessCheck &&
        !linkAttempted
      ) {
        setIsLinking(true);
        setLinkAttempted(true);
        try {
          await linkByEmail({});
          // Force a re-check by reloading
          window.location.reload();
        } catch (error) {
          console.error('Failed to auto-link:', error);
        } finally {
          setIsLinking(false);
        }
      }
    }
    tryLink();
  }, [accessCheck, linkAttempted, linkByEmail]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-deep-blue mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  // Show loading while checking committee member access or linking
  if (accessCheck === undefined || isLinking) {
    return (
      <div className="min-h-screen bg-warm-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-deep-blue mx-auto mb-4" />
          <p className="text-gray-600">{isLinking ? 'Linking your account...' : 'Verifying access...'}</p>
        </div>
      </div>
    );
  }

  // Show access denied if not a committee member
  if (!accessCheck.hasAccess) {
    return <AccessDenied reason={accessCheck.reason} />;
  }

  return <>{children}</>;
}

function AccessDenied({ reason }: { reason?: string }) {
  const { signOut } = useSignOut();

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
        {reason && (
          <p className="text-sm text-gray-500 mb-4">
            Reason: {reason}
          </p>
        )}
        <button
          onClick={() => signOut()}
          className="w-full bg-deep-blue text-white py-2 px-4 rounded-md hover:bg-deep-blue/90 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function useSignOut() {
  const { signOut: authSignOut } = require('@convex-dev/auth/react').useAuthActions();
  const router = useRouter();

  const signOut = async () => {
    await authSignOut();
    router.push('/login');
  };

  return { signOut };
}
