import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/anticipos — List anticipos (optionally filtered by periodoId)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const periodoId = url.searchParams.get('periodoId')
    const status = url.searchParams.get('status')

    const where: any = {}
    if (periodoId) where.periodoId = periodoId
    if (status && status !== 'all') where.status = status

    const anticipos = await db.anticipo.findMany({
      where,
      include: { periodo: true },
      orderBy: [{ numero: 'asc' }],
    })

    return NextResponse.json(anticipos)
  } catch (error) {
    console.error('Error fetching anticipos:', error)
    return NextResponse.json({ error: 'Error al obtener anticipos' }, { status: 500 })
  }
}

// POST /api/anticipos — Create anticipo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { numero, nombre, rut, monto, cuentaBancaria, periodoId, status, createdBy } = body

    if (!nombre || !rut || !monto || !periodoId) {
      return NextResponse.json({ error: 'Nombre, RUT, monto y periodo son obligatorios' }, { status: 400 })
    }

    // Get the max numero for the period
    const maxAnticipo = await db.anticipo.findFirst({
      where: { periodoId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    })
    const nextNumero = numero || (maxAnticipo ? maxAnticipo.numero + 1 : 1)

    const anticipo = await db.anticipo.create({
      data: {
        numero: nextNumero,
        nombre,
        rut,
        monto: Number(monto),
        cuentaBancaria: cuentaBancaria || '',
        periodoId,
        status: status || 'PENDIENTE',
        createdBy: createdBy || null,
      },
    })

    return NextResponse.json(anticipo, { status: 201 })
  } catch (error) {
    console.error('Error creating anticipo:', error)
    return NextResponse.json({ error: 'Error al crear anticipo' }, { status: 500 })
  }
}
