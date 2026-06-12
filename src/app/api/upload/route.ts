import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { put } from '@vercel/blob'

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

    // Try Vercel Blob first (works on Vercel with BLOB_READ_WRITE_TOKEN or OIDC)
    if (process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`uploads/${filename}`, buffer, {
          access: 'public',
          contentType: file.type || 'application/octet-stream',
        })
        return NextResponse.json({ url: blob.url })
      } catch (blobError) {
        console.error('Vercel Blob upload failed:', blobError)
        // If on Vercel, don't fall back to filesystem (it won't work)
        if (process.env.VERCEL) {
          return NextResponse.json(
            { error: 'Error uploading to Vercel Blob. Make sure Blob storage is connected to your project in Vercel Dashboard.' },
            { status: 500 }
          )
        }
        // Fall through to local filesystem for development
      }
    }

    // Local filesystem storage (for development only)
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
