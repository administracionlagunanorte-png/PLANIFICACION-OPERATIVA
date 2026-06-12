import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const ext = path.extname(file.name) || '.bin'
    const filename = `${timestamp}_${randomSuffix}${ext}`

    // Try Vercel Blob first (for production on Vercel)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import('@vercel/blob')
        const blob = await put(`uploads/${filename}`, buffer, {
          access: 'public',
          contentType: file.type || 'application/octet-stream',
        })
        return NextResponse.json({ url: blob.url })
      } catch (blobError) {
        console.error('Vercel Blob upload failed, falling back to local:', blobError)
        // Fall through to local storage
      }
    }

    // Local filesystem storage (for development)
    const uploadsDir = path.join(process.cwd(), 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filePath = path.join(uploadsDir, filename)
    await writeFile(filePath, buffer)

    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Error uploading file' }, { status: 500 })
  }
}
