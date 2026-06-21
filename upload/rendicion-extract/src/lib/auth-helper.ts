import { NextRequest } from 'next/server'
import { decode } from 'next-auth/jwt'

// Custom session helper that works reliably behind reverse proxies.
// Uses next-auth/jwt decode() to read the session directly from the cookie,
// bypassing getServerSession() which can fail in proxy environments.

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || 'expense-app-secret-key-2024'

export interface AuthSession {
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

/**
 * Get the authenticated session from the request cookie.
 * Use this instead of getServerSession(authOptions) in all API routes.
 *
 * @param request - The incoming NextRequest
 * @returns The session object if authenticated, null otherwise
 */
export async function getAuthSession(request: NextRequest): Promise<AuthSession | null> {
  try {
    const sessionToken = request.cookies.get('next-auth.session-token')?.value

    if (!sessionToken) {
      return null
    }

    const decoded = await decode({
      token: sessionToken,
      secret: AUTH_SECRET,
    })

    if (!decoded || !decoded.email) {
      return null
    }

    return {
      user: {
        id: (decoded.id as string) || (decoded.sub as string),
        email: decoded.email as string,
        name: decoded.name as string,
        role: decoded.role as string,
      }
    }
  } catch (error) {
    console.error('[getAuthSession] Error decoding session:', error)
    return null
  }
}

/**
 * Require authentication - returns session or a 401 NextResponse
 */
export async function requireAuth(request: NextRequest): Promise<AuthSession | { error: Response }> {
  const session = await getAuthSession(request)
  if (!session) {
    return {
      error: new Response(
        JSON.stringify({ error: 'No autorizado. Inicie sesión para continuar.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
  return session
}
