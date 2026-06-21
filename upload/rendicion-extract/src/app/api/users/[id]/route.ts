import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// PUT /api/users/[id] - Actualizar usuario (solo admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para continuar." },
        { status: 401 }
      )
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para editar usuarios" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, email, role, montoAsignado, password } = body

    // Verificar que el usuario existe
    const existingUser = await db.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Construir datos de actualización
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (email !== undefined) updateData.email = email.trim().toLowerCase()
    if (role !== undefined && ["USER", "ADMIN"].includes(role)) updateData.role = role
    if (montoAsignado !== undefined) updateData.montoAsignado = parseFloat(montoAsignado) || 0
    if (password && password.length >= 6) {
      const bcrypt = require("bcryptjs")
      updateData.password = await bcrypt.hash(password, 10)
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        montoAsignado: true,
        createdAt: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error al actualizar usuario:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al actualizar usuario" },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Eliminar usuario (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para continuar." },
        { status: 401 }
      )
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para eliminar usuarios" },
        { status: 403 }
      )
    }

    const { id } = await params

    // No puede eliminarse a sí mismo
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "No puede eliminar su propia cuenta" },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Eliminar usuario (las rendiciones y notificaciones se eliminan en cascada)
    await db.user.delete({ where: { id } })

    return NextResponse.json({ message: "Usuario eliminado exitosamente" })
  } catch (error) {
    console.error("Error al eliminar usuario:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al eliminar usuario" },
      { status: 500 }
    )
  }
}
