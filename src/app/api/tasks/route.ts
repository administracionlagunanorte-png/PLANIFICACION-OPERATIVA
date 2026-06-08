import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const FIELD_LABELS: Record<string, string> = {
  description: 'Descripción',
  sector: 'Sector',
  repairType: 'Tipo de Reparación',
  priority: 'Prioridad',
  status: 'Estado',
  responsible: 'Responsable',
  estimatedTime: 'Tiempo Estimado',
  amount: 'Monto',
  startDate: 'Fecha de Inicio',
  endDate: 'Fecha de Término',
  comments: 'Comentarios',
  beforePhotos: 'Fotos Antes',
  afterPhotos: 'Fotos Después',
  workOrder: 'Orden de Trabajo',
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '(vacío)'
  if (typeof val === 'string') {
    // Try to parse date strings
    if (val.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        return new Date(val).toLocaleDateString('es-CL')
      } catch {
        return val
      }
    }
    return val
  }
  if (typeof val === 'number') {
    if (val > 1000) return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)
    return val.toString()
  }
  return String(val)
}

async function logHistory(taskId: string, action: string, field: string | null, oldValue: unknown, newValue: unknown, changedBy?: string) {
  await db.taskHistory.create({
    data: {
      taskId,
      action,
      field: field ? (FIELD_LABELS[field] || field) : null,
      oldValue: formatValue(oldValue),
      newValue: formatValue(newValue),
      changedBy: changedBy || null,
    },
  })
}

export async function GET() {
  try {
    const tasks = await db.task.findMany({
      orderBy: [{ workOrder: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Error fetching tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Auto-assign workOrder if not provided
    const maxWorkOrder = await db.task.aggregate({ _max: { workOrder: true } })
    const nextWorkOrder = (maxWorkOrder._max.workOrder || 0) + 1

    const task = await db.task.create({
      data: {
        description: body.description,
        sector: body.sector,
        repairType: body.repairType,
        priority: body.priority,
        status: body.status || 'Pendiente',
        responsible: body.responsible || null,
        estimatedTime: body.estimatedTime || null,
        amount: body.amount ? parseFloat(body.amount) : null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        comments: body.comments || null,
        beforePhotos: body.beforePhotos || '[]',
        afterPhotos: body.afterPhotos || '[]',
        workOrder: body.workOrder !== undefined ? parseInt(body.workOrder) : nextWorkOrder,
      },
    })

    // Log creation
    await logHistory(task.id, 'creada', null, null, body.description, body.changedBy)

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Error creating task' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, changedBy, ...data } = body
    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }

    // Get current task for comparison
    const currentTask = await db.task.findUnique({ where: { id } })
    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { ...data }
    if (data.amount !== undefined) {
      updateData.amount = data.amount ? parseFloat(data.amount) : null
    }
    if (data.startDate !== undefined) {
      updateData.startDate = data.startDate ? new Date(data.startDate) : null
    }
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null
    }
    if (data.workOrder !== undefined) {
      updateData.workOrder = parseInt(data.workOrder) || 0
    }

    // Track field changes
    const trackableFields = ['description', 'sector', 'repairType', 'priority', 'status', 'responsible', 'estimatedTime', 'amount', 'startDate', 'endDate', 'comments', 'beforePhotos', 'afterPhotos', 'workOrder']
    const changes: { field: string; oldValue: unknown; newValue: unknown }[] = []

    for (const field of trackableFields) {
      if (data[field] !== undefined) {
        let oldVal = (currentTask as Record<string, unknown>)[field]
        let newVal = data[field]

        // Normalize date fields for comparison
        if (field === 'startDate' || field === 'endDate') {
          const oldDate = oldVal ? new Date(oldVal as string).toISOString().split('T')[0] : null
          const newDate = newVal ? new Date(newVal).toISOString().split('T')[0] : null
          if (oldDate !== newDate) {
            changes.push({ field, oldValue: oldVal, newValue: newVal })
          }
          continue
        }

        // Normalize amount
        if (field === 'amount') {
          const oldAmt = oldVal ? Number(oldVal) : null
          const newAmt = newVal ? parseFloat(newVal) : null
          if (oldAmt !== newAmt) {
            changes.push({ field, oldValue: oldVal, newValue: newVal })
          }
          continue
        }

        // Normalize null/empty
        const normalizeStr = (v: unknown) => {
          if (v === null || v === undefined || v === '') return ''
          return String(v)
        }
        if (normalizeStr(oldVal) !== normalizeStr(newVal)) {
          changes.push({ field, oldValue: oldVal, newValue: newVal })
        }
      }
    }

    const task = await db.task.update({
      where: { id },
      data: updateData,
    })

    // Log each change
    for (const change of changes) {
      const action = change.field === 'status' ? 'cambio_estado' : 'actualizada'
      await logHistory(id, action, change.field, change.oldValue, change.newValue, changedBy)
    }

    // If no specific field changes detected but update happened, log a general update
    if (changes.length === 0) {
      await logHistory(id, 'actualizada', null, null, null, changedBy)
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Error updating task' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
    }

    // Get task info before deletion for history
    const task = await db.task.findUnique({ where: { id } })
    if (task) {
      await logHistory(id, 'eliminada', null, task.description, null)
    }

    await db.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Error deleting task' }, { status: 500 })
  }
}
