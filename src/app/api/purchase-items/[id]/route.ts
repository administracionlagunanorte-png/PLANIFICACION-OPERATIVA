import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/purchase-items/[id] — update item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { productDescription, brand, quantity, productLink, referencePhotoUrl, directProvider, notes } = body

    const existing = await db.purchaseItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }

    // Verify the parent request is still editable
    const purchaseRequest = await db.purchaseRequest.findUnique({ where: { id: existing.requestId } })
    if (!purchaseRequest || purchaseRequest.status !== 'PENDIENTE') {
      return NextResponse.json({ error: 'Solo se pueden editar items de solicitudes en estado PENDIENTE' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}

    if (productDescription !== undefined) {
      if (typeof productDescription !== 'string' || productDescription.trim() === '') {
        return NextResponse.json({ error: 'La descripción no puede estar vacía' }, { status: 400 })
      }
      data.productDescription = productDescription.trim()
    }
    if (brand !== undefined) data.brand = brand?.trim() || null
    if (quantity !== undefined) data.quantity = parseInt(String(quantity)) || 1
    if (productLink !== undefined) data.productLink = productLink?.trim() || null
    if (referencePhotoUrl !== undefined) data.referencePhotoUrl = referencePhotoUrl?.trim() || null
    if (directProvider !== undefined) data.directProvider = directProvider?.trim() || null
    if (notes !== undefined) data.notes = notes?.trim() || null

    const item = await db.purchaseItem.update({
      where: { id },
      data,
    })

    return NextResponse.json({ data: item })
  } catch (error) {
    console.error('[PURCHASE_ITEM_PUT]', error)
    return NextResponse.json({ error: 'Error al actualizar item de compra' }, { status: 500 })
  }
}

// DELETE /api/purchase-items/[id] — delete item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.purchaseItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }

    // Verify the parent request is still editable
    const purchaseRequest = await db.purchaseRequest.findUnique({ where: { id: existing.requestId } })
    if (!purchaseRequest || purchaseRequest.status !== 'PENDIENTE') {
      return NextResponse.json({ error: 'Solo se pueden eliminar items de solicitudes en estado PENDIENTE' }, { status: 400 })
    }

    await db.purchaseItem.delete({ where: { id } })

    return NextResponse.json({ data: { id }, message: 'Item eliminado correctamente' })
  } catch (error) {
    console.error('[PURCHASE_ITEM_DELETE]', error)
    return NextResponse.json({ error: 'Error al eliminar item de compra' }, { status: 500 })
  }
}
