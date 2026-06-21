import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// GET /api/purchase-requests/[id]/quotes - Listar cotizaciones
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
      select: { id: true, userId: true },
    })

    if (!pr) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
    }

    if (session.user.role !== "ADMIN" && pr.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const quotes = await db.purchaseQuote.findMany({
      where: { purchaseRequestId: params.id },
      orderBy: { amount: 'asc' },
    })

    return NextResponse.json(quotes)
  } catch (error) {
    console.error("Error al obtener cotizaciones:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// POST /api/purchase-requests/[id]/quotes - Agregar cotización
export async function POST(
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
      select: { id: true, userId: true, status: true },
    })

    if (!pr) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 })
    }

    const isAdmin = session.user.role === "ADMIN"
    const isOwner = pr.userId === session.user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const { providerName, amount, currency, fileName, fileData, fileType, notes } = body

    if (!providerName || !providerName.trim()) {
      return NextResponse.json(
        { error: "El nombre del proveedor es requerido" },
        { status: 400 }
      )
    }

    const finalAmount = parseFloat(amount)
    if (isNaN(finalAmount) || finalAmount < 0) {
      return NextResponse.json(
        { error: "El monto debe ser un número válido mayor o igual a 0" },
        { status: 400 }
      )
    }

    const quote = await db.purchaseQuote.create({
      data: {
        purchaseRequestId: params.id,
        providerName: providerName.trim(),
        amount: finalAmount,
        currency: currency || "CLP",
        fileName: fileName || null,
        fileData: fileData || null,
        fileType: fileType || null,
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error("Error al crear cotización:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
