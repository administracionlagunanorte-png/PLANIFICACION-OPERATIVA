import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/setup-asistencias — One-time setup to create default alert config
export async function GET() {
  try {
    let alertConfig = await db.asistenciaAlertConfig.findFirst()
    if (!alertConfig) {
      alertConfig = await db.asistenciaAlertConfig.create({
        data: {
          dayOfMonth: 29,
          active: true,
          message: 'Informe mensual de asistencias: Revisar y enviar listado de atrasos e inasistencias',
        },
      })
    }
    return NextResponse.json({ ok: true, alertConfig, message: 'Asistencias module set up successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
