import { PrismaClient } from '@prisma/client'
import Database from 'better-sqlite3'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  const dbPath = path.join(process.cwd(), 'db', 'custom.db')
  console.log('Reading from SQLite:', dbPath)
  
  const sqlite = new Database(dbPath, { readonly: true })
  
  // Migrate sectors
  const sectors = sqlite.prepare('SELECT * FROM Sector').all() as any[]
  for (const s of sectors) {
    await prisma.sector.upsert({
      where: { id: s.id },
      update: { name: s.name },
      create: { id: s.id, name: s.name },
    })
  }
  console.log(`Migrated ${sectors.length} sectors`)

  // Migrate repair types
  const repairTypes = sqlite.prepare('SELECT * FROM RepairType').all() as any[]
  for (const r of repairTypes) {
    await prisma.repairType.upsert({
      where: { id: r.id },
      update: { name: r.name },
      create: { id: r.id, name: r.name },
    })
  }
  console.log(`Migrated ${repairTypes.length} repair types`)

  // Migrate priorities
  const priorities = sqlite.prepare('SELECT * FROM Priority').all() as any[]
  for (const p of priorities) {
    await prisma.priority.upsert({
      where: { id: p.id },
      update: { name: p.name, color: p.color, order: p.order },
      create: { id: p.id, name: p.name, color: p.color, order: p.order },
    })
  }
  console.log(`Migrated ${priorities.length} priorities`)

  // Migrate statuses
  const statuses = sqlite.prepare('SELECT * FROM Status').all() as any[]
  for (const s of statuses) {
    await prisma.status.upsert({
      where: { id: s.id },
      update: { name: s.name, color: s.color, order: s.order },
      create: { id: s.id, name: s.name, color: s.color, order: s.order },
    })
  }
  console.log(`Migrated ${statuses.length} statuses`)

  // Migrate responsibles
  const responsibles = sqlite.prepare('SELECT * FROM Responsible').all() as any[]
  for (const r of responsibles) {
    await prisma.responsible.upsert({
      where: { id: r.id },
      update: { name: r.name },
      create: { id: r.id, name: r.name },
    })
  }
  console.log(`Migrated ${responsibles.length} responsibles`)

  // Migrate etapas
  const etapas = sqlite.prepare('SELECT * FROM Etapa').all() as any[]
  for (const e of etapas) {
    await prisma.etapa.upsert({
      where: { id: e.id },
      update: { name: e.name, color: e.color, order: e.order },
      create: { id: e.id, name: e.name, color: e.color, order: e.order },
    })
  }
  console.log(`Migrated ${etapas.length} etapas`)

  // Migrate tasks
  const tasks = sqlite.prepare('SELECT * FROM Task').all() as any[]
  for (const t of tasks) {
    await prisma.task.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        description: t.description,
        sector: t.sector,
        repairType: t.repairType,
        priority: t.priority,
        etapa: t.etapa || '',
        status: t.status || 'Pendiente',
        responsible: t.responsible,
        estimatedTime: t.estimatedTime,
        amount: t.amount,
        startDate: t.startDate ? new Date(t.startDate) : null,
        endDate: t.endDate ? new Date(t.endDate) : null,
        comments: t.comments,
        beforePhotos: t.beforePhotos || '[]',
        afterPhotos: t.afterPhotos || '[]',
        workOrder: t.workOrder || 0,
      },
    })
  }
  console.log(`Migrated ${tasks.length} tasks`)

  // Migrate task history
  try {
    const history = sqlite.prepare('SELECT * FROM TaskHistory').all() as any[]
    for (const h of history) {
      await prisma.taskHistory.create({
        data: {
          id: h.id,
          taskId: h.taskId,
          action: h.action,
          field: h.field,
          oldValue: h.oldValue,
          newValue: h.newValue,
          changedBy: h.changedBy,
          createdAt: new Date(h.createdAt),
        },
      }).catch(() => {}) // Skip duplicates
    }
    console.log(`Migrated ${history.length} history entries`)
  } catch (e) {
    console.log('No TaskHistory table found, skipping')
  }

  // Migrate materials
  try {
    const materials = sqlite.prepare('SELECT * FROM Material').all() as any[]
    for (const m of materials) {
      await prisma.material.create({
        data: {
          id: m.id,
          taskId: m.taskId,
          name: m.name,
          quantity: m.quantity,
          unit: m.unit,
          unitPrice: m.unitPrice,
          totalPrice: m.totalPrice,
          category: m.category,
          notes: m.notes,
        },
      }).catch(() => {}) // Skip duplicates
    }
    console.log(`Migrated ${materials.length} materials`)
  } catch (e) {
    console.log('No Material table found, skipping')
  }

  sqlite.close()
  console.log('Migration completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
