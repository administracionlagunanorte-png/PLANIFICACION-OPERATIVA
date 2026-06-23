import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/review-submissions/[id] — Review a submission (approve/reject)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, reviewedBy, reviewNotes } = body

    if (!status || !reviewedBy) {
      return NextResponse.json({ error: 'status y reviewedBy son requeridos' }, { status: 400 })
    }

    if (!['aprobada', 'rechazada'].includes(status)) {
      return NextResponse.json({ error: 'status debe ser "aprobada" o "rechazada"' }, { status: 400 })
    }

    const submission = await db.reviewSubmission.update({
      where: { id },
      data: {
        status,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || '',
      },
    })

    return NextResponse.json(submission)
  } catch (error) {
    console.error('Error reviewing submission:', error)
    return NextResponse.json({ error: 'Error al revisar envío' }, { status: 500 })
  }
}

// DELETE /api/review-submissions/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.reviewSubmission.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting review submission:', error)
    return NextResponse.json({ error: 'Error al eliminar envío' }, { status: 500 })
  }
}
