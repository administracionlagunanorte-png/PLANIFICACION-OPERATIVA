'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/lib/auth-context'
import { formatCLP } from '@/lib/format-currency'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ShoppingCart,
  Tag,
  Package,
  Building2,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Check,
  X,
  Edit,
  FileText,
  Award,
  Download,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileUpload } from '@/components/app/file-upload'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  APROBADA: { label: 'Aprobada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  RECHAZADA: { label: 'Rechazada', color: 'bg-red-50 text-red-700 border-red-200' },
  EN_COMPRA: { label: 'En Compra', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPRADA: { label: 'Comprada', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  CANCELADA: { label: 'Cancelada', color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  BAJA: { label: 'Baja', color: 'text-gray-600', dot: 'bg-gray-400' },
  MEDIA: { label: 'Media', color: 'text-blue-600', dot: 'bg-blue-500' },
  ALTA: { label: 'Alta', color: 'text-orange-600', dot: 'bg-orange-500' },
  URGENTE: { label: 'Urgente', color: 'text-red-600', dot: 'bg-red-500' },
}

interface Quote {
  id: string
  providerName: string
  amount: number
  currency: string
  fileName?: string | null
  fileData?: string | null
  fileType?: string | null
  notes?: string | null
  isWinner: boolean
  createdAt: string
}

export function PurchaseRequestDetail() {
  const { data: session } = useSession()
  const { selectedPurchaseRequestId, setCurrentView } = useAppStore()
  const queryClient = useQueryClient()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [showQuoteDialog, setShowQuoteDialog] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)

  // Quote form
  const [quoteProvider, setQuoteProvider] = useState('')
  const [quoteAmount, setQuoteAmount] = useState('')
  const [quoteFile, setQuoteFile] = useState<{ name: string; data: string; type: string } | null>(null)
  const [quoteNotes, setQuoteNotes] = useState('')
  const [isSavingQuote, setIsSavingQuote] = useState(false)

  // Review form
  const [reviewStatus, setReviewStatus] = useState('PENDIENTE')
  const [reviewNote, setReviewNote] = useState('')
  const [isSavingReview, setIsSavingReview] = useState(false)

  // Delete
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null)
  const [isDeletingQuote, setIsDeletingQuote] = useState(false)

  const { data: pr, isLoading } = useQuery({
    queryKey: ['purchase-request', selectedPurchaseRequestId],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-requests/${selectedPurchaseRequestId}`)
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
    enabled: !!selectedPurchaseRequestId,
  })

  useEffect(() => {
    if (pr) {
      setReviewStatus(pr.status)
      setReviewNote(pr.reviewNote || '')
    }
  }, [pr])

  if (isLoading || !pr) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    )
  }

  const status = statusConfig[pr.status] || statusConfig.PENDIENTE
  const priority = priorityConfig[pr.priority] || priorityConfig.MEDIA
  const isOwner = pr.userId === session?.user?.id
  const canEdit = isOwner && pr.status === 'PENDIENTE'

  const handleSaveQuote = async () => {
    if (!quoteProvider.trim()) { toast.error('El proveedor es requerido'); return }
    if (!quoteAmount || isNaN(parseFloat(quoteAmount))) {
      toast.error('El monto es requerido y debe ser un número')
      return
    }
    setIsSavingQuote(true)
    try {
      const res = await fetch(`/api/purchase-requests/${pr.id}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerName: quoteProvider.trim(),
          amount: parseFloat(quoteAmount),
          currency: 'CLP',
          fileName: quoteFile?.name,
          fileData: quoteFile?.data,
          fileType: quoteFile?.type,
          notes: quoteNotes.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error')
      }
      toast.success('Cotización agregada correctamente')
      setQuoteProvider(''); setQuoteAmount(''); setQuoteFile(null); setQuoteNotes('')
      setShowQuoteDialog(false)
      queryClient.invalidateQueries({ queryKey: ['purchase-request', pr.id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar cotización')
    } finally {
      setIsSavingQuote(false)
    }
  }

  const handleSetWinner = async (quoteId: string, isWinner: boolean) => {
    try {
      const res = await fetch(`/api/purchase-requests/${pr.id}/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isWinner }),
      })
      if (!res.ok) throw new Error('Error')
      toast.success(isWinner ? 'Cotización marcada como ganadora' : 'Selección eliminada')
      queryClient.invalidateQueries({ queryKey: ['purchase-request', pr.id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
    } catch (err: any) {
      toast.error('Error al actualizar cotización')
    }
  }

  const handleDeleteQuote = async () => {
    if (!deleteQuoteId) return
    setIsDeletingQuote(true)
    try {
      const res = await fetch(`/api/purchase-requests/${pr.id}/quotes/${deleteQuoteId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error')
      toast.success('Cotización eliminada')
      setDeleteQuoteId(null)
      queryClient.invalidateQueries({ queryKey: ['purchase-request', pr.id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
    } catch (err: any) {
      toast.error('Error al eliminar cotización')
    } finally {
      setIsDeletingQuote(false)
    }
  }

  const handleReview = async () => {
    setIsSavingReview(true)
    try {
      const res = await fetch(`/api/purchase-requests/${pr.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          status: reviewStatus,
          reviewNote: reviewNote.trim(),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error')
      }
      toast.success('Solicitud revisada correctamente')
      setShowReviewDialog(false)
      queryClient.invalidateQueries({ queryKey: ['purchase-request', pr.id] })
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] })
    } catch (err: any) {
      toast.error(err.message || 'Error al revisar')
    } finally {
      setIsSavingReview(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta solicitud de compra? Esta acción no se puede deshacer.')) return
    try {
      const res = await fetch(`/api/purchase-requests/${pr.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error')
      toast.success('Solicitud eliminada')
      setCurrentView('purchase-requests')
    } catch (err: any) {
      toast.error('Error al eliminar')
    }
  }

  const quotes: Quote[] = pr.quotes || []
  const winnerQuote = quotes.find((q) => q.isWinner)
  const minQuote = quotes.length > 0
    ? quotes.reduce((min, q) => (q.amount < min.amount ? q : min), quotes[0])
    : null

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView('purchase-requests')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              SC-{String(pr.correlativeNumber).padStart(3, '0')}
            </h2>
            <Badge variant="outline" className={`text-[10px] ${status.color}`}>
              {status.label}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${priority.color} bg-muted/30`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${priority.dot}`} />
              {priority.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Creada el {new Date(pr.createdAt).toLocaleString('es-CL')}
            {pr.user && ` por ${pr.user.name}`}
          </p>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView('edit-purchase-request')}
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            Editar
          </Button>
        )}
      </div>

      {/* Main info card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-600" />
              Detalle del Producto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Description */}
            <div>
              <Label className="text-xs text-muted-foreground">Descripción del producto</Label>
              <p className="text-sm mt-1 whitespace-pre-wrap">{pr.productDescription}</p>
            </div>

            {/* Grid: brand, quantity, link, provider */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pr.brand && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Marca</p>
                    <p className="text-sm font-medium">{pr.brand}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Cantidad</p>
                  <p className="text-sm font-medium">{pr.quantity} unidad{pr.quantity !== 1 ? 'es' : ''}</p>
                </div>
              </div>
              {pr.directProvider && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Proveedor Directo</p>
                    <p className="text-sm font-medium whitespace-pre-wrap break-words">{pr.directProvider}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Link */}
            {pr.productLink && (
              <div>
                <Label className="text-xs text-muted-foreground">Link del producto</Label>
                <a
                  href={pr.productLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-1 break-all"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {pr.productLink}
                </a>
              </div>
            )}

            {/* Reference Photo */}
            {pr.referencePhotoUrl && (
              <div>
                <Label className="text-xs text-muted-foreground">Fotografía de Referencia</Label>
                <button
                  type="button"
                  onClick={() => setShowImageDialog(true)}
                  className="block mt-1"
                >
                  <img
                    src={pr.referencePhotoUrl}
                    alt="Referencia"
                    className="w-32 h-32 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                  />
                </button>
              </div>
            )}

            {/* Notes */}
            {pr.notes && (
              <div>
                <Label className="text-xs text-muted-foreground">Notas</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap p-3 bg-muted/30 rounded-lg">
                  {pr.notes}
                </p>
              </div>
            )}

            {/* Review info */}
            {pr.reviewedBy && pr.reviewedAt && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Revisada por <span className="font-medium">{pr.reviewedBy}</span> el{' '}
                  {new Date(pr.reviewedAt).toLocaleString('es-CL')}
                </p>
                {pr.reviewNote && (
                  <p className="text-xs mt-1 p-2 bg-muted/30 rounded">
                    <span className="font-medium">Comentario: </span>{pr.reviewNote}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quotes section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                Cotizaciones ({quotes.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQuoteDialog(true)}
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar Cotización
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No hay cotizaciones registradas</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Agregue cotizaciones en PDF, Excel, Word o imágenes
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                      quote.isWinner
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : 'border-border hover:bg-muted/30'
                    }`}
                  >
                    {/* Winner badge */}
                    {quote.isWinner && (
                      <div className="absolute -mt-1 -ml-1">
                        <Badge className="text-[9px] bg-emerald-600 text-white">
                          <Award className="h-2.5 w-2.5 mr-0.5" />
                          Ganadora
                        </Badge>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{quote.providerName}</p>
                          <p className="text-lg font-bold text-emerald-700">
                            {formatCLP(quote.amount)}
                            <span className="text-xs text-muted-foreground ml-1">{quote.currency}</span>
                          </p>
                          {quote.notes && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{quote.notes}</p>
                          )}
                          {quote.fileName && (
                            <button
                              type="button"
                              onClick={() => {
                                const link = document.createElement('a')
                                link.href = quote.fileData!
                                link.download = quote.fileName!
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                              }}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                            >
                              <Download className="h-3 w-3" />
                              {quote.fileName}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isAdmin && !quote.isWinner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-emerald-600 hover:bg-emerald-50 text-xs"
                              onClick={() => handleSetWinner(quote.id, true)}
                              title="Marcar como cotización ganadora"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Seleccionar
                            </Button>
                          )}
                          {isAdmin && quote.isWinner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-muted-foreground hover:bg-muted text-xs"
                              onClick={() => handleSetWinner(quote.id, false)}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Quitar
                            </Button>
                          )}
                          {(isAdmin || isOwner) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteQuoteId(quote.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Summary */}
                {quotes.length > 1 && (
                  <div className="pt-2 mt-2 border-t flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {quotes.length} cotizaciones · Mejor: {formatCLP(minQuote?.amount || 0)} ({minQuote?.providerName})
                    </span>
                    {winnerQuote && (
                      <span className="text-emerald-600 font-medium">
                        Seleccionada: {formatCLP(winnerQuote.amount)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Admin review section */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="shadow-sm border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                Revisión de Administrador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Estado actual</p>
                  <Badge variant="outline" className={`text-[10px] ${status.color}`}>
                    {status.label}
                  </Badge>
                </div>
                <Button
                  onClick={() => setShowReviewDialog(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Revisar Solicitud
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Delete button (owner if pendiente, or admin) */}
      {(canEdit || isAdmin) && (
        <div className="flex justify-end pt-2">
          <Button
            variant="ghost"
            className="text-red-600 hover:bg-red-50 text-sm"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Solicitud
          </Button>
        </div>
      )}

      {/* Add Quote Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Agregar Cotización
            </DialogTitle>
            <DialogDescription>
              Registre una cotización del proveedor. Puede adjuntar archivos en PDF, Word, Excel o imágenes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Proveedor *</Label>
              <Input
                placeholder="Ej: Distribuidora XYZ SpA"
                value={quoteProvider}
                onChange={(e) => setQuoteProvider(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto (CLP) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Archivo de cotización (opcional)</Label>
              <FileUpload
                value={quoteFile}
                onChange={setQuoteFile}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.zip"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Ej: Válido por 15 días, incluye despacho..."
                value={quoteNotes}
                onChange={(e) => setQuoteNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowQuoteDialog(false)} disabled={isSavingQuote}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveQuote}
              disabled={isSavingQuote}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSavingQuote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revisar Solicitud de Compra</DialogTitle>
            <DialogDescription>
              Cambie el estado de la solicitud y deje un comentario para el solicitante
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={reviewStatus} onValueChange={setReviewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="APROBADA">Aprobada</SelectItem>
                  <SelectItem value="EN_COMPRA">En Compra</SelectItem>
                  <SelectItem value="COMPRADA">Comprada</SelectItem>
                  <SelectItem value="RECHAZADA">Rechazada</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comentario (opcional)</Label>
              <Textarea
                placeholder="Ej: Aprobado. Proceder con la compra del proveedor X."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReviewDialog(false)} disabled={isSavingReview}>
              Cancelar
            </Button>
            <Button
              onClick={handleReview}
              disabled={isSavingReview}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSavingReview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Guardar Revisión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fotografía de Referencia</DialogTitle>
          </DialogHeader>
          {pr.referencePhotoUrl && (
            <img
              src={pr.referencePhotoUrl}
              alt="Referencia"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Quote Dialog */}
      <Dialog open={!!deleteQuoteId} onOpenChange={(open) => !open && setDeleteQuoteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Cotización</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar esta cotización? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteQuoteId(null)} disabled={isDeletingQuote}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuote} disabled={isDeletingQuote}>
              {isDeletingQuote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
