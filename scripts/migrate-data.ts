import { PrismaClient } from '@prisma/client'
import Database from 'better-sqlite3'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  const dbPath = path.join(process.cwd(), 'db', 'custom.db')
  console.log('Reading from SQLite:', dbPath)
  
  const sqlite = new Database(dbPath, { readonly: true })
  
  // Migrate sectors - use name as unique key since seed may have created some
  const sectors = sqlite.prepare('SELECT * FROM Sector').all() as any[]
  let sectorCount = 0
  for (const s of sectors) {
    try {
      await prisma.sector.upsert({
        where: { name: s.name },
        update: {},
        create: { name: s.name },
      })
      sectorCount++
    } catch (e) {
      console.log(`Skip sector: ${s.name}`)
    }
  }
  console.log(`Migrated ${sectorCount} sectors`)

  // Migrate repair types
  const repairTypes = sqlite.prepare('SELECT * FROM RepairType').all() as any[]
  let rtCount = 0
  for (const r of repairTypes) {
    try {
      await prisma.repairType.upsert({
        where: { name: r.name },
        update: {},
        create: { name: r.name },
      })
      rtCount++
    } catch (e) {
      console.log(`Skip repair type: ${r.name}`)
    }
  }
  console.log(`Migrated ${rtCount} repair types`)

  // Migrate priorities - update existing ones from seed with correct colors/orders
  const priorities = sqlite.prepare('SELECT * FROM Priority').all() as any[]
  let prioCount = 0
  for (const p of priorities) {
    try {
      await prisma.priority.upsert({
        where: { name: p.name },
        update: { color: p.color, order: p.order },
        create: { name: p.name, color: p.color, order: p.order },
      })
      prioCount++
    } catch (e) {
      console.log(`Skip priority: ${p.name}`)
    }
  }
  console.log(`Migrated ${prioCount} priorities`)

  // Migrate statuses
  const statuses = sqlite.prepare('SELECT * FROM Status').all() as any[]
  let stCount = 0
  for (const s of statuses) {
    try {
      await prisma.status.upsert({
        where: { name: s.name },
        update: { color: s.color, order: s.order },
        create: { name: s.name, color: s.color, order: s.order },
      })
      stCount++
    } catch (e) {
      console.log(`Skip status: ${s.name}`)
    }
  }
  console.log(`Migrated ${stCount} statuses`)

  // Migrate responsibles
  const responsibles = sqlite.prepare('SELECT * FROM Responsible').all() as any[]
  let respCount = 0
  for (const r of responsibles) {
    try {
      await prisma.responsible.upsert({
        where: { name: r.name },
        update: {},
        create: { name: r.name },
      })
      respCount++
    } catch (e) {
      console.log(`Skip responsible: ${r.name}`)
    }
  }
  console.log(`Migrated ${respCount} responsibles`)

  // Migrate etapas
  const etapas = sqlite.prepare('SELECT * FROM Etapa').all() as any[]
  let etCount = 0
  for (const e of etapas) {
    try {
      await prisma.etapa.upsert({
        where: { name: e.name },
        update: { color: e.color, order: e.order },
        create: { name: e.name, color: e.color, order: e.order },
      })
      etCount++
    } catch (e2) {
      console.log(`Skip etapa`)
    }
  }
  console.log(`Migrated ${etCount} etapas`)

  // Migrate tasks - use description + sector as pseudo-key to avoid duplicates
  const tasks = sqlite.prepare('SELECT * FROM Task').all() as any[]
  let taskCount = 0
  for (const t of tasks) {
    try {
      // Check if task already exists by description + sector
      const existing = await prisma.task.findFirst({
        where: { description: t.description, sector: t.sector }
      })
      if (existing) {
        console.log(`Skip existing task: ${t.description.substring(0, 40)}...`)
        continue
      }
      
      await prisma.task.create({
        data: {
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
      taskCount++
    } catch (e: any) {
      console.log(`Error migrating task: ${t.description?.substring(0, 30)}... - ${e.message?.substring(0, 80)}`)
    }
  }
  console.log(`Migrated ${taskCount} tasks`)

  // Migrate task history
  try {
    const history = sqlite.prepare('SELECT * FROM TaskHistory').all() as any[]
    let histCount = 0
    for (const h of history) {
      try {
        // Find the matching task in new DB by description
        const oldTask = tasks.find((t: any) => t.id === h.taskId)
        if (!oldTask) continue
        const newTask = await prisma.task.findFirst({
          where: { description: oldTask.description, sector: oldTask.sector }
        })
        if (!newTask) continue
        
        await prisma.taskHistory.create({
          data: {
            taskId: newTask.id,
            action: h.action,
            field: h.field,
            oldValue: h.oldValue,
            newValue: h.newValue,
            changedBy: h.changedBy,
          },
        })
        histCount++
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`Migrated ${histCount} history entries`)
  } catch (e) {
    console.log('No TaskHistory table found, skipping')
  }

  // Migrate materials
  try {
    const materials = sqlite.prepare('SELECT * FROM Material').all() as any[]
    let matCount = 0
    for (const m of materials) {
      try {
        // Find matching task
        const oldTask = tasks.find((t: any) => t.id === m.taskId)
        if (!oldTask) continue
        const newTask = await prisma.task.findFirst({
          where: { description: oldTask.description, sector: oldTask.sector }
        })
        if (!newTask) continue
        
        await prisma.material.create({
          data: {
            taskId: newTask.id,
            name: m.name,
            quantity: m.quantity,
            unit: m.unit,
            unitPrice: m.unitPrice,
            totalPrice: m.totalPrice,
            category: m.category,
            notes: m.notes,
          },
        })
        matCount++
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`Migrated ${matCount} materials`)
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
