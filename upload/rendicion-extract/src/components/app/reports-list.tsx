'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/lib/auth-context'
import { formatCLP } from '@/lib/format-currency'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileEdit,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Borrador', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <FileEdit className="h-3 w-3" /> },
  SUBMITTED: { label: 'Enviado', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="h-3 w-3" /> },
  APPROVED: { label: 'Aprobado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  REJECTED: { label: 'Rechazado', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-3 w-3" /> },
  MODIFICATION_REQUESTED: { label: 'Modificación', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: <AlertTriangle className="h-3 w-3" /> },
}

export function ReportsList() {
  const { data: session } = useSession()
  const { filters, setFilters, resetFilters, setCurrentView, setSelectedReportId } = useAppStore()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<{id: string; name: string; icon: string}[]>([])
  const pageSize = 10
  const isAdmin = session?.user?.role === 'ADMIN'

  // Fetch categories for filter
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

  const buildQuery = () => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('pageSize', pageSize.toString())
    if (filters.status) params.set('status', filters.status)
    if (filters.userId) params.set('userId', filters.userId)
    if (filters.category) params.set('category', filters.category)
    if (search.trim()) params.set('search', search.trim())
    return params.toString()
  }

  const { data, isLoading } = useQuery({
    queryKey: ['reports', page, filters.status, filters.userId, filters.category, search],
    queryFn: async () => {
      const res = await fetch(`/api/reports?${buildQuery()}`)
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
  })

  const handleViewReport = (id: string) => {
    setSelectedReportId(id)
    setCurrentView('report-detail')
  }

  const totalPages = data?.pagination?.totalPages || 1

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Rendiciones de Gastos</h2>
          <p className="text-sm text-muted-foreground">
            {data?.pagination?.total || 0} rendiciones encontradas
          </p>
        </div>
        <Button
          onClick={() => setCurrentView('create-report')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <FileText className="mr-2 h-4 w-4" />
          Nueva
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título o número de rendición..."
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
              <Select value={filters.status || 'all'} onValueChange={(v) => { setFilters({ status: v === 'all' ? '' : v }); setPage(1) }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="DRAFT">Borrador</SelectItem>
                  <SelectItem value="SUBMITTED">Enviado</SelectItem>
                  <SelectItem value="APPROVED">Aprobado</SelectItem>
                  <SelectItem value="REJECTED">Rechazado</SelectItem>
                  <SelectItem value="MODIFICATION_REQUESTED">Modificación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-[140px]">
              <Label className="text-xs">Categoría</Label>
              <Select value={filters.category || 'all'} onValueChange={(v) => { setFilters({ category: v === 'all' ? '' : v }); setPage(1) }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                className="h-9 text-xs w-[140px]"
                value={filters.dateFrom}
                onChange={(e) => { setFilters({ dateFrom: e.target.value }); setPage(1) }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                className="h-9 text-xs w-[140px]"
                value={filters.dateTo}
                onChange={(e) => { setFilters({ dateTo: e.target.value }); setPage(1) }}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => { resetFilters(); setSearch(''); setPage(1) }} className="text-xs">
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
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
      ) : data?.reports?.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No se encontraron rendiciones</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Intente cambiar los filtros de búsqueda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.reports?.map((report: any, index: number) => {
            const status = statusConfig[report.status] || statusConfig.DRAFT
            return (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <Card
                  className="shadow-sm hover:shadow-md transition-all cursor-pointer border-transparent hover:border-emerald-200"
                  onClick={() => handleViewReport(report.id)}
                >
                  <CardContent className="p-4">
                    {/* Desktop View */}
                    <div className="hidden sm:flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {report.correlativeNumber != null && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                              R-{String(report.correlativeNumber).padStart(3, '0')}
                            </Badge>
                          )}
                          <p className="text-sm font-medium truncate">{report.title}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {isAdmin && (
                            <span className="text-xs text-muted-foreground">{report.user?.name}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(report.createdAt).toLocaleDateString('es-ES')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {report.items?.length || 0} {report.items?.length === 1 ? 'gasto' : 'gastos'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-emerald-700">
                          {formatCLP(report.totalAmount)}
                        </span>
                        <Badge variant="outline" className={`text-[10px] ${status.color}`}>
                          {status.icon}
                          <span className="ml-1">{status.label}</span>
                        </Badge>
                      </div>
                    </div>

                    {/* Mobile View */}
                    <div className="sm:hidden">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {report.correlativeNumber != null && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                              R-{String(report.correlativeNumber).padStart(3, '0')}
                            </Badge>
                          )}
                          <p className="text-sm font-medium truncate">{report.title}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${status.color}`}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {isAdmin && <span>{report.user?.name} ·</span>}
                          <span>{new Date(report.createdAt).toLocaleDateString('es-ES')}</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-700">
                          {formatCLP(report.totalAmount)}
                        </span>
                      </div>
                    </div>
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
