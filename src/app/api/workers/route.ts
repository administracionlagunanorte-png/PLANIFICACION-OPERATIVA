import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/workers — List all active workers
export async function GET() {
  try {
    const workers = await db.worker.findMany({
      where: { active: true },
      orderBy: { nombre: 'asc' },
    })
    return NextResponse.json(workers)
  } catch (error) {
    console.error('Error fetching workers:', error)
    return NextResponse.json({ error: 'Error al obtener trabajadores' }, { status: 500 })
  }
}

// POST /api/workers — Create a new worker
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, rut, cuentaBancaria } = body

    if (!nombre || !rut) {
      return NextResponse.json({ error: 'Nombre y RUT son obligatorios' }, { status: 400 })
    }

    // Check for duplicate RUT
    const existing = await db.worker.findFirst({ where: { rut } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un trabajador con ese RUT' }, { status: 409 })
    }

    const worker = await db.worker.create({
      data: { nombre, rut, cuentaBancaria: cuentaBancaria || '' },
    })
    return NextResponse.json(worker, { status: 201 })
  } catch (error) {
    console.error('Error creating worker:', error)
    return NextResponse.json({ error: 'Error al crear trabajador' }, { status: 500 })
  }
}
