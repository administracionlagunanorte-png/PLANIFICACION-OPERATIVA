import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware sets NEXTAUTH_URL dynamically based on the proxy headers
// so that NextAuth generates correct redirect URLs and cookie domains
export function middleware(request: NextRequest) {
  // Only process auth requests
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'http'
    
    if (forwardedHost) {
      const detectedUrl = `${forwardedProto}://${forwardedHost}`
      if (process.env.NEXTAUTH_URL !== detectedUrl) {
        console.log('[Middleware] Setting NEXTAUTH_URL:', detectedUrl)
        process.env.NEXTAUTH_URL = detectedUrl
      }
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/auth/:path*']
}
