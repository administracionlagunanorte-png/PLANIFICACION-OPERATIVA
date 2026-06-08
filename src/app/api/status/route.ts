// Status API Route
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const statuses = await db.status.findMany({ orderBy: { order: 'asc' } })
    return NextResponse.json(statuses)
  } catch (error) {
    console.error('Error fetching statuses:', error)
    return NextResponse.json({ error: 'Error fetching statuses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const status = await db.status.create({
      data: { name: body.name, color: body.color || '#6b7280', order: body.order || 0 },
    })
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error creating status:', error)
    return NextResponse.json({ error: 'Error creating status' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const status = await db.status.update({ where: { id }, data })
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error updating status:', error)
    return NextResponse.json({ error: 'Error updating status' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await db.status.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting status:', error)
    return NextResponse.json({ error: 'Error deleting status' }, { status: 500 })
  }
}
