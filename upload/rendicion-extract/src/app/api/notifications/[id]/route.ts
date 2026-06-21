import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// PATCH /api/notifications/[id] - Marcar notificación como leída
export async function PATCH(
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

    const { id } = await params
    const userId = session.user.id

    const notification = await db.notification.findUnique({
      where: { id }
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Notificación no encontrada" },
        { status: 404 }
      )
    }

    if (notification.userId !== userId) {
      return NextResponse.json(
        { error: "No tiene permisos para modificar esta notificación" },
        { status: 403 }
      )
    }

    const updated = await db.notification.update({
      where: { id },
      data: { read: true }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error al actualizar notificación:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al actualizar notificación" },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/[id] - Eliminar notificación
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

    const { id } = await params
    const userId = session.user.id

    const notification = await db.notification.findUnique({
      where: { id }
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Notificación no encontrada" },
        { status: 404 }
      )
    }

    if (notification.userId !== userId) {
      return NextResponse.json(
        { error: "No tiene permisos para eliminar esta notificación" },
        { status: 403 }
      )
    }

    await db.notification.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Notificación eliminada exitosamente" })
  } catch (error) {
    console.error("Error al eliminar notificación:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al eliminar notificación" },
      { status: 500 }
    )
  }
}
