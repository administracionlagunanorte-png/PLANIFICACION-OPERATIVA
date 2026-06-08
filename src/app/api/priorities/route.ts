import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const priorities = await db.priority.findMany({ orderBy: { order: 'asc' } })
    return NextResponse.json(priorities)
  } catch (error) {
    console.error('Error fetching priorities:', error)
    return NextResponse.json({ error: 'Error fetching priorities' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const priority = await db.priority.create({
      data: { name: body.name, color: body.color || '#6b7280', order: body.order || 0 },
    })
    return NextResponse.json(priority)
  } catch (error) {
    console.error('Error creating priority:', error)
    return NextResponse.json({ error: 'Error creating priority' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const priority = await db.priority.update({ where: { id }, data })
    return NextResponse.json(priority)
  } catch (error) {
    console.error('Error updating priority:', error)
    return NextResponse.json({ error: 'Error updating priority' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await db.priority.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting priority:', error)
    return NextResponse.json({ error: 'Error deleting priority' }, { status: 500 })
  }
}
