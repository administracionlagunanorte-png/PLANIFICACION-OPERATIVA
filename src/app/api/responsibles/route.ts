// Responsibles API Route
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const responsibles = await db.responsible.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(responsibles)
  } catch (error) {
    console.error('Error fetching responsibles:', error)
    return NextResponse.json({ error: 'Error fetching responsibles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const responsible = await db.responsible.create({
      data: { name: body.name },
    })
    return NextResponse.json(responsible)
  } catch (error) {
    console.error('Error creating responsible:', error)
    return NextResponse.json({ error: 'Error creating responsible' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const responsible = await db.responsible.update({ where: { id }, data })
    return NextResponse.json(responsible)
  } catch (error) {
    console.error('Error updating responsible:', error)
    return NextResponse.json({ error: 'Error updating responsible' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await db.responsible.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting responsible:', error)
    return NextResponse.json({ error: 'Error deleting responsible' }, { status: 500 })
  }
}
