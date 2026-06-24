import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/asistencias/debug — Returns database state for debugging
export async function GET() {
  try {
    const totalRecords = await db.asistenciaRecord.count()
    const totalWorkers = await db.worker.count()

    // Get records grouped by month
    const records = await db.asistenciaRecord.findMany({
      include: { worker: true },
      orderBy: [{ date: 'desc' }],
      take: 50,
    })

    // Get distinct months
    const rawMonths = await db.$queryRaw<Array<{ month: string }>>`
      SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') as month
      FROM asistencia_records
      ORDER BY month DESC
    `

    // Count by type
    const atrasosCount = await db.asistenciaRecord.count({ where: { type: 'ATRASO' } })
    const ausenciasCount = await db.asistenciaRecord.count({ where: { type: 'AUSENCIA' } })

    // Workers with schedules
    const workersWithSchedule = await db.worker.findMany({
      where: { horaEntrada: { not: null } },
      select: { id: true, nombre: true, rut: true, horaEntrada: true, horaSalida: true },
    })

    return NextResponse.json({
      totalRecords,
      totalWorkers,
      atrasosCount,
      ausenciasCount,
      availableMonths: rawMonths.map(m => m.month),
      workersWithSchedule,
      recentRecords: records.map(r => ({
        id: r.id,
        workerId: r.workerId,
        workerNombre: r.worker?.nombre,
        workerRut: r.worker?.rut,
        date: r.date,
        type: r.type,
        minutesLate: r.minutesLate,
        reason: r.reason,
      })),
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
