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

// GET /api/expense-items — list items for a reportId query param
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const reportId = searchParams.get('reportId')

    if (!reportId) {
      return NextResponse.json({ error: 'El parámetro reportId es requerido' }, { status: 400 })
    }

    // Verify report exists
    const report = await db.expenseReport.findUnique({ where: { id: reportId } })
    if (!report) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    const items = await db.expenseItem.findMany({
      where: { reportId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: items })
  } catch (error) {
    console.error('[EXPENSE_ITEMS_GET]', error)
    return NextResponse.json({ error: 'Error al obtener items de gastos' }, { status: 500 })
  }
}

// POST /api/expense-items — create new item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, numeroBoleta, montoRendir, category, expenseDate, imageBoletaUrl, imageCompraUrl, reportId } = body

    // Validate required fields
    if (!reportId) {
      return NextResponse.json({ error: 'El campo reportId es requerido' }, { status: 400 })
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return NextResponse.json({ error: 'La descripción es requerida' }, { status: 400 })
    }
    if (!numeroBoleta || typeof numeroBoleta !== 'string' || numeroBoleta.trim() === '') {
      return NextResponse.json({ error: 'El número de boleta es requerido' }, { status: 400 })
    }
    if (montoRendir === undefined || montoRendir === null || typeof montoRendir !== 'number' || montoRendir < 0) {
      return NextResponse.json({ error: 'El monto a rendir es requerido y debe ser un número positivo' }, { status: 400 })
    }
    if (!category || typeof category !== 'string' || category.trim() === '') {
      return NextResponse.json({ error: 'La categoría es requerida' }, { status: 400 })
    }
    if (!expenseDate) {
      return NextResponse.json({ error: 'La fecha de gasto es requerida' }, { status: 400 })
    }

    // Verify report exists
    const report = await db.expenseReport.findUnique({ where: { id: reportId } })
    if (!report) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    const item = await db.expenseItem.create({
      data: {
        description: description.trim(),
        numeroBoleta: numeroBoleta.trim(),
        montoRendir,
        category: category.trim(),
        expenseDate: new Date(expenseDate),
        imageBoletaUrl: imageBoletaUrl || '',
        imageCompraUrl: imageCompraUrl || '',
        reportId,
      },
    })

    // Recalculate report total
    await recalcTotal(reportId)

    return NextResponse.json({ data: item }, { status: 201 })
  } catch (error) {
    console.error('[EXPENSE_ITEMS_POST]', error)
    return NextResponse.json({ error: 'Error al crear item de gasto' }, { status: 500 })
  }
}
