'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Eye, ArrowLeft, Upload, X, CheckCircle, XCircle, Clock, FileText, FileSpreadsheet, Download, Camera, Send, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { jsPDF } from 'jspdf'
import ExcelJS from 'exceljs'

// ============================================================
// Types
// ============================================================

interface ExpenseReport {
  id: string
  correlativeNumber: number
  title: string
  description: string | null
  status: string
  totalAmount: number
  responsible: string | null
  reviewNote: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
  items?: ExpenseItem[]
  itemCount?: number
  _count?: { items: number }
}

interface ExpenseItem {
  id: string
  description: string
  numeroBoleta: string
  montoRendir: number
  category: string
  expenseDate: string
  imageBoletaUrl: string
  imageCompraUrl: string
  reportId: string
  createdAt: string
  updatedAt: string
}

interface ExpenseCategory {
  id: string
  name: string
  icon: string
}

// ============================================================
// Helpers
// ============================================================

const formatCLP = (amount: number | null | undefined): string => {
  if (amount == null || isNaN(amount)) return '$0'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount))
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  BORRADOR: { label: 'Borrador', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  ENVIADO: { label: 'Enviado', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  APROBADO: { label: 'Aprobado', color: 'text-green-600', bgColor: 'bg-green-100' },
  RECHAZADO: { label: 'Rechazado', color: 'text-red-600', bgColor: 'bg-red-100' },
  MODIFICACIÓN_SOLICITADA: { label: 'Modif. Solicitada', color: 'text-orange-600', bgColor: 'bg-orange-100' },
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getCorrelative(num: number): string {
  return `R-${String(num).padStart(3, '0')}`
}

// ============================================================
// Component
// ============================================================

export default function RendicionGastos() {
  const { toast } = useToast()

  // View state
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'form'>('list')
  const [reports, setReports] = useState<ExpenseReport[]>([])
  const [selectedReport, setSelectedReport] = useState<ExpenseReport | null>(null)
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // List filters
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Report form
  const [reportFormOpen, setReportFormOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<ExpenseReport | null>(null)
  const [reportForm, setReportForm] = useState({ title: '', description: '', responsible: '' })

  // Item form
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null)
  const [itemForm, setItemForm] = useState({
    description: '',
    numeroBoleta: '',
    montoRendir: '',
    category: '',
    expenseDate: '',
    imageBoletaUrl: '',
    imageCompraUrl: '',
  })
  const [uploadingBoleta, setUploadingBoleta] = useState(false)
  const [uploadingCompra, setUploadingCompra] = useState(false)

  // Review dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<string>('')
  const [reviewNote, setReviewNote] = useState('')
  const [reviewedBy, setReviewedBy] = useState('')

  // Delete confirmations
  const [deleteReportDialogOpen, setDeleteReportDialogOpen] = useState(false)
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)

  // Photo viewer
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)
  const [photoViewerUrl, setPhotoViewerUrl] = useState('')

  // ============================================================
  // Data fetching
  // ============================================================

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(currentPage))
      params.set('limit', '20')
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())

      const res = await fetch(`/api/expense-reports?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setReports(json.data || [])
        setTotalPages(json.pagination?.totalPages || 1)
        setTotalCount(json.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Error fetching reports:', err)
      toast({ title: 'Error', description: 'No se pudieron cargar los reportes', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchReportDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/expense-reports/${id}`)
      if (res.ok) {
        const json = await res.json()
        setSelectedReport(json.data)
        return json.data
      }
    } catch (err) {
      console.error('Error fetching report detail:', err)
      toast({ title: 'Error', description: 'No se pudo cargar el detalle del reporte', variant: 'destructive' })
    }
    return null
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/expense-categories')
      if (res.ok) {
        const json = await res.json()
        setCategories(json.data || [])
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchReports()
  }, [filterStatus, currentPage])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentView === 'list') fetchReports()
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // ============================================================
  // Photo upload
  // ============================================================

  const handlePhotoUpload = async (file: File, type: 'boleta' | 'compra'): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        return data.url
      }
    } catch (err) {
      console.error('Error uploading photo:', err)
      toast({ title: 'Error', description: 'No se pudo subir la imagen', variant: 'destructive' })
    }
    return null
  }

  // ============================================================
  // Report CRUD
  // ============================================================

  const handleCreateReport = () => {
    setEditingReport(null)
    setReportForm({ title: '', description: '', responsible: '' })
    setReportFormOpen(true)
  }

  const handleEditReport = (report: ExpenseReport) => {
    setEditingReport(report)
    setReportForm({
      title: report.title,
      description: report.description || '',
      responsible: report.responsible || '',
    })
    setReportFormOpen(true)
  }

  const handleSaveReport = async () => {
    if (!reportForm.title.trim()) {
      toast({ title: 'Error', description: 'El título es requerido', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const body = {
        title: reportForm.title.trim(),
        description: reportForm.description.trim() || null,
        responsible: reportForm.responsible.trim() || null,
      }

      let res: Response
      if (editingReport) {
        res = await fetch(`/api/expense-reports/${editingReport.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/expense-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      if (res.ok) {
        const json = await res.json()
        toast({ title: editingReport ? 'Reporte actualizado' : 'Reporte creado', description: editingReport ? 'Los cambios han sido guardados' : 'Se ha creado un nuevo reporte de gastos' })
        setReportFormOpen(false)
        if (currentView === 'detail' && editingReport) {
          setSelectedReport(json.data)
        }
        fetchReports()
      } else {
        const json = await res.json()
        toast({ title: 'Error', description: json.error || 'No se pudo guardar', variant: 'destructive' })
      }
    } catch (err) {
      console.error('Error saving report:', err)
      toast({ title: 'Error', description: 'No se pudo guardar el reporte', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteReport = async () => {
    if (!selectedReport) return
    try {
      const res = await fetch(`/api/expense-reports/${selectedReport.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Reporte eliminado', description: 'El reporte ha sido eliminado correctamente' })
        setCurrentView('list')
        setSelectedReport(null)
        fetchReports()
      } else {
        const json = await res.json()
        toast({ title: 'Error', description: json.error || 'No se pudo eliminar', variant: 'destructive' })
      }
    } catch (err) {
      console.error('Error deleting report:', err)
      toast({ title: 'Error', description: 'No se pudo eliminar el reporte', variant: 'destructive' })
    }
    setDeleteReportDialogOpen(false)
  }

  // ============================================================
  // Status transitions
  // ============================================================

  const handleStatusChange = async (status: string, note?: string, reviewer?: string) => {
    if (!selectedReport) return
    try {
      const body: Record<string, unknown> = { status }
      if (note) body.reviewNote = note
      if (reviewer) body.reviewedBy = reviewer

      const res = await fetch(`/api/expense-reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const json = await res.json()
        setSelectedReport(json.data)
        toast({ title: 'Estado actualizado', description: `El reporte ahora está en estado: ${statusConfig[status]?.label || status}` })
        fetchReports()
      } else {
        const json = await res.json()
        toast({ title: 'Error', description: json.error || 'No se pudo cambiar el estado', variant: 'destructive' })
      }
    } catch (err) {
      console.error('Error changing status:', err)
      toast({ title: 'Error', description: 'No se pudo cambiar el estado', variant: 'destructive' })
    }
    setReviewDialogOpen(false)
    setReviewNote('')
    setReviewedBy('')
    setReviewAction('')
  }

  const openReviewDialog = (action: string) => {
    setReviewAction(action)
    setReviewNote('')
    setReviewedBy('')
    setReviewDialogOpen(true)
  }

  const handleConfirmReview = () => {
    if (reviewAction === 'MODIFICACIÓN SOLICITADA') {
      handleStatusChange('MODIFICACIÓN SOLICITADA', reviewNote, reviewedBy)
    } else if (reviewAction === 'RECHAZADO') {
      handleStatusChange('RECHAZADO', reviewNote, reviewedBy)
    } else if (reviewAction === 'APROBADO') {
      handleStatusChange('APROBADO', reviewNote, reviewedBy)
    }
  }

  // ============================================================
  // Item CRUD
  // ============================================================

  const openCreateItem = () => {
    setEditingItem(null)
    setItemForm({
      description: '',
      numeroBoleta: '',
      montoRendir: '',
      category: categories.length > 0 ? categories[0].name : '',
      expenseDate: new Date().toISOString().split('T')[0],
      imageBoletaUrl: '',
      imageCompraUrl: '',
    })
    setItemFormOpen(true)
  }

  const openEditItem = (item: ExpenseItem) => {
    setEditingItem(item)
    setItemForm({
      description: item.description,
      numeroBoleta: item.numeroBoleta,
      montoRendir: String(item.montoRendir),
      category: item.category,
      expenseDate: item.expenseDate ? new Date(item.expenseDate).toISOString().split('T')[0] : '',
      imageBoletaUrl: item.imageBoletaUrl,
      imageCompraUrl: item.imageCompraUrl,
    })
    setItemFormOpen(true)
  }

  const handleSaveItem = async () => {
    if (!selectedReport) return
    if (!itemForm.description.trim()) {
      toast({ title: 'Error', description: 'La descripción es requerida', variant: 'destructive' })
      return
    }
    if (!itemForm.numeroBoleta.trim()) {
      toast({ title: 'Error', description: 'El número de boleta es requerido', variant: 'destructive' })
      return
    }
    if (!itemForm.montoRendir || Number(itemForm.montoRendir) <= 0) {
      toast({ title: 'Error', description: 'El monto a rendir debe ser mayor a 0', variant: 'destructive' })
      return
    }
    if (!itemForm.category) {
      toast({ title: 'Error', description: 'La categoría es requerida', variant: 'destructive' })
      return
    }
    if (!itemForm.expenseDate) {
      toast({ title: 'Error', description: 'La fecha de gasto es requerida', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const body = {
        description: itemForm.description.trim(),
        numeroBoleta: itemForm.numeroBoleta.trim(),
        montoRendir: Number(itemForm.montoRendir),
        category: itemForm.category,
        expenseDate: itemForm.expenseDate,
        imageBoletaUrl: itemForm.imageBoletaUrl,
        imageCompraUrl: itemForm.imageCompraUrl,
        reportId: selectedReport.id,
      }

      let res: Response
      if (editingItem) {
        res = await fetch(`/api/expense-items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/expense-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      if (res.ok) {
        toast({ title: editingItem ? 'Item actualizado' : 'Item agregado', description: editingItem ? 'Los cambios han sido guardados' : 'Se ha agregado un nuevo item al reporte' })
        setItemFormOpen(false)
        // Refresh report detail
        const updated = await fetchReportDetail(selectedReport.id)
        if (updated) setSelectedReport(updated)
      } else {
        const json = await res.json()
        toast({ title: 'Error', description: json.error || 'No se pudo guardar', variant: 'destructive' })
      }
    } catch (err) {
      console.error('Error saving item:', err)
      toast({ title: 'Error', description: 'No se pudo guardar el item', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteItem = async () => {
    if (!deleteItemId || !selectedReport) return
    try {
      const res = await fetch(`/api/expense-items/${deleteItemId}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Item eliminado', description: 'El item ha sido eliminado correctamente' })
        const updated = await fetchReportDetail(selectedReport.id)
        if (updated) setSelectedReport(updated)
      } else {
        const json = await res.json()
        toast({ title: 'Error', description: json.error || 'No se pudo eliminar', variant: 'destructive' })
      }
    } catch (err) {
      console.error('Error deleting item:', err)
      toast({ title: 'Error', description: 'No se pudo eliminar el item', variant: 'destructive' })
    }
    setDeleteItemDialogOpen(false)
    setDeleteItemId(null)
  }

  // ============================================================
  // PDF Export
  // ============================================================

  const exportPDF = async () => {
    if (!selectedReport) return
    try {
      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 15
      let y = 20

      // Header
      doc.setFontSize(18)
      doc.setTextColor(30, 64, 175)
      doc.text('Rendición de Gastos', margin, y)
      y += 8
      doc.setFontSize(12)
      doc.setTextColor(100, 100, 100)
      doc.text(getCorrelative(selectedReport.correlativeNumber) + ' - ' + selectedReport.title, margin, y)
      y += 10

      // Report info
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const infoLines = [
        ['Responsable:', selectedReport.responsible || '-'],
        ['Estado:', statusConfig[selectedReport.status]?.label || selectedReport.status],
        ['Monto Total:', formatCLP(selectedReport.totalAmount)],
        ['Descripción:', selectedReport.description || '-'],
        ['Fecha Creación:', formatDate(selectedReport.createdAt)],
        ['Fecha Envío:', formatDate(selectedReport.submittedAt)],
        ['Fecha Revisión:', formatDate(selectedReport.reviewedAt)],
        ['Revisado por:', selectedReport.reviewedBy || '-'],
      ]

      infoLines.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin, y)
        doc.setFont('helvetica', 'normal')
        doc.text(String(value), margin + 35, y)
        y += 6
      })

      if (selectedReport.reviewNote) {
        y += 2
        doc.setFont('helvetica', 'bold')
        doc.text('Nota de Revisión:', margin, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        const noteLines = doc.splitTextToSize(selectedReport.reviewNote, pageWidth - margin * 2)
        doc.text(noteLines, margin, y)
        y += noteLines.length * 5
      }

      y += 5
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, pageWidth - margin, y)
      y += 8

      // Items table header
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 64, 175)
      doc.text('Detalle de Gastos', margin, y)
      y += 7

      doc.setFontSize(8)
      doc.setTextColor(80, 80, 80)
      doc.setFont('helvetica', 'bold')
      const colX = [margin, margin + 55, margin + 85, margin + 115, margin + 140]
      const headers = ['Descripción', 'N° Boleta', 'Categoría', 'Fecha', 'Monto']
      headers.forEach((h, i) => doc.text(h, colX[i], y))
      y += 2
      doc.line(margin, y, pageWidth - margin, y)
      y += 5

      // Items
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      const items = selectedReport.items || []
      items.forEach((item) => {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        const descLines = doc.splitTextToSize(item.description, 52)
        doc.text(descLines, colX[0], y)
        doc.text(item.numeroBoleta, colX[1], y)
        doc.text(item.category, colX[2], y)
        doc.text(formatDate(item.expenseDate), colX[3], y)
        doc.text(formatCLP(item.montoRendir), colX[4], y)
        y += Math.max(descLines.length * 4, 5) + 3
      })

      // Total
      y += 3
      doc.line(margin, y, pageWidth - margin, y)
      y += 7
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('TOTAL:', margin + 115, y)
      doc.text(formatCLP(selectedReport.totalAmount), margin + 140, y)

      // Footer
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Generado el ${new Date().toLocaleString('es-CL')}`, margin, 290)

      doc.save(`rendicion-${getCorrelative(selectedReport.correlativeNumber)}.pdf`)
      toast({ title: 'PDF exportado', description: 'El archivo PDF se ha descargado correctamente' })
    } catch (err) {
      console.error('Error exporting PDF:', err)
      toast({ title: 'Error', description: 'No se pudo exportar el PDF', variant: 'destructive' })
    }
  }

  // ============================================================
  // Excel Export
  // ============================================================

  const exportExcel = async () => {
    if (!selectedReport) return
    try {
      const workbook = new ExcelJS.Workbook()

      // Summary sheet
      const summarySheet = workbook.addWorksheet('Resumen')
      summarySheet.columns = [
        { header: 'Campo', key: 'field', width: 25 },
        { header: 'Valor', key: 'value', width: 50 },
      ]

      const summaryData = [
        { field: 'Correlativo', value: getCorrelative(selectedReport.correlativeNumber) },
        { field: 'Título', value: selectedReport.title },
        { field: 'Descripción', value: selectedReport.description || '-' },
        { field: 'Responsable', value: selectedReport.responsible || '-' },
        { field: 'Estado', value: statusConfig[selectedReport.status]?.label || selectedReport.status },
        { field: 'Monto Total', value: selectedReport.totalAmount },
        { field: 'Fecha Creación', value: formatDate(selectedReport.createdAt) },
        { field: 'Fecha Envío', value: formatDate(selectedReport.submittedAt) },
        { field: 'Fecha Revisión', value: formatDate(selectedReport.reviewedAt) },
        { field: 'Revisado por', value: selectedReport.reviewedBy || '-' },
        { field: 'Nota Revisión', value: selectedReport.reviewNote || '-' },
      ]
      summarySheet.addRows(summaryData)

      // Style header
      summarySheet.getRow(1).font = { bold: true, color: { argb: 'FF1E40AF' } }

      // Format amount cell
      const totalRow = summarySheet.getRow(6)
      totalRow.getCell(2).numFmt = '$#,##0'

      // Detail sheet
      const detailSheet = workbook.addWorksheet('Detalle')
      detailSheet.columns = [
        { header: 'Descripción', key: 'description', width: 40 },
        { header: 'N° Boleta', key: 'numeroBoleta', width: 15 },
        { header: 'Categoría', key: 'category', width: 15 },
        { header: 'Fecha', key: 'expenseDate', width: 15 },
        { header: 'Monto', key: 'montoRendir', width: 15 },
      ]

      const items = selectedReport.items || []
      items.forEach((item) => {
        detailSheet.addRow({
          description: item.description,
          numeroBoleta: item.numeroBoleta,
          category: item.category,
          expenseDate: formatDate(item.expenseDate),
          montoRendir: item.montoRendir,
        })
      })

      // Style header
      detailSheet.getRow(1).font = { bold: true, color: { argb: 'FF1E40AF' } }

      // Format amounts
      for (let i = 2; i <= items.length + 1; i++) {
        detailSheet.getRow(i).getCell(5).numFmt = '$#,##0'
      }

      // Total row
      const totalRowIndex = items.length + 3
      detailSheet.getCell(`A${totalRowIndex}`).value = 'TOTAL'
      detailSheet.getCell(`A${totalRowIndex}`).font = { bold: true }
      detailSheet.getCell(`E${totalRowIndex}`).value = selectedReport.totalAmount
      detailSheet.getCell(`E${totalRowIndex}`).font = { bold: true }
      detailSheet.getCell(`E${totalRowIndex}`).numFmt = '$#,##0'

      // Download
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rendicion-${getCorrelative(selectedReport.correlativeNumber)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)

      toast({ title: 'Excel exportado', description: 'El archivo Excel se ha descargado correctamente' })
    } catch (err) {
      console.error('Error exporting Excel:', err)
      toast({ title: 'Error', description: 'No se pudo exportar el Excel', variant: 'destructive' })
    }
  }

  // ============================================================
  // View handlers
  // ============================================================

  const openDetail = async (report: ExpenseReport) => {
    setCurrentView('detail')
    const detail = await fetchReportDetail(report.id)
    if (detail) {
      setSelectedReport(detail)
    } else {
      setSelectedReport(report)
    }
  }

  const goBackToList = () => {
    setCurrentView('list')
    setSelectedReport(null)
    fetchReports()
  }

  const canEdit = selectedReport?.status === 'BORRADOR' || selectedReport?.status === 'MODIFICACIÓN_SOLICITADA'
  const canDelete = selectedReport?.status === 'BORRADOR'
  const canSubmit = selectedReport?.status === 'BORRADOR' || selectedReport?.status === 'MODIFICACIÓN_SOLICITADA'
  const canReview = selectedReport?.status === 'ENVIADO'

  // ============================================================
  // Render: List View
  // ============================================================

  const renderListView = () => (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Rendiciones de Gastos</h2>
          <p className="text-sm text-gray-500">{totalCount} reporte{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={handleCreateReport} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Nueva Rendición
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por título, descripción o responsable..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="w-full"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Report cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-600">No hay rendiciones de gastos</h3>
          <p className="text-sm text-gray-400 mt-1">Crea una nueva rendición para comenzar</p>
          <Button onClick={handleCreateReport} className="mt-4 gap-1.5">
            <Plus className="h-4 w-4" /> Nueva Rendición
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map((report) => {
            const sc = statusConfig[report.status] || statusConfig.BORRADOR
            const itemCount = report.itemCount ?? report._count?.items ?? 0
            return (
              <Card
                key={report.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                style={{ borderLeftColor: report.status === 'APROBADO' ? '#16a34a' : report.status === 'RECHAZADO' ? '#dc2626' : report.status === 'ENVIADO' ? '#d97706' : '#9ca3af' }}
                onClick={() => openDetail(report)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-primary">{getCorrelative(report.correlativeNumber)}</span>
                        <Badge className={`${sc.bgColor} ${sc.color} text-[11px] px-1.5 py-0`}>{sc.label}</Badge>
                      </div>
                      <CardTitle className="text-base leading-tight truncate">{report.title}</CardTitle>
                    </div>
                    <Eye className="h-4 w-4 text-gray-400 shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <div className="space-y-1.5 text-sm text-gray-600">
                    {report.responsible && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-400">👤</span>
                        <span className="truncate">{report.responsible}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                      <span className="font-bold text-gray-900">{formatCLP(report.totalAmount)}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(report.createdAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-600">
            Pág. {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )

  // ============================================================
  // Render: Detail View
  // ============================================================

  const renderDetailView = () => {
    if (!selectedReport) return null
    const sc = statusConfig[selectedReport.status] || statusConfig.BORRADOR
    const items = selectedReport.items || []

    return (
      <div className="space-y-4">
        {/* Back + Header */}
        <div className="flex items-start gap-3">
          <Button variant="outline" size="sm" onClick={goBackToList} className="gap-1 shrink-0 mt-1">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-primary">{getCorrelative(selectedReport.correlativeNumber)}</span>
              <Badge className={`${sc.bgColor} ${sc.color}`}>{sc.label}</Badge>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-1">{selectedReport.title}</h2>
          </div>
        </div>

        {/* Report info card */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Responsable</p>
                <p className="font-medium text-gray-900 mt-0.5">{selectedReport.responsible || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Monto Total</p>
                <p className="font-bold text-lg text-gray-900 mt-0.5">{formatCLP(selectedReport.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Fecha Creación</p>
                <p className="font-medium text-gray-900 mt-0.5">{formatDateTime(selectedReport.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Fecha Envío</p>
                <p className="font-medium text-gray-900 mt-0.5">{formatDateTime(selectedReport.submittedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Fecha Revisión</p>
                <p className="font-medium text-gray-900 mt-0.5">{formatDateTime(selectedReport.reviewedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Revisado por</p>
                <p className="font-medium text-gray-900 mt-0.5">{selectedReport.reviewedBy || '-'}</p>
              </div>
            </div>
            {selectedReport.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Descripción</p>
                <p className="text-gray-700 mt-0.5">{selectedReport.description}</p>
              </div>
            )}
            {selectedReport.reviewNote && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Nota de Revisión</p>
                <div className="mt-1 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm">
                  {selectedReport.reviewNote}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {canSubmit && (
            <Button
              onClick={() => handleStatusChange('ENVIADO')}
              className="gap-1.5 bg-amber-500 hover:bg-amber-600"
            >
              <Send className="h-4 w-4" /> Enviar para Revisión
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => handleEditReport(selectedReport)} className="gap-1.5">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" onClick={() => setDeleteReportDialogOpen(true)} className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          )}
          {canReview && (
            <>
              <Button onClick={() => handleStatusChange('APROBADO')} className="gap-1.5 bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4" /> Aprobar
              </Button>
              <Button onClick={() => openReviewDialog('RECHAZADO')} className="gap-1.5 bg-red-500 hover:bg-red-600">
                <XCircle className="h-4 w-4" /> Rechazar
              </Button>
              <Button onClick={() => openReviewDialog('MODIFICACIÓN SOLICITADA')} variant="outline" className="gap-1.5 border-orange-400 text-orange-600 hover:bg-orange-50">
                <RotateCcw className="h-4 w-4" /> Solicitar Modificación
              </Button>
            </>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
              <FileText className="h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          </div>
        </div>

        {/* Items section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Items de Gasto ({items.length})</CardTitle>
              {canEdit && (
                <Button size="sm" onClick={openCreateItem} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Agregar Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500">No hay items en esta rendición</p>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={openCreateItem} className="mt-3 gap-1.5">
                    <Plus className="h-4 w-4" /> Agregar Primer Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{item.description}</span>
                          <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                          <span>Boleta: {item.numeroBoleta}</span>
                          <span>Fecha: {formatDate(item.expenseDate)}</span>
                        </div>
                        <div className="mt-1.5">
                          <span className="font-bold text-gray-900">{formatCLP(item.montoRendir)}</span>
                        </div>
                        {/* Photos */}
                        {(item.imageBoletaUrl || item.imageCompraUrl) && (
                          <div className="flex gap-2 mt-2">
                            {item.imageBoletaUrl && (
                              <div className="relative group">
                                <img
                                  src={item.imageBoletaUrl}
                                  alt="Boleta"
                                  className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => { setPhotoViewerUrl(item.imageBoletaUrl); setPhotoViewerOpen(true) }}
                                />
                                <span className="absolute bottom-0 left-0 right-0 text-[8px] text-white bg-black/60 text-center rounded-b">Boleta</span>
                              </div>
                            )}
                            {item.imageCompraUrl && (
                              <div className="relative group">
                                <img
                                  src={item.imageCompraUrl}
                                  alt="Compra"
                                  className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => { setPhotoViewerUrl(item.imageCompraUrl); setPhotoViewerOpen(true) }}
                                />
                                <span className="absolute bottom-0 left-0 right-0 text-[8px] text-white bg-black/60 text-center rounded-b">Compra</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditItem(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => { setDeleteItemId(item.id); setDeleteItemDialogOpen(true) }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Items total */}
            {items.length > 0 && (
              <div className="flex justify-end items-center gap-2 pt-3 mt-3 border-t">
                <span className="text-sm text-gray-500">Total Items:</span>
                <span className="text-lg font-bold text-gray-900">{formatCLP(selectedReport.totalAmount)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen">
      {currentView === 'list' && renderListView()}
      {currentView === 'detail' && renderDetailView()}

      {/* ============================================ */}
      {/* Report Form Dialog */}
      {/* ============================================ */}
      <Dialog open={reportFormOpen} onOpenChange={setReportFormOpen}>
        <DialogContent className="sm:max-w-lg w-[calc(100vw-1rem)] sm:w-auto">
          <DialogHeader>
            <DialogTitle>{editingReport ? 'Editar Rendición' : 'Nueva Rendición de Gastos'}</DialogTitle>
            <DialogDescription className="sr-only">
              {editingReport ? 'Formulario para editar rendición de gastos' : 'Formulario para crear nueva rendición de gastos'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="report-title">Título *</Label>
              <Input
                id="report-title"
                placeholder="Ej: Gastos mantenimiento junio 2026"
                value={reportForm.title}
                onChange={(e) => setReportForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-responsible">Responsable</Label>
              <Input
                id="report-responsible"
                placeholder="Nombre del responsable"
                value={reportForm.responsible}
                onChange={(e) => setReportForm((p) => ({ ...p, responsible: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-description">Descripción</Label>
              <Textarea
                id="report-description"
                placeholder="Descripción de la rendición..."
                value={reportForm.description}
                onChange={(e) => setReportForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportFormOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSaveReport} disabled={!reportForm.title.trim() || saving}>
              {saving ? 'Guardando...' : editingReport ? 'Guardar Cambios' : 'Crear Rendición'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* Item Form Dialog */}
      {/* ============================================ */}
      <Dialog open={itemFormOpen} onOpenChange={setItemFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto w-[calc(100vw-1rem)] sm:w-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item de Gasto' : 'Agregar Item de Gasto'}</DialogTitle>
            <DialogDescription className="sr-only">
              {editingItem ? 'Formulario para editar item de gasto' : 'Formulario para agregar nuevo item de gasto'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="item-description">Descripción *</Label>
              <Input
                id="item-description"
                placeholder="Descripción del gasto"
                value={itemForm.description}
                onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="item-boleta">N° Boleta *</Label>
                <Input
                  id="item-boleta"
                  placeholder="Ej: 12345"
                  value={itemForm.numeroBoleta}
                  onChange={(e) => setItemForm((p) => ({ ...p, numeroBoleta: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="item-amount">Monto a Rendir *</Label>
                <Input
                  id="item-amount"
                  type="number"
                  placeholder="$"
                  min="0"
                  value={itemForm.montoRendir}
                  onChange={(e) => setItemForm((p) => ({ ...p, montoRendir: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="item-category">Categoría *</Label>
                <Select value={itemForm.category} onValueChange={(v) => setItemForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger id="item-category">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="item-date">Fecha de Gasto *</Label>
                <Input
                  id="item-date"
                  type="date"
                  value={itemForm.expenseDate}
                  onChange={(e) => setItemForm((p) => ({ ...p, expenseDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Photo uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Boleta photo */}
              <div className="grid gap-2">
                <Label>Foto Boleta</Label>
                {itemForm.imageBoletaUrl ? (
                  <div className="relative">
                    <img
                      src={itemForm.imageBoletaUrl}
                      alt="Boleta"
                      className="w-full h-32 object-cover rounded-lg border"
                      onClick={() => { setPhotoViewerUrl(itemForm.imageBoletaUrl); setPhotoViewerOpen(true) }}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => setItemForm((p) => ({ ...p, imageBoletaUrl: '' }))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors">
                    {uploadingBoleta ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    ) : (
                      <>
                        <Camera className="h-6 w-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">Subir boleta</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setUploadingBoleta(true)
                        const url = await handlePhotoUpload(file, 'boleta')
                        if (url) setItemForm((p) => ({ ...p, imageBoletaUrl: url }))
                        setUploadingBoleta(false)
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Compra photo */}
              <div className="grid gap-2">
                <Label>Foto Compra</Label>
                {itemForm.imageCompraUrl ? (
                  <div className="relative">
                    <img
                      src={itemForm.imageCompraUrl}
                      alt="Compra"
                      className="w-full h-32 object-cover rounded-lg border"
                      onClick={() => { setPhotoViewerUrl(itemForm.imageCompraUrl); setPhotoViewerOpen(true) }}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => setItemForm((p) => ({ ...p, imageCompraUrl: '' }))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors">
                    {uploadingCompra ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">Subir compra</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setUploadingCompra(true)
                        const url = await handlePhotoUpload(file, 'compra')
                        if (url) setItemForm((p) => ({ ...p, imageCompraUrl: url }))
                        setUploadingCompra(false)
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemFormOpen(false)} disabled={saving}>Cancelar</Button>
            <Button
              onClick={handleSaveItem}
              disabled={!itemForm.description.trim() || !itemForm.numeroBoleta.trim() || !itemForm.montoRendir || !itemForm.category || !itemForm.expenseDate || saving}
            >
              {saving ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Agregar Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* Review Dialog */}
      {/* ============================================ */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-1rem)] sm:w-auto">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'RECHAZADO' ? 'Rechazar Reporte' : 'Solicitar Modificación'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'RECHAZADO'
                ? 'Indique el motivo del rechazo del reporte de gastos.'
                : 'Indique las modificaciones necesarias para el reporte de gastos.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="review-note">{reviewAction === 'RECHAZADO' ? 'Motivo del rechazo' : 'Modificaciones solicitadas'}</Label>
              <Textarea
                id="review-note"
                placeholder={reviewAction === 'RECHAZADO' ? 'Indique el motivo del rechazo...' : 'Describa las modificaciones necesarias...'}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reviewed-by">Revisado por</Label>
              <Input
                id="reviewed-by"
                placeholder="Nombre del revisor"
                value={reviewedBy}
                onChange={(e) => setReviewedBy(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleConfirmReview}
              className={reviewAction === 'RECHAZADO' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}
            >
              {reviewAction === 'RECHAZADO' ? 'Confirmar Rechazo' : 'Solicitar Modificación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* Delete Report Dialog */}
      {/* ============================================ */}
      <AlertDialog open={deleteReportDialogOpen} onOpenChange={setDeleteReportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Rendición</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar la rendición &quot;{selectedReport?.title}&quot;? Esta acción no se puede deshacer y se eliminarán todos los items asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReport} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================ */}
      {/* Delete Item Dialog */}
      {/* ============================================ */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Item</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar este item de gasto? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================ */}
      {/* Photo Viewer Dialog */}
      {/* ============================================ */}
      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black">
          <DialogDescription className="sr-only">Visor de imagen</DialogDescription>
          <div className="relative">
            {photoViewerUrl && (
              <img
                src={photoViewerUrl}
                alt="Foto ampliada"
                className="w-full max-h-[80vh] object-contain"
              />
            )}
            <button
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
              onClick={() => setPhotoViewerOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
