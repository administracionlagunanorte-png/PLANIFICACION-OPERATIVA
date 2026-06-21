import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const VALID_CURRENCIES = ['CLP', 'USD', 'EUR']

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    const { id, quoteId } = await params
    const body = await request.json()

    // Verify quote exists and belongs to the purchase request
    const existingQuote = await db.purchaseQuote.findUnique({
      where: { id: quoteId },
    })

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    if (existingQuote.purchaseRequestId !== id) {
      return NextResponse.json(
        { error: 'Quote does not belong to this purchase request' },
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

    // If setting this quote as winner, unset any previous winner for this request
    if (body.isWinner === true) {
      await db.purchaseQuote.updateMany({
        where: {
          purchaseRequestId: id,
          isWinner: true,
        },
        data: {
          isWinner: false,
        },
      })
    }

    const updateData: Record<string, unknown> = {}

    if (body.providerName !== undefined) updateData.providerName = body.providerName
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount)
    if (body.currency !== undefined) updateData.currency = body.currency
    if (body.fileName !== undefined) updateData.fileName = body.fileName || null
    if (body.fileUrl !== undefined) updateData.fileUrl = body.fileUrl || null
    if (body.fileType !== undefined) updateData.fileType = body.fileType || null
    if (body.notes !== undefined) updateData.notes = body.notes || null
    if (body.isWinner !== undefined) updateData.isWinner = body.isWinner

    const updatedQuote = await db.purchaseQuote.update({
      where: { id: quoteId },
      data: updateData,
    })

    return NextResponse.json(updatedQuote)
  } catch (error) {
    console.error('Error updating quote:', error)
    return NextResponse.json(
      { error: 'Error updating quote' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; quoteId: string }> }
) {
  try {
    const { id, quoteId } = await params

    // Verify quote exists and belongs to the purchase request
    const existingQuote = await db.purchaseQuote.findUnique({
      where: { id: quoteId },
    })

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    if (existingQuote.purchaseRequestId !== id) {
      return NextResponse.json(
        { error: 'Quote does not belong to this purchase request' },
        { status: 400 }
      )
    }

    await db.purchaseQuote.delete({
      where: { id: quoteId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting quote:', error)
    return NextResponse.json(
      { error: 'Error deleting quote' },
      { status: 500 }
    )
  }
}
