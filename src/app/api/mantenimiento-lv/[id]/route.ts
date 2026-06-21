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

    // Extract fields that should NOT be spread directly
    const { items, ...simpleFields } = body

    // If items are provided, update them
    if (items) {
      // Delete existing items and recreate
      await db.mantenimientoItem.deleteMany({ where: { lvId: id } })

      const lv = await db.mantenimientoLV.update({
        where: { id },
        data: {
          ...simpleFields,
          scheduledDate: simpleFields.scheduledDate ? new Date(simpleFields.scheduledDate) : undefined,
          completedDate: simpleFields.completedDate ? new Date(simpleFields.completedDate) : undefined,
          motivoPendiente: simpleFields.motivoPendiente !== undefined ? simpleFields.motivoPendiente : undefined,
          items: {
            create: items.map((item: any, idx: number) => ({
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
      
      // Determine status based on progress or explicit status
      let status: string
      if (progress === 100) {
        status = 'COMPLETADA'
      } else if (progress > 0) {
        status = 'EN_PROGRESO'
      } else {
        status = simpleFields.status || 'PENDIENTE'
      }

      // Clear motivoPendiente if status is not PENDIENTE
      const motivoPendiente = status !== 'PENDIENTE' ? null : (simpleFields.motivoPendiente || lv.motivoPendiente)

      await db.mantenimientoLV.update({
        where: { id },
        data: {
          progress,
          status,
          completedDate: status === 'COMPLETADA' ? new Date() : null,
          motivoPendiente,
        },
      })

      return NextResponse.json({ ...lv, progress, status, motivoPendiente })
    }

    // Simple update without items (status change, comments, etc.)
    const updateData: any = { ...simpleFields }
    if (simpleFields.scheduledDate) updateData.scheduledDate = new Date(simpleFields.scheduledDate)
    if (simpleFields.completedDate) updateData.completedDate = new Date(simpleFields.completedDate)
    
    // If status is being changed
    if (simpleFields.status) {
      // Clear motivo if no longer pending
      if (simpleFields.status !== 'PENDIENTE') {
        updateData.motivoPendiente = null
      }
      if (simpleFields.status === 'COMPLETADA') {
        updateData.completedDate = new Date()
        updateData.progress = 100
      }
    }

    const lv = await db.mantenimientoLV.update({
      where: { id },
      data: updateData,
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
