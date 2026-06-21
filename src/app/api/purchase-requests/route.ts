import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const VALID_STATUSES = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'EN_COMPRA', 'COMPRADA', 'CANCELADA']
const VALID_PRIORITIES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (status && VALID_STATUSES.includes(status)) {
      where.status = status
    }

    if (priority && VALID_PRIORITIES.includes(priority)) {
      where.priority = priority
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { productDescription: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { directProvider: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { responsible: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      db.purchaseRequest.findMany({
        where,
        include: {
          quotes: {
            orderBy: { createdAt: 'asc' },
          },
          items: {
            select: { id: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { correlativeNumber: 'desc' },
        skip,
        take: limit,
      }),
      db.purchaseRequest.count({ where }),
    ])

    // Add itemCount to each request
    const enriched = items.map((r) => ({
      ...r,
      itemCount: r.items.length,
      items: undefined,
    }))

    return NextResponse.json({
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching purchase requests:', error)
    return NextResponse.json(
      { error: 'Error fetching purchase requests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title && !body.productDescription) {
      return NextResponse.json(
        { error: 'El título o descripción es requerido' },
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

    // Auto-assign correlative number
    const maxResult = await db.purchaseRequest.aggregate({
      _max: { correlativeNumber: true },
    })
    const nextCorrelative = (maxResult._max.correlativeNumber || 0) + 1

    const purchaseRequest = await db.purchaseRequest.create({
      data: {
        correlativeNumber: nextCorrelative,
        title: body.title || body.productDescription || '',
        productDescription: body.productDescription || body.title || '',
        brand: body.brand || null,
        quantity: body.quantity ? parseInt(body.quantity) : 1,
        priority: body.priority || 'MEDIA',
        productLink: body.productLink || null,
        referencePhotoUrl: body.referencePhotoUrl || null,
        directProvider: body.directProvider || null,
        notes: body.notes || null,
        status: 'PENDIENTE',
        responsible: body.responsible || null,
      },
      include: {
        quotes: true,
        items: { orderBy: { createdAt: 'asc' } },
      },
    })

    return NextResponse.json(purchaseRequest, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase request:', error)
    return NextResponse.json(
      { error: 'Error creating purchase request' },
      { status: 500 }
    )
  }
}
