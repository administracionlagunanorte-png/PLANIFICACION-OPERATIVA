import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/mantenimiento-lv
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const frecuencia = url.searchParams.get('frecuencia')
    const status = url.searchParams.get('status')
    const sector = url.searchParams.get('sector')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')

    const where: any = {}
    if (frecuencia && frecuencia !== 'all') where.frecuencia = frecuencia
    if (status && status !== 'all') where.status = status
    if (sector && sector !== 'all') where.sector = { contains: sector, mode: 'insensitive' }
    if (from || to) {
      where.scheduledDate = {}
      if (from) where.scheduledDate.gte = new Date(from)
      if (to) where.scheduledDate.lte = new Date(to + 'T23:59:59')
    }

    const lvs = await db.mantenimientoLV.findMany({
      where,
      include: {
        _count: { select: { items: true } },
        items: { orderBy: { order: 'asc' } },
      },
      orderBy: [{ scheduledDate: 'asc' }, { codigo: 'asc' }],
    })

    return NextResponse.json(lvs)
  } catch (error) {
    console.error('Error fetching mantenimiento LVs:', error)
    return NextResponse.json({ error: 'Error al obtener listas de verificación' }, { status: 500 })
  }
}

// POST /api/mantenimiento-lv
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { codigo, nombre, sector, frecuencia, scheduledDate, responsable, turno, items, createdBy } = body

    if (!codigo || !nombre || !sector || !frecuencia) {
      return NextResponse.json({ error: 'Código, nombre, sector y frecuencia son obligatorios' }, { status: 400 })
    }

    const lv = await db.mantenimientoLV.create({
      data: {
        codigo,
        nombre,
        sector,
        frecuencia,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        responsable: responsable || null,
        turno: turno || null,
        createdBy: createdBy || null,
        items: items && items.length > 0 ? {
          create: items.map((item: any, idx: number) => ({
            category: item.category || 'A',
            description: item.description,
            order: idx,
          }))
        } : undefined,
      },
      include: { items: true },
    })

    return NextResponse.json(lv, { status: 201 })
  } catch (error) {
    console.error('Error creating mantenimiento LV:', error)
    return NextResponse.json({ error: 'Error al crear lista de verificación' }, { status: 500 })
  }
}
