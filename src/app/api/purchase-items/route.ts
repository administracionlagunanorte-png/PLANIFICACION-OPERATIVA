import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/purchase-items — list items for a requestId query param
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const requestId = searchParams.get('requestId')

    if (!requestId) {
      return NextResponse.json({ error: 'El parámetro requestId es requerido' }, { status: 400 })
    }

    const request = await db.purchaseRequest.findUnique({ where: { id: requestId } })
    if (!request) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }

    const items = await db.purchaseItem.findMany({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: items })
  } catch (error) {
    console.error('[PURCHASE_ITEMS_GET]', error)
    return NextResponse.json({ error: 'Error al obtener items de compra' }, { status: 500 })
  }
}

// POST /api/purchase-items — create new item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productDescription, brand, quantity, productLink, referencePhotoUrl, directProvider, notes, requestId } = body

    if (!requestId) {
      return NextResponse.json({ error: 'El campo requestId es requerido' }, { status: 400 })
    }
    if (!productDescription || typeof productDescription !== 'string' || productDescription.trim() === '') {
      return NextResponse.json({ error: 'La descripción del producto es requerida' }, { status: 400 })
    }

    // Verify request exists and is editable
    const purchaseRequest = await db.purchaseRequest.findUnique({ where: { id: requestId } })
    if (!purchaseRequest) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    }
    if (purchaseRequest.status !== 'PENDIENTE') {
      return NextResponse.json({ error: 'Solo se pueden agregar items a solicitudes en estado PENDIENTE' }, { status: 400 })
    }

    const item = await db.purchaseItem.create({
      data: {
        productDescription: productDescription.trim(),
        brand: brand?.trim() || null,
        quantity: quantity ? parseInt(String(quantity)) : 1,
        productLink: productLink?.trim() || null,
        referencePhotoUrl: referencePhotoUrl?.trim() || null,
        directProvider: directProvider?.trim() || null,
        notes: notes?.trim() || null,
        requestId,
      },
    })

    return NextResponse.json({ data: item }, { status: 201 })
  } catch (error) {
    console.error('[PURCHASE_ITEMS_POST]', error)
    return NextResponse.json({ error: 'Error al crear item de compra' }, { status: 500 })
  }
}
