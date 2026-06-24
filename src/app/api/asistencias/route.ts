import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/asistencias — List records with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')   // 1-12
    const year = searchParams.get('year')     // 2026
    const type = searchParams.get('type')     // AUSENCIA | ATRASO
    const workerId = searchParams.get('workerId')

    const where: any = {}
    if (month && year) {
      const m = parseInt(month)
      const y = parseInt(year)
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 1)
      where.date = { gte: start, lt: end }
    }
    if (type) where.type = type
    if (workerId) where.workerId = workerId

    const records = await db.asistenciaRecord.findMany({
      where,
      include: { worker: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(records)
  } catch (error) {
    console.error('Error fetching asistencias:', error)
    return NextResponse.json({ error: 'Error al obtener registros de asistencia' }, { status: 500 })
  }
}

// POST /api/asistencias — Create a new record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workerId, date, type, minutesLate, reason, reportedBy } = body

    if (!workerId || !date || !type) {
      return NextResponse.json({ error: 'workerId, date y type son requeridos' }, { status: 400 })
    }
    if (!['AUSENCIA', 'ATRASO'].includes(type)) {
      return NextResponse.json({ error: 'type debe ser AUSENCIA o ATRASO' }, { status: 400 })
    }
    if (type === 'ATRASO' && (!minutesLate || minutesLate <= 0)) {
      return NextResponse.json({ error: 'Los minutos de atraso son requeridos para ATRASO' }, { status: 400 })
    }

    const record = await db.asistenciaRecord.create({
      data: {
        workerId,
        date: new Date(date),
        type,
        minutesLate: type === 'ATRASO' ? minutesLate : 0,
        reason: reason || null,
        reportedBy: reportedBy || null,
      },
      include: { worker: true },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Error creating asistencia:', error)
    return NextResponse.json({ error: 'Error al crear registro de asistencia' }, { status: 500 })
  }
}

// DELETE /api/asistencias?month=X&year=Y — Delete all records for a given month
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    if (!month || !year) {
      return NextResponse.json({ error: 'month y year son requeridos' }, { status: 400 })
    }

    const m = parseInt(month)
    const y = parseInt(year)
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 1)

    const result = await db.asistenciaRecord.deleteMany({
      where: {
        date: { gte: start, lt: end },
      },
    })

    return NextResponse.json({ deleted: result.count })
  } catch (error) {
    console.error('Error deleting asistencias:', error)
    return NextResponse.json({ error: 'Error al eliminar registros de asistencia' }, { status: 500 })
  }
}
