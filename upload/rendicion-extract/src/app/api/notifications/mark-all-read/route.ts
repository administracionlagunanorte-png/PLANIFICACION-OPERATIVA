import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// PATCH /api/notifications/mark-all-read - Marcar todas las notificaciones como leídas
export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para continuar." },
        { status: 401 }
      )
    }

    const userId = session.user.id

    const result = await db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    })

    return NextResponse.json({
      message: "Todas las notificaciones marcadas como leídas",
      updatedCount: result.count
    })
  } catch (error) {
    console.error("Error al marcar notificaciones como leídas:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al marcar notificaciones como leídas" },
      { status: 500 }
    )
  }
}
