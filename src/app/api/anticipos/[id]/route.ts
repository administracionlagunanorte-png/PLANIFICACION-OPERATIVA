import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/anticipos/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const anticipo = await db.anticipo.findUnique({
      where: { id },
      include: { periodo: true },
    })

    if (!anticipo) {
      return NextResponse.json({ error: 'Anticipo no encontrado' }, { status: 404 })
    }

    return NextResponse.json(anticipo)
  } catch (error) {
    console.error('Error fetching anticipo:', error)
    return NextResponse.json({ error: 'Error al obtener anticipo' }, { status: 500 })
  }
}

// PUT /api/anticipos/[id] — Update anticipo
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const anticipo = await db.anticipo.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(anticipo)
  } catch (error) {
    console.error('Error updating anticipo:', error)
    return NextResponse.json({ error: 'Error al actualizar anticipo' }, { status: 500 })
  }
}

// DELETE /api/anticipos/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.anticipo.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting anticipo:', error)
    return NextResponse.json({ error: 'Error al eliminar anticipo' }, { status: 500 })
  }
}
