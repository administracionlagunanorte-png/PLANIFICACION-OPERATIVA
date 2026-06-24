import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/review-submissions — List review submissions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const module = searchParams.get('module')
    const status = searchParams.get('status')

    const where: any = {}
    if (module) where.module = module
    if (status) where.status = status

    const submissions = await db.reviewSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(submissions)
  } catch (error) {
    console.error('Error fetching review submissions:', error)
    return NextResponse.json({ error: 'Error al obtener envíos' }, { status: 500 })
  }
}

// POST /api/review-submissions — Create a new review submission
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { module, itemId, itemTitle, submittedBy, submittedRole, attachmentUrl, attachmentName, notes } = body

    if (!module || !itemId || !itemTitle || !submittedBy || !attachmentUrl) {
      return NextResponse.json({
        error: 'module, itemId, itemTitle, submittedBy y attachmentUrl son requeridos. El adjunto es obligatorio.',
      }, { status: 400 })
    }

    const validModules = ['anticipos', 'asistencias', 'mantenimiento']
    if (!validModules.includes(module)) {
      return NextResponse.json({ error: `Módulo inválido. Válidos: ${validModules.join(', ')}` }, { status: 400 })
    }

    const submission = await db.reviewSubmission.create({
      data: {
        module,
        itemId,
        itemTitle,
        submittedBy,
        submittedRole: submittedRole || 'SUPERVISOR',
        attachmentUrl,
        attachmentName: attachmentName || '',
        notes: notes || '',
        status: 'pendiente',
      },
    })

    return NextResponse.json(submission, { status: 201 })
  } catch (error) {
    console.error('Error creating review submission:', error)
    return NextResponse.json({ error: 'Error al crear envío' }, { status: 500 })
  }
}
