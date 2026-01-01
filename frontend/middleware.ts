export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /assets/* (static files)
     * - /api/* (API routes if any)
     * - Files with extensions (*.js, *.css, etc.)
     */
    '/((?!assets|api).*)',
  ],
};

export default function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Only add headers for booking page routes (/{slug})
  // Skip static assets, files with extensions
  const isBookingPage = pathname.match(/^\/[a-zA-Z0-9_-]+$/) &&
                       !pathname.startsWith('/assets') &&
                       !pathname.startsWith('/api') &&
                       !pathname.includes('.');

  if (!isBookingPage) {
    return new Response(null, {
      status: 200,
      headers: {
        'x-middleware-next': '1',
      },
    });
  }

  // Construct the full booking page URL
  const bookingPageUrl = `https://app.daywisebooking.com${pathname}`;

  // Build oEmbed endpoint URLs
  const oembedJsonUrl = `https://api.daywisebooking.com/api/oembed?url=${encodeURIComponent(bookingPageUrl)}&format=json`;
  const oembedXmlUrl = `https://api.daywisebooking.com/api/oembed?url=${encodeURIComponent(bookingPageUrl)}&format=xml`;

  // Return response with Link headers for oEmbed discovery (Iframely reads these!)
  // Format: Link: <URL>; rel="alternate"; type="application/json+oembed"
  return new Response(null, {
    status: 200,
    headers: {
      'x-middleware-next': '1',
      'Link': [
        `<${oembedJsonUrl}>; rel="alternate"; type="application/json+oembed"`,
        `<${oembedXmlUrl}>; rel="alternate"; type="application/xml+oembed"`,
      ].join(', '),
    },
  });
}
