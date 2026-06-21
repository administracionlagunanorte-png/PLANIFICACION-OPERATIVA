import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireAdminOrSupervisor, requireAdmin } from '@/lib/auth-helper'

// GET - Listar todos los usuarios (requiere ADMIN o SUPERVISOR)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminOrSupervisor(request)
    if (authResult instanceof Response) return authResult

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error listando usuarios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar usuario (requiere ADMIN)
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request)
    if (authResult instanceof Response) return authResult

    const body = await request.json()
    const { id, name, email, role, active, password } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // No permitir que un admin se desactive a sí mismo
    if (id === authResult.user.id && active === false) {
      return NextResponse.json(
        { error: 'No puedes desactivar tu propia cuenta' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (role !== undefined) {
      const validRoles = ['ADMIN', 'SUPERVISOR', 'USER']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Rol inválido' },
          { status: 400 }
        )
      }
      updateData.role = role
    }
    if (active !== undefined) updateData.active = active
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        )
      }
      updateData.password = await bcrypt.hash(password, 12)
    }

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error actualizando usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar usuario (requiere ADMIN)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request)
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      )
    }

    // No permitir eliminar tu propia cuenta
    if (id === authResult.user.id) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propia cuenta' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { id } })
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    await db.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error eliminando usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
