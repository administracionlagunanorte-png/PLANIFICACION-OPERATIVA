import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';

const sqlite = new Database('./db/custom.db');
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.NEON_URL }
  }
});

async function migrate() {
  console.log('=== Migrando datos de SQLite a Neon PostgreSQL ===\n');

  // 1. Migrate Statuses (upsert)
  const statuses = sqlite.prepare('SELECT * FROM Status').all();
  console.log(`Migrando ${statuses.length} estados...`);
  for (const s of statuses) {
    await prisma.status.upsert({
      where: { name: s.name },
      update: { color: s.color, order: s.order },
      create: { id: s.id, name: s.name, color: s.color || '#6b7280', order: s.order || 0 }
    });
  }

  // 2. Migrate Priorities (upsert)
  const priorities = sqlite.prepare('SELECT * FROM Priority').all();
  console.log(`Migrando ${priorities.length} prioridades...`);
  for (const p of priorities) {
    await prisma.priority.upsert({
      where: { name: p.name },
      update: { color: p.color, order: p.order },
      create: { id: p.id, name: p.name, color: p.color || '#6b7280', order: p.order || 0 }
    });
  }

  // 3. Migrate Sectors (upsert)
  const sectors = sqlite.prepare('SELECT * FROM Sector').all();
  console.log(`Migrando ${sectors.length} sectores...`);
  for (const s of sectors) {
    await prisma.sector.upsert({
      where: { name: s.name },
      update: {},
      create: { id: s.id, name: s.name }
    });
  }

  // 4. Migrate RepairTypes (upsert)
  const repairTypes = sqlite.prepare('SELECT * FROM RepairType').all();
  console.log(`Migrando ${repairTypes.length} tipos de reparación...`);
  for (const r of repairTypes) {
    await prisma.repairType.upsert({
      where: { name: r.name },
      update: {},
      create: { id: r.id, name: r.name }
    });
  }

  // 5. Migrate Responsibles
  const responsibles = sqlite.prepare('SELECT * FROM Responsible').all();
  console.log(`Migrando ${responsibles.length} responsables...`);
  for (const r of responsibles) {
    await prisma.responsible.upsert({
      where: { name: r.name },
      update: {},
      create: { id: r.id, name: r.name }
    });
  }

  // 6. Migrate Etapas
  const etapas = sqlite.prepare('SELECT * FROM Etapa').all();
  console.log(`Migrando ${etapas.length} etapas...`);
  for (const e of etapas) {
    await prisma.etapa.upsert({
      where: { name: e.name },
      update: {},
      create: { id: e.id, name: e.name, color: e.color || '#6b7280', order: e.order || 0 }
    });
  }

  // 7. Migrate Tasks
  const tasks = sqlite.prepare('SELECT * FROM Task').all();
  console.log(`Migrando ${tasks.length} tareas...`);
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
        createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date()
      }
    });
  }

  // 8. Migrate TaskHistory
  const histories = sqlite.prepare('SELECT * FROM TaskHistory').all();
  console.log(`Migrando ${histories.length} historiales...`);
  for (const h of histories) {
    await prisma.taskHistory.upsert({
      where: { id: h.id },
      update: {},
      create: {
        id: h.id,
        taskId: h.taskId,
        action: h.action,
        field: h.field,
        oldValue: h.oldValue,
        newValue: h.newValue,
        changedBy: h.changedBy,
        createdAt: h.createdAt ? new Date(h.createdAt) : new Date()
      }
    });
  }

  // 9. Migrate Materials
  const materials = sqlite.prepare('SELECT * FROM Material').all();
  console.log(`Migrando ${materials.length} materiales...`);
  for (const m of materials) {
    await prisma.material.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        taskId: m.taskId,
        name: m.name,
        quantity: m.quantity,
        unit: m.unit,
        unitPrice: m.unitPrice,
        totalPrice: m.totalPrice,
        category: m.category,
        notes: m.notes,
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        updatedAt: m.updatedAt ? new Date(m.updatedAt) : new Date()
      }
    });
  }

  console.log('\n=== Migración completada exitosamente ===');
  
  // Verify counts
  const taskCount = await prisma.task.count();
  const historyCount = await prisma.taskHistory.count();
  const materialCount = await prisma.material.count();
  console.log(`Verificación: ${taskCount} tareas, ${historyCount} historiales, ${materialCount} materiales en Neon`);

  sqlite.close();
  await prisma.$disconnect();
}

migrate().catch(e => {
  console.error('Error en migración:', e);
  process.exit(1);
});
