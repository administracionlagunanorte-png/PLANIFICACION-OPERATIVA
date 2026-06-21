import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// POST /api/auth/register - Crear nuevo usuario (SOLO ADMIN)
export async function POST(request: NextRequest) {
  try {
    // Verificar que sea un administrador autenticado
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para continuar." },
        { status: 401 }
      )
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para crear usuarios. Solo el administrador puede registrar nuevos usuarios." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, name, password, role } = body

    // Validación de campos requeridos
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, nombre y contraseña son requeridos" },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "El formato del email no es válido" },
        { status: 400 }
      )
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Verificar si el email ya existe
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con este email" },
        { status: 409 }
      )
    }

    // Validar rol
    const validRole = role && ["USER", "ADMIN"].includes(role) ? role : "USER"

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear usuario
    const user = await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: validRole
      }
    })

    // Retornar usuario sin contraseña
    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    console.error("Error al registrar usuario:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al registrar usuario" },
      { status: 500 }
    )
  }
}
