'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/lib/auth-context'
import { formatCLP } from '@/lib/format-currency'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileEdit,
  Send,
  Download,
  Camera,
  FileText,
  DollarSign,
  Calendar,
  User,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Receipt,
  ImageIcon,
  Loader2,
  PlusCircle,
  Trash2,
  Pencil,
  Shield,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAppStore } from '@/lib/store'
import { ExpenseItemDialog } from './expense-item-dialog'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  icon: string
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  DRAFT: {
    label: 'Borrador',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <FileEdit className="h-4 w-4" />,
    description: 'La rendición está en edición',
  },
  SUBMITTED: {
    label: 'Enviado',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="h-4 w-4" />,
    description: 'Pendiente de revisión por un administrador',
  },
  APPROVED: {
    label: 'Aprobado',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="h-4 w-4" />,
    description: 'La rendición ha sido aprobada',
  },
  REJECTED: {
    label: 'Rechazado',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="h-4 w-4" />,
    description: 'La rendición ha sido rechazada',
  },
  MODIFICATION_REQUESTED: {
    label: 'Modificación Solicitada',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: <AlertTriangle className="h-4 w-4" />,
    description: 'Se han solicitado modificaciones',
  },
}

export function ReportDetail() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { selectedReportId, setCurrentView } = useAppStore()
  const [reviewNote, setReviewNote] = useState('')
  const [actionDialog, setActionDialog] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [showItemDialog, setShowItemDialog] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  const isAdmin = session?.user?.role === 'ADMIN'
  const userId = session?.user?.id

  // Fetch categories for display
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data)
        }
      })
      .catch(() => {})
  }, [])

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', selectedReportId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${selectedReportId}`)
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
    enabled: !!selectedReportId,
  })

  const getCategoryDisplay = (catName: string) => {
    const cat = categories.find((c) => c.name === catName)
    return cat ? `${cat.icon} ${cat.name}` : catName
  }

  const handleStatusChange = async (status: string) => {
    setIsActing(true)
    try {
      const res = await fetch(`/api/reports/${selectedReportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewNote: reviewNote.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al cambiar estado')
      }
      toast.success(
        status === 'APPROVED' ? 'Rendición aprobada' :
        status === 'REJECTED' ? 'Rendición rechazada' :
        'Modificación solicitada'
      )
      queryClient.invalidateQueries({ queryKey: ['report', selectedReportId] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setReviewNote('')
      setActionDialog(null)
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la acción')
    } finally {
      setIsActing(false)
    }
  }

  const handleSubmitForReview = async () => {
    try {
      const res = await fetch(`/api/reports/${selectedReportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SUBMITTED' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al enviar')
      }
      // Admin auto-approval
      if (isAdmin) {
        toast.success('Rendición enviada y aprobada automáticamente (Admin)')
      } else {
        toast.success('Rendición enviada para revisión')
      }
      queryClient.invalidateQueries({ queryKey: ['report', selectedReportId] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar la rendición')
    }
  }

  const handleDeleteItem = async () => {
    if (!deleteItemId) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/items/${deleteItemId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al eliminar gasto')
      }
      toast.success('Gasto eliminado correctamente')
      queryClient.invalidateQueries({ queryKey: ['report', selectedReportId] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      setDeleteItemId(null)
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar el gasto')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      if (format === 'pdf') {
        const url = `/api/export/pdf?reportId=${selectedReportId}`
        window.open(url, '_blank')
        toast.success('Documento abierto en nueva pestaña. Use Ctrl+P para guardar como PDF.')
      } else {
        const url = `/api/export/excel?reportId=${selectedReportId}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Error al exportar')
        const blob = await res.blob()
        const downloadUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `rendicion-${selectedReportId}.xlsx`
        a.click()
        URL.revokeObjectURL(downloadUrl)
        toast.success('Exportación completada')
      }
    } catch {
      toast.error('Error al exportar la rendición')
    }
  }

  const handleDownloadPhotos = async () => {
    try {
      const url = `/api/export/photos?reportId=${selectedReportId}`
      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al descargar fotos')
      }
      const blob = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      const correlative = report?.correlativeNumber
        ? `R-${String(report.correlativeNumber).padStart(3, '0')}`
        : selectedReportId
      a.download = `fotos_rendicion_${correlative}.zip`
      a.click()
      URL.revokeObjectURL(downloadUrl)
      toast.success('Fotos descargadas correctamente')
    } catch (err: any) {
      toast.error(err.message || 'Error al descargar las fotos')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">Rendición no encontrada</p>
      </div>
    )
  }

  const status = statusConfig[report.status] || statusConfig.DRAFT
  const canEdit = (report.userId === userId || isAdmin) && ['DRAFT', 'MODIFICATION_REQUESTED'].includes(report.status)
  const canSubmit = (report.userId === userId || isAdmin) && ['DRAFT', 'MODIFICATION_REQUESTED'].includes(report.status) && report.items?.length > 0
  const canReview = isAdmin && report.userId !== userId && ['SUBMITTED', 'MODIFICATION_REQUESTED'].includes(report.status)
  const canAdminModify = isAdmin && report.status === 'APPROVED'
  const canAddItem = canEdit || canAdminModify

  // Calculate total monto a rendir
  const totalMontoRendir = report.items?.reduce((sum: number, item: any) => sum + (item.montoRendir || 0), 0) || 0

  const openEditDialog = (item?: any) => {
    setEditingItem(item || null)
    setShowItemDialog(true)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Image Preview Dialog */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{previewImage.title}</DialogTitle>
            </DialogHeader>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="w-full rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Item Confirmation Dialog */}
      <Dialog open={!!deleteItemId} onOpenChange={(open) => !open && setDeleteItemId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Gasto</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar este gasto? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteItemId(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Item Dialog */}
      <ExpenseItemDialog
        open={showItemDialog}
        onOpenChange={setShowItemDialog}
        item={editingItem}
        reportId={selectedReportId!}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['report', selectedReportId] })
          queryClient.invalidateQueries({ queryKey: ['reports'] })
          queryClient.invalidateQueries({ queryKey: ['stats'] })
        }}
      />

      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentView('dashboard')}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {report.correlativeNumber != null && (
                <Badge className="bg-emerald-600 text-white border-0 text-xs shrink-0">
                  Rendición #{String(report.correlativeNumber).padStart(3, '0')}
                </Badge>
              )}
              <h2 className="text-xl font-bold truncate">{report.title}</h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && report.userId === userId && (
                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                  <Shield className="h-2.5 w-2.5 mr-0.5" />
                  Auto-aprobación
                </Badge>
              )}
              <Badge variant="outline" className={`shrink-0 text-xs ${status.color}`}>
                {status.icon}
                <span className="ml-1">{status.label}</span>
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{status.description}</p>
          {isAdmin && report.userId === userId && ['DRAFT', 'MODIFICATION_REQUESTED'].includes(report.status) && (
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Como administrador, su rendición se aprobará automáticamente al enviarla
            </p>
          )}
          {canAdminModify && (
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Como administrador, puede modificar esta rendición aprobada
            </p>
          )}
        </div>
      </div>

      {/* Report Info */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          {report.description && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">Descripción</span>
              <p className="text-sm mt-0.5">{report.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Solicitante:</span>
              <span className="font-medium">{report.user?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Creado:</span>
              <span className="font-medium">{new Date(report.createdAt).toLocaleDateString('es-CL')}</span>
            </div>
            {report.reviewedAt && (
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Revisado:</span>
                <span className="font-medium">{new Date(report.reviewedAt).toLocaleDateString('es-CL')}</span>
              </div>
            )}
          </div>
          {report.reviewNote && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Nota de revisión</span>
              </div>
              <p className="text-sm">{report.reviewNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Items */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Detalle de Gastos
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-600 text-white border-0">
                {report.items?.length || 0} {report.items?.length === 1 ? 'gasto' : 'gastos'}
              </Badge>
              {canAddItem && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog()}
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  Agregar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {report.items?.length === 0 ? (
            <div className="text-center py-6">
              <DollarSign className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No hay gastos registrados</p>
              {canAddItem && (
                <Button
                  variant="link"
                  className="text-emerald-600 mt-1"
                  onClick={() => openEditDialog()}
                >
                  Agregar primer gasto
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {report.items?.map((item: any, index: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.description}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Receipt className="h-3 w-3" />
                          Boleta: {item.numeroBoleta}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                          {getCategoryDisplay(item.category)}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.expenseDate).toLocaleDateString('es-CL')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs font-semibold text-emerald-700">
                          A Rendir: {formatCLP(item.montoRendir)}
                        </span>
                      </div>
                    </div>

                    {/* Edit & Delete buttons */}
                    {(canEdit || canAdminModify) && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteItemId(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Photos */}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {item.imageBoletaUrl && (
                      <button
                        onClick={() => setPreviewImage({ url: item.imageBoletaUrl, title: 'Foto de la Boleta' })}
                        className="relative group rounded-md overflow-hidden border hover:ring-2 hover:ring-emerald-300 transition-all"
                      >
                        <div className="text-[10px] font-medium text-center bg-emerald-50 text-emerald-700 py-0.5">
                          Foto Boleta
                        </div>
                        <img
                          src={item.imageBoletaUrl}
                          alt="Foto de la boleta"
                          className="w-full h-24 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-white" />
                        </div>
                      </button>
                    )}
                    {item.imageCompraUrl && (
                      <button
                        onClick={() => setPreviewImage({ url: item.imageCompraUrl, title: 'Foto de la Compra' })}
                        className="relative group rounded-md overflow-hidden border hover:ring-2 hover:ring-blue-300 transition-all"
                      >
                        <div className="text-[10px] font-medium text-center bg-blue-50 text-blue-700 py-0.5">
                          Foto Compra
                        </div>
                        <img
                          src={item.imageCompraUrl}
                          alt="Foto de la compra"
                          className="w-full h-24 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-white" />
                        </div>
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Totals */}
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Total a Rendir</span>
              <span className="text-2xl font-bold text-emerald-700">
                {formatCLP(totalMontoRendir)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Actions (for other users' reports) */}
      {canReview && (
        <Card className="shadow-sm border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Clock className="h-4 w-4" />
              Revisión de Rendición
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-note" className="text-xs">Nota de revisión (opcional)</Label>
              <Textarea
                id="review-note"
                placeholder="Agregar comentario sobre la revisión..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Dialog open={actionDialog === 'approve'} onOpenChange={(open) => !open && setActionDialog(null)}>
                <DialogTrigger asChild>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setActionDialog('approve')}
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" />
                    Aprobar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar Aprobación</DialogTitle>
                    <DialogDescription>
                      ¿Está seguro de que desea aprobar esta rendición por {formatCLP(totalMontoRendir)}?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setActionDialog(null)}>Cancelar</Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleStatusChange('APPROVED')}
                      disabled={isActing}
                    >
                      {isActing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Confirmar Aprobación
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={actionDialog === 'reject'} onOpenChange={(open) => !open && setActionDialog(null)}>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setActionDialog('reject')}
                  >
                    <ThumbsDown className="mr-2 h-4 w-4" />
                    Rechazar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar Rechazo</DialogTitle>
                    <DialogDescription>
                      ¿Está seguro de que desea rechazar esta rendición? Esta acción notificará al solicitante.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setActionDialog(null)}>Cancelar</Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusChange('REJECTED')}
                      disabled={isActing}
                    >
                      {isActing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Confirmar Rechazo
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={actionDialog === 'modify'} onOpenChange={(open) => !open && setActionDialog(null)}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={() => setActionDialog('modify')}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Solicitar Modificación
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Solicitar Modificación</DialogTitle>
                    <DialogDescription>
                      Se notificará al solicitante que debe realizar cambios en su rendición.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setActionDialog(null)}>Cancelar</Button>
                    <Button
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={() => handleStatusChange('MODIFICATION_REQUESTED')}
                      disabled={isActing}
                    >
                      {isActing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Solicitar Modificación
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User & Admin Actions */}
      {(canEdit || canSubmit || canAdminModify) && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {canEdit && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCurrentView('edit-report')}
                >
                  <FileEdit className="mr-2 h-4 w-4" />
                  Editar Rendición Completa
                </Button>
              )}
              {canAdminModify && (
                <Button
                  variant="outline"
                  className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => setCurrentView('edit-report')}
                >
                  <FileEdit className="mr-2 h-4 w-4" />
                  Modificar Rendición Aprobada
                </Button>
              )}
              {canSubmit && (
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleSubmitForReview}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isAdmin && report.userId === userId ? 'Enviar y Aprobar' : 'Enviar para Revisión'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Buttons */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 shadow-sm"
              onClick={() => handleExport('excel')}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar a Excel
            </Button>
            <Button
              variant="outline"
              className="flex-1 shadow-sm"
              onClick={() => handleExport('pdf')}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar a PDF
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                className="flex-1 shadow-sm border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={handleDownloadPhotos}
              >
                <Camera className="mr-2 h-4 w-4" />
                Descargar Fotos
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
