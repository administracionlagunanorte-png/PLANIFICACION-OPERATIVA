import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Resolve the project root directory - works in both dev and standalone mode
function getProjectRoot() {
  // In dev mode, process.cwd() is the project root
  // In standalone mode, we need to go up from .next/standalone
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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const ext = path.extname(file.name) || '.png'
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const filename = `${timestamp}_${randomSuffix}${ext}`

    // Ensure uploads directory exists
    const uploadsDir = path.join(getProjectRoot(), 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    const filePath = path.join(uploadsDir, filename)
    await writeFile(filePath, buffer)

    // Return the URL that the frontend can use to display the image
    const url = `/uploads/${filename}`

    return NextResponse.json({ url, filename })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Error uploading file' }, { status: 500 })
  }
}
