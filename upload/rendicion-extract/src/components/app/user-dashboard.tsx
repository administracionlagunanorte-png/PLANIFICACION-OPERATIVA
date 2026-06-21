'use client'

import { useSession } from '@/lib/auth-context'
import { formatCLP } from '@/lib/format-currency'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  PlusCircle,
  ArrowRight,
  AlertTriangle,
  FileEdit,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Borrador', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <FileEdit className="h-3 w-3" /> },
  SUBMITTED: { label: 'Enviado', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="h-3 w-3" /> },
  APPROVED: { label: 'Aprobado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  REJECTED: { label: 'Rechazado', color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-3 w-3" /> },
  MODIFICATION_REQUESTED: { label: 'Modificación', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: <AlertTriangle className="h-3 w-3" /> },
}

export function UserDashboard() {
  const { data: session } = useSession()
  const { setCurrentView } = useAppStore()
  const userName = session?.user?.name?.split(' ')[0] || 'Usuario'

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
  })

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['my-reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports?pageSize=5')
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
  })

  const statCards = [
    {
      title: 'Mis Rendiciones',
      value: stats?.myReports ?? 0,
      icon: <FileText className="h-5 w-5" />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Pendientes',
      value: stats?.mySubmitted ?? 0,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Aprobadas',
      value: stats?.myApproved ?? 0,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Monto Aprobado',
      value: formatCLP(stats?.myTotalApproved ?? 0),
      icon: <DollarSign className="h-5 w-5" />,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold">¡Hola, {userName}! 👋</h2>
        <p className="text-muted-foreground mt-1">Aquí tienes un resumen de tus rendiciones de gastos</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          >
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {statsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-16" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                      <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                        <span className={stat.color}>{stat.icon}</span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => setCurrentView('create-report')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Rendición
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentView('dashboard')}
          className="shadow-sm"
        >
          <FileText className="mr-2 h-4 w-4" />
          Ver Todas las Rendiciones
        </Button>
      </div>

      {/* Recent Reports */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Rendiciones Recientes</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700 text-xs"
              onClick={() => setCurrentView('dashboard')}
            >
              Ver todas <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : reportsData?.reports?.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No tienes rendiciones aún</p>
              <Button
                variant="link"
                className="text-emerald-600 mt-1"
                onClick={() => setCurrentView('create-report')}
              >
                Crear primera rendición
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reportsData?.reports?.map((report: any) => {
                const status = statusConfig[report.status] || statusConfig.DRAFT
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
                        {new Date(report.createdAt).toLocaleDateString('es-CL')} · {formatCLP(report.totalAmount)}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ml-2 shrink-0 ${status.color}`}>
                      {status.icon}
                      <span className="ml-1">{status.label}</span>
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
