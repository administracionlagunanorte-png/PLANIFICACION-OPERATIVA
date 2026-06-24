import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/asistencias/reporte?month=X&year=Y — Returns all records for a report
// This is a dedicated endpoint that bypasses any client-side issues
export async function GET(req: NextRequest) {
  try {
    // Ensure columns exist
    try {
      await db.$executeRawUnsafe(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS "cargo" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS "turnoA" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS "turnoB" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS "horaEntrada" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS "horaSalida" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE asistencia_records ADD COLUMN IF NOT EXISTS "tipoJustificacion" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE asistencia_records ADD COLUMN IF NOT EXISTS "justificacion" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE asistencia_records ADD COLUMN IF NOT EXISTS "comprobanteUrl" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE asistencia_records ADD COLUMN IF NOT EXISTS "comprobanteNombre" TEXT`)
    } catch {}

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // First try with month filter
    let records: any[] = []
    if (month && year) {
      const m = parseInt(month)
      const y = parseInt(year)
      const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0))
      const end = new Date(Date.UTC(y, m, 1, 0, 0, 0))

      records = await db.asistenciaRecord.findMany({
        where: { date: { gte: start, lt: end } },
        include: { worker: true },
        orderBy: [{ date: 'asc' }],
      })
    }

    // If no records with filter, try getting ALL records
    if (records.length === 0) {
      records = await db.asistenciaRecord.findMany({
        include: { worker: true },
        orderBy: [{ date: 'asc' }],
        take: 500,
      })
    }

    // Also get total count for diagnostics
    const totalCount = await db.asistenciaRecord.count()

    return NextResponse.json({
      records,
      totalCount,
      filteredCount: records.length,
      month: month ? parseInt(month) : null,
      year: year ? parseInt(year) : null,
    })
  } catch (error) {
    console.error('Error fetching report data:', error)
    return NextResponse.json({ error: 'Error al obtener datos del informe', records: [], totalCount: 0 }, { status: 500 })
  }
}
