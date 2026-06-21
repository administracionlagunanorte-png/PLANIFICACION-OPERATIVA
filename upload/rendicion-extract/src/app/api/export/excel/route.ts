import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { formatCLPForExcel } from '@/lib/format-currency'
import * as XLSX from 'xlsx'
import { LOGO_BASE64 } from '@/lib/logo'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    let reports

    if (reportId) {
      const report = await db.expenseReport.findUnique({
        where: { id: reportId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: true
        }
      })
      if (!report) {
        return NextResponse.json({ error: 'Rendición no encontrada' }, { status: 404 })
      }
      reports = [report]
    } else {
      const where: any = {}
      if (status) where.status = status
      if (userId) where.userId = userId
      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) where.createdAt.gte = new Date(dateFrom)
        if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999')
      }

      reports = await db.expenseReport.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: true
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (reports.length === 0) {
      return NextResponse.json({ error: 'No hay rendiciones para exportar' }, { status: 404 })
    }

    const wb = XLSX.utils.book_new()

    // Header row for Laguna Norte branding
    const headerData = [{ 'Laguna Norte — Sistema de Rendición de Gastos': '' }]
    const headerWs = XLSX.utils.json_to_sheet(headerData, { skipHeader: true })
    headerWs['!cols'] = [{ wch: 50 }]
    headerWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }]
    // Style the header cell
    if (!headerWs['A1']) headerWs['A1'] = {}
    headerWs['A1'].v = 'Laguna Norte — Sistema de Rendición de Gastos'
    headerWs['A1'].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } }
    XLSX.utils.book_append_sheet(wb, headerWs, 'Laguna Norte')

    // Sheet 1: Summary
    const summaryData = reports.map(r => ({
      'Correlativo': r.correlativeNumber ? `R-${String(r.correlativeNumber).padStart(3, '0')}` : '',
      'ID Rendición': r.id,
      'Título': r.title,
      'Descripción': r.description || '',
      'Solicitante': r.user.name,
      'Email': r.user.email,
      'Estado': getStatusLabel(r.status),
      'Total a Rendir': formatCLPForExcel(r.items.reduce((sum: number, item: any) => sum + (item.montoRendir || 0), 0)),
      'Cantidad de Gastos': r.items.length,
      'Nota de Revisión': r.reviewNote || '',
      'Fecha Creación': r.createdAt.toLocaleDateString('es-CL'),
      'Fecha Actualización': r.updatedAt.toLocaleDateString('es-CL'),
    }))
    const summaryWs = XLSX.utils.json_to_sheet(summaryData)
    summaryWs['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 40 }, { wch: 20 }, { wch: 25 },
      { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }
    ]
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen Rendiciones')

    // Sheet 2: Detail
    const detailData: any[] = []
    reports.forEach(r => {
      const correlativo = r.correlativeNumber ? `R-${String(r.correlativeNumber).padStart(3, '0')}` : ''
      r.items.forEach((item, idx) => {
        detailData.push({
          'Correlativo': idx === 0 ? correlativo : '',
          'ID Rendición': idx === 0 ? r.id : '',
          'Título Rendición': idx === 0 ? r.title : '',
          'Solicitante': idx === 0 ? r.user.name : '',
          'Estado Rendición': idx === 0 ? getStatusLabel(r.status) : '',
          'Descripción Gasto': item.description,
          'Número de Boleta': item.numeroBoleta || '',
          'Monto a Rendir': formatCLPForExcel(item.montoRendir || 0),
          'Categoría': item.category,
          'Fecha Gasto': new Date(item.expenseDate).toLocaleDateString('es-CL'),
          'Foto Boleta': item.imageBoletaUrl ? 'Sí' : 'No',
          'Foto Compra': item.imageCompraUrl ? 'Sí' : 'No',
        })
      })
    })

    if (detailData.length > 0) {
      const detailWs = XLSX.utils.json_to_sheet(detailData)
      detailWs['!cols'] = [
        { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 18 },
        { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 }
      ]
      XLSX.utils.book_append_sheet(wb, detailWs, 'Detalle Gastos')
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const filename = reportId
      ? `rendicion_${reportId}.xlsx`
      : `rendiciones_${new Date().toISOString().slice(0, 10)}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting Excel:', error)
    return NextResponse.json({ error: 'Error al exportar Excel' }, { status: 500 })
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Borrador',
    SUBMITTED: 'Enviado',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    MODIFICATION_REQUESTED: 'Modificación Solicitada',
  }
  return labels[status] || status
}
