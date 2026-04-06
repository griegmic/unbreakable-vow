import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === '/witness' && searchParams.get('token')) {
    const token = searchParams.get('token');
    return NextResponse.redirect(new URL(`/w/${token}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/witness'],
};
