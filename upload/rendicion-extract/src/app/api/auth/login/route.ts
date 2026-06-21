import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { encode } from 'next-auth/jwt'

// Custom login endpoint that works reliably behind reverse proxies.
// Uses NextAuth's own JWT encode function to create a compatible session token,
// and sets the session cookie directly in the response.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Find user - try exact match first, then lowercase
    const trimmedEmail = email.trim()
    let user = await db.user.findUnique({
      where: { email: trimmedEmail }
    })

    // If not found, try lowercase version (for case-insensitive email lookup)
    if (!user) {
      user = await db.user.findUnique({
        where: { email: trimmedEmail.toLowerCase() }
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Email o contraseña incorrectos' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Email o contraseña incorrectos' },
        { status: 401 }
      )
    }

    console.log('[Login API] Success:', email, 'Role:', user.role)

    // Create a NextAuth-compatible session token using next-auth/jwt encode
    // The secret MUST match NEXTAUTH_SECRET in .env
    const secret = process.env.NEXTAUTH_SECRET || 'expense-app-secret-key-2024'

    const sessionToken = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        sub: user.id,
      },
      secret,
      maxAge: 30 * 24 * 60 * 60, // 30 days - matches auth-config
    })

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    })

    // Set the session cookie - this is what NextAuth reads to determine the session
    response.cookies.set('next-auth.session-token', sessionToken, {
      httpOnly: true,
      secure: false,       // Must be false for HTTP/proxy access
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('[Login API] Error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
