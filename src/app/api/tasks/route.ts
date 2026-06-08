import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const tasks = await db.task.findMany({
      orderBy: { createdAt: 'desc' },
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
      },
    })
    return NextResponse.json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Error creating task' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 })
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
    const task = await db.task.update({
      where: { id },
      data: updateData,
    })
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
    await db.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Error deleting task' }, { status: 500 })
  }
}
