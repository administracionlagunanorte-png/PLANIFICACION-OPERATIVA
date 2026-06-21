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

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  BORRADOR: ['ENVIADO'],
  ENVIADO: ['APROBADO', 'RECHAZADO', 'MODIFICACIÓN SOLICITADA'],
  APROBADO: [],
  RECHAZADO: [],
  'MODIFICACIÓN SOLICITADA': ['BORRADOR'],
}

// GET /api/expense-reports/[id] — single report with items
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const report = await db.expenseReport.findUnique({
      where: { id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })

    if (!report) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: report })
  } catch (error) {
    console.error('[EXPENSE_REPORT_GET]', error)
    return NextResponse.json({ error: 'Error al obtener reporte' }, { status: 500 })
  }
}

// PUT /api/expense-reports/[id] — update title/description/status (full update)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, responsible } = body

    const existing = await db.expenseReport.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = typeof title === 'string' ? title.trim() : title
    if (description !== undefined) data.description = description?.trim() || null
    if (responsible !== undefined) data.responsible = responsible?.trim() || null

    const report = await db.expenseReport.update({
      where: { id },
      data,
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })

    return NextResponse.json({ data: report })
  } catch (error) {
    console.error('[EXPENSE_REPORT_PUT]', error)
    return NextResponse.json({ error: 'Error al actualizar reporte' }, { status: 500 })
  }
}

// PATCH /api/expense-reports/[id] — change status with validation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, reviewNote, reviewedBy } = body

    if (!status) {
      return NextResponse.json({ error: 'El campo status es requerido' }, { status: 400 })
    }

    const existing = await db.expenseReport.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    // Validate transition
    const allowedTransitions = VALID_TRANSITIONS[existing.status] || []
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Transición no válida: no se puede cambiar de "${existing.status}" a "${status}". Transiciones permitidas: [${allowedTransitions.join(', ')}]`,
        },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = { status }

    // Set submittedAt when transitioning to ENVIADO
    if (status === 'ENVIADO') {
      data.submittedAt = new Date()
    }

    // Set reviewedAt and review fields when transitioning to review statuses
    if (status === 'APROBADO' || status === 'RECHAZADO' || status === 'MODIFICACIÓN SOLICITADA') {
      data.reviewedAt = new Date()
      if (reviewNote !== undefined) data.reviewNote = reviewNote?.trim() || null
      if (reviewedBy !== undefined) data.reviewedBy = reviewedBy?.trim() || null
    }

    const report = await db.expenseReport.update({
      where: { id },
      data,
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })

    return NextResponse.json({ data: report })
  } catch (error) {
    console.error('[EXPENSE_REPORT_PATCH]', error)
    return NextResponse.json({ error: 'Error al cambiar estado del reporte' }, { status: 500 })
  }
}

// DELETE /api/expense-reports/[id] — only BORRADOR status
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.expenseReport.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    if (existing.status !== 'BORRADOR') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar reportes en estado BORRADOR' },
        { status: 400 }
      )
    }

    await db.expenseReport.delete({ where: { id } })

    return NextResponse.json({ data: { id }, message: 'Reporte eliminado correctamente' })
  } catch (error) {
    console.error('[EXPENSE_REPORT_DELETE]', error)
    return NextResponse.json({ error: 'Error al eliminar reporte' }, { status: 500 })
  }
}

export { recalcTotal }
