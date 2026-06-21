import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// GET /api/purchase-requests/[id] - Obtener una solicitud específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const pr = await db.purchaseRequest.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        quotes: { orderBy: { amount: 'asc' } },
      },
    })

    if (!pr) {
      return NextResponse.json(
        { error: "Solicitud de compra no encontrada" },
        { status: 404 }
      )
    }

    // Usuarios normales solo pueden ver sus propias solicitudes
    if (session.user.role !== "ADMIN" && pr.userId !== session.user.id) {
      return NextResponse.json(
        { error: "No tiene permisos para ver esta solicitud" },
        { status: 403 }
      )
    }

    return NextResponse.json(pr)
  } catch (error) {
    console.error("Error al obtener solicitud de compra:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT /api/purchase-requests/[id] - Actualizar solicitud
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const existing = await db.purchaseRequest.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Solicitud de compra no encontrada" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const isAdmin = session.user.role === "ADMIN"
    const isOwner = existing.userId === session.user.id

    // Determinar acción: revisión (admin) o edición (dueño si está pendiente)
    const { action } = body

    if (action === "review" && isAdmin) {
      // Revisión por admin: aprobar / rechazar / marcar en compra
      const validStatuses = ["PENDIENTE", "APROBADA", "RECHAZADA", "EN_COMPRA", "COMPRADA", "CANCELADA"]
      const newStatus = validStatuses.includes(body.status) ? body.status : existing.status

      const updated = await db.purchaseRequest.update({
        where: { id: params.id },
        data: {
          status: newStatus,
          reviewNote: body.reviewNote?.trim() || existing.reviewNote,
          reviewedBy: session.user.name,
          reviewedAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          quotes: true,
        },
      })

      // Notificar al usuario solicitante
      await db.notification.create({
        data: {
          userId: existing.userId,
          title: `Solicitud de compra ${newStatus.toLowerCase()}`,
          message: `Tu solicitud "${existing.productDescription.slice(0, 60)}" fue ${newStatus.toLowerCase()}.`,
          type: "PURCHASE_REQUEST",
          reportId: existing.id,
        },
      })

      return NextResponse.json(updated)
    }

    // Edición por dueño (solo si está PENDIENTE)
    if (isOwner && existing.status === "PENDIENTE") {
      const validPriorities = ["BAJA", "MEDIA", "ALTA", "URGENTE"]
      const finalPriority = body.priority && validPriorities.includes(body.priority) ? body.priority : existing.priority
      const finalQuantity = body.quantity ? parseInt(body.quantity) : existing.quantity

      const updated = await db.purchaseRequest.update({
        where: { id: params.id },
        data: {
          productDescription: body.productDescription?.trim() || existing.productDescription,
          brand: body.brand !== undefined ? (body.brand?.trim() || null) : existing.brand,
          quantity: finalQuantity,
          priority: finalPriority,
          productLink: body.productLink !== undefined ? (body.productLink?.trim() || null) : existing.productLink,
          referencePhotoUrl: body.referencePhotoUrl !== undefined ? (body.referencePhotoUrl || null) : existing.referencePhotoUrl,
          directProvider: body.directProvider !== undefined ? (body.directProvider?.trim() || null) : existing.directProvider,
          notes: body.notes !== undefined ? (body.notes?.trim() || null) : existing.notes,
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          quotes: true,
        },
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json(
      { error: "No tiene permisos para realizar esta acción" },
      { status: 403 }
    )
  } catch (error) {
    console.error("Error al actualizar solicitud de compra:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/purchase-requests/[id] - Eliminar solicitud
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const existing = await db.purchaseRequest.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Solicitud de compra no encontrada" },
        { status: 404 }
      )
    }

    const isAdmin = session.user.role === "ADMIN"
    const isOwner = existing.userId === session.user.id

    // Solo admin o dueño (si está pendiente) puede eliminar
    if (!isAdmin && !(isOwner && existing.status === "PENDIENTE")) {
      return NextResponse.json(
        { error: "No tiene permisos para eliminar esta solicitud" },
        { status: 403 }
      )
    }

    await db.purchaseRequest.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar solicitud de compra:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
