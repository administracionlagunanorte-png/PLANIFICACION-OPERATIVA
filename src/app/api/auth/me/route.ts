import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-helper'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request)

    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: session.user,
    })
  } catch (error) {
    console.error('Error en /api/auth/me:', error)
    return NextResponse.json(
      { error: 'Error al obtener sesión' },
      { status: 500 }
    )
  }
}
