import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/mantenimiento-lv/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const lv = await db.mantenimientoLV.findUnique({
      where: { id },
      include: { items: { orderBy: { order: 'asc' } } },
    })
    if (!lv) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json(lv)
  } catch (error) {
    console.error('Error fetching mantenimiento LV:', error)
    return NextResponse.json({ error: 'Error al obtener lista' }, { status: 500 })
  }
}

// PUT /api/mantenimiento-lv/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    // If items are provided, update them
    if (body.items) {
      // Delete existing items and recreate
      await db.mantenimientoItem.deleteMany({ where: { lvId: id } })

      const lv = await db.mantenimientoLV.update({
        where: { id },
        data: {
          ...body,
          scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
          completedDate: body.completedDate ? new Date(body.completedDate) : undefined,
          items: {
            create: body.items.map((item: any, idx: number) => ({
              category: item.category || 'A',
              description: item.description || '',
              status: item.status || 'PENDIENTE',
              value: item.value || null,
              observation: item.observation || null,
              order: idx,
            }))
          },
        },
        include: { items: { orderBy: { order: 'asc' } } },
      })

      // Recalculate progress
      const totalItems = lv.items.length
      const completedItems = lv.items.filter(i => i.status === 'OK' || i.status === 'N/A').length
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
      const status = progress === 100 ? 'COMPLETADA' : progress > 0 ? 'EN_PROGRESO' : 'PENDIENTE'

      await db.mantenimientoLV.update({
        where: { id },
        data: {
          progress,
          status,
          completedDate: progress === 100 ? new Date() : null,
        },
      })

      return NextResponse.json({ ...lv, progress, status })
    }

    // Simple update without items
    const lv = await db.mantenimientoLV.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(lv)
  } catch (error) {
    console.error('Error updating mantenimiento LV:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

// DELETE /api/mantenimiento-lv/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.mantenimientoItem.deleteMany({ where: { lvId: id } })
    await db.mantenimientoLV.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting mantenimiento LV:', error)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
