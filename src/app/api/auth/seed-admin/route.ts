import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

/**
 * Endpoint para crear el primer usuario administrador.
 * Solo funciona si NO existe ningún usuario en la base de datos.
 * Esto permite el bootstrap inicial del sistema.
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar si ya existen usuarios
    const userCount = await db.user.count()

    if (userCount > 0) {
      // Si ya hay usuarios, verificar que el solicitante sea admin
      const authHeader = request.cookies.get('next-auth.session-token')?.value
      if (!authHeader) {
        return NextResponse.json(
          { error: 'Ya existen usuarios. Inicia sesión como administrador para crear más.' },
          { status: 403 }
        )
      }

      // Decodificar token para verificar rol
      const { decode } = await import('next-auth/jwt')
      const decoded = await decode({
        token: authHeader,
        secret: process.env.NEXTAUTH_SECRET || 'planificacion-operativa-secret-key-2024',
      })

      if (!decoded || decoded.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Solo un administrador puede crear usuarios' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { email, name, password, role } = body

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, nombre y contraseña son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Verificar email duplicado
    const existingUser = await db.user.findUnique({
      where: { email },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const userRole = userCount === 0 ? 'ADMIN' : (role || 'USER')

    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: userRole,
      },
    })

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt,
        isFirstUser: userCount === 0,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en seed-admin:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
