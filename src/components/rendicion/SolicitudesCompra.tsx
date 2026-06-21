'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Eye, ArrowLeft, Upload, X, CheckCircle, XCircle, Clock, FileText, FileSpreadsheet, Download, Camera, Send, Star, ShoppingBag, ExternalLink, ShieldCheck, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { jsPDF } from 'jspdf'
import ExcelJS from 'exceljs'

// ============================================================
// Types
// ============================================================

interface PurchaseRequest {
  id: string
  correlativeNumber: number
  productDescription: string
  brand: string | null
  quantity: number
  priority: string
  productLink: string | null
  referencePhotoUrl: string | null
  directProvider: string | null
  notes: string | null
  status: string
  responsible: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string
  updatedAt: string
  quotes?: PurchaseQuote[]
}

interface PurchaseQuote {
  id: string
  purchaseRequestId: string
  providerName: string
  amount: number
  currency: string
  fileName: string | null
  fileUrl: string | null
  fileType: string | null
  notes: string | null
  isWinner: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// Config & Helpers
// ============================================================

const formatCLP = (amount: number | null | undefined): string => {
  if (amount == null || isNaN(amount)) return '$0'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(amount))
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDIENTE: { label: 'Pendiente', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  APROBADA_SUPERVISOR: { label: 'Aprobada (Supervisor)', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  APROBADA: { label: 'Aprobada (Admin)', color: 'text-green-600', bgColor: 'bg-green-100' },
  RECHAZADA: { label: 'Rechazada', color: 'text-red-600', bgColor: 'bg-red-100' },
  EN_COMPRA: { label: 'En Compra', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  COMPRADA: { label: 'Comprada', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  CANCELADA: { label: 'Cancelada', color: 'text-gray-600', bgColor: 'bg-gray-100' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  BAJA: { label: 'Baja', color: 'bg-gray-400' },
  MEDIA: { label: 'Media', color: 'bg-blue-400' },
  ALTA: { label: 'Alta', color: 'bg-amber-400' },
  URGENTE: { label: 'Urgente', color: 'bg-red-500' },
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'PENDIENTE': return <Clock className="h-3.5 w-3.5" />
    case 'APROBADA_SUPERVISOR': return <ShieldCheck className="h-3.5 w-3.5" />
    case 'APROBADA': return <CheckCircle className="h-3.5 w-3.5" />
    case 'RECHAZADA': return <XCircle className="h-3.5 w-3.5" />
    case 'EN_COMPRA': return <ShoppingBag className="h-3.5 w-3.5" />
    case 'COMPRADA': return <CheckCircle className="h-3.5 w-3.5" />
    case 'CANCELADA': return <XCircle className="h-3.5 w-3.5" />
    default: return <Clock className="h-3.5 w-3.5" />
  }
}

const correlativeStr = (n: number) => `SC-${String(n).padStart(3, '0')}`

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// ============================================================
// File upload helper
// ============================================================

const handleFileUpload = async (file: File): Promise<string | null> => {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (res.ok) {
      const data = await res.json()
      return data.url
    }
  } catch (err) {
    console.error('Error uploading file:', err)
  }
  return null
}

// ============================================================
// Component
// ============================================================

interface SolicitudesCompraProps {
  userRole?: string
}

export default function SolicitudesCompra({ userRole = 'USER' }: SolicitudesCompraProps) {
  const { toast } = useToast()
  const isAdmin = userRole === 'ADMIN'
  const isSupervisor = userRole === 'SUPERVISOR'
  const canApprove = isAdmin || isSupervisor
  const canEditAll = isAdmin || isSupervisor

  // --- View state ---
  const [view, setView] = useState<'list' | 'detail'>('list')

  // --- Data ---
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null)

  // --- Filters ---
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)

  // --- Dialogs ---
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'request' | 'quote'; id: string } | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'APROBADA' | 'APROBADA_SUPERVISOR' | 'RECHAZADA' | 'EN_COMPRA' | 'COMPRADA' | null>(null)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')

  // --- Form state ---
  const [formData, setFormData] = useState({
    productDescription: '',
    brand: '',
    quantity: '1',
    priority: 'MEDIA',
    productLink: '',
    referencePhotoUrl: '',
    directProvider: '',
    notes: '',
    responsible: '',
  })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // --- Quote form state ---
  const [quoteFormData, setQuoteFormData] = useState({
    providerName: '',
    amount: '',
    currency: 'CLP',
    notes: '',
    fileUrl: '',
    fileName: '',
    fileType: '',
  })
  const [uploadingQuoteFile, setUploadingQuoteFile] = useState(false)
  const quoteFileInputRef = useRef<HTMLInputElement>(null)

  // --- Review form ---
  const [reviewNote, setReviewNote] = useState('')
  const [reviewedBy, setReviewedBy] = useState('')

