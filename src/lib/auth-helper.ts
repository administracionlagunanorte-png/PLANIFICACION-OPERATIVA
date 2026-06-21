import { decode } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

export interface AuthSession {
  user: AuthUser
}

/**
 * Obtiene la sesión del usuario desde la cookie JWT de NextAuth.
 * Funciona detrás de proxies reversos donde getServerSession() falla.
 */
export async function getAuthSession(
  request: NextRequest
): Promise<AuthSession | null> {
  try {
    const token = request.cookies.get('next-auth.session-token')?.value
    if (!token) return null

    const decoded = await decode({
      token,
      secret: process.env.NEXTAUTH_SECRET || 'planificacion-operativa-secret-key-2024',
    })

    if (!decoded) return null

    return {
      user: {
        id: decoded.id as string,
        email: decoded.email as string,
        name: decoded.name as string,
        role: decoded.role as string,
      },
    }
  } catch (error) {
    console.error('Error decoding session:', error)
    return null
  }
}

/**
 * Requiere autenticación. Retorna la sesión o una respuesta 401.
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthSession | Response> {
  const session = await getAuthSession(request)
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return session
}

/**
 * Requiere que el usuario tenga rol de ADMIN o SUPERVISOR.
 */
export async function requireAdminOrSupervisor(
  request: NextRequest
): Promise<AuthSession | Response> {
  const result = await requireAuth(request)
  if (result instanceof Response) return result

  const session = result as AuthSession
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR') {
    return new Response(
      JSON.stringify({ error: 'No tienes permisos suficientes' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
  return session
}

/**
 * Requiere que el usuario tenga rol de ADMIN.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AuthSession | Response> {
  const result = await requireAuth(request)
  if (result instanceof Response) return result

  const session = result as AuthSession
  if (session.user.role !== 'ADMIN') {
    return new Response(
      JSON.stringify({ error: 'No tienes permisos de administrador' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
  return session
}
