import { NextResponse } from 'next/server';
import { auth } from './lib/auth';

export const proxy = auth((request) => {
  if (!request.auth?.user?.accessToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (request.nextUrl.pathname.startsWith('/admin') && !request.auth.user.roles?.includes('SUPERUSUARIO')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return NextResponse.next();
});
export const config = { matcher: ['/admin/:path*', '/dashboard/:path*'] };