  // ============================================================
  // Fetch data
  // ============================================================

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterPriority !== 'all') params.set('priority', filterPriority)
      if (searchTerm.trim()) params.set('search', searchTerm.trim())
      params.set('page', String(page))
      params.set('limit', '20')

      const res = await fetch(`/api/purchase-requests?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRequests(data.data || [])
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch (err) {
      console.error('Error fetching purchase requests:', err)
      toast({ title: 'Error', description: 'No se pudieron cargar las solicitudes', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchRequestDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/purchase-requests/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedRequest(data)
      }
    } catch (err) {
      console.error('Error fetching request detail:', err)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [filterStatus, filterPriority, page])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) fetchRequests()
      else setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // ============================================================
  // Form handlers
  // ============================================================

  const resetForm = () => {
    setFormData({
      productDescription: '',
      brand: '',
      quantity: '1',
      priority: 'MEDIA',
      productLink: '',
      referencePhotoUrl: '',
      directProvider: '',
      notes: '',
      responsible: '',
    })
    setEditingId(null)
  }

  const openCreateForm = () => {
    resetForm()
    setFormOpen(true)
  }

  const openEditForm = (req: PurchaseRequest) => {
    setFormData({
      productDescription: req.productDescription,
      brand: req.brand || '',
      quantity: String(req.quantity),
      priority: req.priority,
      productLink: req.productLink || '',
      referencePhotoUrl: req.referencePhotoUrl || '',
      directProvider: req.directProvider || '',
      notes: req.notes || '',
      responsible: req.responsible || '',
    })
    setEditingId(req.id)
    setFormOpen(true)
  }

  const handleFormSubmit = async () => {
    if (!formData.productDescription.trim()) {
      toast({ title: 'Error', description: 'La descripción del producto es obligatoria', variant: 'destructive' })
      return
    }

    try {
      const body = {
        productDescription: formData.productDescription.trim(),
        brand: formData.brand.trim() || null,
        quantity: parseInt(formData.quantity) || 1,
        priority: formData.priority,
        productLink: formData.productLink.trim() || null,
        referencePhotoUrl: formData.referencePhotoUrl.trim() || null,
        directProvider: formData.directProvider.trim() || null,
        notes: formData.notes.trim() || null,
        responsible: formData.responsible.trim() || null,
      }

      let res: Response
      if (editingId) {
        res = await fetch(`/api/purchase-requests/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/purchase-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      if (res.ok) {
        toast({ title: editingId ? 'Solicitud actualizada' : 'Solicitud creada', description: editingId ? 'La solicitud se actualizó correctamente' : 'La solicitud se creó correctamente' })
        setFormOpen(false)
        resetForm()
        fetchRequests()
        if (selectedRequest?.id === editingId) {
          fetchRequestDetail(editingId)
        }
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo guardar la solicitud', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Solo se permiten imágenes', variant: 'destructive' })
      return
    }
    setUploadingPhoto(true)
    const url = await handleFileUpload(file)
    if (url) {
      setFormData(prev => ({ ...prev, referencePhotoUrl: url }))
    } else {
      toast({ title: 'Error', description: 'No se pudo subir la imagen', variant: 'destructive' })
    }
    setUploadingPhoto(false)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, referencePhotoUrl: '' }))
  }

  // ============================================================
  // Quote handlers
  // ============================================================

  const resetQuoteForm = () => {
    setQuoteFormData({
      providerName: '',
      amount: '',
      currency: 'CLP',
      notes: '',
      fileUrl: '',
      fileName: '',
      fileType: '',
    })
  }

  const openQuoteDialog = () => {
    resetQuoteForm()
    setQuoteDialogOpen(true)
  }

  const handleQuoteFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingQuoteFile(true)
    const url = await handleFileUpload(file)
    if (url) {
      setQuoteFormData(prev => ({
        ...prev,
        fileUrl: url,
        fileName: file.name,
        fileType: file.type,
      }))
    } else {
      toast({ title: 'Error', description: 'No se pudo subir el archivo', variant: 'destructive' })
    }
    setUploadingQuoteFile(false)
    if (quoteFileInputRef.current) quoteFileInputRef.current.value = ''
  }

  const removeQuoteFile = () => {
    setQuoteFormData(prev => ({ ...prev, fileUrl: '', fileName: '', fileType: '' }))
  }

  const handleQuoteSubmit = async () => {
    if (!selectedRequest) return
    if (!quoteFormData.providerName.trim()) {
      toast({ title: 'Error', description: 'El nombre del proveedor es obligatorio', variant: 'destructive' })
      return
    }
    if (!quoteFormData.amount || parseFloat(quoteFormData.amount) <= 0) {
      toast({ title: 'Error', description: 'El monto debe ser mayor a 0', variant: 'destructive' })
      return
    }

    try {
      const body = {
        providerName: quoteFormData.providerName.trim(),
        amount: parseFloat(quoteFormData.amount),
        currency: quoteFormData.currency,
        notes: quoteFormData.notes.trim() || null,
        fileUrl: quoteFormData.fileUrl || null,
        fileName: quoteFormData.fileName || null,
        fileType: quoteFormData.fileType || null,
      }

      const res = await fetch(`/api/purchase-requests/${selectedRequest.id}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast({ title: 'Cotización agregada', description: 'La cotización se agregó correctamente' })
        setQuoteDialogOpen(false)
        resetQuoteForm()
        fetchRequestDetail(selectedRequest.id)
        fetchRequests()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo agregar la cotización', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  const setWinner = async (quoteId: string) => {
    if (!selectedRequest) return
    try {
      const res = await fetch(`/api/purchase-requests/${selectedRequest.id}/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isWinner: true }),
      })
      if (res.ok) {
        toast({ title: 'Cotización ganadora', description: 'Se seleccionó la cotización ganadora' })
        fetchRequestDetail(selectedRequest.id)
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo seleccionar la cotización', variant: 'destructive' })
    }
  }

  const deleteQuote = async (quoteId: string) => {
    if (!selectedRequest) return
    try {
      const res = await fetch(`/api/purchase-requests/${selectedRequest.id}/quotes/${quoteId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast({ title: 'Cotización eliminada', description: 'La cotización se eliminó correctamente' })
        fetchRequestDetail(selectedRequest.id)
        fetchRequests()
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar la cotización', variant: 'destructive' })
    }
  }

  // ============================================================
  // Delete request
  // ============================================================

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'request') {
        const res = await fetch(`/api/purchase-requests/${deleteTarget.id}`, { method: 'DELETE' })
        if (res.ok) {
          toast({ title: 'Solicitud eliminada', description: 'La solicitud se eliminó correctamente' })
          if (selectedRequest?.id === deleteTarget.id) {
            setView('list')
            setSelectedRequest(null)
          }
          fetchRequests()
        } else {
          const err = await res.json()
          toast({ title: 'Error', description: err.error || 'No se pudo eliminar', variant: 'destructive' })
        }
      } else if (deleteTarget.type === 'quote') {
        await deleteQuote(deleteTarget.id)
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }

  // ============================================================
  // Review / Status change handlers
  // ============================================================

  const openReviewDialog = (action: 'APROBADA' | 'APROBADA_SUPERVISOR' | 'RECHAZADA' | 'EN_COMPRA' | 'COMPRADA') => {
    setReviewAction(action)
    setReviewNote('')
    setReviewedBy('')
    setReviewDialogOpen(true)
  }

  const handleReviewSubmit = async () => {
    if (!selectedRequest || !reviewAction) return

    try {
      let res: Response
      if (reviewAction === 'APROBADA' || reviewAction === 'APROBADA_SUPERVISOR' || reviewAction === 'RECHAZADA') {
        res = await fetch(`/api/purchase-requests/${selectedRequest.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'review',
            status: reviewAction,
            reviewNote: reviewNote.trim() || null,
            reviewedBy: reviewedBy.trim() || null,
          }),
        })
      } else {
        // EN_COMPRA or COMPRADA — direct status update via review action
        res = await fetch(`/api/purchase-requests/${selectedRequest.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'review',
            status: reviewAction,
            reviewNote: reviewNote.trim() || null,
            reviewedBy: reviewedBy.trim() || null,
          }),
        })
      }

      if (res.ok) {
        const actionLabels: Record<string, string> = {
          APROBADA: 'aprobada',
          RECHAZADA: 'rechazada',
          EN_COMPRA: 'marcada en compra',
          COMPRADA: 'marcada como comprada',
        }
        toast({ title: 'Estado actualizado', description: `La solicitud fue ${actionLabels[reviewAction]}` })
        setReviewDialogOpen(false)
        fetchRequestDetail(selectedRequest.id)
        fetchRequests()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo actualizar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  // ============================================================
  // Navigation
  // ============================================================

  const goToDetail = (req: PurchaseRequest) => {
    setSelectedRequest(req)
    setView('detail')
    fetchRequestDetail(req.id)
  }

  const goToList = () => {
    setView('list')
    setSelectedRequest(null)
  }

  // ============================================================
  // PDF Export
  // ============================================================

  const exportPDF = (req: PurchaseRequest) => {
    const doc = new jsPDF()
    const sc = correlativeStr(req.correlativeNumber)
    const st = statusConfig[req.status] || { label: req.status }

    // Header
    doc.setFontSize(18)
    doc.setTextColor(30, 64, 175)
    doc.text(`Solicitud de Compra ${sc}`, 14, 22)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Fecha: ${formatDate(req.createdAt)}`, 14, 30)
    doc.text(`Estado: ${st.label}`, 14, 36)

    // Separator
    doc.setDrawColor(200)
    doc.line(14, 40, 196, 40)

    // Info section
    doc.setFontSize(12)
    doc.setTextColor(30)
    let y = 48

    const addField = (label: string, value: string) => {
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`${label}:`, 14, y)
      doc.setTextColor(30)
      doc.text(value || '-', 60, y)
      y += 7
    }

    addField('Producto', req.productDescription)
    addField('Marca', req.brand || '-')
    addField('Cantidad', String(req.quantity))
    addField('Prioridad', priorityConfig[req.priority]?.label || req.priority)
    addField('Proveedor Directo', req.directProvider || '-')
    addField('Responsable', req.responsible || '-')
    if (req.productLink) addField('Link', req.productLink.substring(0, 80))
    if (req.notes) {
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text('Notas:', 14, y)
      doc.setTextColor(30)
      const lines = doc.splitTextToSize(req.notes, 130)
      doc.text(lines, 60, y)
      y += lines.length * 5
    }

    if (req.reviewNote) {
      y += 4
      addField('Nota Revisión', req.reviewNote)
      addField('Revisado por', req.reviewedBy || '-')
      if (req.reviewedAt) addField('Fecha Revisión', formatDateTime(req.reviewedAt))
    }

    // Quotes table
    if (req.quotes && req.quotes.length > 0) {
      y += 10
      doc.setFontSize(12)
      doc.setTextColor(30, 64, 175)
      doc.text('Cotizaciones', 14, y)
      y += 8

      // Table header
      doc.setFontSize(9)
      doc.setFillColor(240, 240, 240)
      doc.rect(14, y - 4, 182, 8, 'F')
      doc.setTextColor(60)
      doc.text('Proveedor', 16, y)
      doc.text('Monto', 90, y)
      doc.text('Moneda', 130, y)
      doc.text('Ganadora', 155, y)
      doc.text('Notas', 175, y)
      y += 8

      const winnerQuote = req.quotes.find(q => q.isWinner)
      const bestPrice = !winnerQuote && req.quotes.length > 0
        ? Math.min(...req.quotes.map(q => q.amount))
        : null

      req.quotes.forEach(q => {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        const isWin = q.isWinner || (bestPrice !== null && q.amount === bestPrice)
        doc.setTextColor(isWin ? 0 : 30)
        doc.text(q.providerName.substring(0, 20), 16, y)
        doc.text(formatCLP(q.amount), 90, y)
        doc.text(q.currency, 130, y)
        doc.text(q.isWinner ? '★' : bestPrice && q.amount === bestPrice ? '▸' : '', 158, y)
        doc.text((q.notes || '').substring(0, 15), 175, y)
        y += 7
      })
    }

    doc.save(`solicitud-compra-${sc}.pdf`)
  }

  // ============================================================
  // Excel Export
  // ============================================================

  const exportExcel = async (req: PurchaseRequest) => {
    const workbook = new ExcelJS.Workbook()
    const sc = correlativeStr(req.correlativeNumber)

    // --- Sheet 1: Resumen ---
    const ws1 = workbook.addWorksheet('Resumen')
    ws1.columns = [
      { header: 'Campo', key: 'campo', width: 25 },
      { header: 'Valor', key: 'valor', width: 50 },
    ]

    const st = statusConfig[req.status] || { label: req.status }
    const summaryRows = [
      { campo: 'Correlativo', valor: sc },
      { campo: 'Producto', valor: req.productDescription },
      { campo: 'Marca', valor: req.brand || '-' },
      { campo: 'Cantidad', valor: String(req.quantity) },
      { campo: 'Prioridad', valor: priorityConfig[req.priority]?.label || req.priority },
      { campo: 'Estado', valor: st.label },
      { campo: 'Proveedor Directo', valor: req.directProvider || '-' },
      { campo: 'Responsable', valor: req.responsible || '-' },
      { campo: 'Link Producto', valor: req.productLink || '-' },
      { campo: 'Notas', valor: req.notes || '-' },
      { campo: 'Fecha Creación', valor: formatDateTime(req.createdAt) },
      { campo: 'Revisado por', valor: req.reviewedBy || '-' },
      { campo: 'Nota Revisión', valor: req.reviewNote || '-' },
      { campo: 'Fecha Revisión', valor: req.reviewedAt ? formatDateTime(req.reviewedAt) : '-' },
    ]
    ws1.addRows(summaryRows)

    // Style header
    const headerRow = ws1.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FF1E40AF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }

    // --- Sheet 2: Cotizaciones ---
    const ws2 = workbook.addWorksheet('Cotizaciones')
    ws2.columns = [
      { header: 'Proveedor', key: 'provider', width: 25 },
      { header: 'Monto', key: 'amount', width: 18 },
      { header: 'Moneda', key: 'currency', width: 10 },
      { header: 'Ganadora', key: 'winner', width: 12 },
      { header: 'Notas', key: 'notes', width: 30 },
      { header: 'Archivo', key: 'file', width: 20 },
      { header: 'Fecha', key: 'date', width: 18 },
    ]

    if (req.quotes && req.quotes.length > 0) {
      req.quotes.forEach(q => {
        ws2.addRow({
          provider: q.providerName,
          amount: q.amount,
          currency: q.currency,
          winner: q.isWinner ? '★ Sí' : 'No',
          notes: q.notes || '-',
          file: q.fileName || '-',
          date: formatDateTime(q.createdAt),
        })
      })
    }

    const headerRow2 = ws2.getRow(1)
    headerRow2.font = { bold: true, color: { argb: 'FF1E40AF' } }
    headerRow2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }

    // Format amount column
    ws2.getColumn('amount').numFmt = '#,##0'

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `solicitud-compra-${sc}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ============================================================
  // Computed helpers
  // ============================================================

  const getBestQuoteAmount = (req: PurchaseRequest): string => {
    if (!req.quotes || req.quotes.length === 0) return '-'
    const winner = req.quotes.find(q => q.isWinner)
    if (winner) return formatCLP(winner.amount)
    const min = Math.min(...req.quotes.map(q => q.amount))
    return formatCLP(min)
  }

  // ============================================================
  // RENDER: List View
  // ============================================================

  const renderListView = () => (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-600" />
            Solicitudes de Compra
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona las solicitudes de compra del proyecto</p>
        </div>
        <Button onClick={openCreateForm} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Buscar producto, marca, proveedor..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="max-w-xs h-9 text-sm"
        />
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1) }}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={v => { setFilterPriority(v); setPage(1) }}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(priorityConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No hay solicitudes</p>
          <p className="text-sm">Crea una nueva solicitud de compra para comenzar</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {requests.map(req => {
              const st = statusConfig[req.status] || { label: req.status, color: 'text-gray-600', bgColor: 'bg-gray-100' }
              const pr = priorityConfig[req.priority] || { label: req.priority, color: 'bg-gray-400' }
              return (
                <Card
                  key={req.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                  style={{ borderLeftColor: req.status === 'COMPRADA' ? '#10b981' : req.status === 'APROBADA' ? '#22c55e' : req.status === 'APROBADA_SUPERVISOR' ? '#3b82f6' : req.status === 'RECHAZADA' ? '#ef4444' : req.status === 'EN_COMPRA' ? '#3b82f6' : req.status === 'URGENTE' ? '#ef4444' : '#f59e0b' }}
                  onClick={() => goToDetail(req)}
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-blue-700">{correlativeStr(req.correlativeNumber)}</span>
                      <Badge className={`${st.bgColor} ${st.color} gap-1 text-[11px]`}>
                        {statusIcon(req.status)}
                        {st.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-semibold text-gray-800 leading-tight mt-1 line-clamp-2">
                      {req.productDescription}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {req.brand && (
                        <Badge variant="outline" className="text-[11px] font-normal">{req.brand}</Badge>
                      )}
                      <Badge variant="outline" className="text-[11px] font-normal">Qty: {req.quantity}</Badge>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full text-white ${pr.color}`}>
                        {pr.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <span>{formatDate(req.createdAt)}</span>
                      <div className="flex items-center gap-3">
                        {req.quotes && req.quotes.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {req.quotes.length} cot.
                          </span>
                        )}
                        <span className="font-semibold text-gray-700">{getBestQuoteAmount(req)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-500">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )

  // ============================================================
  // RENDER: Detail View
  // ============================================================

  const renderDetailView = () => {
    if (!selectedRequest) return null
    const req = selectedRequest
    const st = statusConfig[req.status] || { label: req.status, color: 'text-gray-600', bgColor: 'bg-gray-100' }
    const pr = priorityConfig[req.priority] || { label: req.priority, color: 'bg-gray-400' }

    const winnerQuote = req.quotes?.find(q => q.isWinner)
    const bestPrice = !winnerQuote && req.quotes && req.quotes.length > 0
      ? Math.min(...req.quotes.map(q => q.amount))
      : null

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={goToList} className="shrink-0 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-800">{correlativeStr(req.correlativeNumber)}</h2>
              <Badge className={`${st.bgColor} ${st.color} gap-1`}>
                {statusIcon(req.status)}
                {st.label}
              </Badge>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white ${pr.color}`}>
                {pr.label}
              </span>
            </div>
            <p className="text-gray-600 mt-1">{req.productDescription}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="outline" size="sm" onClick={() => exportPDF(req)} title="Exportar PDF">
              <FileText className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportExcel(req)} title="Exportar Excel">
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {req.brand && (
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Marca</span>
                  <p className="text-sm font-medium text-gray-800">{req.brand}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Cantidad</span>
                <p className="text-sm font-medium text-gray-800">{req.quantity}</p>
              </div>
              {req.directProvider && (
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Proveedor Directo</span>
                  <p className="text-sm font-medium text-gray-800">{req.directProvider}</p>
                </div>
              )}
              {req.responsible && (
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Responsable</span>
                  <p className="text-sm font-medium text-gray-800">{req.responsible}</p>
                </div>
              )}
              {req.productLink && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Link del Producto</span>
                  <a
                    href={req.productLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    {req.productLink.length > 60 ? req.productLink.substring(0, 60) + '...' : req.productLink}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {req.notes && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Notas</span>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{req.notes}</p>
                </div>
              )}
              {req.referencePhotoUrl && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Foto Referencia</span>
                  <div className="mt-1.5">
                    <img
                      src={req.referencePhotoUrl}
                      alt="Referencia"
                      className="h-24 w-24 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => { setPreviewImageUrl(req.referencePhotoUrl!); setImagePreviewOpen(true) }}
                    />
                  </div>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Fecha Creación</span>
                <p className="text-sm text-gray-700">{formatDateTime(req.createdAt)}</p>
              </div>
              {req.reviewedBy && (
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Revisado por</span>
                  <p className="text-sm text-gray-700">{req.reviewedBy}</p>
                </div>
              )}
              {req.reviewNote && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Nota de Revisión</span>
                  <p className="text-sm text-gray-700 mt-0.5 bg-amber-50 p-2 rounded border border-amber-200 whitespace-pre-wrap">{req.reviewNote}</p>
                </div>
              )}
              {req.reviewedAt && (
                <div>
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Fecha Revisión</span>
                  <p className="text-sm text-gray-700">{formatDateTime(req.reviewedAt)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {req.status === 'PENDIENTE' && canApprove && (
            <>
              {isSupervisor && (
                <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700" onClick={() => openReviewDialog('APROBADA_SUPERVISOR')}>
                  <ShieldCheck className="h-4 w-4" /> Aprobar (Supervisor)
                </Button>
              )}
              {isAdmin && (
                <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => openReviewDialog('APROBADA')}>
                  <CheckCircle className="h-4 w-4" /> Aprobar (Admin)
                </Button>
              )}
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => openReviewDialog('RECHAZADA')}>
                <XCircle className="h-4 w-4" /> Rechazar
              </Button>
            </>
          )}
          {req.status === 'PENDIENTE' && canEditAll && (
            <>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => openEditForm(req)}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { setDeleteTarget({ type: 'request', id: req.id }); setDeleteDialogOpen(true) }}>
                <Trash2 className="h-4 w-4" /> Eliminar
              </Button>
            </>
          )}
          {req.status === 'APROBADA_SUPERVISOR' && isAdmin && (
            <>
              <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={() => openReviewDialog('APROBADA')}>
                <CheckCircle className="h-4 w-4" /> Aprobar (Admin)
              </Button>
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => openReviewDialog('RECHAZADA')}>
                <XCircle className="h-4 w-4" /> Rechazar
              </Button>
            </>
          )}
          {req.status === 'APROBADA' && (
            <>
              <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700" onClick={() => openReviewDialog('EN_COMPRA')}>
                <ShoppingBag className="h-4 w-4" /> Marcar En Compra
              </Button>
              <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => openReviewDialog('COMPRADA')}>
                <CheckCircle className="h-4 w-4" /> Marcar Comprada
              </Button>
            </>
          )}
          {req.status === 'EN_COMPRA' && (
            <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => openReviewDialog('COMPRADA')}>
              <CheckCircle className="h-4 w-4" /> Marcar Comprada
            </Button>
          )}
        </div>

        {/* Quotes Section */}
        <Card>
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Cotizaciones
                {req.quotes && req.quotes.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{req.quotes.length}</Badge>
                )}
              </CardTitle>
              <Button size="sm" variant="outline" className="gap-1" onClick={openQuoteDialog}>
                <Plus className="h-3.5 w-3.5" /> Agregar Cotización
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {!req.quotes || req.quotes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay cotizaciones registradas</p>
                <p className="text-xs mt-1">Agrega cotizaciones de proveedores para esta solicitud</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {req.quotes.map(q => {
                  const isWinner = q.isWinner
                  const isBestPrice = bestPrice !== null && q.amount === bestPrice
                  return (
                    <div
                      key={q.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        isWinner ? 'bg-green-50 border-green-300' : isBestPrice ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      {/* Star / Winner selector */}
                      <button
                        onClick={() => !isWinner && setWinner(q.id)}
                        className={`mt-0.5 shrink-0 ${isWinner ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'} transition-colors`}
                        title={isWinner ? 'Cotización ganadora' : 'Seleccionar como ganadora'}
                      >
                        <Star className={`h-5 w-5 ${isWinner ? 'fill-current' : ''}`} />
                      </button>

                      {/* Quote Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-gray-800">{q.providerName}</span>
                          {isWinner && (
                            <Badge className="bg-green-100 text-green-700 text-[10px] gap-0.5">
                              <CheckCircle className="h-3 w-3" /> Ganadora
                            </Badge>
                          )}
                          {isBestPrice && !isWinner && (
                            <Badge className="bg-blue-100 text-blue-700 text-[10px]">Mejor precio</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-lg font-bold text-gray-900">{formatCLP(q.amount)}</span>
                          <span className="text-xs text-gray-400 uppercase">{q.currency}</span>
                        </div>
                        {q.notes && (
                          <p className="text-xs text-gray-500 mt-1">{q.notes}</p>
                        )}
                        {q.fileName && (
                          <a
                            href={q.fileUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"
                          >
                            <Download className="h-3 w-3" /> {q.fileName}
                          </a>
                        )}
                        <span className="text-[10px] text-gray-400 mt-1 block">{formatDateTime(q.createdAt)}</span>
                      </div>

                      {/* Delete quote */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-gray-400 hover:text-red-500 h-8 w-8 p-0"
                        onClick={() => { setDeleteTarget({ type: 'quote', id: q.id }); setDeleteDialogOpen(true) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================================
  // RENDER: Create / Edit Form Dialog
  // ============================================================

  const renderFormDialog = () => (
    <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) resetForm() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Editar Solicitud' : 'Nueva Solicitud de Compra'}</DialogTitle>
          <DialogDescription>
            {editingId ? 'Modifica los campos de la solicitud' : 'Completa los datos para crear una nueva solicitud de compra'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Product Description */}
          <div className="space-y-1.5">
            <Label htmlFor="productDescription" className="text-sm font-medium">
              Descripción del Producto <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="productDescription"
              value={formData.productDescription}
              onChange={e => setFormData(prev => ({ ...prev, productDescription: e.target.value }))}
              placeholder="Describe el producto o servicio solicitado..."
              rows={3}
            />
          </div>

          {/* Brand & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="brand" className="text-sm font-medium">Marca</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={e => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                placeholder="Ej: Bosch, 3M..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantity" className="text-sm font-medium">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={e => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Prioridad</Label>
            <Select value={formData.priority} onValueChange={v => setFormData(prev => ({ ...prev, priority: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(priorityConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${v.color}`} />
                      {v.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Link */}
          <div className="space-y-1.5">
            <Label htmlFor="productLink" className="text-sm font-medium">Link del Producto</Label>
            <Input
              id="productLink"
              value={formData.productLink}
              onChange={e => setFormData(prev => ({ ...prev, productLink: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          {/* Reference Photo */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Foto de Referencia</Label>
            {formData.referencePhotoUrl ? (
              <div className="relative inline-block">
                <img
                  src={formData.referencePhotoUrl}
                  alt="Referencia"
                  className="h-24 w-24 object-cover rounded-lg border"
                />
                <button
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center justify-center h-24 w-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                {uploadingPhoto ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                ) : (
                  <div className="text-center">
                    <Camera className="h-6 w-6 mx-auto text-gray-400" />
                    <span className="text-[10px] text-gray-400 mt-1 block">Subir foto</span>
                  </div>
                )}
              </div>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          {/* Direct Provider */}
          <div className="space-y-1.5">
            <Label htmlFor="directProvider" className="text-sm font-medium">Proveedor Directo</Label>
            <Input
              id="directProvider"
              value={formData.directProvider}
              onChange={e => setFormData(prev => ({ ...prev, directProvider: e.target.value }))}
              placeholder="Nombre del proveedor sugerido..."
            />
          </div>

          {/* Responsible */}
          <div className="space-y-1.5">
            <Label htmlFor="responsible" className="text-sm font-medium">Responsable</Label>
            <Input
              id="responsible"
              value={formData.responsible}
              onChange={e => setFormData(prev => ({ ...prev, responsible: e.target.value }))}
              placeholder="Nombre del responsable..."
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm font-medium">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observaciones adicionales..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setFormOpen(false); resetForm() }}>Cancelar</Button>
          <Button onClick={handleFormSubmit} className="gap-1">
            <Send className="h-4 w-4" />
            {editingId ? 'Guardar Cambios' : 'Crear Solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // ============================================================
  // RENDER: Add Quote Dialog
  // ============================================================

  const renderQuoteDialog = () => (
    <Dialog open={quoteDialogOpen} onOpenChange={v => { setQuoteDialogOpen(v); if (!v) resetQuoteForm() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Cotización</DialogTitle>
          <DialogDescription>
            Ingresa los datos de la cotización del proveedor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Provider Name */}
          <div className="space-y-1.5">
            <Label htmlFor="providerName" className="text-sm font-medium">
              Proveedor <span className="text-red-500">*</span>
            </Label>
            <Input
              id="providerName"
              value={quoteFormData.providerName}
              onChange={e => setQuoteFormData(prev => ({ ...prev, providerName: e.target.value }))}
              placeholder="Nombre del proveedor..."
            />
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="quoteAmount" className="text-sm font-medium">
                Monto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quoteAmount"
                type="number"
                min="0"
                step="any"
                value={quoteFormData.amount}
                onChange={e => setQuoteFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Moneda</Label>
              <Select value={quoteFormData.currency} onValueChange={v => setQuoteFormData(prev => ({ ...prev, currency: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLP">CLP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* File attachment */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Archivo Adjunto</Label>
            {quoteFormData.fileUrl ? (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border">
                <FileText className="h-4 w-4 text-gray-500 shrink-0" />
                <span className="text-sm text-gray-700 truncate flex-1">{quoteFormData.fileName}</span>
                <button
                  onClick={removeQuoteFile}
                  className="text-red-500 hover:text-red-700 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => quoteFileInputRef.current?.click()}
                className="flex items-center justify-center h-16 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                {uploadingQuoteFile ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                ) : (
                  <div className="text-center">
                    <Upload className="h-5 w-5 mx-auto text-gray-400" />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">Subir archivo</span>
                  </div>
                )}
              </div>
            )}
            <input
              ref={quoteFileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleQuoteFileUpload}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="quoteNotes" className="text-sm font-medium">Notas</Label>
            <Textarea
              id="quoteNotes"
              value={quoteFormData.notes}
              onChange={e => setQuoteFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observaciones sobre la cotización..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setQuoteDialogOpen(false); resetQuoteForm() }}>Cancelar</Button>
          <Button onClick={handleQuoteSubmit} className="gap-1">
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // ============================================================
  // RENDER: Review Dialog
  // ============================================================

  const renderReviewDialog = () => {
    const actionLabels: Record<string, string> = {
      APROBADA: 'Aprobar (Admin)',
      APROBADA_SUPERVISOR: 'Aprobar (Supervisor)',
      RECHAZADA: 'Rechazar',
      EN_COMPRA: 'Marcar En Compra',
      COMPRADA: 'Marcar Comprada',
    }
    return (
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{reviewAction ? actionLabels[reviewAction] : 'Acción'}</DialogTitle>
            <DialogDescription>
              {reviewAction === 'APROBADA' && '¿Estás seguro de aprobar esta solicitud?'}
              {reviewAction === 'RECHAZADA' && 'Indica el motivo del rechazo'}
              {reviewAction === 'EN_COMPRA' && '¿Confirmas que esta solicitud está en proceso de compra?'}
              {reviewAction === 'COMPRADA' && '¿Confirmas que esta solicitud ya fue comprada?'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reviewedBy" className="text-sm font-medium">Revisado por</Label>
              <Input
                id="reviewedBy"
                value={reviewedBy}
                onChange={e => setReviewedBy(e.target.value)}
                placeholder="Tu nombre..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reviewNote" className="text-sm font-medium">Nota</Label>
              <Textarea
                id="reviewNote"
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder={reviewAction === 'RECHAZADA' ? 'Motivo del rechazo...' : 'Observaciones (opcional)...'}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleReviewSubmit}
              className={reviewAction === 'RECHAZADA' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {reviewAction ? actionLabels[reviewAction] : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ============================================================
  // RENDER: Delete Confirmation
  // ============================================================

  const renderDeleteDialog = () => (
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteTarget?.type === 'request'
              ? 'Esta acción eliminará la solicitud de compra y todas sus cotizaciones. No se puede deshacer.'
              : 'Esta acción eliminará la cotización. No se puede deshacer.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null) }}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  // ============================================================
  // RENDER: Image Preview
  // ============================================================

  const renderImagePreview = () => (
    <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
      <DialogContent className="max-w-lg p-2">
        <DialogHeader className="sr-only">
          <DialogTitle>Vista previa de imagen</DialogTitle>
          <DialogDescription>Imagen de referencia ampliada</DialogDescription>
        </DialogHeader>
        {previewImageUrl && (
          <img
            src={previewImageUrl}
            alt="Vista previa"
            className="w-full h-auto rounded-lg"
          />
        )}
      </DialogContent>
    </Dialog>
  )

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <div className="w-full">
      {view === 'list' ? renderListView() : renderDetailView()}

      {renderFormDialog()}
      {renderQuoteDialog()}
      {renderReviewDialog()}
      {renderDeleteDialog()}
      {renderImagePreview()}
    </div>
  )
}
