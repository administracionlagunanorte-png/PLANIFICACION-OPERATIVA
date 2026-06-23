import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const defaultAlerts = [
  // MANTENIMIENTO
  {
    module: 'mantenimiento',
    alertType: 'vencimiento',
    title: 'LV Próximas a Vencer',
    message: 'Existen Listas de Verificación pendientes que deben ser completadas. Revise el calendario de mantenciones.',
    dayOfMonth: 1,
    active: true,
    auto: true,
    targetRole: 'ALL',
    priority: 'warning',
  },
  {
    module: 'mantenimiento',
    alertType: 'urgente',
    title: 'Mantenciones Vencidas',
    message: 'Hay mantenciones que no se han ejecutado en la fecha programada. Se requiere atención inmediata.',
    dayOfMonth: 15,
    active: true,
    auto: true,
    targetRole: 'SUPERVISOR',
    priority: 'urgent',
  },
  {
    module: 'mantenimiento',
    alertType: 'informe',
    title: 'Informe Mensual de Mantención',
    message: 'Debe generarse el informe mensual de mantenciones ejecutadas y pendientes.',
    dayOfMonth: 25,
    active: true,
    auto: true,
    targetRole: 'ADMIN',
    priority: 'info',
  },

  // RENDICIÓN
  {
    module: 'rendicion',
    alertType: 'vencimiento',
    title: 'Rendiciones Pendientes',
    message: 'Existen rendiciones de gastos en estado BORRADOR que deben ser enviadas para revisión.',
    dayOfMonth: 5,
    active: true,
    auto: true,
    targetRole: 'ALL',
    priority: 'warning',
  },
  {
    module: 'rendicion',
    alertType: 'urgente',
    title: 'Rendiciones Vencidas',
    message: 'Plazo vencido para enviar rendiciones de gastos. Complete y envíe sus rendiciones pendientes.',
    dayOfMonth: 20,
    active: true,
    auto: true,
    targetRole: 'SUPERVISOR',
    priority: 'urgent',
  },

  // COMPRAS
  {
    module: 'compras',
    alertType: 'recordatorio',
    title: 'Solicitudes de Compra Pendientes',
    message: 'Hay solicitudes de compra pendientes de revisión que requieren aprobación.',
    dayOfMonth: 5,
    active: true,
    auto: true,
    targetRole: 'ADMIN',
    priority: 'warning',
  },
  {
    module: 'compras',
    alertType: 'urgente',
    title: 'Compras Urgentes sin Cotizar',
    message: 'Existen solicitudes de compra con prioridad ALTA que no tienen cotizaciones asignadas.',
    dayOfMonth: 10,
    active: true,
    auto: true,
    targetRole: 'SUPERVISOR',
    priority: 'urgent',
  },

  // ANTICIPOS
  {
    module: 'anticipos',
    alertType: 'vencimiento',
    title: 'Anticipos Pendientes de Pago',
    message: 'Plazo vencido: Anticipos pendientes deben ser pagados. Revise los anticipos del período actual.',
    dayOfMonth: 13,
    active: true,
    auto: true,
    targetRole: 'ALL',
    priority: 'warning',
  },
  {
    module: 'anticipos',
    alertType: 'urgente',
    title: 'Anticipos con Pago Atrasado',
    message: 'Los anticipos del período siguen sin ser pagados. Se requiere acción inmediata.',
    dayOfMonth: 20,
    active: true,
    auto: true,
    targetRole: 'ADMIN',
    priority: 'critical',
  },

  // TAREAS (Planificación Operativa)
  {
    module: 'tareas',
    alertType: 'vencimiento',
    title: 'Tareas Pendientes de Aprobación',
    message: 'Existen tareas que requieren revisión y aprobación. Revise las tareas pendientes en el panel de Planificación Operativa.',
    dayOfMonth: 3,
    active: true,
    auto: true,
    targetRole: 'SUPERVISOR',
    priority: 'warning',
  },
  {
    module: 'tareas',
    alertType: 'urgente',
    title: 'Tareas Vencidas sin Completar',
    message: 'Hay tareas con fecha de término vencida que no han sido completadas. Se requiere atención inmediata.',
    dayOfMonth: 15,
    active: true,
    auto: true,
    targetRole: 'ALL',
    priority: 'urgent',
  },
  {
    module: 'tareas',
    alertType: 'informe',
    title: 'Informe Semanal de Tareas',
    message: 'Debe generarse el informe semanal de avance de tareas y planificación operativa.',
    dayOfMonth: 25,
    active: true,
    auto: true,
    targetRole: 'ADMIN',
    priority: 'info',
  },

  // ASISTENCIAS
  {
    module: 'asistencias',
    alertType: 'informe',
    title: 'Informe de Asistencias Mensual',
    message: 'Informe mensual de asistencias: Revisar y enviar listado de atrasos e inasistencias a Administración.',
    dayOfMonth: 29,
    active: true,
    auto: true,
    targetRole: 'SUPERVISOR',
    priority: 'warning',
  },
  {
    module: 'asistencias',
    alertType: 'vencimiento',
    title: 'Informe de Asistencias Vencido',
    message: 'El informe mensual de inasistencias y atrasos no ha sido enviado. Debe enviarse a Administración.',
    dayOfMonth: 29,
    active: true,
    auto: true,
    targetRole: 'ADMIN',
    priority: 'urgent',
  },
]

// GET /api/seed-alerts — Seed default alerts for all modules (idempotent)
export async function GET() {
  try {
    // Get existing alerts to check which ones already exist
    const existing = await db.moduleAlert.findMany({
      select: { module: true, title: true },
    })

    const existingKeys = new Set(existing.map(a => `${a.module}::${a.title}`))

    // Only create alerts that don't exist yet
    const newAlerts = defaultAlerts.filter(a => !existingKeys.has(`${a.module}::${a.title}`))

    if (newAlerts.length === 0) {
      return NextResponse.json({ ok: true, message: `Ya existen ${existing.length} alertas, no hay nuevas para crear`, count: existing.length })
    }

    const result = await db.moduleAlert.createMany({ data: newAlerts })

    return NextResponse.json({
      ok: true,
      message: `Se crearon ${result.count} alertas nuevas (ya existían ${existing.length})`,
      created: result.count,
      total: existing.length + result.count,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
