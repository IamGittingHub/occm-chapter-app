import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://occm.srv1165028.hstgr.cloud';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error.message);
      return NextResponse.redirect(`${appUrl}/login?error=auth`);
    }

    // Redirect to dashboard - auto-linking happens there
    return NextResponse.redirect(`${appUrl}${next}`);
  }

  return NextResponse.redirect(`${appUrl}/login?error=auth`);
}
