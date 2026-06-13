import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { writeFile, mkdir, existsSync } from 'fs/promises'
import path from 'path'

// Resolve project root (works in both dev and standalone mode)
function getProjectRoot() {
  const cwd = process.cwd()
  if (cwd.includes('.next/standalone') || cwd.includes('.next\\standalone')) {
    return path.resolve(cwd, '../..')
  }
  return cwd
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate a unique filename
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const ext = path.extname(file.name) || '.bin'
    const filename = `${timestamp}_${randomSuffix}${ext}`

    // Try Vercel Blob first (works in production)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`uploads/${filename}`, buffer, {
          access: 'public',
          contentType: file.type || 'application/octet-stream',
        })
        return NextResponse.json({ url: blob.url })
      } catch (blobError) {
        console.error('Vercel Blob upload failed, falling back to local:', blobError)
        if (process.env.VERCEL) {
          return NextResponse.json(
            { error: 'Error uploading to Vercel Blob. Check BLOB_READ_WRITE_TOKEN.' },
            { status: 500 }
          )
        }
      }
    }

    // Fallback: save to local filesystem (works in development)
    const uploadsDir = path.join(getProjectRoot(), 'uploads')
    if (!existsSync(uploadsDir)) { await mkdir(uploadsDir, { recursive: true }) }
    const filePath = path.join(uploadsDir, filename)
    await writeFile(filePath, buffer)

    const url = `/uploads/${filename}`
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
