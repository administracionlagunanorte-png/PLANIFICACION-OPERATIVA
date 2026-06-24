import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

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

  // TAREAS
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

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Create admin user if not exists
  const existingUsers = await prisma.user.count()
  if (existingUsers === 0) {
    const hashedPassword = await bcrypt.hash('admin123', 12)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@lagunanorte.cl',
        name: 'Administrador',
        password: hashedPassword,
        role: 'ADMIN',
      },
    })
    console.log('✅ Admin user created:', admin.email)
  } else {
    console.log(`ℹ️  ${existingUsers} users already exist, skipping admin creation`)
  }

  // 2. Create default sectors if not exist
  const existingSectors = await prisma.sector.count()
  if (existingSectors === 0) {
    const sectors = ['Torre A', 'Torre B', 'Torre C', 'Estacionamiento', 'Areas Comunes', 'Piscina', 'Gym', 'Lobby']
    for (const name of sectors) {
      await prisma.sector.create({ data: { name } })
    }
    console.log('✅ Sectors created')
  }

  // 3. Create default priorities if not exist
  const existingPriorities = await prisma.priority.count()
  if (existingPriorities === 0) {
    const priorities = [
      { name: 'Baja', color: '#6b7280', order: 0 },
      { name: 'Media', color: '#3b82f6', order: 1 },
      { name: 'Alta', color: '#f59e0b', order: 2 },
      { name: 'Urgente', color: '#ef4444', order: 3 },
    ]
    for (const p of priorities) {
      await prisma.priority.create({ data: p })
    }
    console.log('✅ Priorities created')
  }

  // 4. Create default statuses if not exist
  const existingStatuses = await prisma.status.count()
  if (existingStatuses === 0) {
    const statuses = [
      { name: 'Pendiente', color: '#6b7280', order: 0 },
      { name: 'En Progreso', color: '#3b82f6', order: 1 },
      { name: 'Completada', color: '#10b981', order: 2 },
      { name: 'Cancelada', color: '#ef4444', order: 3 },
    ]
    for (const s of statuses) {
      await prisma.status.create({ data: s })
    }
    console.log('✅ Statuses created')
  }

  // 5. Create default repair types if not exist
  const existingRepairTypes = await prisma.repairType.count()
  if (existingRepairTypes === 0) {
    const repairTypes = ['Plomería', 'Electricidad', 'Pintura', 'Carpintería', 'Jardinería', 'Limpieza', 'Otro']
    for (const name of repairTypes) {
      await prisma.repairType.create({ data: { name } })
    }
    console.log('✅ Repair types created')
  }

  // 6. Create default responsibles if not exist
  const existingResponsibles = await prisma.responsible.count()
  if (existingResponsibles === 0) {
    const responsibles = ['Carlos Mendoza', 'Pedro Soto', 'María López', 'Juan Pérez']
    for (const name of responsibles) {
      await prisma.responsible.create({ data: { name } })
    }
    console.log('✅ Responsibles created')
  }

  // 7. Create default etapas if not exist
  const existingEtapas = await prisma.etapa.count()
  if (existingEtapas === 0) {
    const etapas = [
      { name: 'Solicitud', color: '#6b7280', order: 0 },
      { name: 'Evaluación', color: '#3b82f6', order: 1 },
      { name: 'Aprobación', color: '#f59e0b', order: 2 },
      { name: 'Ejecución', color: '#10b981', order: 3 },
      { name: 'Verificación', color: '#8b5cf6', order: 4 },
      { name: 'Cierre', color: '#6b7280', order: 5 },
    ]
    for (const e of etapas) {
      await prisma.etapa.create({ data: e })
    }
    console.log('✅ Etapas created')
  }

  // 8. Create expense categories if not exist
  const existingCategories = await prisma.expenseCategory.count()
  if (existingCategories === 0) {
    const categories = [
      { name: 'Materiales', icon: '📦' },
      { name: 'Mano de Obra', icon: '👷' },
      { name: 'Transporte', icon: '🚛' },
      { name: 'Servicios', icon: '🔧' },
      { name: 'Equipos', icon: '🛠️' },
      { name: 'Otros', icon: '📋' },
    ]
    for (const c of categories) {
      await prisma.expenseCategory.create({ data: c })
    }
    console.log('✅ Expense categories created')
  }

  // 9. Seed default alerts (idempotent)
  const existingAlerts = await prisma.moduleAlert.findMany({
    select: { module: true, title: true },
  })
  const existingKeys = new Set(existingAlerts.map(a => `${a.module}::${a.title}`))
  const newAlerts = defaultAlerts.filter(a => !existingKeys.has(`${a.module}::${a.title}`))

  if (newAlerts.length > 0) {
    const result = await prisma.moduleAlert.createMany({ data: newAlerts })
    console.log(`✅ Created ${result.count} new alerts (total: ${existingAlerts.length + result.count})`)
  } else {
    console.log(`ℹ️  ${existingAlerts.length} alerts already exist, no new alerts to create`)
  }

  // 10. Create legacy alert configs if not exist
  const existingAnticipoAlert = await prisma.anticipoAlertConfig.count()
  if (existingAnticipoAlert === 0) {
    await prisma.anticipoAlertConfig.create({
      data: {
        dayOfMonth: 13,
        active: true,
        message: 'Plazo vencido: Anticipos pendientes deben ser pagados',
      },
    })
    console.log('✅ Anticipo alert config created')
  }

  const existingAsistenciaAlert = await prisma.asistenciaAlertConfig.count()
  if (existingAsistenciaAlert === 0) {
    await prisma.asistenciaAlertConfig.create({
      data: {
        dayOfMonth: 29,
        active: true,
        message: 'Informe mensual de asistencias: Revisar y enviar listado de atrasos e inasistencias',
      },
    })
    console.log('✅ Asistencia alert config created')
  }

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
