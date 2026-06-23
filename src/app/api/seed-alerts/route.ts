import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/seed-alerts — Seed default alerts for all modules
export async function GET() {
  try {
    const existing = await db.moduleAlert.count()
    if (existing > 0) {
      return NextResponse.json({ ok: true, message: `Ya existen ${existing} alertas`, count: existing })
    }

    const alerts = await db.moduleAlert.createMany({
      data: [
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
      ],
    })

    return NextResponse.json({ ok: true, message: `Se crearon ${alerts.count} alertas por defecto`, count: alerts.count })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
