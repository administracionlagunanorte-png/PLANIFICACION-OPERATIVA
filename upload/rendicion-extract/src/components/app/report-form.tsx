'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/lib/auth-context'
import { formatCLP } from '@/lib/format-currency'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Save,
  Send,
  PlusCircle,
  Trash2,
  Loader2,
  ArrowLeft,
  DollarSign,
  FileText,
  Receipt,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { ImageUpload } from './image-upload'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  icon: string
}

interface ExpenseItem {
  id?: string
  description: string
  numeroBoleta: string
  montoRendir: string
  category: string
  expenseDate: string
  imageBoletaUrl: string | null
  imageCompraUrl: string | null
  isNew?: boolean
  isDeleted?: boolean
}

export function ReportForm() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { selectedReportId, setCurrentView, setSelectedReportId } = useAppStore()
  const isEditing = !!selectedReportId
  const isAdmin = session?.user?.role === 'ADMIN'

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<ExpenseItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  // Fetch categories
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

  // Load existing report if editing
  const [reportStatus, setReportStatus] = useState<string>('')
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['report', selectedReportId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/${selectedReportId}`)
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
    enabled: isEditing,
  })

  useEffect(() => {
    if (report) {
      setTitle(report.title)
      setDescription(report.description || '')
      setReportStatus(report.status)
      setItems(
        report.items.map((item: any) => ({
          id: item.id,
          description: item.description,
          numeroBoleta: item.numeroBoleta || '',
          montoRendir: item.montoRendir?.toString() || '',
          category: item.category,
          expenseDate: new Date(item.expenseDate).toISOString().split('T')[0],
          imageBoletaUrl: item.imageBoletaUrl || null,
          imageCompraUrl: item.imageCompraUrl || null,
          isNew: false,
        }))
      )
    }
  }, [report])

  const totalMontoRendir = items
    .filter((i) => !i.isDeleted)
    .reduce((sum, item) => sum + (parseFloat(item.montoRendir) || 0), 0)

  const addItem = () => {
    const defaultCategory = categories.length > 0 ? categories[0].name : ''
    setItems([
      ...items,
      {
        description: '',
        numeroBoleta: '',
        montoRendir: '',
        category: defaultCategory,
        expenseDate: new Date().toISOString().split('T')[0],
        imageBoletaUrl: null,
        imageCompraUrl: null,
        isNew: true,
      },
    ])
  }

  const removeItem = (index: number) => {
    const item = items[index]
    if (item.id && !item.isNew) {
      // Mark for deletion if existing item
      setItems(items.map((it, i) => (i === index ? { ...it, isDeleted: true } : it)))
    } else {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof ExpenseItem, value: string | null) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const validateForm = (): string | null => {
    if (!title.trim()) return 'El título es requerido'
    const activeItems = items.filter((i) => !i.isDeleted)
    if (activeItems.length === 0) return 'Debe agregar al menos un gasto'
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.isDeleted) continue
      if (!item.description.trim()) return `El gasto #${i + 1} debe tener una descripción`
      if (!item.montoRendir || parseFloat(item.montoRendir) <= 0) return `El gasto #${i + 1} debe tener un monto a rendir válido`
      if (!item.numeroBoleta.trim()) return `El gasto #${i + 1} debe tener un número de boleta`
      if (!item.category) return `El gasto #${i + 1} debe tener una categoría`
      if (!item.expenseDate) return `El gasto #${i + 1} debe tener una fecha`
      if (!item.imageBoletaUrl) return `El gasto #${i + 1} debe tener la foto de la boleta`
      if (!item.imageCompraUrl) return `El gasto #${i + 1} debe tener la foto de la compra`
    }
    return null
  }

  const handleSave = async (submitForReview = false) => {
    const error = validateForm()
    if (error) {
      toast.error(error)
      return
    }

    if (submitForReview) {
      setIsSubmitting(true)
    } else {
      setIsSaving(true)
    }

    try {
      let reportId = selectedReportId

      // Create or update report
      if (!isEditing) {
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al crear reporte')
        }
        const createdReport = await res.json()
        reportId = createdReport.id
        setSelectedReportId(reportId)
      } else {
        const res = await fetch(`/api/reports/${reportId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al actualizar reporte')
        }
      }

      // Handle items
      const activeItems = items.filter((i) => !i.isDeleted)

      // Delete removed items
      const deletedItems = items.filter((i) => i.isDeleted && i.id)
      for (const item of deletedItems) {
        await fetch(`/api/items/${item.id}`, { method: 'DELETE' })
      }

      // Create new items
      const newItems = activeItems.filter((i) => i.isNew || !i.id)
      for (const item of newItems) {
        const montoRendirValue = parseFloat(item.montoRendir)
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: item.description.trim(),
            numeroBoleta: item.numeroBoleta.trim(),
            montoRendir: montoRendirValue,
            category: item.category,
            expenseDate: item.expenseDate,
            imageBoletaUrl: item.imageBoletaUrl,
            imageCompraUrl: item.imageCompraUrl,
            reportId,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al agregar gasto')
        }
      }

      // Update existing items
      const existingItems = activeItems.filter((i) => i.id && !i.isNew)
      for (const item of existingItems) {
        const montoRendirValue = parseFloat(item.montoRendir)
        const res = await fetch(`/api/items/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: item.description.trim(),
            numeroBoleta: item.numeroBoleta.trim(),
            montoRendir: montoRendirValue,
            category: item.category,
            expenseDate: item.expenseDate,
            imageBoletaUrl: item.imageBoletaUrl,
            imageCompraUrl: item.imageCompraUrl,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al actualizar gasto')
        }
      }

      // Submit for review if requested (only for non-approved reports)
      if (submitForReview && reportStatus !== 'APPROVED') {
        const res = await fetch(`/api/reports/${reportId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'SUBMITTED' }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al enviar reporte')
        }
        toast.success('Rendición enviada para revisión')
        setSelectedReportId(reportId)
        setCurrentView('report-detail')
      } else if (reportStatus === 'APPROVED') {
        toast.success('Rendición aprobada modificada correctamente')
        setSelectedReportId(reportId)
        setCurrentView('report-detail')
      } else {
        toast.success(isEditing ? 'Rendición actualizada' : 'Rendición guardada como borrador')
        setSelectedReportId(reportId)
        setCurrentView('report-detail')
      }

      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la rendición')
    } finally {
      setIsSaving(false)
      setIsSubmitting(false)
    }
  }

  if (isEditing && reportLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (isEditing) {
              setCurrentView('report-detail')
            } else {
              setCurrentView('dashboard')
            }
          }}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">
            {isEditing && reportStatus === 'APPROVED' ? 'Modificar Rendición Aprobada' : isEditing ? 'Editar Rendición' : 'Nueva Rendición'}
            {isEditing && report?.correlativeNumber != null && (
              <span className="ml-2 text-emerald-600">#{String(report.correlativeNumber).padStart(3, '0')}</span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEditing && reportStatus === 'APPROVED'
              ? 'Como administrador, puede modificar esta rendición ya aprobada'
              : isEditing
              ? 'Modifique los datos de la rendición'
              : 'Complete los datos para crear una nueva rendición'}
          </p>
        </div>
      </div>

      {/* Report Info */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            Información del Reporte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report-title">Título *</Label>
            <Input
              id="report-title"
              placeholder="Ej: Viaje de negocios - Madrid"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-desc">Descripción</Label>
            <Textarea
              id="report-desc"
              placeholder="Descripción opcional del reporte..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Expense Items */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Gastos
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Agregar Gasto
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {items.filter((i) => !i.isDeleted).length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 border-2 border-dashed rounded-lg border-muted"
              >
                <DollarSign className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No hay gastos agregados</p>
                <Button
                  type="button"
                  variant="link"
                  className="text-emerald-600 mt-1"
                  onClick={addItem}
                >
                  Agregar primer gasto
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => {
                  if (item.isDeleted) return null
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border rounded-lg p-4 space-y-3 bg-muted/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Gasto #{index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* N° Boleta */}
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <Receipt className="h-3 w-3" />
                            N° Boleta *
                          </Label>
                          <Input
                            placeholder="Ej: 12345"
                            value={item.numeroBoleta}
                            onChange={(e) => updateItem(index, 'numeroBoleta', e.target.value)}
                          />
                        </div>
                        {/* Monto a Rendir */}
                        <div className="space-y-1">
                          <Label className="text-xs">Monto a Rendir *</Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              placeholder="0"
                              value={item.montoRendir}
                              onChange={(e) => updateItem(index, 'montoRendir', e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        </div>
                        {/* Categoría */}
                        <div className="space-y-1">
                          <Label className="text-xs">Categoría *</Label>
                          <Select
                            value={item.category}
                            onValueChange={(v) => updateItem(index, 'category', v)}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue />
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
                        {/* Fecha */}
                        <div className="space-y-1">
                          <Label className="text-xs">Fecha *</Label>
                          <Input
                            type="date"
                            value={item.expenseDate}
                            onChange={(e) => updateItem(index, 'expenseDate', e.target.value)}
                          />
                        </div>
                        {/* Descripción - full width */}
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Descripción *</Label>
                          <Input
                            placeholder="Descripción del gasto"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Photo uploads */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                            <Receipt className="h-3 w-3" />
                            Foto de la Boleta *
                          </Label>
                          <ImageUpload
                            value={item.imageBoletaUrl}
                            onChange={(url) => updateItem(index, 'imageBoletaUrl', url)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                            🛒 Foto de la Compra *
                          </Label>
                          <ImageUpload
                            value={item.imageCompraUrl}
                            onChange={(url) => updateItem(index, 'imageCompraUrl', url)}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </AnimatePresence>

          {/* Totals */}
          {items.filter((i) => !i.isDeleted).length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Total a Rendir</span>
                  <span className="text-xl font-bold text-emerald-700">
                    {formatCLP(totalMontoRendir)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pb-6">
        {isEditing && reportStatus === 'APPROVED' ? (
          <Button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving || isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar Cambios en Rendición Aprobada
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isSaving || isSubmitting}
              className="flex-1 shadow-sm"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar Borrador
            </Button>
            <Button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving || isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar para Revisión
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
