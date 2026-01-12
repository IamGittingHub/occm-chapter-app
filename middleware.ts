import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Convex Auth handles authentication client-side
  // This middleware only handles basic routing logic
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
