import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Si intenta entrar a cualquier ruta que empiece con /admin
  if (path.startsWith('/admin')) {
    const token = request.cookies.get('accessToken')?.value;

    // Si NO hay token/cookie, lo regresamos a la fuerza al /login
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};