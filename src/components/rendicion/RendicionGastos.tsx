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
import { Plus, Pencil, Trash2, Eye, ArrowLeft, Upload, X, CheckCircle, XCircle, Clock, FileText, FileSpreadsheet, Download, Camera, Send, RotateCcw, ShieldCheck, Shield, ImageIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ModuleAlertBanner, { ModuleAlertItem } from './ModuleAlertBanner'
import AlertConfigDialog from './AlertConfigDialog'
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
  imageCompraUrls: string[] | string  // Support both array and legacy string
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

const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  BORRADOR: { label: 'Borrador', color: 'text-slate-700', bgColor: 'bg-slate-100', borderColor: 'border-l-slate-400', icon: <Clock className="w-3.5 h-3.5" /> },
  ENVIADO: { label: 'Enviado', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-l-amber-500', icon: <Send className="w-3.5 h-3.5" /> },
  APROBADO_SUPERVISOR: { label: 'Aprobado Supervisor', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-l-blue-500', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  APROBADO: { label: 'Aprobado Admin', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-l-emerald-500', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  RECHAZADO: { label: 'Rechazado', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-l-red-500', icon: <XCircle className="w-3.5 h-3.5" /> },
  'MODIFICACIÓN SOLICITADA': { label: 'Modif. Solicitada', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-l-orange-500', icon: <RotateCcw className="w-3.5 h-3.5" /> },
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

// Normalize imageCompraUrls to always be an array
function getCompraUrls(item: ExpenseItem): string[] {
  if (Array.isArray(item.imageCompraUrls)) return item.imageCompraUrls
  if (typeof item.imageCompraUrls === 'string') {
    if (!item.imageCompraUrls || item.imageCompraUrls === '[]' || item.imageCompraUrls === '') return []
    try {
      const parsed = JSON.parse(item.imageCompraUrls)
      return Array.isArray(parsed) ? parsed : [item.imageCompraUrls]
    } catch {
      return [item.imageCompraUrls]
    }
  }
  return []
}

// ============================================================
// Component
// ============================================================

interface RendicionGastosProps {
  userRole?: string
  initialStatusFilter?: string
  onStatusFilterConsumed?: () => void
}

export default function RendicionGastos({ userRole = 'USER', initialStatusFilter, onStatusFilterConsumed }: RendicionGastosProps) {
  const { toast } = useToast()
  const isAdmin = userRole === 'ADMIN'
  const isSupervisor = userRole === 'SUPERVISOR'
  const canApprove = isAdmin || isSupervisor
  const canEditAll = isAdmin || isSupervisor

  // View state
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'form'>('list')
  const [reports, setReports] = useState<ExpenseReport[]>([])
  const [selectedReport, setSelectedReport] = useState<ExpenseReport | null>(null)
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [moduleAlerts, setModuleAlerts] = useState<ModuleAlertItem[]>([])
  const [alertConfigOpen, setAlertConfigOpen] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  // List filters
  const [filterStatus, setFilterStatus] = useState<string>(initialStatusFilter || 'all')
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
    imageCompraUrls: [] as string[],  // Array of compra image URLs
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
  // React to initialStatusFilter from parent (dashboard click)
  // ============================================================
  useEffect(() => {
    if (initialStatusFilter && initialStatusFilter !== 'all') {
      setFilterStatus(initialStatusFilter)
      setCurrentPage(1)
      setCurrentView('list')
      if (onStatusFilterConsumed) onStatusFilterConsumed()
    }
  }, [initialStatusFilter])

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
    fetch('/api/module-alerts?module=rendicion').then(r => r.ok ? r.json() : []).then(setModuleAlerts).catch(() => {})
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

  const handlePhotoUpload = async (file: File): Promise<string | null> => {
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

  // Upload multiple compra images
  const handleMultipleCompraUpload = async (files: FileList) => {
    setUploadingCompra(true)
    const newUrls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const url = await handlePhotoUpload(files[i])
      if (url) newUrls.push(url)
    }
    if (newUrls.length > 0) {
      setItemForm((p) => ({ ...p, imageCompraUrls: [...p.imageCompraUrls, ...newUrls] }))
    }
    setUploadingCompra(false)
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
      imageCompraUrls: [],
    })
    setItemFormOpen(true)
  }

  const openEditItem = (item: ExpenseItem) => {
    const compraUrls = getCompraUrls(item)
    setEditingItem(item)
    setItemForm({
      description: item.description,
      numeroBoleta: item.numeroBoleta,
      montoRendir: String(item.montoRendir),
      category: item.category,
      expenseDate: item.expenseDate ? new Date(item.expenseDate).toISOString().split('T')[0] : '',
      imageBoletaUrl: item.imageBoletaUrl,
      imageCompraUrls: compraUrls,
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
        imageCompraUrls: itemForm.imageCompraUrls,
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

      // Load logo
      const logoUrl = `${window.location.origin}/logo-laguna-norte.jpg`
      let logoAdded = false
      try {
        const logoResp = await fetch(logoUrl)
        if (logoResp.ok) {
          const logoBlob = await logoResp.blob()
          const logoDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(logoBlob)
          })
          doc.addImage(logoDataUrl, 'JPEG', margin, y - 5, 30, 30)
          logoAdded = true
        }
      } catch (e) { /* logo not available */ }

      // Header
      doc.setFontSize(16)
      doc.setTextColor(30, 64, 175)
      const headerX = logoAdded ? margin + 35 : margin
      doc.text('Rendicion de Gastos', headerX, y + 2)
      y += 7
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text('Condominio Laguna Norte', headerX, y + 2)
      y += 6
      doc.setFontSize(11)
      doc.setTextColor(60, 60, 60)
      doc.text(getCorrelative(selectedReport.correlativeNumber) + ' - ' + selectedReport.title, headerX, y + 2)
      y += logoAdded ? 14 : 10

      // Report info
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const infoLines = [
        ['Responsable:', selectedReport.responsible || '-'],
        ['Estado:', statusConfig[selectedReport.status]?.label || selectedReport.status],
        ['Monto Total:', formatCLP(selectedReport.totalAmount)],
        ['Descripcion:', selectedReport.description || '-'],
        ['Fecha Creacion:', formatDate(selectedReport.createdAt)],
        ['Fecha Envio:', formatDate(selectedReport.submittedAt)],
        ['Fecha Revision:', formatDate(selectedReport.reviewedAt)],
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
        doc.text('Nota de Revision:', margin, y)
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
      const headers = ['Descripcion', 'N Boleta', 'Categoria', 'Fecha', 'Monto']
      headers.forEach((h, i) => doc.text(h, colX[i], y))
      y += 2
      doc.line(margin, y, pageWidth - margin, y)
      y += 5

      // Items
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      const items = selectedReport.items || []

      // Helper to load image as base64
      const loadImageAsBase64 = async (url: string): Promise<string | null> => {
        try {
          const resp = await fetch(url)
          if (!resp.ok) return null
          const blob = await resp.blob()
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
        } catch { return null }
      }

      for (const item of items) {
        if (y > 250) {
          doc.addPage()
          y = 20
        }
        const descLines = doc.splitTextToSize(item.description, 52)
        doc.text(descLines, colX[0], y)
        doc.text(item.numeroBoleta, colX[1], y)
        doc.text(item.category, colX[2], y)
        doc.text(formatDate(item.expenseDate), colX[3], y)
        doc.text(formatCLP(item.montoRendir), colX[4], y)
        y += Math.max(descLines.length * 4, 5) + 2

        // Add boleta image
        if (item.imageBoletaUrl) {
          const imgData = await loadImageAsBase64(item.imageBoletaUrl)
          if (imgData) {
            if (y > 240) { doc.addPage(); y = 20 }
            doc.setFontSize(7)
            doc.setTextColor(30, 64, 175)
            doc.text('Boleta:', colX[0], y)
            y += 2
            const imgHeight = 35
            const imgWidth = 35
            doc.addImage(imgData, 'JPEG', colX[0], y, imgWidth, imgHeight)
            y += imgHeight + 4
          }
        }

        // Add compra images
        const compraUrls = getCompraUrls(item)
        for (let ci = 0; ci < Math.min(compraUrls.length, 3); ci++) {
          const imgData = await loadImageAsBase64(compraUrls[ci])
          if (imgData) {
            if (y > 240) { doc.addPage(); y = 20 }
            doc.setFontSize(7)
            doc.setTextColor(16, 163, 127)
            doc.text(`Compra ${ci + 1}:`, colX[0], y)
            y += 2
            const imgHeight = 35
            const imgWidth = 35
            const imgX = colX[0] + ci * 40
            doc.addImage(imgData, 'JPEG', imgX, y, imgWidth, imgHeight)
            if (ci === Math.min(compraUrls.length, 3) - 1) {
              y += imgHeight + 4
            }
          }
        }
        y += 3
      }

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

      // Add logo to summary sheet
      try {
        const logoUrl = `${window.location.origin}/logo-laguna-norte.jpg`
        const logoResp = await fetch(logoUrl)
        if (logoResp.ok) {
          const logoBlob = await logoResp.blob()
          const logoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              resolve(result.split(',')[1]) // Remove data:image/...;base64, prefix
            }
            reader.readAsDataURL(logoBlob)
          })
          const logoImageId = workbook.addImage({ base64: logoBase64, extension: 'jpeg' })
          summarySheet.addImage(logoImageId, {
            tl: { col: 0, row: 0 },
            ext: { width: 80, height: 80 },
          })
        }
      } catch (e) { /* logo not available */ }

      // Title row
      summarySheet.mergeCells('B1:D1')
      summarySheet.getCell('B1').value = 'Rendición de Gastos — Condominio Laguna Norte'
      summarySheet.getCell('B1').font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } }
      summarySheet.mergeCells('B2:D2')
      summarySheet.getCell('B2').value = getCorrelative(selectedReport.correlativeNumber) + ' - ' + selectedReport.title
      summarySheet.getCell('B2').font = { size: 11, color: { argb: 'FF666666' } }

      summarySheet.columns = [
        { header: '', key: 'spacer', width: 12 },
        { header: 'Campo', key: 'field', width: 25 },
        { header: 'Valor', key: 'value', width: 50 },
      ]

      const summaryData = [
        { field: 'Correlativo', value: getCorrelative(selectedReport.correlativeNumber) },
        { field: 'Titulo', value: selectedReport.title },
        { field: 'Descripcion', value: selectedReport.description || '-' },
        { field: 'Responsable', value: selectedReport.responsible || '-' },
        { field: 'Estado', value: statusConfig[selectedReport.status]?.label || selectedReport.status },
        { field: 'Monto Total', value: selectedReport.totalAmount },
        { field: 'Fecha Creacion', value: formatDate(selectedReport.createdAt) },
        { field: 'Fecha Envio', value: formatDate(selectedReport.submittedAt) },
        { field: 'Fecha Revision', value: formatDate(selectedReport.reviewedAt) },
        { field: 'Revisado por', value: selectedReport.reviewedBy || '-' },
        { field: 'Nota Revision', value: selectedReport.reviewNote || '-' },
      ]

      // Start data from row 5 to leave room for logo
      summaryData.forEach((row, idx) => {
        const rowNum = idx + 5
        summarySheet.getCell(`B${rowNum}`).value = row.field
        summarySheet.getCell(`B${rowNum}`).font = { bold: true }
        summarySheet.getCell(`C${rowNum}`).value = row.value
      })

      // Style
      summarySheet.getCell('B4').value = 'Campo'
      summarySheet.getCell('C4').value = 'Valor'
      summarySheet.getCell('B4').font = { bold: true, color: { argb: 'FF1E40AF' } }
      summarySheet.getCell('C4').font = { bold: true, color: { argb: 'FF1E40AF' } }

      // Format amount cell
      summarySheet.getCell(`C10`).numFmt = '$#,##0'

      // Detail sheet
      const detailSheet = workbook.addWorksheet('Detalle')

      // Add logo to detail sheet too
      try {
        const logoUrl = `${window.location.origin}/logo-laguna-norte.jpg`
        const logoResp = await fetch(logoUrl)
        if (logoResp.ok) {
          const logoBlob = await logoResp.blob()
          const logoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              resolve(result.split(',')[1])
            }
            reader.readAsDataURL(logoBlob)
          })
          const logoImageId2 = workbook.addImage({ base64: logoBase64, extension: 'jpeg' })
          detailSheet.addImage(logoImageId2, {
            tl: { col: 0, row: 0 },
            ext: { width: 60, height: 60 },
          })
        }
      } catch (e) { /* logo not available */ }

      // Title on detail sheet
      detailSheet.mergeCells('B1:F1')
      detailSheet.getCell('B1').value = 'Detalle de Gastos — Condominio Laguna Norte'
      detailSheet.getCell('B1').font = { bold: true, size: 12, color: { argb: 'FF1E40AF' } }
      detailSheet.mergeCells('B2:F2')
      detailSheet.getCell('B2').value = getCorrelative(selectedReport.correlativeNumber) + ' - ' + selectedReport.title
      detailSheet.getCell('B2').font = { size: 10, color: { argb: 'FF666666' } }

      detailSheet.columns = [
        { header: '', key: 'spacer', width: 10 },
        { header: 'Descripcion', key: 'description', width: 40 },
        { header: 'N Boleta', key: 'numeroBoleta', width: 15 },
        { header: 'Categoria', key: 'category', width: 15 },
        { header: 'Fecha', key: 'expenseDate', width: 15 },
        { header: 'Monto', key: 'montoRendir', width: 15 },
        { header: 'Foto Boleta', key: 'fotoBoleta', width: 20 },
        { header: 'Fotos Compra', key: 'fotosCompra', width: 40 },
      ]

      // Header row at row 4
      detailSheet.getCell('B4').value = 'Descripción'
      detailSheet.getCell('C4').value = 'N° Boleta'
      detailSheet.getCell('D4').value = 'Categoría'
      detailSheet.getCell('E4').value = 'Fecha'
      detailSheet.getCell('F4').value = 'Monto'
      detailSheet.getCell('G4').value = 'Foto Boleta'
      detailSheet.getCell('H4').value = 'Fotos Compra'
      for (let c = 2; c <= 8; c++) {
        detailSheet.getCell(`${String.fromCharCode(64 + c)}4`).font = { bold: true, color: { argb: 'FF1E40AF' } }
      }

      const items = selectedReport.items || []
      items.forEach((item, idx) => {
        const compraUrls = getCompraUrls(item)
        const rowNum = idx + 5
        detailSheet.getCell(`B${rowNum}`).value = item.description
        detailSheet.getCell(`C${rowNum}`).value = item.numeroBoleta
        detailSheet.getCell(`D${rowNum}`).value = item.category
        detailSheet.getCell(`E${rowNum}`).value = formatDate(item.expenseDate)
        detailSheet.getCell(`F${rowNum}`).value = item.montoRendir
        detailSheet.getCell(`F${rowNum}`).numFmt = '$#,##0'
        detailSheet.getCell(`G${rowNum}`).value = item.imageBoletaUrl || '-'
        detailSheet.getCell(`H${rowNum}`).value = compraUrls.length > 0 ? compraUrls.join(' | ') : '-'
      })

      // Total row
      const totalRowIndex = items.length + 6
      detailSheet.getCell(`B${totalRowIndex}`).value = 'TOTAL'
      detailSheet.getCell(`B${totalRowIndex}`).font = { bold: true }
      detailSheet.getCell(`F${totalRowIndex}`).value = selectedReport.totalAmount
      detailSheet.getCell(`F${totalRowIndex}`).font = { bold: true }
      detailSheet.getCell(`F${totalRowIndex}`).numFmt = '$#,##0'

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

  const canEdit = canEditAll && (selectedReport?.status === 'BORRADOR' || selectedReport?.status === 'MODIFICACIÓN SOLICITADA')
  const canDelete = canEditAll && selectedReport?.status === 'BORRADOR'
  const canSubmit = selectedReport?.status === 'BORRADOR' || selectedReport?.status === 'MODIFICACIÓN SOLICITADA'
  // Supervisor puede aprobar desde ENVIADO → APROBADO_SUPERVISOR
  // Admin puede aprobar desde ENVIADO → APROBADO directamente, o desde APROBADO_SUPERVISOR → APROBADO
  const canSupervisorApprove = isSupervisor && selectedReport?.status === 'ENVIADO'
  const canAdminApprove = isAdmin && (selectedReport?.status === 'ENVIADO' || selectedReport?.status === 'APROBADO_SUPERVISOR')
  const canReview = canSupervisorApprove || canAdminApprove

  // ============================================================
  // Render: List View
  // ============================================================

  const renderListView = () => (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Rendiciones de Gastos
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} reporte{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={handleCreateReport} className="gap-1.5 shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4" /> Nueva Rendicion
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Buscar por titulo, descripcion o responsable..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="w-full bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-full sm:w-[220px] bg-white border-slate-300 text-slate-800">
            <SelectValue placeholder="Filtrar estado" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-300">
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  {cfg.icon}
                  {cfg.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Report cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <FileText className="h-14 w-14 mx-auto mb-3 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700">No hay rendiciones de gastos</h3>
          <p className="text-sm text-slate-500 mt-1">Crea una nueva rendicion para comenzar</p>
          <Button onClick={handleCreateReport} className="mt-4 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4" /> Nueva Rendicion
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
                className={`cursor-pointer hover:shadow-lg transition-all border-l-4 ${sc.borderColor} bg-white`}
                onClick={() => openDetail(report)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-blue-700">{getCorrelative(report.correlativeNumber)}</span>
                        <Badge className={`${sc.bgColor} ${sc.color} text-[11px] px-2 py-0.5 font-medium border-0`}>
                          <span className="flex items-center gap-1">
                            {sc.icon}
                            {sc.label}
                          </span>
                        </Badge>
                      </div>
                      <CardTitle className="text-base leading-tight text-slate-800 truncate">{report.title}</CardTitle>
                    </div>
                    <Eye className="h-4 w-4 text-slate-400 shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <div className="space-y-1.5 text-sm text-slate-600">
                    {report.responsible && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-medium">Responsable:</span>
                        <span className="truncate text-slate-700">{report.responsible}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                      <span className="font-bold text-slate-800 text-base">{formatCLP(report.totalAmount)}</span>
                    </div>
                    <div className="text-xs text-slate-400">
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
            className="border-slate-300 text-slate-700"
          >
            Anterior
          </Button>
          <span className="text-sm text-slate-600 font-medium">
            Pag. {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="border-slate-300 text-slate-700"
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
      <div className="space-y-5">
        {/* Back + Header */}
        <div className="flex items-start gap-3">
          <Button variant="outline" size="sm" onClick={goBackToList} className="gap-1 shrink-0 mt-1 border-slate-300 text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-blue-700">{getCorrelative(selectedReport.correlativeNumber)}</span>
              <Badge className={`${sc.bgColor} ${sc.color} px-2.5 py-0.5 font-medium border-0`}>
                <span className="flex items-center gap-1.5">
                  {sc.icon}
                  {sc.label}
                </span>
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mt-1">{selectedReport.title}</h2>
          </div>
        </div>

        {/* Report info card */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Responsable</p>
                <p className="font-medium text-slate-800 mt-0.5">{selectedReport.responsible || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Monto Total</p>
                <p className="font-bold text-lg text-slate-800 mt-0.5">{formatCLP(selectedReport.totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Fecha Creacion</p>
                <p className="font-medium text-slate-800 mt-0.5">{formatDateTime(selectedReport.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Fecha Envio</p>
                <p className="font-medium text-slate-800 mt-0.5">{formatDateTime(selectedReport.submittedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Fecha Revision</p>
                <p className="font-medium text-slate-800 mt-0.5">{formatDateTime(selectedReport.reviewedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Revisado por</p>
                <p className="font-medium text-slate-800 mt-0.5">{selectedReport.reviewedBy || '-'}</p>
              </div>
            </div>
            {selectedReport.description && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Descripcion</p>
                <p className="text-slate-700 mt-0.5">{selectedReport.description}</p>
              </div>
            )}
            {selectedReport.reviewNote && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Nota de Revision</p>
                <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
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
              className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Send className="h-4 w-4" /> Enviar para Revision
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => handleEditReport(selectedReport)} className="gap-1.5 border-slate-300 text-slate-700">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" onClick={() => setDeleteReportDialogOpen(true)} className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          )}
          {canReview && (
            <>
              {canSupervisorApprove && (
                <Button onClick={() => handleStatusChange('APROBADO_SUPERVISOR')} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                  <ShieldCheck className="h-4 w-4" /> Aprobar (Supervisor)
                </Button>
              )}
              {canAdminApprove && (
                <Button onClick={() => handleStatusChange('APROBADO')} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle className="h-4 w-4" /> Aprobar (Admin)
                </Button>
              )}
              <Button onClick={() => openReviewDialog('RECHAZADO')} className="gap-1.5 bg-red-500 hover:bg-red-600 text-white">
                <XCircle className="h-4 w-4" /> Rechazar
              </Button>
              <Button onClick={() => openReviewDialog('MODIFICACIÓN SOLICITADA')} variant="outline" className="gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-50">
                <RotateCcw className="h-4 w-4" /> Solicitar Modificacion
              </Button>
            </>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5 border-slate-300 text-slate-700">
              <FileText className="h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5 border-slate-300 text-slate-700">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          </div>
        </div>

        {/* Items section */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Items de Gasto ({items.length})
              </CardTitle>
              {canEdit && (
                <Button size="sm" onClick={openCreateItem} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4" /> Agregar Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                <p className="text-slate-600 font-medium">No hay items en esta rendicion</p>
                <p className="text-sm text-slate-400 mt-1">Agrega items con los gastos realizados</p>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={openCreateItem} className="mt-3 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50">
                    <Plus className="h-4 w-4" /> Agregar Primer Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {items.map((item) => {
                  const compraUrls = getCompraUrls(item)
                  const totalImages = (item.imageBoletaUrl ? 1 : 0) + compraUrls.length
                  return (
                    <div key={item.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800">{item.description}</span>
                            <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50">{item.category}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              Boleta: <span className="font-medium text-slate-700">{item.numeroBoleta}</span>
                            </span>
                            <span>Fecha: {formatDate(item.expenseDate)}</span>
                          </div>
                          <div className="mt-2">
                            <span className="font-bold text-lg text-slate-800">{formatCLP(item.montoRendir)}</span>
                          </div>

                          {/* Photos section - Boleta + multiple compra images */}
                          {totalImages > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Evidencia ({totalImages} imagen{totalImages !== 1 ? 'es' : ''})
                              </p>
                              <div className="flex gap-3 flex-wrap">
                                {/* Boleta image */}
                                {item.imageBoletaUrl && (
                                  <div className="relative group">
                                    <img
                                      src={item.imageBoletaUrl}
                                      alt="Boleta"
                                      className="w-28 h-28 object-cover rounded-lg border-2 border-blue-200 cursor-pointer hover:opacity-80 hover:border-blue-400 transition-all shadow-sm group-hover:shadow-md"
                                      onClick={() => { setPhotoViewerUrl(item.imageBoletaUrl); setPhotoViewerOpen(true) }}
                                    />
                                    <span className="absolute bottom-0 left-0 right-0 text-[10px] text-white bg-blue-600/90 text-center rounded-b-lg font-semibold py-0.5">Boleta</span>
                                  </div>
                                )}
                                {/* Compra images */}
                                {compraUrls.map((url, idx) => (
                                  <div key={idx} className="relative group">
                                    <img
                                      src={url}
                                      alt={`Compra ${idx + 1}`}
                                      className="w-28 h-28 object-cover rounded-lg border-2 border-emerald-200 cursor-pointer hover:opacity-80 hover:border-emerald-400 transition-all shadow-sm group-hover:shadow-md"
                                      onClick={() => { setPhotoViewerUrl(url); setPhotoViewerOpen(true) }}
                                    />
                                    <span className="absolute bottom-0 left-0 right-0 text-[10px] text-white bg-emerald-600/90 text-center rounded-b-lg font-semibold py-0.5">Compra {idx + 1}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditItem(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => { setDeleteItemId(item.id); setDeleteItemDialogOpen(true) }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Items total */}
            {items.length > 0 && (
              <div className="flex justify-end items-center gap-2 pt-4 mt-4 border-t border-slate-200">
                <span className="text-sm text-slate-500 font-medium">Total Items:</span>
                <span className="text-xl font-bold text-slate-800">{formatCLP(selectedReport.totalAmount)}</span>
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
      {/* Alert Banner (unified system) */}
      {currentView === 'list' && (
        <ModuleAlertBanner
          alerts={moduleAlerts.filter(a => !dismissedAlerts.has(a.id))}
          userRole={userRole}
          onConfigure={() => setAlertConfigOpen(true)}
          onDismiss={(id) => setDismissedAlerts(prev => new Set([...prev, id]))}
        />
      )}
      {currentView === 'list' && renderListView()}
      {currentView === 'detail' && renderDetailView()}

      {/* ============================================ */}
      {/* Report Form Dialog */}
      {/* ============================================ */}
      <Dialog open={reportFormOpen} onOpenChange={setReportFormOpen}>
        <DialogContent className="sm:max-w-lg w-[calc(100vw-1rem)] sm:w-auto bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800">{editingReport ? 'Editar Rendicion' : 'Nueva Rendicion de Gastos'}</DialogTitle>
            <DialogDescription className="sr-only">
              {editingReport ? 'Formulario para editar rendicion de gastos' : 'Formulario para crear nueva rendicion de gastos'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="report-title" className="text-slate-700 font-medium">Titulo *</Label>
              <Input
                id="report-title"
                placeholder="Ej: Gastos mantenimiento junio 2026"
                value={reportForm.title}
                onChange={(e) => setReportForm((p) => ({ ...p, title: e.target.value }))}
                className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-responsible" className="text-slate-700 font-medium">Responsable</Label>
              <Input
                id="report-responsible"
                placeholder="Nombre del responsable"
                value={reportForm.responsible}
                onChange={(e) => setReportForm((p) => ({ ...p, responsible: e.target.value }))}
                className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-description" className="text-slate-700 font-medium">Descripcion</Label>
              <Textarea
                id="report-description"
                placeholder="Descripcion de la rendicion..."
                value={reportForm.description}
                onChange={(e) => setReportForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportFormOpen(false)} disabled={saving} className="border-slate-300 text-slate-700">Cancelar</Button>
            <Button onClick={handleSaveReport} disabled={!reportForm.title.trim() || saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Guardando...' : editingReport ? 'Guardar Cambios' : 'Crear Rendicion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* Item Form Dialog */}
      {/* ============================================ */}
      <Dialog open={itemFormOpen} onOpenChange={setItemFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto w-[calc(100vw-1rem)] sm:w-auto bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800">{editingItem ? 'Editar Item de Gasto' : 'Agregar Item de Gasto'}</DialogTitle>
            <DialogDescription className="sr-only">
              {editingItem ? 'Formulario para editar item de gasto' : 'Formulario para agregar nuevo item de gasto'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="item-description" className="text-slate-700 font-medium">Descripcion *</Label>
              <Input
                id="item-description"
                placeholder="Descripcion del gasto"
                value={itemForm.description}
                onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
                className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="item-boleta" className="text-slate-700 font-medium">N Boleta *</Label>
                <Input
                  id="item-boleta"
                  placeholder="Ej: 12345"
                  value={itemForm.numeroBoleta}
                  onChange={(e) => setItemForm((p) => ({ ...p, numeroBoleta: e.target.value }))}
                  className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="item-amount" className="text-slate-700 font-medium">Monto a Rendir *</Label>
                <Input
                  id="item-amount"
                  type="number"
                  placeholder="$"
                  min="0"
                  value={itemForm.montoRendir}
                  onChange={(e) => setItemForm((p) => ({ ...p, montoRendir: e.target.value }))}
                  className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="item-category" className="text-slate-700 font-medium">Categoria *</Label>
                <Select value={itemForm.category} onValueChange={(v) => setItemForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger id="item-category" className="bg-white border-slate-300 text-slate-800">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-300">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="item-date" className="text-slate-700 font-medium">Fecha de Gasto *</Label>
                <Input
                  id="item-date"
                  type="date"
                  value={itemForm.expenseDate}
                  onChange={(e) => setItemForm((p) => ({ ...p, expenseDate: e.target.value }))}
                  className="bg-white border-slate-300 text-slate-800"
                />
              </div>
            </div>

            {/* Photo uploads */}
            <div className="space-y-4 pt-2">
              {/* Boleta photo */}
              <div className="grid gap-2">
                <Label className="text-slate-700 font-medium flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-600" />
                  Foto Boleta
                </Label>
                {itemForm.imageBoletaUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={itemForm.imageBoletaUrl}
                      alt="Boleta"
                      className="w-full max-w-xs h-32 object-cover rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
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
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                    {uploadingBoleta ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    ) : (
                      <>
                        <Camera className="h-6 w-6 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-500 font-medium">Subir boleta</span>
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
                        const url = await handlePhotoUpload(file)
                        if (url) setItemForm((p) => ({ ...p, imageBoletaUrl: url }))
                        setUploadingBoleta(false)
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Compra photos - MULTIPLE */}
              <div className="grid gap-2">
                <Label className="text-slate-700 font-medium flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  Fotos de Compra ({itemForm.imageCompraUrls.length})
                </Label>

                {/* Existing compra images */}
                {itemForm.imageCompraUrls.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {itemForm.imageCompraUrls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Compra ${idx + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => { setPhotoViewerUrl(url); setPhotoViewerOpen(true) }}
                        />
                        <span className="absolute bottom-0 left-0 right-0 text-[9px] text-white bg-emerald-600/80 text-center rounded-b-lg font-medium py-0.5">Compra {idx + 1}</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full shadow-sm"
                          onClick={() => setItemForm((p) => ({
                            ...p,
                            imageCompraUrls: p.imageCompraUrls.filter((_, i) => i !== idx)
                          }))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button for more compra images */}
                <label className={`flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  uploadingCompra
                    ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                    : 'border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50/50'
                }`}>
                  {uploadingCompra ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                      <span className="text-xs text-slate-500">Subiendo...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-emerald-500 mb-1" />
                      <span className="text-xs text-slate-600 font-medium">Agregar fotos de compra</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Puedes seleccionar varias imagenes</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files
                      if (!files || files.length === 0) return
                      await handleMultipleCompraUpload(files)
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setItemFormOpen(false)} disabled={saving} className="border-slate-300 text-slate-700">Cancelar</Button>
            <Button
              onClick={handleSaveItem}
              disabled={!itemForm.description.trim() || !itemForm.numeroBoleta.trim() || !itemForm.montoRendir || !itemForm.category || !itemForm.expenseDate || saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
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
        <DialogContent className="sm:max-w-md w-[calc(100vw-1rem)] sm:w-auto bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800">
              {reviewAction === 'RECHAZADO' ? 'Rechazar Reporte' : 'Solicitar Modificacion'}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {reviewAction === 'RECHAZADO'
                ? 'Indique el motivo del rechazo del reporte de gastos.'
                : 'Indique las modificaciones necesarias para el reporte de gastos.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="review-note" className="text-slate-700 font-medium">{reviewAction === 'RECHAZADO' ? 'Motivo del rechazo' : 'Modificaciones solicitadas'}</Label>
              <Textarea
                id="review-note"
                placeholder={reviewAction === 'RECHAZADO' ? 'Indique el motivo del rechazo...' : 'Describa las modificaciones necesarias...'}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reviewed-by" className="text-slate-700 font-medium">Revisado por</Label>
              <Input
                id="reviewed-by"
                placeholder="Nombre del revisor"
                value={reviewedBy}
                onChange={(e) => setReviewedBy(e.target.value)}
                className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} className="border-slate-300 text-slate-700">Cancelar</Button>
            <Button
              onClick={handleConfirmReview}
              className={reviewAction === 'RECHAZADO' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}
            >
              {reviewAction === 'RECHAZADO' ? 'Confirmar Rechazo' : 'Solicitar Modificacion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* Delete Report Dialog */}
      {/* ============================================ */}
      <AlertDialog open={deleteReportDialogOpen} onOpenChange={setDeleteReportDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-800">Eliminar Rendicion</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Esta seguro que desea eliminar la rendicion &quot;{selectedReport?.title}&quot;? Esta accion no se puede deshacer y se eliminaran todos los items asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300 text-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReport} className="bg-red-500 hover:bg-red-600 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================ */}
      {/* Delete Item Dialog */}
      {/* ============================================ */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-800">Eliminar Item</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Esta seguro que desea eliminar este item de gasto? Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300 text-slate-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-red-500 hover:bg-red-600 text-white">
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

      {/* Alert Config Dialog (unified system) */}
      <AlertConfigDialog
        open={alertConfigOpen}
        onOpenChange={setAlertConfigOpen}
        moduleName="rendicion"
        moduleLabel="Rendición de Gastos"
        userRole={userRole}
      />
    </div>
  )
}
