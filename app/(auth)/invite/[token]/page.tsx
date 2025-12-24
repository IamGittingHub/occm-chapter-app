import { createClient } from '@/lib/supabase/server';
import { InviteForm } from '@/components/auth/invite-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface InvitePageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ email?: string }>;
}

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const { token } = resolvedParams;
  const email = resolvedSearchParams.email || '';

  // If no email in URL, show error
  if (!email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid Invite Link</CardTitle>
          <CardDescription>
            This invite link appears to be invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <InviteForm email={email} token={token} />;
}
