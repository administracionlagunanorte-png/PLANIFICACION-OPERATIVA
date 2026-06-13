import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    // Simple auth check
    const authHeader = request.headers.get('authorization')
    if (authHeader !== 'Bearer migrate-laguna-norte-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const filename = formData.get('filename') as string | null

    if (!file || !filename) {
      return NextResponse.json({ error: 'Missing file or filename' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to Vercel Blob
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN not configured' }, { status: 500 })
    }

    const blob = await put(`uploads/${filename}`, buffer, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    })

    return NextResponse.json({ url: blob.url, originalFilename: filename })
  } catch (error: any) {
    console.error('Migration upload error:', error)
    return NextResponse.json({ error: error.message || 'Migration failed' }, { status: 500 })
  }
}
