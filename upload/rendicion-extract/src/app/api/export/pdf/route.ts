import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { formatCLP } from '@/lib/format-currency'
import { LOGO_BASE64 } from '@/lib/logo'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')

    if (!reportId) {
      return NextResponse.json({ error: 'Se requiere ID de rendición' }, { status: 400 })
    }

    const report = await db.expenseReport.findUnique({
      where: { id: reportId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        items: { orderBy: { createdAt: 'asc' } }
      }
    })

    if (!report) {
      return NextResponse.json({ error: 'Rendición no encontrada' }, { status: 404 })
    }

    // Generate HTML for PDF rendering on client side
    const htmlContent = generatePDFHtml(report)

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 })
  }
}

function generatePDFHtml(report: any): string {
  const statusLabels: Record<string, string> = {
    DRAFT: 'Borrador',
    SUBMITTED: 'Enviado',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    MODIFICATION_REQUESTED: 'Modificación Solicitada',
  }

  const statusColors: Record<string, string> = {
    DRAFT: '#6b7280',
    SUBMITTED: '#f59e0b',
    APPROVED: '#10b981',
    REJECTED: '#ef4444',
    MODIFICATION_REQUESTED: '#f97316',
  }

  const totalMontoRendir = report.items.reduce((sum: number, item: any) => sum + (item.montoRendir || 0), 0)

  const itemsRows = report.items.map((item: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.numeroBoleta || '-'}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCLP(item.montoRendir || 0)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.category}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${new Date(item.expenseDate).toLocaleDateString('es-CL')}</td>
    </tr>
  `).join('')

  // Build pairs of images side by side where both exist
  const imagePairs = report.items.map((item: any, index: number) => {
    const hasBoth = item.imageBoletaUrl && item.imageCompraUrl
    if (hasBoth) {
      return `
        <div style="margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; background: #fafafa;">
          <p style="font-weight: 600; margin-bottom: 4px; color: #1f2937; font-size: 14px;">
            Gasto #${index + 1}: ${item.description}
          </p>
          <p style="font-size: 11px; color: #6b7280; margin-bottom: 10px;">
            N. Boleta: ${item.numeroBoleta} | A Rendir: ${formatCLP(item.montoRendir)} | ${item.category} | ${new Date(item.expenseDate).toLocaleDateString('es-CL')}
          </p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 280px;">
              <p style="font-size: 11px; font-weight: 600; color: #059669; margin-bottom: 4px;">Foto de la Boleta</p>
              <img src="${item.imageBoletaUrl}" alt="Boleta: ${item.description}" style="width: 100%; max-height: 350px; object-fit: contain; border-radius: 6px; border: 1px solid #e5e7eb;" />
            </div>
            <div style="flex: 1; min-width: 280px;">
              <p style="font-size: 11px; font-weight: 600; color: #2563eb; margin-bottom: 4px;">Foto de la Compra</p>
              <img src="${item.imageCompraUrl}" alt="Compra: ${item.description}" style="width: 100%; max-height: 350px; object-fit: contain; border-radius: 6px; border: 1px solid #e5e7eb;" />
            </div>
          </div>
        </div>
      `
    } else {
      const parts = []
      if (item.imageBoletaUrl) {
        parts.push(`
          <div style="margin-bottom: 16px; page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa;">
            <p style="font-weight: 600; margin-bottom: 4px; color: #1f2937; font-size: 13px;">
              Gasto #${index + 1}: ${item.description} — Foto de la Boleta
            </p>
            <p style="font-size: 11px; color: #6b7280; margin-bottom: 6px;">N. Boleta: ${item.numeroBoleta} | A Rendir: ${formatCLP(item.montoRendir)}</p>
            <img src="${item.imageBoletaUrl}" alt="Boleta: ${item.description}" style="max-width: 100%; max-height: 400px; border-radius: 6px; display: block; margin: 0 auto;" />
          </div>
        `)
      }
      if (item.imageCompraUrl) {
        parts.push(`
          <div style="margin-bottom: 16px; page-break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa;">
            <p style="font-weight: 600; margin-bottom: 4px; color: #1f2937; font-size: 13px;">
              Gasto #${index + 1}: ${item.description} — Foto de la Compra
            </p>
            <img src="${item.imageCompraUrl}" alt="Compra: ${item.description}" style="max-width: 100%; max-height: 400px; border-radius: 6px; display: block; margin: 0 auto;" />
          </div>
        `)
      }
      return parts.join('')
    }
  }).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rendición de Gastos - ${report.title}</title>
  <style>
    @media print {
      body { margin: 0; padding: 15px; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
      @page { margin: 1cm; }
    }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; max-width: 900px; margin: 0 auto; padding: 20px; }
    h1 { color: #059669; font-size: 22px; margin-bottom: 4px; }
    h2 { color: #374151; font-size: 16px; margin-top: 28px; margin-bottom: 10px; border-bottom: 2px solid #059669; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background-color: #059669; color: white; padding: 7px 8px; text-align: left; font-size: 10px; }
    .total-row td { font-weight: 700; border-top: 2px solid #059669; padding: 8px; }
  </style>
</head>
<body>
  <div class="no-print" style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border: 1px solid #059669; border-radius: 10px; padding: 14px 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100;">
    <div>
      <span style="color: #065f46; font-weight: 600; font-size: 14px;">Vista previa del documento</span>
      <p style="color: #047857; font-size: 11px; margin-top: 2px;">Las imágenes se incluyen en la vista previa y en la impresión PDF</p>
    </div>
    <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      🖨️ Imprimir / Guardar PDF
    </button>
  </div>

  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; gap: 14px;">
      <img src="${LOGO_BASE64}" alt="Laguna Norte" style="height: 48px; width: 48px; border-radius: 10px; object-fit: cover;" />
      <div>
        <h1 style="margin-bottom: 2px;">Laguna Norte — Rendición de Gastos</h1>
        <p style="color: #6b7280; font-size: 13px; margin-top: 2px;">${report.title}${report.correlativeNumber ? ` — R-${String(report.correlativeNumber).padStart(3, '0')}` : ''}</p>
      </div>
    </div>
    <span style="background: ${statusColors[report.status] || '#6b7280'}; color: white; padding: 5px 16px; border-radius: 20px; font-size: 12px; font-weight: 600;">${statusLabels[report.status] || report.status}</span>
  </div>

  <div style="background: #f9fafb; border-radius: 10px; padding: 14px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
    <div>
      <p style="color: #6b7280; font-size: 11px; margin-bottom: 1px;">Solicitante</p>
      <p style="font-weight: 600; font-size: 13px;">${report.user.name}</p>
    </div>
    <div>
      <p style="color: #6b7280; font-size: 11px; margin-bottom: 1px;">Email</p>
      <p style="font-weight: 600; font-size: 13px;">${report.user.email}</p>
    </div>
    <div>
      <p style="color: #6b7280; font-size: 11px; margin-bottom: 1px;">Fecha Creación</p>
      <p style="font-weight: 600; font-size: 13px;">${new Date(report.createdAt).toLocaleDateString('es-CL')}</p>
    </div>
    <div>
      <p style="color: #6b7280; font-size: 11px; margin-bottom: 1px;">Total a Rendir</p>
      <p style="font-weight: 700; color: #059669; font-size: 16px;">${formatCLP(totalMontoRendir)}</p>
    </div>
  </div>

  ${report.description ? `<p style="margin-bottom: 20px; color: #4b5563; font-size: 13px;"><strong>Descripción:</strong> ${report.description}</p>` : ''}

  <h2>Detalle de Gastos</h2>
  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th style="text-align: center;">N. Boleta</th>
        <th style="text-align: right;">Monto a Rendir</th>
        <th>Categoría</th>
        <th style="text-align: center;">Fecha</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
      <tr class="total-row">
        <td style="padding: 8px; border-top: 2px solid #059669;">TOTAL</td>
        <td style="padding: 8px; border-top: 2px solid #059669;"></td>
        <td style="padding: 8px; border-top: 2px solid #059669; text-align: right; color: #059669; font-size: 13px;">${formatCLP(totalMontoRendir)}</td>
        <td style="padding: 8px; border-top: 2px solid #059669;"></td>
        <td style="padding: 8px; border-top: 2px solid #059669;"></td>
      </tr>
    </tbody>
  </table>

  ${imagePairs ? `<div class="page-break"></div><h2>Comprobantes Adjuntos (Fotos)</h2><p style="font-size: 11px; color: #6b7280; margin-bottom: 16px;">A continuación se muestran las fotografías de las boletas y compras adjuntas a cada gasto.</p>${imagePairs}` : ''}

  ${report.reviewNote ? `
  <div style="margin-top: 24px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 14px;">
    <p style="font-weight: 600; color: #92400e; margin-bottom: 4px; font-size: 13px;">Nota de Revisión</p>
    <p style="color: #78350f; font-size: 12px;">${report.reviewNote}</p>
  </div>` : ''}

  ${report.reviewedBy ? `
  <div style="margin-top: 12px; font-size: 11px; color: #6b7280;">
    <p>Revisado el ${report.reviewedAt ? new Date(report.reviewedAt).toLocaleDateString('es-CL') : '-'}</p>
  </div>` : ''}

  <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; display: flex; justify-content: space-between;">
    <span>Generado el ${new Date().toLocaleDateString('es-CL')} a las ${new Date().toLocaleTimeString('es-CL')}</span>
    <span>Sistema de Rendición de Gastos</span>
  </div>
</body>
</html>`
}
