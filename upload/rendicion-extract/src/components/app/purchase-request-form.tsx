'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, X, ArrowLeft, Loader2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageUpload } from '@/components/app/image-upload'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const PRIORITY_OPTIONS = [
  { value: 'BAJA', label: 'Baja', color: 'text-gray-600' },
  { value: 'MEDIA', label: 'Media', color: 'text-blue-600' },
  { value: 'ALTA', label: 'Alta', color: 'text-orange-600' },
  { value: 'URGENTE', label: 'Urgente', color: 'text-red-600' },
]

export function PurchaseRequestForm({ mode = 'create' }: { mode?: 'create' | 'edit' }) {
  const { selectedPurchaseRequestId, setCurrentView } = useAppStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(mode === 'edit')

  const [productDescription, setProductDescription] = useState('')
  const [brand, setBrand] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [priority, setPriority] = useState('MEDIA')
  const [productLink, setProductLink] = useState('')
  const [referencePhoto, setReferencePhoto] = useState<string | null>(null)
  const [directProvider, setDirectProvider] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (mode === 'edit' && selectedPurchaseRequestId) {
      setIsLoading(true)
      fetch(`/api/purchase-requests/${selectedPurchaseRequestId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Error al cargar')
          return res.json()
        })
        .then((data) => {
          setProductDescription(data.productDescription || '')
          setBrand(data.brand || '')
          setQuantity(String(data.quantity || 1))
          setPriority(data.priority || 'MEDIA')
          setProductLink(data.productLink || '')
          setReferencePhoto(data.referencePhotoUrl || null)
          setDirectProvider(data.directProvider || '')
          setNotes(data.notes || '')
        })
        .catch(() => toast.error('No se pudo cargar la solicitud'))
        .finally(() => setIsLoading(false))
    }
  }, [mode, selectedPurchaseRequestId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!productDescription.trim()) {
      toast.error('La descripción del producto es requerida')
      return
    }
    if (!quantity || parseInt(quantity) < 1) {
      toast.error('La cantidad debe ser al menos 1')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        productDescription: productDescription.trim(),
        brand: brand.trim(),
        quantity: parseInt(quantity),
        priority,
        productLink: productLink.trim(),
        referencePhotoUrl: referencePhoto,
        directProvider: directProvider.trim(),
        notes: notes.trim(),
      }

      let response
      if (mode === 'edit' && selectedPurchaseRequestId) {
        response = await fetch(`/api/purchase-requests/${selectedPurchaseRequestId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        response = await fetch('/api/purchase-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al guardar')
      }

      toast.success(mode === 'edit' ? 'Solicitud actualizada correctamente' : 'Solicitud creada correctamente')
      setCurrentView('purchase-requests')
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la solicitud')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentView('purchase-requests')}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
            {mode === 'edit' ? 'Editar Solicitud de Compra' : 'Nueva Solicitud de Compra'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Complete los datos del producto que desea solicitar
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Información del Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Descripción del producto */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Descripción del Producto <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Ej: Notebook HP Pavilion 15 pulgadas, 16GB RAM, 512GB SSD"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  required
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>

              {/* Marca y Cantidad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    placeholder="Ej: HP, Sony, Bosch..."
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Cantidad <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Prioridad */}
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={priority} onValueChange={setPriority} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={opt.color}>●</span>{' '}
                        <span className="ml-1">{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Link del producto */}
              <div className="space-y-2">
                <Label htmlFor="link">Link del producto</Label>
                <Input
                  id="link"
                  type="url"
                  placeholder="https://www.tienda.com/producto"
                  value={productLink}
                  onChange={(e) => setProductLink(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Proveedor directo */}
              <div className="space-y-2">
                <Label htmlFor="provider">Proveedor Directo (si tenemos)</Label>
                <Input
                  id="provider"
                  placeholder="Ej: Distribuidora XYZ SpA - contacto@xyz.cl - +56 2 1234 5678"
                  value={directProvider}
                  onChange={(e) => setDirectProvider(e.target.value)}
                  disabled={isSubmitting}
                />
                <p className="text-[10px] text-muted-foreground">
                  Indique proveedor(es) con los que ya trabajamos o que tienen cuenta corriente
                </p>
              </div>

              {/* Fotografía de referencia */}
              <div className="space-y-2">
                <Label>Fotografía de Referencia</Label>
                <ImageUpload
                  value={referencePhoto}
                  onChange={setReferencePhoto}
                  disabled={isSubmitting}
                />
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas / Comentarios</Label>
                <Textarea
                  id="notes"
                  placeholder="Información adicional: especificaciones técnicas, plazos, justificación, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSubmitting}
                  rows={2}
                />
              </div>

              {/* Botones */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentView('purchase-requests')}
                  disabled={isSubmitting}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {mode === 'edit' ? 'Guardar Cambios' : 'Crear Solicitud'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
