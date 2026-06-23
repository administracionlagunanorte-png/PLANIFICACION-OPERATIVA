import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/module-alerts/[id] — Update an alert
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { module, alertType, title, message, dayOfMonth, active, auto, targetRole, priority, status, completedBy } = body

    const data: any = {}
    if (module) data.module = module
    if (alertType) data.alertType = alertType
    if (title !== undefined) data.title = title
    if (message !== undefined) data.message = message
    if (dayOfMonth !== undefined) data.dayOfMonth = dayOfMonth
    if (active !== undefined) data.active = active
    if (auto !== undefined) data.auto = auto
    if (targetRole) data.targetRole = targetRole
    if (priority) data.priority = priority

    // Handle status changes
    if (status === 'completada') {
      data.status = 'completada'
      data.completedBy = completedBy || 'Admin'
      data.completedAt = new Date()
    } else if (status === 'activa') {
      data.status = 'activa'
      data.completedBy = null
      data.completedAt = null
    }

    // Update monthYear if provided
    if (body.monthYear !== undefined) data.monthYear = body.monthYear

    const alert = await db.moduleAlert.update({
      where: { id },
      data,
    })

    return NextResponse.json(alert)
  } catch (error) {
    console.error('Error updating module alert:', error)
    return NextResponse.json({ error: 'Error al actualizar alerta' }, { status: 500 })
  }
}

// DELETE /api/module-alerts/[id] — Delete an alert
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.moduleAlert.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting module alert:', error)
    return NextResponse.json({ error: 'Error al eliminar alerta' }, { status: 500 })
  }
}
