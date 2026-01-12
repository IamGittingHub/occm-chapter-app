import { redirect } from 'next/navigation';

// Old token-based invites are no longer used - redirect to login
// Users should sign in with Google instead
export default async function InvitePage() {
  redirect('/login');
}
