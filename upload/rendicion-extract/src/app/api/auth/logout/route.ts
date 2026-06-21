import { NextRequest, NextResponse } from 'next/server'

// Custom logout endpoint that clears the session cookie reliably
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })

  // Clear the session cookie by setting it with an expired date
  response.cookies.set('next-auth.session-token', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,  // Expire immediately
  })

  // Also clear CSRF and callback-url cookies
  response.cookies.set('next-auth.csrf-token', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  response.cookies.set('next-auth.callback-url', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}
