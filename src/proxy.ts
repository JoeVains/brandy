import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE, isValidAuthCookie } from '@/lib/auth';

export function proxy(request: NextRequest) {
  // No password configured (e.g. local dev without the env var) → auth disabled
  if (!process.env.SITE_PASSWORD) return NextResponse.next();

  const { pathname } = request.nextUrl;

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (isValidAuthCookie(cookie)) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!login|api/login|api/logout|share|api/share|uploads|_next/static|_next/image|favicon\\.ico|brandy-logo\\.svg|favicon\\.svg).*)',
  ],
};
