import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (taskId) {
      const materials = await db.material.findMany({
        where: { taskId },
        orderBy: { createdAt: 'asc' },
      })
      return NextResponse.json(materials)
    }

    // Return all materials if no taskId specified
    const materials = await db.material.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    return NextResponse.json(materials)
  } catch (error) {
    console.error('Error fetching materials:', error)
    return NextResponse.json({ error: 'Error fetching materials' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const material = await db.material.create({
      data: {
        taskId: body.taskId,
        name: body.name,
        quantity: body.quantity || null,
        unit: body.unit || null,
        unitPrice: body.unitPrice ? parseFloat(body.unitPrice) : null,
        totalPrice: body.totalPrice ? parseFloat(body.totalPrice) : null,
        category: body.category || null,
        notes: body.notes || null,
      },
    })
    return NextResponse.json(material)
  } catch (error) {
    console.error('Error creating material:', error)
    return NextResponse.json({ error: 'Error creating material' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { ...data }
    if (data.unitPrice !== undefined) {
      updateData.unitPrice = data.unitPrice ? parseFloat(data.unitPrice) : null
    }
    if (data.totalPrice !== undefined) {
      updateData.totalPrice = data.totalPrice ? parseFloat(data.totalPrice) : null
    }

    const material = await db.material.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(material)
  } catch (error) {
    console.error('Error updating material:', error)
    return NextResponse.json({ error: 'Error updating material' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Material ID required' }, { status: 400 })
    }
    await db.material.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json({ error: 'Error deleting material' }, { status: 500 })
  }
}
