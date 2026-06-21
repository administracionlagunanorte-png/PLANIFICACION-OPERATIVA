import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { encode } from 'next-auth/jwt'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Buscar usuario por email exacto primero, luego insensible a mayúsculas
    let user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      const users = await db.user.findMany({
        where: { email: { equals: email, mode: 'insensitive' } },
      })
      user = users[0] || null
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    if (!user.active) {
      return NextResponse.json(
        { error: 'Tu cuenta está desactivada. Contacta al administrador.' },
        { status: 403 }
      )
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Crear token JWT compatible con NextAuth
    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      secret: process.env.NEXTAUTH_SECRET || 'planificacion-operativa-secret-key-2024',
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })

    // Establecer cookie de sesión
    const isProduction = process.env.NODE_ENV === 'production'
    response.cookies.set('next-auth.session-token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 días
    })

    return response
  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
