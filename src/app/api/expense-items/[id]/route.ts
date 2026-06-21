import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Helper: recalculate totalAmount for a report
async function recalcTotal(reportId: string) {
  const result = await db.expenseItem.aggregate({
    where: { reportId },
    _sum: { montoRendir: true },
  })
  const total = result._sum.montoRendir ?? 0
  await db.expenseReport.update({
    where: { id: reportId },
    data: { totalAmount: total },
  })
}

// PUT /api/expense-items/[id] — update item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { description, numeroBoleta, montoRendir, category, expenseDate, imageBoletaUrl, imageCompraUrl } = body

    const existing = await db.expenseItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim() === '') {
        return NextResponse.json({ error: 'La descripción no puede estar vacía' }, { status: 400 })
      }
      data.description = description.trim()
    }

    if (numeroBoleta !== undefined) {
      if (typeof numeroBoleta !== 'string' || numeroBoleta.trim() === '') {
        return NextResponse.json({ error: 'El número de boleta no puede estar vacío' }, { status: 400 })
      }
      data.numeroBoleta = numeroBoleta.trim()
    }

    if (montoRendir !== undefined) {
      if (typeof montoRendir !== 'number' || montoRendir < 0) {
        return NextResponse.json({ error: 'El monto a rendir debe ser un número positivo' }, { status: 400 })
      }
      data.montoRendir = montoRendir
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || category.trim() === '') {
        return NextResponse.json({ error: 'La categoría no puede estar vacía' }, { status: 400 })
      }
      data.category = category.trim()
    }

    if (expenseDate !== undefined) {
      data.expenseDate = new Date(expenseDate)
    }

    if (imageBoletaUrl !== undefined) {
      data.imageBoletaUrl = imageBoletaUrl || ''
    }

    if (imageCompraUrl !== undefined) {
      data.imageCompraUrl = imageCompraUrl || ''
    }

    const item = await db.expenseItem.update({
      where: { id },
      data,
    })

    // Recalculate report total
    await recalcTotal(existing.reportId)

    return NextResponse.json({ data: item })
  } catch (error) {
    console.error('[EXPENSE_ITEM_PUT]', error)
    return NextResponse.json({ error: 'Error al actualizar item de gasto' }, { status: 500 })
  }
}

// DELETE /api/expense-items/[id] — delete item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.expenseItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }

    const reportId = existing.reportId

    await db.expenseItem.delete({ where: { id } })

    // Recalculate report total
    await recalcTotal(reportId)

    return NextResponse.json({ data: { id }, message: 'Item eliminado correctamente' })
  } catch (error) {
    console.error('[EXPENSE_ITEM_DELETE]', error)
    return NextResponse.json({ error: 'Error al eliminar item de gasto' }, { status: 500 })
  }
}
