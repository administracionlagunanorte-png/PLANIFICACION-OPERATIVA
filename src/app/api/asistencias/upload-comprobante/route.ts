import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

// Resolve the project root directory
function getProjectRoot() {
  const cwd = process.cwd()
  if (cwd.includes('.next/standalone') || cwd.includes('.next\\standalone')) {
    return path.resolve(cwd, '../..')
  }
  return cwd
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo no puede superar 10MB' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido. Use JPG, PNG, GIF, WebP o PDF' }, { status: 400 })
    }

    const uploadsDir = path.join(getProjectRoot(), 'uploads', 'comprobantes')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const ext = path.extname(file.name) || '.bin'
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
    const filePath = path.join(uploadsDir, uniqueName)

    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    const fileUrl = `/api/serve-upload/comprobantes/${uniqueName}`

    return NextResponse.json({
      url: fileUrl,
      nombre: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('Error uploading comprobante:', error)
    return NextResponse.json({ error: 'Error al subir el archivo' }, { status: 500 })
  }
}
