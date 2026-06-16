import { NextResponse, type NextRequest } from 'next/server';

import { isMobileOrTabletRequest } from './lib/device';

const UNSUPPORTED_DEVICE_PATH = '/unsupported-device';

export function middleware(request: NextRequest) {
  const { nextUrl } = request;

  if (nextUrl.pathname === UNSUPPORTED_DEVICE_PATH) {
    return NextResponse.next();
  }

  const isUnsupportedDevice = isMobileOrTabletRequest({
    secChUaMobile: request.headers.get('sec-ch-ua-mobile'),
    secChUaPlatform: request.headers.get('sec-ch-ua-platform'),
    userAgent: request.headers.get('user-agent') ?? '',
  });

  if (!isUnsupportedDevice) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL(UNSUPPORTED_DEVICE_PATH, request.url));
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|metadata|assets).*)',
  ],
};
