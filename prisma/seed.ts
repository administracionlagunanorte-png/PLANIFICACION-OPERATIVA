import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed Sectors
  const sectors = [
    { name: 'Club House' },
    { name: 'Canchas' },
    { name: 'Piscina' },
    { name: 'Gimnasio' },
    { name: 'Áreas Verdes' },
    { name: 'Estacionamiento' },
    { name: 'Portería' },
    { name: 'Quincho' },
    { name: 'Juegos Infantiles' },
    { name: 'Pasar edificaciones' },
  ]

  for (const sector of sectors) {
    await prisma.sector.upsert({
      where: { name: sector.name },
      update: {},
      create: sector,
    })
  }

  // Seed Repair Types
  const repairTypes = [
    { name: 'Pintura' },
    { name: 'Plomería' },
    { name: 'Electricidad' },
    { name: 'Carpintería' },
    { name: 'Impermeabilización' },
    { name: 'Masonry' },
    { name: 'Cerrajería' },
    { name: 'Limpieza' },
    { name: 'Pavimentación' },
    { name: 'Revestimiento' },
    { name: 'Equipamiento' },
    { name: 'Jardinería' },
    { name: 'Techado' },
    { name: 'Ventanería' },
    { name: 'Seguridad' },
  ]

  for (const rt of repairTypes) {
    await prisma.repairType.upsert({
      where: { name: rt.name },
      update: {},
      create: rt,
    })
  }

  // Seed Priorities
  const priorities = [
    { name: 'Alta', color: '#ef4444', order: 1 },
    { name: 'Media', color: '#f59e0b', order: 2 },
    { name: 'Baja', color: '#22c55e', order: 3 },
  ]

  for (const p of priorities) {
    await prisma.priority.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    })
  }

  // Seed Tasks
  const tasks = [
    {
      description: 'Pintura interior y exterior del Club House',
      sector: 'Club House',
      repairType: 'Pintura',
      priority: 'Alta',
      responsible: 'Empresa Pinturas S.A.',
      estimatedTime: '2 semanas',
      amount: 2500000,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-14'),
      status: 'Pendiente',
    },
    {
      description: 'Reparación de grifos en baños del Club House',
      sector: 'Club House',
      repairType: 'Plomería',
      priority: 'Alta',
      responsible: 'Plomero Juan Pérez',
      estimatedTime: '3 días',
      amount: 350000,
      startDate: new Date('2026-06-02'),
      endDate: new Date('2026-06-04'),
      status: 'Pendiente',
    },
    {
      description: 'Cambio de luminarias en pasillos del Club House',
      sector: 'Club House',
      repairType: 'Electricidad',
      priority: 'Media',
      responsible: 'Eléctrica Luz & Fuerza',
      estimatedTime: '1 semana',
      amount: 800000,
      startDate: new Date('2026-06-05'),
      endDate: new Date('2026-06-11'),
      status: 'Pendiente',
    },
    {
      description: 'Reparación de puerta principal del Club House',
      sector: 'Club House',
      repairType: 'Carpintería',
      priority: 'Media',
      responsible: 'Carpintería Madera Noble',
      estimatedTime: '4 días',
      amount: 450000,
      startDate: new Date('2026-06-10'),
      endDate: new Date('2026-06-13'),
      status: 'Pendiente',
    },
    {
      description: 'Impermeabilización del techo del Club House',
      sector: 'Club House',
      repairType: 'Impermeabilización',
      priority: 'Alta',
      responsible: 'Impermeabilizadora ProTech',
      estimatedTime: '1 semana',
      amount: 1800000,
      startDate: new Date('2026-06-15'),
      endDate: new Date('2026-06-21'),
      status: 'Pendiente',
    },
    {
      description: 'Reparación de malla perimetral en canchas',
      sector: 'Canchas',
      repairType: 'Masonry',
      priority: 'Media',
      responsible: 'Constructora Fierro Ltda.',
      estimatedTime: '5 días',
      amount: 600000,
      startDate: new Date('2026-06-03'),
      endDate: new Date('2026-06-07'),
      status: 'Pendiente',
    },
    {
      description: 'Pintura de líneas en cancha de fútbol',
      sector: 'Canchas',
      repairType: 'Pintura',
      priority: 'Baja',
      responsible: 'Deportivo Line Sp.',
      estimatedTime: '2 días',
      amount: 200000,
      startDate: new Date('2026-06-08'),
      endDate: new Date('2026-06-09'),
      status: 'Pendiente',
    },
    {
      description: 'Reparación de arcos de fútbol',
      sector: 'Canchas',
      repairType: 'Masonry',
      priority: 'Baja',
      responsible: 'Constructora Fierro Ltda.',
      estimatedTime: '3 días',
      amount: 300000,
      startDate: new Date('2026-06-10'),
      endDate: new Date('2026-06-12'),
      status: 'Pendiente',
    },
    {
      description: 'Cambio de cerraduras en portones de canchas',
      sector: 'Canchas',
      repairType: 'Cerrajería',
      priority: 'Media',
      responsible: 'Cerrajería Seguridad Plus',
      estimatedTime: '1 día',
      amount: 150000,
      startDate: new Date('2026-06-05'),
      endDate: new Date('2026-06-05'),
      status: 'Pendiente',
    },
    {
      description: 'Reparación de bomba de agua de piscina',
      sector: 'Piscina',
      repairType: 'Plomería',
      priority: 'Alta',
      responsible: 'Aqua Service Ltda.',
      estimatedTime: '3 días',
      amount: 950000,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-03'),
      status: 'Pendiente',
    },
    {
      description: 'Limpieza profunda y tratamiento de agua de piscina',
      sector: 'Piscina',
      repairType: 'Limpieza',
      priority: 'Media',
      responsible: 'Pool Clean SpA',
      estimatedTime: '2 días',
      amount: 400000,
      startDate: new Date('2026-06-04'),
      endDate: new Date('2026-06-05'),
      status: 'Pendiente',
    },
    {
      description: 'Reparación de baldosas alrededor de la piscina',
      sector: 'Piscina',
      repairType: 'Masonry',
      priority: 'Baja',
      responsible: 'Cerámica Pro SpA',
      estimatedTime: '4 días',
      amount: 700000,
      startDate: new Date('2026-06-12'),
      endDate: new Date('2026-06-15'),
      status: 'Pendiente',
    },
    {
      description: 'Mantenimiento de máquinas del gimnasio',
      sector: 'Gimnasio',
      repairType: 'Equipamiento',
      priority: 'Media',
      responsible: 'Gym Service Chile',
      estimatedTime: '2 días',
      amount: 500000,
      startDate: new Date('2026-06-06'),
      endDate: new Date('2026-06-07'),
      status: 'Pendiente',
    },
    {
      description: 'Reparación de espejos del gimnasio',
      sector: 'Gimnasio',
      repairType: 'Ventanería',
      priority: 'Baja',
      responsible: 'Cristalería del Sur',
      estimatedTime: '1 día',
      amount: 250000,
      startDate: new Date('2026-06-08'),
      endDate: new Date('2026-06-08'),
      status: 'Pendiente',
    },
    {
      description: 'Poda de árboles y arbustos en áreas verdes',
      sector: 'Áreas Verdes',
      repairType: 'Jardinería',
      priority: 'Media',
      responsible: 'Jardines del Valle',
      estimatedTime: '3 días',
      amount: 350000,
      startDate: new Date('2026-06-02'),
      endDate: new Date('2026-06-04'),
      status: 'Pendiente',
    },
    {
      description: 'Reparación de sistema de riego en áreas verdes',
      sector: 'Áreas Verdes',
      repairType: 'Plomería',
      priority: 'Alta',
      responsible: 'Riego Automático SpA',
      estimatedTime: '4 días',
      amount: 800000,
      startDate: new Date('2026-06-05'),
      endDate: new Date('2026-06-08'),
      status: 'Pendiente',
    },
    {
      description: 'Reparación de pavimento en estacionamiento',
      sector: 'Estacionamiento',
      repairType: 'Pavimentación',
      priority: 'Alta',
      responsible: 'Asfaltos Chile Ltda.',
      estimatedTime: '1 semana',
      amount: 3200000,
      startDate: new Date('2026-06-10'),
      endDate: new Date('2026-06-16'),
      status: 'Pendiente',
    },
    {
      description: 'Pintura de líneas en estacionamiento',
      sector: 'Estacionamiento',
      repairType: 'Pintura',
      priority: 'Media',
      responsible: 'Deportivo Line Sp.',
      estimatedTime: '2 días',
      amount: 300000,
      startDate: new Date('2026-06-17'),
      endDate: new Date('2026-06-18'),
      status: 'Pendiente',
    },
    {
      description: 'Reparación de portón de acceso principal',
      sector: 'Portería',
      repairType: 'Cerrajería',
      priority: 'Alta',
      responsible: 'Cerrajería Seguridad Plus',
      estimatedTime: '2 días',
      amount: 650000,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-06-02'),
      status: 'Pendiente',
    },
    {
      description: 'Instalación de cámaras de seguridad en portería',
      sector: 'Portería',
      repairType: 'Seguridad',
      priority: 'Alta',
      responsible: 'Seguridad Total SpA',
      estimatedTime: '3 días',
      amount: 1500000,
      startDate: new Date('2026-06-03'),
      endDate: new Date('2026-06-05'),
      status: 'Pendiente',
    },
    {
      description: 'Reparación de techado del quincho',
      sector: 'Quincho',
      repairType: 'Techado',
      priority: 'Media',
      responsible: 'Techos y Cubiertas SpA',
      estimatedTime: '3 días',
      amount: 900000,
      startDate: new Date('2026-06-08'),
      endDate: new Date('2026-06-10'),
      status: 'Pendiente',
    },
  ]

  for (const task of tasks) {
    await prisma.task.create({ data: task })
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
