import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  
  // Check if the current host is exactly the non-www domain
  if (host === 'medicohealth.ca') {
    const nextUrl = request.nextUrl.clone()
    
    // Rewrite the target URL to include 'www'
    return NextResponse.redirect(
      `https://www.medicohealth.ca${nextUrl.pathname}${nextUrl.search}`,
      301 // Permanent redirect for SEO preservation
    )
  }

  return NextResponse.next()
}

// Ensure the middleware doesn't run on static assets or API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
