import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// GET /api/notifications - Listar notificaciones del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para continuar." },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const searchParams = request.nextUrl.searchParams
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    const where: any = { userId }
    if (unreadOnly) {
      where.read = false
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50
    })

    const unreadCount = await db.notification.count({
      where: { userId, read: false }
    })

    return NextResponse.json({
      notifications,
      unreadCount
    })
  } catch (error) {
    console.error("Error al obtener notificaciones:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al obtener notificaciones" },
      { status: 500 }
    )
  }
}
