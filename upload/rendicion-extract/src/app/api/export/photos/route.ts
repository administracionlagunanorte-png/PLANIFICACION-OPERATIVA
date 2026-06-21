import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth-helper'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado. Inicie sesión para continuar.' },
        { status: 401 }
      )
    }

    const userRole = session.user.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden descargar fotos' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')

    if (!reportId) {
      return NextResponse.json({ error: 'Se requiere ID de rendición' }, { status: 400 })
    }

    const report = await db.expenseReport.findUnique({
      where: { id: reportId },
      include: {
        user: { select: { name: true } },
        items: { orderBy: { createdAt: 'asc' } }
      }
    })

    if (!report) {
      return NextResponse.json({ error: 'Rendición no encontrada' }, { status: 404 })
    }

    // Create ZIP using dynamic import of archiver (CommonJS module)
    const archiverModule = await import('archiver')
    const archiver = archiverModule.default || archiverModule

    const archive = archiver('zip', { zlib: { level: 9 } })

    // Collect buffers from archive
    const chunks: Buffer[] = []
    archive.on('data', (chunk: Buffer) => chunks.push(chunk))

    const archivePromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => resolve(Buffer.concat(chunks)))
      archive.on('error', (err: Error) => reject(err))
    })

    // Add each item's photos to the archive
    report.items.forEach((item, index) => {
      const itemLabel = `Gasto${index + 1}`

      if (item.imageBoletaUrl) {
        try {
          const base64Data = extractBase64FromDataUrl(item.imageBoletaUrl)
          if (base64Data) {
            const ext = getExtensionFromDataUrl(item.imageBoletaUrl)
            archive.append(Buffer.from(base64Data, 'base64'), {
              name: `${itemLabel}_Boleta${ext}`
            })
          }
        } catch {
          // Skip invalid images
        }
      }

      if (item.imageCompraUrl) {
        try {
          const base64Data = extractBase64FromDataUrl(item.imageCompraUrl)
          if (base64Data) {
            const ext = getExtensionFromDataUrl(item.imageCompraUrl)
            archive.append(Buffer.from(base64Data, 'base64'), {
              name: `${itemLabel}_Compra${ext}`
            })
          }
        } catch {
          // Skip invalid images
        }
      }
    })

    await archive.finalize()
    const zipBuffer = await archivePromise

    const correlativeLabel = report.correlativeNumber
      ? `R-${String(report.correlativeNumber).padStart(3, '0')}`
      : reportId

    const filename = `fotos_rendicion_${correlativeLabel}.zip`

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting photos:', error)
    return NextResponse.json({ error: 'Error al exportar fotos' }, { status: 500 })
  }
}

function extractBase64FromDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/)
  return match ? match[1] : null
}

function getExtensionFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/([^;]+);/)
  if (match) {
    const mime = match[1].toLowerCase()
    if (mime === 'jpeg' || mime === 'jpg') return '.jpg'
    if (mime === 'png') return '.png'
    if (mime === 'gif') return '.gif'
    if (mime === 'webp') return '.webp'
    return `.${mime}`
  }
  return '.jpg'
}
