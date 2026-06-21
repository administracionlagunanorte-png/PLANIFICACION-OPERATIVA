'use client'

import { useState } from 'react'
import { useSession } from '@/lib/auth-context'
import { formatCLP } from '@/lib/format-currency'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ShoppingCart,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  XCircle,
  ExternalLink,
  Package,
  Tag,
  Building2,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'

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

export function PurchaseRequestsList() {
  const { data: session } = useSession()
  const { setCurrentView, setSelectedPurchaseRequestId } = useAppStore()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const pageSize = 10
  const isAdmin = session?.user?.role === 'ADMIN'

  const buildQuery = () => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('pageSize', pageSize.toString())
    if (statusFilter) params.set('status', statusFilter)
    if (priorityFilter) params.set('priority', priorityFilter)
    if (search.trim()) params.set('search', search.trim())
    return params.toString()
  }

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-requests', page, statusFilter, priorityFilter, search],
    queryFn: async () => {
      const res = await fetch(`/api/purchase-requests?${buildQuery()}`)
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
  })

  const handleViewDetail = (id: string) => {
    setSelectedPurchaseRequestId(id)
    setCurrentView('purchase-request-detail')
  }

  const totalPages = data?.pagination?.totalPages || 1

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
            Solicitudes de Compra
          </h2>
          <p className="text-sm text-muted-foreground">
            {data?.pagination?.total || 0} solicitudes encontradas
          </p>
        </div>
        <Button
          onClick={() => setCurrentView('create-purchase-request')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por producto, marca, proveedor o número SC-..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9 h-10"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => { setSearch(''); setPage(1) }}
          >
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 min-w-[140px]">
              <Label className="text-xs">Estado</Label>
              <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="APROBADA">Aprobada</SelectItem>
                  <SelectItem value="EN_COMPRA">En Compra</SelectItem>
                  <SelectItem value="COMPRADA">Comprada</SelectItem>
                  <SelectItem value="RECHAZADA">Rechazada</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-[140px]">
              <Label className="text-xs">Prioridad</Label>
              <Select value={priorityFilter || 'all'} onValueChange={(v) => { setPriorityFilter(v === 'all' ? '' : v); setPage(1) }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="URGENTE">Urgente</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="MEDIA">Media</SelectItem>
                  <SelectItem value="BAJA">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStatusFilter(''); setPriorityFilter(''); setSearch(''); setPage(1) }}
              className="text-xs"
            >
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.requests?.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No se encontraron solicitudes de compra</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Cree una nueva solicitud haciendo clic en "Nueva Solicitud"
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.requests?.map((req: any, index: number) => {
            const status = statusConfig[req.status] || statusConfig.PENDIENTE
            const priority = priorityConfig[req.priority] || priorityConfig.MEDIA
            const quotesCount = req.quotes?.length || 0
            const winnerQuote = req.quotes?.find((q: any) => q.isWinner)
            const minQuote = req.quotes?.length > 0
              ? req.quotes.reduce((min: any, q: any) => (q.amount < min.amount ? q : min), req.quotes[0])
              : null

            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <Card
                  className="shadow-sm hover:shadow-md transition-all cursor-pointer border-transparent hover:border-emerald-200"
                  onClick={() => handleViewDetail(req.id)}
                >
                  <CardContent className="p-4">
                    {/* Top row: priority + correlative + status */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                          SC-{String(req.correlativeNumber).padStart(3, '0')}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${priority.color} bg-muted/30`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${priority.dot}`} />
                          {priority.label}
                        </Badge>
                        {req.referencePhotoUrl && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground bg-muted/30 shrink-0">
                            <ImageIcon className="h-2.5 w-2.5 mr-0.5" />
                            Foto
                          </Badge>
                        )}
                        {req.productLink && (
                          <Badge variant="outline" className="text-[10px] text-blue-600 bg-blue-50 shrink-0">
                            <ExternalLink className="h-2.5 w-2.5 mr-0.5" />
                            Link
                          </Badge>
                        )}
                        {quotesCount > 0 && (
                          <Badge variant="outline" className="text-[10px] text-purple-600 bg-purple-50 shrink-0">
                            {quotesCount} cotizació{quotesCount === 1 ? 'n' : 'nes'}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${status.color}`}>
                        {status.label}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-sm font-medium line-clamp-2">{req.productDescription}</p>

                    {/* Details row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {req.brand && (
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {req.brand}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {req.quantity} unidad{req.quantity !== 1 ? 'es' : ''}
                      </span>
                      {req.directProvider && (
                        <span className="flex items-center gap-1 truncate max-w-[200px]">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {req.directProvider.split(' - ')[0]}
                        </span>
                      )}
                      {isAdmin && req.user && (
                        <span>· {req.user.name}</span>
                      )}
                      <span>· {new Date(req.createdAt).toLocaleDateString('es-CL')}</span>
                    </div>

                    {/* Quote summary */}
                    {(winnerQuote || minQuote) && (
                      <div className="mt-2 pt-2 border-t border-dashed text-xs">
                        {winnerQuote ? (
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-semibold">✓ Cotización ganadora:</span>
                            <span className="font-medium">{winnerQuote.providerName}</span>
                            <span className="font-bold text-emerald-700">{formatCLP(winnerQuote.amount)}</span>
                          </div>
                        ) : minQuote ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>Mejor cotización:</span>
                            <span className="font-medium">{minQuote.providerName}</span>
                            <span className="font-bold text-emerald-700">{formatCLP(minQuote.amount)}</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
