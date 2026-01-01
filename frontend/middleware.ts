import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Only add headers for booking page routes (/{slug})
  // Skip static assets, API routes, etc.
  const isBookingPage = pathname.match(/^\/[a-zA-Z0-9_-]+$/) &&
                       !pathname.startsWith('/_next') &&
                       !pathname.startsWith('/api') &&
                       !pathname.includes('.');

  if (!isBookingPage) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Construct the full booking page URL
  const bookingPageUrl = `https://app.daywisebooking.com${pathname}`;

  // Build oEmbed endpoint URLs
  const oembedJsonUrl = `https://api.daywisebooking.com/api/oembed?url=${encodeURIComponent(bookingPageUrl)}&format=json`;
  const oembedXmlUrl = `https://api.daywisebooking.com/api/oembed?url=${encodeURIComponent(bookingPageUrl)}&format=xml`;

  // Add Link headers for oEmbed discovery (Iframely reads these!)
  // Format: Link: <URL>; rel="alternate"; type="application/json+oembed"
  response.headers.append(
    'Link',
    `<${oembedJsonUrl}>; rel="alternate"; type="application/json+oembed"`
  );

  response.headers.append(
    'Link',
    `<${oembedXmlUrl}>; rel="alternate"; type="application/xml+oembed"`
  );

  return response;
}

export const config = {
  // Match all paths except static files and API routes
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
