import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'

// Resolve the project root directory - works in both dev and standalone mode
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
    const filePath = path.join(getProjectRoot(), 'uploads', ...pathParts)

    const fileStats = await stat(filePath)
    if (!fileStats.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 })
    }

    const buffer = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()

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
