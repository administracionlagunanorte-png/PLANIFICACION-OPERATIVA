import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/asistencias/[id] — Update a record
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { workerId, date, type, minutesLate, reason, reportedBy } = body

    if (type && !['AUSENCIA', 'ATRASO'].includes(type)) {
      return NextResponse.json({ error: 'type debe ser AUSENCIA o ATRASO' }, { status: 400 })
    }

    const data: any = {}
    if (workerId) data.workerId = workerId
    if (date) data.date = new Date(date)
    if (type) data.type = type
    if (minutesLate !== undefined) data.minutesLate = minutesLate
    if (reason !== undefined) data.reason = reason
    if (reportedBy !== undefined) data.reportedBy = reportedBy
    if (type === 'ATRASO' && data.minutesLate === undefined) data.minutesLate = 0
    if (type === 'AUSENCIA') data.minutesLate = 0

    const record = await db.asistenciaRecord.update({
      where: { id },
      data,
      include: { worker: true },
    })

    return NextResponse.json(record)
  } catch (error) {
    console.error('Error updating asistencia:', error)
    return NextResponse.json({ error: 'Error al actualizar registro de asistencia' }, { status: 500 })
  }
}

// DELETE /api/asistencias/[id] — Delete a record
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.asistenciaRecord.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting asistencia:', error)
    return NextResponse.json({ error: 'Error al eliminar registro de asistencia' }, { status: 500 })
  }
}
