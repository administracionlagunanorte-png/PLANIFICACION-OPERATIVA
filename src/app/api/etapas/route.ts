import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const etapas = await db.etapa.findMany({ orderBy: { order: 'asc' } })
    return NextResponse.json(etapas)
  } catch (error) {
    console.error('Error fetching etapas:', error)
    return NextResponse.json({ error: 'Error fetching etapas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const etapa = await db.etapa.create({
      data: { name: body.name, color: body.color || '#6b7280', order: body.order || 0 },
    })
    return NextResponse.json(etapa)
  } catch (error) {
    console.error('Error creating etapa:', error)
    return NextResponse.json({ error: 'Error creating etapa' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const etapa = await db.etapa.update({ where: { id }, data })
    return NextResponse.json(etapa)
  } catch (error) {
    console.error('Error updating etapa:', error)
    return NextResponse.json({ error: 'Error updating etapa' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    await db.etapa.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting etapa:', error)
    return NextResponse.json({ error: 'Error deleting etapa' }, { status: 500 })
  }
}
