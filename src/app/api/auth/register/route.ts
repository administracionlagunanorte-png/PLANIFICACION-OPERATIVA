import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireAdminOrSupervisor } from '@/lib/auth-helper'

export async function POST(request: NextRequest) {
  try {
    // Solo ADMIN o SUPERVISOR pueden registrar usuarios
    const authResult = await requireAdminOrSupervisor(request)
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const { email, name, password, role } = body

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, nombre y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      )
    }

    // Validar contraseña
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Validar rol
    const validRoles = ['ADMIN', 'SUPERVISOR', 'USER']
    const userRole = role || 'USER'
    if (!validRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Rol inválido. Roles válidos: ADMIN, SUPERVISOR, USER' },
        { status: 400 }
      )
    }

    // Solo ADMIN puede crear otros ADMIN
    if (userRole === 'ADMIN' && authResult.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo un administrador puede crear otros administradores' },
        { status: 403 }
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

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear usuario
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
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en register:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
