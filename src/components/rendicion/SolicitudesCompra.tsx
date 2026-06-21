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
import { Plus, Pencil, Trash2, Eye, ArrowLeft, Upload, X, CheckCircle, XCircle, Clock, FileText, FileSpreadsheet, Download, Camera, Send, Star, ShoppingBag, ExternalLink, ShieldCheck, Shield, Package, ImageIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { jsPDF } from 'jspdf'
import ExcelJS from 'exceljs'

// ============================================================
// Types
// ============================================================

interface PurchaseItem {
  id: string
  productDescription: string
  brand: string | null
  quantity: number
  productLink: string | null
  referencePhotoUrl: string | null
  directProvider: string | null
  notes: string | null
  requestId: string
  createdAt: string
  updatedAt: string
}

interface PurchaseRequest {
  id: string
  correlativeNumber: number
  title: string
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
  items?: PurchaseItem[]
  itemCount?: number
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

const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  PENDIENTE: { label: 'Pendiente', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-l-amber-500', icon: <Clock className="h-3.5 w-3.5" /> },
  APROBADA_SUPERVISOR: { label: 'Aprobada (Supervisor)', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-l-blue-500', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  APROBADA: { label: 'Aprobada (Admin)', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-l-emerald-500', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  RECHAZADA: { label: 'Rechazada', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-l-red-500', icon: <XCircle className="h-3.5 w-3.5" /> },
  EN_COMPRA: { label: 'En Compra', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-l-blue-500', icon: <ShoppingBag className="h-3.5 w-3.5" /> },
  COMPRADA: { label: 'Comprada', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-l-emerald-500', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  CANCELADA: { label: 'Cancelada', color: 'text-slate-600', bgColor: 'bg-slate-100', borderColor: 'border-l-slate-400', icon: <XCircle className="h-3.5 w-3.5" /> },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  BAJA: { label: 'Baja', color: 'bg-slate-400' },
  MEDIA: { label: 'Media', color: 'bg-blue-400' },
  ALTA: { label: 'Alta', color: 'bg-amber-400' },
  URGENTE: { label: 'Urgente', color: 'bg-red-500' },
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
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'request' | 'quote' | 'item'; id: string } | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'APROBADA' | 'APROBADA_SUPERVISOR' | 'RECHAZADA' | 'EN_COMPRA' | 'COMPRADA' | null>(null)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState('')

  // --- Request form state ---
  const [formData, setFormData] = useState({
    title: '',
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

  // --- Item form state ---
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PurchaseItem | null>(null)
  const [itemForm, setItemForm] = useState({
    productDescription: '',
    brand: '',
    quantity: '1',
    productLink: '',
    referencePhotoUrl: '',
    directProvider: '',
    notes: '',
  })
  const [uploadingItemPhoto, setUploadingItemPhoto] = useState(false)
  const [savingItem, setSavingItem] = useState(false)
  const itemPhotoInputRef = useRef<HTMLInputElement>(null)

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

  const fetchRequestDetail = async (id: string): Promise<PurchaseRequest | null> => {
    try {
      const res = await fetch(`/api/purchase-requests/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedRequest(data)
        return data
      }
    } catch (err) {
      console.error('Error fetching request detail:', err)
    }
    return null
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
  // Request form handlers
  // ============================================================

  const resetForm = () => {
    setFormData({
      title: '',
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
      title: req.title || req.productDescription,
      productDescription: req.productDescription || req.title,
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
    if (!formData.title.trim() && !formData.productDescription.trim()) {
      toast({ title: 'Error', description: 'El título o descripción es obligatorio', variant: 'destructive' })
      return
    }

    try {
      const body = {
        title: formData.title.trim() || formData.productDescription.trim(),
        productDescription: formData.productDescription.trim() || formData.title.trim(),
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
        const created = await res.json()
        toast({ title: editingId ? 'Solicitud actualizada' : 'Solicitud creada', description: editingId ? 'La solicitud se actualizó correctamente' : 'La solicitud se creó correctamente. Ahora puedes agregar items.' })
        setFormOpen(false)
        resetForm()
        if (editingId && selectedRequest?.id === editingId) {
          await fetchRequestDetail(editingId)
        } else if (!editingId && created.id) {
          // Navigate to detail view after creating a new request
          await fetchRequests()
          goToDetail(created)
          return
        }
        fetchRequests()
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
  // Item CRUD
  // ============================================================

  const openCreateItem = () => {
    setEditingItem(null)
    setItemForm({
      productDescription: '',
      brand: '',
      quantity: '1',
      productLink: '',
      referencePhotoUrl: '',
      directProvider: '',
      notes: '',
    })
    setItemFormOpen(true)
  }

  const openEditItem = (item: PurchaseItem) => {
    setEditingItem(item)
    setItemForm({
      productDescription: item.productDescription,
      brand: item.brand || '',
      quantity: String(item.quantity),
      productLink: item.productLink || '',
      referencePhotoUrl: item.referencePhotoUrl || '',
      directProvider: item.directProvider || '',
      notes: item.notes || '',
    })
    setItemFormOpen(true)
  }

  const handleSaveItem = async () => {
    if (!selectedRequest) return
    if (!itemForm.productDescription.trim()) {
      toast({ title: 'Error', description: 'La descripción del producto es requerida', variant: 'destructive' })
      return
    }

    setSavingItem(true)
    try {
      const body = {
        productDescription: itemForm.productDescription.trim(),
        brand: itemForm.brand.trim() || null,
        quantity: parseInt(itemForm.quantity) || 1,
        productLink: itemForm.productLink.trim() || null,
        referencePhotoUrl: itemForm.referencePhotoUrl.trim() || null,
        directProvider: itemForm.directProvider.trim() || null,
        notes: itemForm.notes.trim() || null,
        requestId: selectedRequest.id,
      }

      let res: Response
      if (editingItem) {
        res = await fetch(`/api/purchase-items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/purchase-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      if (res.ok) {
        toast({ title: editingItem ? 'Item actualizado' : 'Item agregado', description: editingItem ? 'Los cambios han sido guardados' : 'Se ha agregado un nuevo item a la solicitud' })
        setItemFormOpen(false)
        await fetchRequestDetail(selectedRequest.id)
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo guardar el item', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSavingItem(false)
    }
  }

  const handleItemPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingItemPhoto(true)
    const url = await handleFileUpload(file)
    if (url) setItemForm(prev => ({ ...prev, referencePhotoUrl: url }))
    else toast({ title: 'Error', description: 'No se pudo subir la imagen', variant: 'destructive' })
    setUploadingItemPhoto(false)
    if (itemPhotoInputRef.current) itemPhotoInputRef.current.value = ''
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedRequest) return
    try {
      const res = await fetch(`/api/purchase-items/${itemId}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Item eliminado', description: 'El item ha sido eliminado correctamente' })
        await fetchRequestDetail(selectedRequest.id)
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo eliminar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }

  // ============================================================
  // Quote handlers
  // ============================================================

  const resetQuoteForm = () => {
    setQuoteFormData({ providerName: '', amount: '', currency: 'CLP', notes: '', fileUrl: '', fileName: '', fileType: '' })
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
      setQuoteFormData(prev => ({ ...prev, fileUrl: url, fileName: file.name, fileType: file.type }))
    }
    setUploadingQuoteFile(false)
    if (quoteFileInputRef.current) quoteFileInputRef.current.value = ''
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
      const res = await fetch(`/api/purchase-requests/${selectedRequest.id}/quotes/${quoteId}`, { method: 'DELETE' })
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
      } else if (deleteTarget.type === 'item') {
        await handleDeleteItem(deleteTarget.id)
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
      const res = await fetch(`/api/purchase-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          status: reviewAction,
          reviewNote: reviewNote.trim() || null,
          reviewedBy: reviewedBy.trim() || null,
        }),
      })

      if (res.ok) {
        const actionLabels: Record<string, string> = {
          APROBADA: 'aprobada',
          APROBADA_SUPERVISOR: 'aprobada por supervisor',
          RECHAZADA: 'rechazada',
          EN_COMPRA: 'aprobada y enviada a proceso de compra',
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
  // Computed helpers
  // ============================================================

  const getBestQuoteAmount = (req: PurchaseRequest): string => {
    if (!req.quotes || req.quotes.length === 0) return '-'
    const winner = req.quotes.find(q => q.isWinner)
    if (winner) return formatCLP(winner.amount)
    const min = Math.min(...req.quotes.map(q => q.amount))
    return formatCLP(min)
  }

  // Any user can add/edit items on a PENDIENTE request
  const canEditItems = selectedRequest?.status === 'PENDIENTE'
  // Only admins/supervisors can edit/delete the request header itself
  const canEditRequest = selectedRequest?.status === 'PENDIENTE' && canEditAll

  // ============================================================
  // RENDER: List View
  // ============================================================

  const renderListView = () => (
    <div className="space-y-5">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-600" />
            Solicitudes de Compra
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Gestiona las solicitudes de compra del proyecto</p>
        </div>
        <Button onClick={openCreateForm} className="gap-2 shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
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
          className="max-w-xs h-9 text-sm bg-white border-slate-300 text-slate-800 placeholder:text-slate-400"
        />
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1) }}>
          <SelectTrigger className="w-[180px] h-9 text-sm bg-white border-slate-300 text-slate-800">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                <span className="flex items-center gap-1.5">{v.icon} {v.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={v => { setFilterPriority(v); setPage(1) }}>
          <SelectTrigger className="w-[130px] h-9 text-sm bg-white border-slate-300 text-slate-800">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">Todas</SelectItem>
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

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <ShoppingBag className="h-14 w-14 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-semibold text-slate-700">No hay solicitudes</p>
          <p className="text-sm text-slate-500 mt-1">Crea una nueva solicitud de compra para comenzar</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {requests.map(req => {
              const st = statusConfig[req.status] || statusConfig.PENDIENTE
              const pr = priorityConfig[req.priority] || priorityConfig.MEDIA
              const itemCount = req.itemCount ?? (req.items?.length ?? 0)
              return (
                <Card
                  key={req.id}
                  className={`cursor-pointer hover:shadow-lg transition-all border-l-4 bg-white ${st.borderColor}`}
                  onClick={() => goToDetail(req)}
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-blue-700">{correlativeStr(req.correlativeNumber)}</span>
                      <Badge className={`${st.bgColor} ${st.color} gap-1 text-[11px] border-0 font-medium`}>
                        <span className="flex items-center gap-1">{st.icon} {st.label}</span>
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-semibold text-slate-800 leading-tight mt-1 line-clamp-2">
                      {req.title || req.productDescription}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {req.brand && (
                        <Badge variant="outline" className="text-[11px] font-normal border-slate-200 text-slate-600">{req.brand}</Badge>
                      )}
                      <Badge variant="outline" className="text-[11px] font-normal border-blue-200 text-blue-700 bg-blue-50">
                        <Package className="w-3 h-3 mr-0.5" />
                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                      </Badge>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full text-white ${pr.color}`}>
                        {pr.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                      <span>{formatDate(req.createdAt)}</span>
                      <div className="flex items-center gap-3">
                        {req.quotes && req.quotes.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {req.quotes.length} cot.
                          </span>
                        )}
                        <span className="font-semibold text-slate-700">{getBestQuoteAmount(req)}</span>
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
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="border-slate-300 text-slate-700">Anterior</Button>
              <span className="text-sm text-slate-600 font-medium">Pag. {page} de {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="border-slate-300 text-slate-700">Siguiente</Button>
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
    const st = statusConfig[req.status] || statusConfig.PENDIENTE
    const pr = priorityConfig[req.priority] || priorityConfig.MEDIA
    const items = req.items || []
    const winnerQuote = req.quotes?.find(q => q.isWinner)
    const bestPrice = !winnerQuote && req.quotes && req.quotes.length > 0
      ? Math.min(...req.quotes.map(q => q.amount))
      : null

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button variant="outline" size="sm" onClick={goToList} className="shrink-0 border-slate-300 text-slate-700">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-blue-700">{correlativeStr(req.correlativeNumber)}</h2>
              <Badge className={`${st.bgColor} ${st.color} gap-1 border-0 font-medium`}>
                <span className="flex items-center gap-1">{st.icon} {st.label}</span>
              </Badge>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full text-white ${pr.color}`}>
                {pr.label}
              </span>
            </div>
            <p className="text-slate-700 font-medium mt-1">{req.title || req.productDescription}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="outline" size="sm" onClick={() => exportPDF(req)} title="Exportar PDF" className="border-slate-300 text-slate-700">
              <FileText className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportExcel(req)} title="Exportar Excel" className="border-slate-300 text-slate-700">
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-white border-slate-200">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {req.responsible && (
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Responsable</span>
                  <p className="text-sm font-medium text-slate-800">{req.responsible}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Fecha Creacion</span>
                <p className="text-sm text-slate-700">{formatDateTime(req.createdAt)}</p>
              </div>
              {req.notes && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Notas</span>
                  <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{req.notes}</p>
                </div>
              )}
              {req.reviewedBy && (
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Revisado por</span>
                  <p className="text-sm text-slate-700">{req.reviewedBy}</p>
                </div>
              )}
              {req.reviewNote && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Nota de Revision</span>
                  <p className="text-sm text-slate-700 mt-0.5 bg-amber-50 p-2 rounded border border-amber-200 whitespace-pre-wrap">{req.reviewNote}</p>
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
                <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openReviewDialog('APROBADA_SUPERVISOR')}>
                  <ShieldCheck className="h-4 w-4" /> Aprobar (Supervisor)
                </Button>
              )}
              {isAdmin && (
                <>
                  <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openReviewDialog('APROBADA')}>
                    <CheckCircle className="h-4 w-4" /> Aprobar
                  </Button>
                  <Button size="sm" className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openReviewDialog('EN_COMPRA')}>
                    <ShoppingBag className="h-4 w-4" /> Aprobar y Enviar a Compra
                  </Button>
                </>
              )}
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => openReviewDialog('RECHAZADA')}>
                <XCircle className="h-4 w-4" /> Rechazar
              </Button>
            </>
          )}
          {canEditRequest && (
            <>
              <Button size="sm" variant="outline" className="gap-1 border-slate-300 text-slate-700" onClick={() => openEditForm(req)}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => { setDeleteTarget({ type: 'request', id: req.id }); setDeleteDialogOpen(true) }}>
                <Trash2 className="h-4 w-4" /> Eliminar
              </Button>
            </>
          )}
          {req.status === 'APROBADA_SUPERVISOR' && isAdmin && (
            <>
              <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openReviewDialog('APROBADA')}>
                <CheckCircle className="h-4 w-4" /> Aprobar
              </Button>
              <Button size="sm" className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openReviewDialog('EN_COMPRA')}>
                <ShoppingBag className="h-4 w-4" /> Aprobar y Enviar a Compra
              </Button>
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => openReviewDialog('RECHAZADA')}>
                <XCircle className="h-4 w-4" /> Rechazar
              </Button>
            </>
          )}
          {req.status === 'APROBADA' && (
            <>
              <Button size="sm" className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openReviewDialog('EN_COMPRA')}>
                <ShoppingBag className="h-4 w-4" /> En Proceso de Compra
              </Button>
              <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openReviewDialog('COMPRADA')}>
                <CheckCircle className="h-4 w-4" /> Marcar Comprada
              </Button>
            </>
          )}
          {req.status === 'EN_COMPRA' && (
            <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => openReviewDialog('COMPRADA')}>
              <CheckCircle className="h-4 w-4" /> Marcar Comprada
            </Button>
          )}
        </div>

        {/* Items Section */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                Items de Compra ({items.length})
              </CardTitle>
              {canEditItems && (
                <Button size="sm" onClick={openCreateItem} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4" /> Agregar Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {items.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                <p className="text-slate-600 font-medium">No hay items en esta solicitud</p>
                <p className="text-sm text-slate-400 mt-1">Agrega los productos o servicios que necesitas comprar</p>
                {canEditItems && (
                  <Button size="sm" variant="outline" onClick={openCreateItem} className="mt-3 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50">
                    <Plus className="h-4 w-4" /> Agregar Primer Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={item.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold shrink-0">{idx + 1}</span>
                          <span className="font-semibold text-slate-800">{item.productDescription}</span>
                          {item.brand && <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600">{item.brand}</Badge>}
                          <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 bg-blue-50">Qty: {item.quantity}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500 ml-8">
                          {item.directProvider && <span>Proveedor: <span className="text-slate-700 font-medium">{item.directProvider}</span></span>}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-slate-500 mt-1 ml-8">{item.notes}</p>
                        )}
                        {item.productLink && (
                          <a href={item.productLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1 ml-8">
                            <ExternalLink className="h-3 w-3" /> Ver enlace del producto
                          </a>
                        )}
                        {item.referencePhotoUrl && (
                          <div className="mt-2 ml-8">
                            <img
                              src={item.referencePhotoUrl}
                              alt="Referencia"
                              className="w-20 h-20 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity shadow-sm"
                              onClick={() => { setPreviewImageUrl(item.referencePhotoUrl!); setImagePreviewOpen(true) }}
                            />
                          </div>
                        )}
                      </div>
                      {canEditItems && (
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditItem(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => { setDeleteTarget({ type: 'item', id: item.id }); setDeleteDialogOpen(true) }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quotes Section */}
        <Card className="bg-white border-slate-200">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Cotizaciones
                {req.quotes && req.quotes.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{req.quotes.length}</Badge>
                )}
              </CardTitle>
              <Button size="sm" variant="outline" className="gap-1 border-slate-300 text-slate-700" onClick={openQuoteDialog}>
                <Plus className="h-3.5 w-3.5" /> Agregar Cotizacion
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {!req.quotes || req.quotes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="font-medium text-slate-600">No hay cotizaciones registradas</p>
                <p className="text-xs mt-1">Agrega cotizaciones de proveedores para esta solicitud</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {req.quotes.map(q => {
                  const isWinner = q.isWinner
                  const isBestPrice = bestPrice !== null && q.amount === bestPrice
                  return (
                    <div key={q.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isWinner ? 'bg-emerald-50 border-emerald-300' : isBestPrice ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                      <button onClick={() => !isWinner && setWinner(q.id)} className={`mt-0.5 shrink-0 ${isWinner ? 'text-yellow-500' : 'text-slate-300 hover:text-yellow-400'} transition-colors`} title={isWinner ? 'Cotización ganadora' : 'Seleccionar como ganadora'}>
                        <Star className={`h-5 w-5 ${isWinner ? 'fill-current' : ''}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-slate-800">{q.providerName}</span>
                          {isWinner && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] gap-0.5 border-0"><CheckCircle className="h-3 w-3" /> Ganadora</Badge>}
                          {isBestPrice && !isWinner && <Badge className="bg-blue-100 text-blue-700 text-[10px] border-0">Mejor precio</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-lg font-bold text-slate-900">{formatCLP(q.amount)}</span>
                          <span className="text-xs text-slate-400 uppercase">{q.currency}</span>
                        </div>
                        {q.notes && <p className="text-xs text-slate-500 mt-1">{q.notes}</p>}
                        {q.fileName && (
                          <a href={q.fileUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                            <Download className="h-3 w-3" /> {q.fileName}
                          </a>
                        )}
                        <span className="text-[10px] text-slate-400 mt-1 block">{formatDateTime(q.createdAt)}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0 text-slate-400 hover:text-red-500 h-8 w-8 p-0" onClick={() => { setDeleteTarget({ type: 'quote', id: q.id }); setDeleteDialogOpen(true) }}>
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
  // PDF Export
  // ============================================================

  const exportPDF = (req: PurchaseRequest) => {
    const doc = new jsPDF()
    const sc = correlativeStr(req.correlativeNumber)
    const st = statusConfig[req.status] || { label: req.status }

    doc.setFontSize(18)
    doc.setTextColor(30, 64, 175)
    doc.text(`Solicitud de Compra ${sc}`, 14, 22)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Fecha: ${formatDate(req.createdAt)}`, 14, 30)
    doc.text(`Estado: ${st.label}`, 14, 36)
    doc.setDrawColor(200)
    doc.line(14, 40, 196, 40)

    let y = 48
    const addField = (label: string, value: string) => {
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`${label}:`, 14, y)
      doc.setTextColor(30)
      doc.text(value || '-', 60, y)
      y += 7
    }

    addField('Titulo', req.title || req.productDescription)
    addField('Responsable', req.responsible || '-')
    if (req.notes) addField('Notas', req.notes)
    if (req.reviewedBy) addField('Revisado por', req.reviewedBy)
    if (req.reviewNote) addField('Nota Revision', req.reviewNote)

    // Items table
    const items = req.items || []
    if (items.length > 0) {
      y += 5
      doc.setFontSize(12)
      doc.setTextColor(30, 64, 175)
      doc.text('Items de Compra', 14, y)
      y += 7
      doc.setFontSize(9)
      doc.setFillColor(240, 240, 240)
      doc.rect(14, y - 4, 182, 8, 'F')
      doc.setTextColor(60)
      doc.text('N', 16, y)
      doc.text('Producto', 24, y)
      doc.text('Marca', 90, y)
      doc.text('Cant.', 125, y)
      doc.text('Proveedor', 145, y)
      y += 8

      items.forEach((item, idx) => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.setTextColor(30)
        doc.text(String(idx + 1), 16, y)
        const descLines = doc.splitTextToSize(item.productDescription, 62)
        doc.text(descLines, 24, y)
        doc.text((item.brand || '-').substring(0, 15), 90, y)
        doc.text(String(item.quantity), 128, y)
        doc.text((item.directProvider || '-').substring(0, 18), 145, y)
        y += Math.max(descLines.length * 4, 5) + 3
      })
    }

    // Quotes table
    if (req.quotes && req.quotes.length > 0) {
      y += 5
      doc.setFontSize(12)
      doc.setTextColor(30, 64, 175)
      doc.text('Cotizaciones', 14, y)
      y += 7
      doc.setFontSize(9)
      doc.setFillColor(240, 240, 240)
      doc.rect(14, y - 4, 182, 8, 'F')
      doc.setTextColor(60)
      doc.text('Proveedor', 16, y)
      doc.text('Monto', 90, y)
      doc.text('Moneda', 130, y)
      doc.text('Ganadora', 155, y)
      y += 8

      req.quotes.forEach(q => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.setTextColor(q.isWinner ? 0 : 30)
        doc.text(q.providerName.substring(0, 20), 16, y)
        doc.text(formatCLP(q.amount), 90, y)
        doc.text(q.currency, 130, y)
        doc.text(q.isWinner ? 'Si' : '', 158, y)
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
    const st = statusConfig[req.status] || { label: req.status }
    const items = req.items || []

    // Sheet 1: Resumen
    const ws1 = workbook.addWorksheet('Resumen')
    ws1.columns = [
      { header: 'Campo', key: 'campo', width: 25 },
      { header: 'Valor', key: 'valor', width: 50 },
    ]
    ws1.addRows([
      { campo: 'Correlativo', valor: sc },
      { campo: 'Titulo', valor: req.title || req.productDescription },
      { campo: 'Prioridad', valor: priorityConfig[req.priority]?.label || req.priority },
      { campo: 'Estado', valor: st.label },
      { campo: 'Responsable', valor: req.responsible || '-' },
      { campo: 'Notas', valor: req.notes || '-' },
      { campo: 'Fecha Creacion', valor: formatDateTime(req.createdAt) },
      { campo: 'Revisado por', valor: req.reviewedBy || '-' },
      { campo: 'Nota Revision', valor: req.reviewNote || '-' },
    ])
    ws1.getRow(1).font = { bold: true, color: { argb: 'FF1E40AF' } }

    // Sheet 2: Items
    if (items.length > 0) {
      const ws2 = workbook.addWorksheet('Items')
      ws2.columns = [
        { header: 'N', key: 'n', width: 5 },
        { header: 'Producto', key: 'product', width: 35 },
        { header: 'Marca', key: 'brand', width: 15 },
        { header: 'Cantidad', key: 'qty', width: 10 },
        { header: 'Proveedor', key: 'provider', width: 20 },
        { header: 'Link', key: 'link', width: 30 },
        { header: 'Notas', key: 'notes', width: 25 },
      ]
      items.forEach((item, idx) => {
        ws2.addRow({ n: idx + 1, product: item.productDescription, brand: item.brand || '-', qty: item.quantity, provider: item.directProvider || '-', link: item.productLink || '-', notes: item.notes || '-' })
      })
      ws2.getRow(1).font = { bold: true, color: { argb: 'FF1E40AF' } }
    }

    // Sheet 3: Cotizaciones
    if (req.quotes && req.quotes.length > 0) {
      const ws3 = workbook.addWorksheet('Cotizaciones')
      ws3.columns = [
        { header: 'Proveedor', key: 'provider', width: 25 },
        { header: 'Monto', key: 'amount', width: 18 },
        { header: 'Moneda', key: 'currency', width: 10 },
        { header: 'Ganadora', key: 'winner', width: 12 },
        { header: 'Notas', key: 'notes', width: 30 },
      ]
      req.quotes.forEach(q => {
        ws3.addRow({ provider: q.providerName, amount: q.amount, currency: q.currency, winner: q.isWinner ? 'Si' : 'No', notes: q.notes || '-' })
      })
      ws3.getRow(1).font = { bold: true, color: { argb: 'FF1E40AF' } }
      ws3.getColumn('amount').numFmt = '#,##0'
    }

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
  // RENDER: Create / Edit Request Dialog
  // ============================================================

  const renderFormDialog = () => (
    <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) resetForm() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-800">{editingId ? 'Editar Solicitud' : 'Nueva Solicitud de Compra'}</DialogTitle>
          <DialogDescription className="text-slate-500">
            {editingId ? 'Modifica los campos de la solicitud' : 'Completa los datos generales. Podras agregar multiples items despues.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-sm font-medium text-slate-700">Titulo de la Solicitud <span className="text-red-500">*</span></Label>
            <Input id="title" value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Ej: Compra materiales junio 2026" className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Prioridad</Label>
            <Select value={formData.priority} onValueChange={v => setFormData(prev => ({ ...prev, priority: v }))}>
              <SelectTrigger className="bg-white border-slate-300 text-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {Object.entries(priorityConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    <span className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${v.color}`} />{v.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="responsible" className="text-sm font-medium text-slate-700">Responsable</Label>
            <Input id="responsible" value={formData.responsible} onChange={e => setFormData(prev => ({ ...prev, responsible: e.target.value }))} placeholder="Nombre del responsable..." className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm font-medium text-slate-700">Notas</Label>
            <Textarea id="notes" value={formData.notes} onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Observaciones generales..." rows={2} className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setFormOpen(false); resetForm() }} className="border-slate-300 text-slate-700">Cancelar</Button>
          <Button onClick={handleFormSubmit} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={!formData.title.trim()}>
            <Send className="h-4 w-4" />
            {editingId ? 'Guardar Cambios' : 'Crear Solicitud'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // ============================================================
  // RENDER: Item Form Dialog
  // ============================================================

  const renderItemFormDialog = () => (
    <Dialog open={itemFormOpen} onOpenChange={setItemFormOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-800">{editingItem ? 'Editar Item de Compra' : 'Agregar Item de Compra'}</DialogTitle>
          <DialogDescription className="text-slate-500">
            {editingItem ? 'Modifica los datos del item' : 'Agrega un producto o servicio a la solicitud de compra'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="itemProductDescription" className="text-sm font-medium text-slate-700">Descripcion del Producto <span className="text-red-500">*</span></Label>
            <Textarea id="itemProductDescription" value={itemForm.productDescription} onChange={e => setItemForm(prev => ({ ...prev, productDescription: e.target.value }))} placeholder="Describe el producto o servicio..." rows={2} className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="itemBrand" className="text-sm font-medium text-slate-700">Marca</Label>
              <Input id="itemBrand" value={itemForm.brand} onChange={e => setItemForm(prev => ({ ...prev, brand: e.target.value }))} placeholder="Ej: Bosch, 3M..." className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="itemQuantity" className="text-sm font-medium text-slate-700">Cantidad</Label>
              <Input id="itemQuantity" type="number" min="1" value={itemForm.quantity} onChange={e => setItemForm(prev => ({ ...prev, quantity: e.target.value }))} className="bg-white border-slate-300 text-slate-800" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="itemProductLink" className="text-sm font-medium text-slate-700">Link del Producto</Label>
            <Input id="itemProductLink" value={itemForm.productLink} onChange={e => setItemForm(prev => ({ ...prev, productLink: e.target.value }))} placeholder="https://..." className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-blue-600" />
              Foto de Referencia
            </Label>
            {itemForm.referencePhotoUrl ? (
              <div className="relative inline-block">
                <img src={itemForm.referencePhotoUrl} alt="Referencia" className="h-24 w-24 object-cover rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:opacity-80" onClick={() => { setPreviewImageUrl(itemForm.referencePhotoUrl); setImagePreviewOpen(true) }} />
                <Button variant="destructive" size="sm" className="absolute top-1 right-1 h-6 w-6 p-0" onClick={() => setItemForm(prev => ({ ...prev, referencePhotoUrl: '' }))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-24 w-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                {uploadingItemPhoto ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                ) : (
                  <div className="text-center">
                    <Camera className="h-6 w-6 mx-auto text-slate-400" />
                    <span className="text-[10px] text-slate-500 mt-1 block">Subir foto</span>
                  </div>
                )}
                <input ref={itemPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleItemPhotoUpload} />
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="itemDirectProvider" className="text-sm font-medium text-slate-700">Proveedor Directo</Label>
            <Input id="itemDirectProvider" value={itemForm.directProvider} onChange={e => setItemForm(prev => ({ ...prev, directProvider: e.target.value }))} placeholder="Nombre del proveedor sugerido..." className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="itemNotes" className="text-sm font-medium text-slate-700">Notas</Label>
            <Textarea id="itemNotes" value={itemForm.notes} onChange={e => setItemForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Observaciones adicionales..." rows={2} className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setItemFormOpen(false)} disabled={savingItem} className="border-slate-300 text-slate-700">Cancelar</Button>
          <Button onClick={handleSaveItem} disabled={!itemForm.productDescription.trim() || savingItem} className="bg-blue-600 hover:bg-blue-700 text-white">
            {savingItem ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Agregar Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // ============================================================
  // RENDER: Quote Dialog
  // ============================================================

  const renderQuoteDialog = () => (
    <Dialog open={quoteDialogOpen} onOpenChange={v => { setQuoteDialogOpen(v); if (!v) resetQuoteForm() }}>
      <DialogContent className="max-w-md bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-800">Agregar Cotizacion</DialogTitle>
          <DialogDescription className="text-slate-500">Ingresa los datos de la cotizacion del proveedor</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="providerName" className="text-sm font-medium text-slate-700">Proveedor <span className="text-red-500">*</span></Label>
            <Input id="providerName" value={quoteFormData.providerName} onChange={e => setQuoteFormData(prev => ({ ...prev, providerName: e.target.value }))} placeholder="Nombre del proveedor..." className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="quoteAmount" className="text-sm font-medium text-slate-700">Monto <span className="text-red-500">*</span></Label>
              <Input id="quoteAmount" type="number" min="0" step="any" value={quoteFormData.amount} onChange={e => setQuoteFormData(prev => ({ ...prev, amount: e.target.value }))} placeholder="0" className="bg-white border-slate-300 text-slate-800" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Moneda</Label>
              <Select value={quoteFormData.currency} onValueChange={v => setQuoteFormData(prev => ({ ...prev, currency: v }))}>
                <SelectTrigger className="bg-white border-slate-300 text-slate-800"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white"><SelectItem value="CLP">CLP</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Archivo Adjunto</Label>
            {quoteFormData.fileUrl ? (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                <span className="text-sm text-slate-700 truncate flex-1">{quoteFormData.fileName}</span>
                <button onClick={() => setQuoteFormData(prev => ({ ...prev, fileUrl: '', fileName: '', fileType: '' }))} className="text-red-500 hover:text-red-700 shrink-0"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div onClick={() => quoteFileInputRef.current?.click()} className="flex items-center justify-center h-16 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                {uploadingQuoteFile ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" /> : <div className="text-center"><Upload className="h-5 w-5 mx-auto text-slate-400" /><span className="text-[10px] text-slate-500 mt-0.5 block">Subir archivo</span></div>}
              </div>
            )}
            <input ref={quoteFileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" className="hidden" onChange={handleQuoteFileUpload} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quoteNotes" className="text-sm font-medium text-slate-700">Notas</Label>
            <Textarea id="quoteNotes" value={quoteFormData.notes} onChange={e => setQuoteFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Observaciones..." rows={2} className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setQuoteDialogOpen(false); resetQuoteForm() }} className="border-slate-300 text-slate-700">Cancelar</Button>
          <Button onClick={handleQuoteSubmit} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"><Plus className="h-4 w-4" />Agregar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // ============================================================
  // RENDER: Review Dialog
  // ============================================================

  const renderReviewDialog = () => {
    const actionLabels: Record<string, string> = {
      APROBADA: 'Aprobar', APROBADA_SUPERVISOR: 'Aprobar (Supervisor)', RECHAZADA: 'Rechazar', EN_COMPRA: 'Aprobar y Enviar a Compra', COMPRADA: 'Marcar Comprada',
    }
    return (
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-sm bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800">{reviewAction ? actionLabels[reviewAction] : 'Accion'}</DialogTitle>
            <DialogDescription className="text-slate-500">
              {reviewAction === 'RECHAZADA' && 'Indica el motivo del rechazo'}
              {reviewAction === 'APROBADA' && 'Confirmas la aprobacion de esta solicitud?'}
              {reviewAction === 'APROBADA_SUPERVISOR' && 'Confirmas la aprobacion como supervisor?'}
              {reviewAction === 'EN_COMPRA' && 'Se aprobara la solicitud y se marcara como En Proceso de Compra'}
              {reviewAction === 'COMPRADA' && 'Confirmas que esta solicitud ya fue comprada?'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reviewedBy" className="text-sm font-medium text-slate-700">Revisado por</Label>
              <Input id="reviewedBy" value={reviewedBy} onChange={e => setReviewedBy(e.target.value)} placeholder="Tu nombre..." className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reviewNote" className="text-sm font-medium text-slate-700">Nota</Label>
              <Textarea id="reviewNote" value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder={reviewAction === 'RECHAZADA' ? 'Motivo del rechazo...' : 'Observaciones (opcional)...'} rows={2} className="bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} className="border-slate-300 text-slate-700">Cancelar</Button>
            <Button onClick={handleReviewSubmit} className={reviewAction === 'RECHAZADA' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}>
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
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-800">Estas seguro?</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-600">
            {deleteTarget?.type === 'request'
              ? 'Esta accion eliminara la solicitud de compra y todos sus items y cotizaciones. No se puede deshacer.'
              : deleteTarget?.type === 'item'
              ? 'Esta accion eliminara este item de compra. No se puede deshacer.'
              : 'Esta accion eliminara la cotizacion. No se puede deshacer.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null) }} className="border-slate-300 text-slate-700">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  // ============================================================
  // RENDER: Image Preview
  // ============================================================

  const renderImagePreview = () => (
    <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
      <DialogContent className="max-w-lg p-2 bg-black">
        <DialogHeader className="sr-only">
          <DialogTitle>Vista previa de imagen</DialogTitle>
          <DialogDescription>Imagen de referencia ampliada</DialogDescription>
        </DialogHeader>
        {previewImageUrl && <img src={previewImageUrl} alt="Vista previa" className="w-full h-auto rounded-lg" />}
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
      {renderItemFormDialog()}
      {renderQuoteDialog()}
      {renderReviewDialog()}
      {renderDeleteDialog()}
      {renderImagePreview()}
    </div>
  )
}
