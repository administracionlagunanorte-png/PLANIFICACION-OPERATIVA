import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const sectors = await db.sector.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(sectors)
  } catch (error) {
    console.error('Error fetching sectors:', error)
    return NextResponse.json({ error: 'Error fetching sectors' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sector = await db.sector.create({ data: { name: body.name } })
    return NextResponse.json(sector)
  } catch (error) {
    console.error('Error creating sector:', error)
    return NextResponse.json({ error: 'Error creating sector' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const sector = await db.sector.update({ where: { id }, data })
    return NextResponse.json(sector)
  } catch (error) {
    console.error('Error updating sector:', error)
    return NextResponse.json({ error: 'Error updating sector' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await db.sector.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sector:', error)
    return NextResponse.json({ error: 'Error deleting sector' }, { status: 500 })
  }
}
