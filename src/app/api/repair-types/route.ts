import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const repairTypes = await db.repairType.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(repairTypes)
  } catch (error) {
    console.error('Error fetching repair types:', error)
    return NextResponse.json({ error: 'Error fetching repair types' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const repairType = await db.repairType.create({ data: { name: body.name } })
    return NextResponse.json(repairType)
  } catch (error) {
    console.error('Error creating repair type:', error)
    return NextResponse.json({ error: 'Error creating repair type' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const repairType = await db.repairType.update({ where: { id }, data })
    return NextResponse.json(repairType)
  } catch (error) {
    console.error('Error updating repair type:', error)
    return NextResponse.json({ error: 'Error updating repair type' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await db.repairType.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting repair type:', error)
    return NextResponse.json({ error: 'Error deleting repair type' }, { status: 500 })
  }
}
