import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const VALID_STATUSES = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'EN_COMPRA', 'COMPRADA', 'CANCELADA']
const VALID_PRIORITIES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE']
const REVIEW_STATUSES = ['APROBADA', 'RECHAZADA']

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const purchaseRequest = await db.purchaseRequest.findUnique({
      where: { id },
      include: {
        quotes: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!purchaseRequest) {
      return NextResponse.json(
        { error: 'Purchase request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(purchaseRequest)
  } catch (error) {
    console.error('Error fetching purchase request:', error)
    return NextResponse.json(
      { error: 'Error fetching purchase request' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.purchaseRequest.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Purchase request not found' },
        { status: 404 }
      )
    }

    // Review action — updates status/reviewNote/reviewedBy/reviewedAt
    if (body.action === 'review') {
      if (!body.status || !REVIEW_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid review status. Must be one of: ${REVIEW_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }

      const updated = await db.purchaseRequest.update({
        where: { id },
        data: {
          status: body.status,
          reviewNote: body.reviewNote || null,
          reviewedBy: body.reviewedBy || null,
          reviewedAt: new Date(),
        },
        include: {
          quotes: { orderBy: { createdAt: 'asc' } },
        },
      })

      return NextResponse.json(updated)
    }

    // Regular update — only allowed if status is PENDIENTE
    if (existing.status !== 'PENDIENTE') {
      return NextResponse.json(
        { error: 'Cannot update a purchase request that is not in PENDIENTE status' },
        { status: 400 }
      )
    }

    // Validate priority if provided
    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (body.productDescription !== undefined) updateData.productDescription = body.productDescription
    if (body.brand !== undefined) updateData.brand = body.brand || null
    if (body.quantity !== undefined) updateData.quantity = parseInt(body.quantity) || 1
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.productLink !== undefined) updateData.productLink = body.productLink || null
    if (body.referencePhotoUrl !== undefined) updateData.referencePhotoUrl = body.referencePhotoUrl || null
    if (body.directProvider !== undefined) updateData.directProvider = body.directProvider || null
    if (body.notes !== undefined) updateData.notes = body.notes || null
    if (body.responsible !== undefined) updateData.responsible = body.responsible || null

    const updated = await db.purchaseRequest.update({
      where: { id },
      data: updateData,
      include: {
        quotes: { orderBy: { createdAt: 'asc' } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating purchase request:', error)
    return NextResponse.json(
      { error: 'Error updating purchase request' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.purchaseRequest.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Purchase request not found' },
        { status: 404 }
      )
    }

    if (existing.status !== 'PENDIENTE') {
      return NextResponse.json(
        { error: 'Only purchase requests with PENDIENTE status can be deleted' },
        { status: 400 }
      )
    }

    await db.purchaseRequest.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting purchase request:', error)
    return NextResponse.json(
      { error: 'Error deleting purchase request' },
      { status: 500 }
    )
  }
}
