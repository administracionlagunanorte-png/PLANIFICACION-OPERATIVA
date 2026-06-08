import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'

// Resolve the project root directory
function getProjectRoot() {
  const cwd = process.cwd()
  if (cwd.includes('.next/standalone') || cwd.includes('.next\\standalone')) {
    return path.resolve(cwd, '../..')
  }
  return cwd
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathParts } = await params
    
    if (!pathParts || pathParts.length === 0) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 })
    }

    const filePath = path.join(getProjectRoot(), 'uploads', ...pathParts)
    
    // Security: prevent directory traversal
    const resolvedPath = path.resolve(filePath)
    const uploadsDir = path.resolve(path.join(getProjectRoot(), 'uploads'))
    if (!resolvedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 403 })
    }

    const fileStats = await stat(resolvedPath)
    if (!fileStats.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 })
    }

    const buffer = await readFile(resolvedPath)
    const ext = path.extname(resolvedPath).toLowerCase()

    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    }

    const contentType = contentTypes[ext] || 'application/octet-stream'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
