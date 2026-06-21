import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const VALID_CURRENCIES = ['CLP', 'USD', 'EUR']

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const purchaseRequest = await db.purchaseRequest.findUnique({
      where: { id },
    })

    if (!purchaseRequest) {
      return NextResponse.json(
        { error: 'Purchase request not found' },
        { status: 404 }
      )
    }

    const quotes = await db.purchaseQuote.findMany({
      where: { purchaseRequestId: id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(quotes)
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json(
      { error: 'Error fetching quotes' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Verify purchase request exists
    const purchaseRequest = await db.purchaseRequest.findUnique({
      where: { id },
    })

    if (!purchaseRequest) {
      return NextResponse.json(
        { error: 'Purchase request not found' },
        { status: 404 }
      )
    }

    // Validate required fields
    if (!body.providerName) {
      return NextResponse.json(
        { error: 'providerName is required' },
        { status: 400 }
      )
    }

    if (body.amount === undefined || body.amount === null) {
      return NextResponse.json(
        { error: 'amount is required' },
        { status: 400 }
      )
    }

    // Validate currency if provided
    if (body.currency && !VALID_CURRENCIES.includes(body.currency)) {
      return NextResponse.json(
        { error: `Invalid currency. Must be one of: ${VALID_CURRENCIES.join(', ')}` },
        { status: 400 }
      )
    }

    const quote = await db.purchaseQuote.create({
      data: {
        purchaseRequestId: id,
        providerName: body.providerName,
        amount: parseFloat(body.amount),
        currency: body.currency || 'CLP',
        fileName: body.fileName || null,
        fileUrl: body.fileUrl || null,
        fileType: body.fileType || null,
        notes: body.notes || null,
        isWinner: false,
      },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error('Error creating quote:', error)
    return NextResponse.json(
      { error: 'Error creating quote' },
      { status: 500 }
    )
  }
}
