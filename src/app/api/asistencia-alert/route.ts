import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/asistencia-alert — Get the alert config (singleton)
export async function GET() {
  try {
    let config = await db.asistenciaAlertConfig.findFirst()
    if (!config) {
      config = await db.asistenciaAlertConfig.create({
        data: { dayOfMonth: 29, active: true, message: 'Informe mensual de asistencias: Revisar y enviar listado de atrasos e inasistencias' },
      })
    }
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching asistencia alert config:', error)
    return NextResponse.json({ error: 'Error al obtener configuración de alerta' }, { status: 500 })
  }
}

// PUT /api/asistencia-alert — Update the alert config
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { dayOfMonth, active, message } = body

    if (dayOfMonth !== undefined && (dayOfMonth < 1 || dayOfMonth > 31)) {
      return NextResponse.json({ error: 'El día del mes debe estar entre 1 y 31' }, { status: 400 })
    }

    let config = await db.asistenciaAlertConfig.findFirst()
    if (!config) {
      config = await db.asistenciaAlertConfig.create({
        data: {
          dayOfMonth: dayOfMonth || 29,
          active: active !== undefined ? active : true,
          message: message || 'Informe mensual de asistencias: Revisar y enviar listado de atrasos e inasistencias',
        },
      })
    } else {
      config = await db.asistenciaAlertConfig.update({
        where: { id: config.id },
        data: {
          ...(dayOfMonth !== undefined && { dayOfMonth }),
          ...(active !== undefined && { active }),
          ...(message !== undefined && { message }),
        },
      })
    }
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error updating asistencia alert config:', error)
    return NextResponse.json({ error: 'Error al actualizar configuración de alerta' }, { status: 500 })
  }
}
