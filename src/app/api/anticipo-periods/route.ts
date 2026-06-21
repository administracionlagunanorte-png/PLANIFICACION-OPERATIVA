import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/anticipo-periods — List periods
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')

    const where: any = {}
    if (status && status !== 'all') where.status = status

    const periods = await db.anticipoPeriod.findMany({
      where,
      include: {
        _count: { select: { anticipos: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    // Calculate totalAmount from anticipos for each period
    const periodsWitTotal = await Promise.all(
      periods.map(async (p) => {
        const result = await db.anticipo.aggregate({
          where: { periodoId: p.id },
          _sum: { monto: true },
          _count: true,
        })
        return {
          ...p,
          anticipoCount: result._count,
          totalAmount: result._sum.monto || 0,
        }
      })
    )

    return NextResponse.json(periodsWitTotal)
  } catch (error) {
    console.error('Error fetching anticipo periods:', error)
    return NextResponse.json({ error: 'Error al obtener periodos' }, { status: 500 })
  }
}

// POST /api/anticipo-periods — Create period
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, month, year } = body

    if (!name || !month || !year) {
      return NextResponse.json({ error: 'Nombre, mes y año son obligatorios' }, { status: 400 })
    }

    const period = await db.anticipoPeriod.create({
      data: { name, month: Number(month), year: Number(year) },
    })

    return NextResponse.json(period, { status: 201 })
  } catch (error) {
    console.error('Error creating anticipo period:', error)
    return NextResponse.json({ error: 'Error al crear periodo' }, { status: 500 })
  }
}
