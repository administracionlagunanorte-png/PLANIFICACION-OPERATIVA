import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';

const sqlite = new Database('./db/custom.db');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.NEON_URL } },
  log: ['error']
});

async function migrate() {
  console.log('=== Migración rápida SQLite → Neon ===\n');

  // Tasks - createMany with skipDuplicates
  const tasks = sqlite.prepare('SELECT * FROM Task').all();
  console.log(`Migrando ${tasks.length} tareas...`);
  for (const t of tasks) {
    try {
      await prisma.task.create({
        data: {
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
    } catch (e) {
      if (!e.message.includes('Unique constraint')) console.error('Task error:', t.id, e.message);
    }
  }
  console.log('✓ Tareas migradas');

  // Responsibles
  const responsibles = sqlite.prepare('SELECT * FROM Responsible').all();
  console.log(`Migrando ${responsibles.length} responsables...`);
  for (const r of responsibles) {
    try {
      await prisma.responsible.create({ data: { id: r.id, name: r.name } });
    } catch (e) {
      if (!e.message.includes('Unique constraint')) console.error('Responsible error:', e.message);
    }
  }
  console.log('✓ Responsables migrados');

  // Etapas
  const etapas = sqlite.prepare('SELECT * FROM Etapa').all();
  console.log(`Migrando ${etapas.length} etapas...`);
  for (const e of etapas) {
    try {
      await prisma.etapa.create({ data: { id: e.id, name: e.name, color: e.color || '#6b7280', order: e.order || 0 } });
    } catch (err) {
      if (!err.message.includes('Unique constraint')) console.error('Etapa error:', err.message);
    }
  }
  console.log('✓ Etapas migradas');

  // TaskHistory
  const histories = sqlite.prepare('SELECT * FROM TaskHistory').all();
  console.log(`Migrando ${histories.length} historiales...`);
  let hCount = 0;
  for (const h of histories) {
    try {
      await prisma.taskHistory.create({
        data: {
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
      hCount++;
    } catch (e) {
      if (!e.message.includes('Unique constraint')) console.error('History error:', h.id, e.message.substring(0, 80));
    }
  }
  console.log(`✓ ${hCount} historiales migrados`);

  // Materials
  const materials = sqlite.prepare('SELECT * FROM Material').all();
  console.log(`Migrando ${materials.length} materiales...`);
  for (const m of materials) {
    try {
      await prisma.material.create({
        data: {
          id: m.id, taskId: m.taskId, name: m.name, quantity: m.quantity,
          unit: m.unit, unitPrice: m.unitPrice, totalPrice: m.totalPrice,
          category: m.category, notes: m.notes,
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
          updatedAt: m.updatedAt ? new Date(m.updatedAt) : new Date()
        }
      });
    } catch (e) {
      if (!e.message.includes('Unique constraint')) console.error('Material error:', e.message);
    }
  }
  console.log('✓ Materiales migrados');

  // Verify
  const tCount = await prisma.task.count();
  const h2Count = await prisma.taskHistory.count();
  const mCount = await prisma.material.count();
  console.log(`\n=== Verificación en Neon: ${tCount} tareas, ${h2Count} historiales, ${mCount} materiales ===`);

  sqlite.close();
  await prisma.$disconnect();
}

migrate().catch(e => { console.error('Fatal:', e); process.exit(1); });
