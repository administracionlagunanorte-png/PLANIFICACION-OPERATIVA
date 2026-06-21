'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  CheckCheck,
  BellOff,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

const typeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  INFO: { icon: <Info className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
  SUCCESS: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  WARNING: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-600', bg: 'bg-orange-50' },
  ERROR: { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-50' },
}

export function NotificationsPanel() {
  const queryClient = useQueryClient()
  const { setCurrentView, setSelectedReportId } = useAppStore()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error('Error')
      return res.json()
    },
  })

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Error')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    } catch {
      toast.error('Error al marcar notificación')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', { method: 'PATCH' })
      if (!res.ok) throw new Error('Error')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
      toast.success('Todas las notificaciones marcadas como leídas')
    } catch {
      toast.error('Error al marcar notificaciones')
    }
  }

  const handleGoToReport = (reportId: string, notifId: string) => {
    handleMarkAsRead(notifId)
    setSelectedReportId(reportId)
    setCurrentView('report-detail')
  }

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">Notificaciones</h2>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white border-0 text-xs">
              {unreadCount} sin leer
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs"
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <BellOff className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No tienes notificaciones</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Las notificaciones aparecerán aquí cuando haya actividad en tus rendiciones
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {notifications.map((notif: any, index: number) => {
              const type = typeConfig[notif.type] || typeConfig.INFO
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <Card className={`shadow-sm transition-colors ${!notif.read ? 'border-emerald-200 bg-emerald-50/30' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full shrink-0 ${type.bg}`}>
                          <span className={type.color}>{type.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notif.read ? 'font-semibold' : 'font-medium'}`}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {notif.message}
                              </p>
                            </div>
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(notif.createdAt).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {!notif.read && (
                              <button
                                onClick={() => handleMarkAsRead(notif.id)}
                                className="text-[10px] text-emerald-600 hover:text-emerald-700 hover:underline"
                              >
                                Marcar como leída
                              </button>
                            )}
                            {notif.reportId && (
                              <button
                                onClick={() => handleGoToReport(notif.reportId, notif.id)}
                                className="text-[10px] text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-0.5"
                              >
                                Ver rendición <ExternalLink className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
