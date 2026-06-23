import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/module-alerts — List alerts, optionally filtered by module or status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const module = searchParams.get('module')
    const status = searchParams.get('status')
    const all = searchParams.get('all') === 'true' // fetch all modules

    const where: any = {}
    if (module) where.module = module
    if (status) where.status = status

    const alerts = await db.moduleAlert.findMany({
      where,
      orderBy: [{ module: 'asc' }, { dayOfMonth: 'asc' }],
    })

    // Auto-reset: for auto alerts with status 'completada', check if month changed
    const now = new Date()
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const needsReset = alerts.filter(a =>
      a.auto && a.status === 'completada' && a.monthYear && a.monthYear !== currentMonthYear
    )

    if (needsReset.length > 0) {
      await Promise.all(needsReset.map(a =>
        db.moduleAlert.update({
          where: { id: a.id },
          data: { status: 'activa', monthYear: currentMonthYear, completedBy: null, completedAt: null },
        })
      ))
      // Re-fetch after reset
      const refreshed = await db.moduleAlert.findMany({ where, orderBy: [{ module: 'asc' }, { dayOfMonth: 'asc' }] })
      return NextResponse.json(refreshed)
    }

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
    const { module, alertType, title, message, dayOfMonth, active, auto, targetRole, priority, monthYear } = body

    if (!module || !title || !message) {
      return NextResponse.json({ error: 'module, title y message son requeridos' }, { status: 400 })
    }

    const validModules = ['mantenimiento', 'rendicion', 'compras', 'anticipos', 'asistencias', 'tareas']
    if (!validModules.includes(module)) {
      return NextResponse.json({ error: `Módulo inválido. Válidos: ${validModules.join(', ')}` }, { status: 400 })
    }

    const now = new Date()
    const currentMonthYear = monthYear || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

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
        status: 'activa',
        monthYear: currentMonthYear,
      },
    })

    return NextResponse.json(alert, { status: 201 })
  } catch (error) {
    console.error('Error creating module alert:', error)
    return NextResponse.json({ error: 'Error al crear alerta' }, { status: 500 })
  }
}
