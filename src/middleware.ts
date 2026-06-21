import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Solo aplicar middleware a rutas API protegidas (no a auth)
  const { pathname } = request.url ? new URL(request.url) : { pathname: request.nextUrl.pathname }

  // Detectar proxy headers y configurar NEXTAUTH_URL dinámicamente
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')

  if (forwardedHost && forwardedProto) {
    process.env.NEXTAUTH_URL = `${forwardedProto}://${forwardedHost}`
  }

  // No interceptar rutas de autenticación ni archivos estáticos
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
