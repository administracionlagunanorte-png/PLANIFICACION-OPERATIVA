import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/workers/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const worker = await db.worker.findUnique({ where: { id } })
    if (!worker) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }
    return NextResponse.json(worker)
  } catch (error) {
    console.error('Error fetching worker:', error)
    return NextResponse.json({ error: 'Error al obtener trabajador' }, { status: 500 })
  }
}

// PUT /api/workers/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { nombre, rut, cuentaBancaria, active } = body

    const worker = await db.worker.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(rut !== undefined && { rut }),
        ...(cuentaBancaria !== undefined && { cuentaBancaria }),
        ...(active !== undefined && { active }),
      },
    })
    return NextResponse.json(worker)
  } catch (error) {
    console.error('Error updating worker:', error)
    return NextResponse.json({ error: 'Error al actualizar trabajador' }, { status: 500 })
  }
}

// DELETE /api/workers/[id] — Soft delete (set active=false)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.worker.update({ where: { id }, data: { active: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting worker:', error)
    return NextResponse.json({ error: 'Error al eliminar trabajador' }, { status: 500 })
  }
}
