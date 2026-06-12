import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create default priorities
  await prisma.priority.upsert({ where: { name: 'Alta' }, update: {}, create: { name: 'Alta', color: '#ef4444', order: 1 } })
  await prisma.priority.upsert({ where: { name: 'Media' }, update: {}, create: { name: 'Media', color: '#f59e0b', order: 2 } })
  await prisma.priority.upsert({ where: { name: 'Baja' }, update: {}, create: { name: 'Baja', color: '#22c55e', order: 3 } })

  // Create default statuses
  await prisma.status.upsert({ where: { name: 'Pendiente' }, update: {}, create: { name: 'Pendiente', color: '#f59e0b', order: 1 } })
  await prisma.status.upsert({ where: { name: 'En Proceso' }, update: {}, create: { name: 'En Proceso', color: '#3b82f6', order: 2 } })
  await prisma.status.upsert({ where: { name: 'Completada' }, update: {}, create: { name: 'Completada', color: '#22c55e', order: 3 } })
  await prisma.status.upsert({ where: { name: 'Cancelada' }, update: {}, create: { name: 'Cancelada', color: '#ef4444', order: 4 } })

  // Create default sectors
  const sectors = ['Club House', 'Canchas', 'Av. Principal', 'Piscina', 'Gimnasio', 'Portería', 'Áreas Verdes', 'Casino', 'Quincho']
  for (const name of sectors) {
    await prisma.sector.upsert({ where: { name }, update: {}, create: { name } })
  }

  // Create default repair types
  const repairTypes = ['Pavimentación', 'Electricidad', 'Plomería', 'Carpintería', 'Seguridad', 'Pintura', 'Jardinería', 'Impermeabilización', 'Techado', 'Equipamiento']
  for (const name of repairTypes) {
    await prisma.repairType.upsert({ where: { name }, update: {}, create: { name } })
  }

  console.log('Seed completed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
