import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// PUT /api/purchase-requests/[id]/quotes/[quoteId] - Actualizar cotización (marcar como ganadora)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; quoteId: string } }
) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const isAdmin = session.user.role === "ADMIN"

    const quote = await db.purchaseQuote.findUnique({
      where: { id: params.quoteId },
      include: { purchaseRequest: { select: { userId: true } } },
    })

    if (!quote || quote.purchaseRequestId !== params.id) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 })
    }

    const body = await request.json()
    const { isWinner, notes, amount, providerName } = body

    // Marcar como ganadora: solo admin
    if (body.isWinner !== undefined && isAdmin) {
      // Quitar el flag de ganadora de todas las demás cotizaciones de esta solicitud
      if (body.isWinner) {
        await db.purchaseQuote.updateMany({
          where: { purchaseRequestId: params.id },
          data: { isWinner: false },
        })
      }
      const updated = await db.purchaseQuote.update({
        where: { id: params.quoteId },
        data: { isWinner: body.isWinner },
      })
      return NextResponse.json(updated)
    }

    // Editar cotización (admin o dueño)
    if (!isAdmin && quote.purchaseRequest.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const updated = await db.purchaseQuote.update({
      where: { id: params.quoteId },
      data: {
        providerName: providerName?.trim() || quote.providerName,
        amount: amount !== undefined ? parseFloat(amount) : quote.amount,
        notes: notes !== undefined ? (notes?.trim() || null) : quote.notes,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error al actualizar cotización:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// DELETE /api/purchase-requests/[id]/quotes/[quoteId] - Eliminar cotización
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; quoteId: string } }
) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const quote = await db.purchaseQuote.findUnique({
      where: { id: params.quoteId },
      include: { purchaseRequest: { select: { userId: true } } },
    })

    if (!quote || quote.purchaseRequestId !== params.id) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 })
    }

    const isAdmin = session.user.role === "ADMIN"
    if (!isAdmin && quote.purchaseRequest.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    await db.purchaseQuote.delete({ where: { id: params.quoteId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar cotización:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
