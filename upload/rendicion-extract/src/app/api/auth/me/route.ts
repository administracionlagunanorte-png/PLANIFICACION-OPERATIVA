import { NextRequest, NextResponse } from 'next/server'
import { decode } from 'next-auth/jwt'

// Custom session verification endpoint that works reliably behind reverse proxies.
// Reads the session cookie directly and returns the user data.
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('next-auth.session-token')?.value

    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const secret = process.env.NEXTAUTH_SECRET || 'expense-app-secret-key-2024'

    const decoded = await decode({
      token: sessionToken,
      secret,
    })

    if (!decoded || !decoded.email) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: decoded.id || decoded.sub,
        email: decoded.email,
        name: decoded.name,
        role: decoded.role,
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (error) {
    console.error('[Auth/Me] Error:', error)
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
