import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/anticipo-periods/[id] — Get period with anticipos
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const period = await db.anticipoPeriod.findUnique({
      where: { id },
      include: {
        anticipos: { orderBy: { numero: 'asc' } },
      },
    })

    if (!period) {
      return NextResponse.json({ error: 'Periodo no encontrado' }, { status: 404 })
    }

    const totalAmount = period.anticipos.reduce((sum, a) => sum + a.monto, 0)

    return NextResponse.json({ ...period, totalAmount })
  } catch (error) {
    console.error('Error fetching anticipo period:', error)
    return NextResponse.json({ error: 'Error al obtener periodo' }, { status: 500 })
  }
}

// PUT /api/anticipo-periods/[id] — Update period
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const period = await db.anticipoPeriod.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(period)
  } catch (error) {
    console.error('Error updating anticipo period:', error)
    return NextResponse.json({ error: 'Error al actualizar periodo' }, { status: 500 })
  }
}

// DELETE /api/anticipo-periods/[id] — Delete period and all its anticipos
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await db.anticipo.deleteMany({ where: { periodoId: id } })
    await db.anticipoPeriod.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting anticipo period:', error)
    return NextResponse.json({ error: 'Error al eliminar periodo' }, { status: 500 })
  }
}
