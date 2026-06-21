import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/expense-reports — list all with optional status filter, search, pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { responsible: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [reports, total] = await Promise.all([
      db.expenseReport.findMany({
        where,
        include: {
          items: {
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.expenseReport.count({ where }),
    ])

    const enriched = reports.map((r) => ({
      ...r,
      itemCount: r.items.length,
      items: undefined,
    }))

    return NextResponse.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[EXPENSE_REPORTS_GET]', error)
    return NextResponse.json({ error: 'Error al obtener reportes de gastos' }, { status: 500 })
  }
}

// POST /api/expense-reports — create new report with auto correlativeNumber
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, responsible } = body

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'El título es requerido' }, { status: 400 })
    }

    // Get max correlativeNumber and add 1
    const maxResult = await db.expenseReport.aggregate({
      _max: { correlativeNumber: true },
    })
    const correlativeNumber = (maxResult._max.correlativeNumber ?? 0) + 1

    const report = await db.expenseReport.create({
      data: {
        correlativeNumber,
        title: title.trim(),
        description: description?.trim() || null,
        responsible: responsible?.trim() || null,
        status: 'BORRADOR',
        totalAmount: 0,
      },
      include: { items: true },
    })

    return NextResponse.json({ data: report }, { status: 201 })
  } catch (error) {
    console.error('[EXPENSE_REPORTS_POST]', error)
    return NextResponse.json({ error: 'Error al crear reporte de gastos' }, { status: 500 })
  }
}
