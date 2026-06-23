import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/module-alerts — List alerts, optionally filtered by module
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const module = searchParams.get('module')

    const where: any = {}
    if (module) where.module = module

    const alerts = await db.moduleAlert.findMany({
      where,
      orderBy: [{ module: 'asc' }, { dayOfMonth: 'asc' }],
    })

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error fetching module alerts:', error)
    return NextResponse.json({ error: 'Error al obtener alertas' }, { status: 500 })
  }
}

// POST /api/module-alerts — Create a new alert
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { module, alertType, title, message, dayOfMonth, active, auto, targetRole, priority } = body

    if (!module || !title || !message) {
      return NextResponse.json({ error: 'module, title y message son requeridos' }, { status: 400 })
    }

    const validModules = ['mantenimiento', 'rendicion', 'compras', 'anticipos', 'asistencias']
    if (!validModules.includes(module)) {
      return NextResponse.json({ error: `Módulo inválido. Válidos: ${validModules.join(', ')}` }, { status: 400 })
    }

    const validRoles = ['ALL', 'ADMIN', 'SUPERVISOR', 'USER']
    if (targetRole && !validRoles.includes(targetRole)) {
      return NextResponse.json({ error: `Rol inválido. Válidos: ${validRoles.join(', ')}` }, { status: 400 })
    }

    const alert = await db.moduleAlert.create({
      data: {
        module,
        alertType: alertType || 'recordatorio',
        title,
        message,
        dayOfMonth: dayOfMonth || 1,
        active: active !== undefined ? active : true,
        auto: auto !== undefined ? auto : true,
        targetRole: targetRole || 'ALL',
        priority: priority || 'warning',
      },
    })

    return NextResponse.json(alert, { status: 201 })
  } catch (error) {
    console.error('Error creating module alert:', error)
    return NextResponse.json({ error: 'Error al crear alerta' }, { status: 500 })
  }
}
