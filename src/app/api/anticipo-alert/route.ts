import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/anticipo-alert — Get the alert config (singleton)
export async function GET() {
  try {
    let config = await db.anticipoAlertConfig.findFirst()
    if (!config) {
      // Create default config if none exists
      config = await db.anticipoAlertConfig.create({
        data: { dayOfMonth: 13, active: true, message: 'Plazo vencido: Anticipos pendientes deben ser pagados' },
      })
    }
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching alert config:', error)
    return NextResponse.json({ error: 'Error al obtener configuración de alerta' }, { status: 500 })
  }
}

// PUT /api/anticipo-alert — Update the alert config
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { dayOfMonth, active, message } = body

    if (dayOfMonth !== undefined && (dayOfMonth < 1 || dayOfMonth > 31)) {
      return NextResponse.json({ error: 'El día del mes debe estar entre 1 y 31' }, { status: 400 })
    }

    let config = await db.anticipoAlertConfig.findFirst()
    if (!config) {
      config = await db.anticipoAlertConfig.create({
        data: {
          dayOfMonth: dayOfMonth || 13,
          active: active !== undefined ? active : true,
          message: message || 'Plazo vencido: Anticipos pendientes deben ser pagados',
        },
      })
    } else {
      config = await db.anticipoAlertConfig.update({
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
    console.error('Error updating alert config:', error)
    return NextResponse.json({ error: 'Error al actualizar configuración de alerta' }, { status: 500 })
  }
}
