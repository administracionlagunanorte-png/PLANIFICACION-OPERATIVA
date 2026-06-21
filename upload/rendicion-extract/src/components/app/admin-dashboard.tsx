'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatCLP } from '@/lib/format-currency'
import { motion } from 'framer-motion'
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Users,
  Download,
  AlertTriangle,
  FileEdit,
  TrendingUp,
  Eye,
  PlusCircle,
  Wallet,
  User,
  Timer,
  Zap,
  Hourglass,
  Search,
  ShoppingCart,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Borrador', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <FileEdit className="h-3 w-3" /> },
  SUBMITTED: { label: 'Enviado', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="h-3 w-3" /> },
  APPROVED: { label: 'Aprobado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  REJECTED: { label: 'Rechazado', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-3 w-3" /> },
  MODIFICATION_REQUESTED: { label: 'Modificación', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: <AlertTriangle className="h-3 w-3" /> },
}

function formatHours(hours: number): string {
  if (hours === 0) return '-'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${Math.round(hours * 10) / 10} hrs`
  const days = Math.round((hours / 24) * 10) / 10
  return `${days} días`
}

export function AdminDashboard() {
  const { filters, setFilters, resetFilters, setCurrentView } = useAppStore()
  const [search, setSearch] = useState('')

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
  })

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports?status=SUBMITTED&pageSize=10')
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
  })

  // Fetch pending purchase requests
  const { data: pendingPurchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ['pending-purchase-requests'],
    queryFn: async () => {
      const res = await fetch('/api/purchase-requests?status=PENDIENTE&pageSize=5')
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
  })

  // Filter pending and recent reports by search
  const filteredPendingReports = search
    ? pendingData?.reports?.filter((report: any) =>
        report.title.toLowerCase().includes(search.toLowerCase()) ||
        (report.correlativeNumber != null && String(report.correlativeNumber).includes(search)) ||
        report.user?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : pendingData?.reports

  // Fetch users with budget data for the control panel
  const { data: budgetData, isLoading: budgetLoading } = useQuery({
    queryKey: ['admin-budget'],
    queryFn: async () => {
      const res = await fetch('/api/users?withBudget=true')
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
  })

  const handleExportAll = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.userId) params.set('userId', filters.userId)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)

      const url = `/api/export/excel?${params.toString()}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Error al exportar')
      const blob = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = 'rendiciones.xlsx'
      a.click()
      URL.revokeObjectURL(downloadUrl)
      toast.success('Exportación completada')
    } catch {
      toast.error('Error al exportar los datos')
    }
  }

  // Compute budget totals
  const totalAsignado = budgetData?.users?.reduce((sum: number, u: any) => sum + (u.montoAsignado || 0), 0) || 0
  const totalAprobado = budgetData?.users?.reduce((sum: number, u: any) => sum + (u.montoAprobado || 0), 0) || 0
  const totalRendido = budgetData?.users?.reduce((sum: number, u: any) => sum + (u.montoRendido || 0), 0) || 0
  const totalRestante = budgetData?.users?.reduce((sum: number, u: any) => sum + (u.montoRestante || 0), 0) || 0

  const statCards = [
    {
      title: 'Total Rendiciones',
      value: stats?.totalReports ?? 0,
      icon: <FileText className="h-5 w-5" />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Pendientes Revisión',
      value: stats?.pendingReports ?? 0,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Aprobadas',
      value: stats?.approvedReports ?? 0,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Rechazadas',
      value: stats?.rejectedReports ?? 0,
      icon: <XCircle className="h-5 w-5" />,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      title: 'Usuarios',
      value: stats?.totalUsers ?? 0,
      icon: <Users className="h-5 w-5" />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Monto Aprobado',
      value: formatCLP(stats?.totalAmountApproved ?? 0),
      icon: <DollarSign className="h-5 w-5" />,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Panel de Administración</h2>
          <p className="text-muted-foreground mt-1">Gestiona y revisa todas las rendiciones de gastos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentView('create-report')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Rendición
          </Button>
          <Button onClick={handleExportAll} variant="outline" className="shadow-sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar Todo
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título, número o usuario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {statsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-7 w-14" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                      <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                        <span className={stat.color}>{stat.icon}</span>
                      </div>
                    </div>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Time Statistics Card */}
      <Card className="shadow-sm border-emerald-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4 text-emerald-600" />
            Estadísticas de Tiempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : stats?.timeStats?.count > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-600">Tiempo Promedio</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatHours(stats.timeStats.avgApprovalHours)}
                </p>
                <p className="text-[10px] text-emerald-500 mt-1">desde envío hasta aprobación</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">Aprobación Más Rápida</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {formatHours(stats.timeStats.fastestApprovalHours)}
                </p>
                <p className="text-[10px] text-blue-500 mt-1">menor tiempo de aprobación</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Hourglass className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-600">Aprobación Más Lenta</span>
                </div>
                <p className="text-2xl font-bold text-amber-700">
                  {formatHours(stats.timeStats.slowestApprovalHours)}
                </p>
                <p className="text-[10px] text-amber-500 mt-1">mayor tiempo de aprobación</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Timer className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No hay datos de tiempo de aprobación aún</p>
              <p className="text-xs text-muted-foreground mt-1">Los datos aparecerán cuando se aprueben rendiciones enviadas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Worker Statistics Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            Estadísticas por Trabajador
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : stats?.workerStats?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Trabajador</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Rendiciones</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Compras</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Total Rendido</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground">Tiempo Prom. Aprobación</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.workerStats.map((worker: any) => (
                    <tr key={worker.userId} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            {worker.userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{worker.userName}</p>
                            <p className="text-[10px] text-muted-foreground">{worker.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          {worker.rendicionesCount}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                          {worker.comprasCount}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-emerald-700">
                        {formatCLP(worker.totalRendido)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="text-xs text-muted-foreground">
                          {formatHours(worker.avgApprovalHours)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No hay datos de trabajadores</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Control Summary */}
      <Card className="shadow-sm border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-600" />
              Control de Presupuestos
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 text-xs"
              onClick={() => setCurrentView('users-panel')}
            >
              Ver detalle <TrendingUp className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {budgetLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <span className="text-xs text-blue-600 font-medium">Total Asignado</span>
                  <p className="text-lg font-bold text-blue-700">{formatCLP(totalAsignado)}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <span className="text-xs text-emerald-600 font-medium">Total Aprobado</span>
                  <p className="text-lg font-bold text-emerald-700">{formatCLP(totalAprobado)}</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <span className="text-xs text-amber-600 font-medium">Total Rendido</span>
                  <p className="text-lg font-bold text-amber-700">{formatCLP(totalRendido)}</p>
                </div>
                <div className={`p-3 rounded-lg ${totalRestante >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <span className={`text-xs font-medium ${totalRestante >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Total Restante</span>
                  <p className={`text-lg font-bold ${totalRestante >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCLP(totalRestante)}</p>
                </div>
              </div>

              {/* Quick user budget list */}
              {budgetData?.users?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Resumen por usuario:</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {budgetData.users.map((user: any) => {
                      const restante = user.montoRestante || 0
                      const isOver = restante < 0
                      const pct = user.montoAsignado > 0 ? Math.round((user.montoRendido / user.montoAsignado) * 100) : 0
                      return (
                        <div key={user.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/30 text-xs">
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium truncate">{user.name}</span>
                          </div>
                          <div className="flex-1">
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-[11px]">
                            <span className="text-blue-600">{formatCLP(user.montoAsignado || 0)}</span>
                            <span className="text-amber-600">{formatCLP(user.montoRendido || 0)}</span>
                            <span className={`font-medium ${isOver ? 'text-red-600' : 'text-emerald-600'}`}>
                              {formatCLP(restante)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Pending Review Section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Pendientes de Revisión</CardTitle>
              {stats?.pendingReports > 0 && (
                <Badge className="bg-amber-500 text-white border-0 text-[10px]">
                  {stats.pendingReports}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700 text-xs"
              onClick={() => {
                setFilters({ status: 'SUBMITTED' })
                setCurrentView('dashboard')
              }}
            >
              Ver todas <TrendingUp className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : filteredPendingReports?.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-300 mb-2" />
              <p className="text-sm text-muted-foreground">{search ? 'No hay resultados para la búsqueda' : 'No hay rendiciones pendientes de revisión'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPendingReports?.map((report: any) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-emerald-100"
                  onClick={() => {
                    useAppStore.getState().setSelectedReportId(report.id)
                    setCurrentView('report-detail')
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {report.correlativeNumber != null && (
                        <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 px-1">
                          R-{String(report.correlativeNumber).padStart(3, '0')}
                        </Badge>
                      )}
                      <p className="text-sm font-medium truncate">{report.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {report.user?.name} · {new Date(report.createdAt).toLocaleDateString('es-CL')} · {formatCLP(report.totalAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Pendiente
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7 text-emerald-600">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Purchase Requests */}
      <Card className="shadow-sm border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                Solicitudes de Compra Pendientes
              </CardTitle>
              {pendingPurchases?.pagination?.total > 0 && (
                <Badge className="bg-blue-500 text-white border-0 text-[10px]">
                  {pendingPurchases.pagination.total}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 text-xs"
              onClick={() => setCurrentView('purchase-requests')}
            >
              Ver todas <TrendingUp className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {purchasesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          ) : pendingPurchases?.requests?.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-300 mb-2" />
              <p className="text-sm text-muted-foreground">No hay solicitudes de compra pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPurchases?.requests?.map((req: any) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-blue-100"
                  onClick={() => {
                    useAppStore.getState().setSelectedPurchaseRequestId(req.id)
                    setCurrentView('purchase-request-detail')
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 shrink-0 px-1">
                        SC-{String(req.correlativeNumber).padStart(3, '0')}
                      </Badge>
                      {req.priority === 'URGENTE' && (
                        <Badge className="bg-red-500 text-white border-0 text-[9px] px-1">URGENTE</Badge>
                      )}
                      {req.priority === 'ALTA' && (
                        <Badge className="bg-orange-500 text-white border-0 text-[9px] px-1">ALTA</Badge>
                      )}
                      <p className="text-sm font-medium truncate">{req.productDescription}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {req.user?.name} · {new Date(req.createdAt).toLocaleDateString('es-CL')} · {req.quantity} unid.
                      {req.brand && ` · ${req.brand}`}
                      {req.quotes?.length > 0 && ` · ${req.quotes.length} cotiz.`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Pendiente
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7 text-blue-600">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : (stats?.recentReports || []).filter((report: any) => {
              if (!search) return true
              return report.title.toLowerCase().includes(search.toLowerCase()) ||
                (report.correlativeNumber != null && String(report.correlativeNumber).includes(search)) ||
                report.user?.name?.toLowerCase().includes(search.toLowerCase())
            }).length === 0 ? (
            <div className="text-center py-6">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">{search ? 'No hay resultados para la búsqueda' : 'No hay actividad reciente'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(stats?.recentReports || []).filter((report: any) => {
                if (!search) return true
                return report.title.toLowerCase().includes(search.toLowerCase()) ||
                  (report.correlativeNumber != null && String(report.correlativeNumber).includes(search)) ||
                  report.user?.name?.toLowerCase().includes(search.toLowerCase())
              }).map((report: any) => {
                const st = statusConfig[report.status] || statusConfig.DRAFT
                return (
                  <div
                    key={report.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      useAppStore.getState().setSelectedReportId(report.id)
                      setCurrentView('report-detail')
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {report.correlativeNumber != null && (
                          <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 px-1">
                            R-{String(report.correlativeNumber).padStart(3, '0')}
                          </Badge>
                        )}
                        <p className="text-sm font-medium truncate">{report.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {report.user?.name} · {new Date(report.createdAt).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ml-2 shrink-0 ${st.color}`}>
                      {st.icon}
                      <span className="ml-1">{st.label}</span>
                    </Badge>
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
