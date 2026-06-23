'use client'

import { Bell, BellRing, Settings, AlertTriangle, Info, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface ModuleAlertItem {
  id: string
  module: string
  alertType: string
  title: string
  message: string
  dayOfMonth: number
  active: boolean
  auto: boolean
  targetRole: string
  priority: string
}

interface ModuleAlertBannerProps {
  alerts: ModuleAlertItem[]
  userRole: string
  onConfigure?: () => void
  onDismiss?: (id: string) => void
}

const priorityConfig: Record<string, { icon: React.ReactNode; bgClass: string; borderClass: string; textClass: string; titleClass: string; subClass: string }> = {
  info: {
    icon: <Info className="h-5 w-5 text-blue-600" />,
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    textClass: 'text-blue-800',
    titleClass: 'text-blue-900',
    subClass: 'text-blue-600',
  },
  warning: {
    icon: <Bell className="h-5 w-5 text-amber-600" />,
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-800',
    titleClass: 'text-amber-900',
    subClass: 'text-amber-600',
  },
  urgent: {
    icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    textClass: 'text-orange-800',
    titleClass: 'text-orange-900',
    subClass: 'text-orange-600',
  },
  critical: {
    icon: <BellRing className="h-5 w-5 text-red-600" />,
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    textClass: 'text-red-800',
    titleClass: 'text-red-900',
    subClass: 'text-red-600',
  },
}

const targetRoleLabels: Record<string, string> = {
  ALL: 'Todos',
  ADMIN: 'Solo Admin',
  SUPERVISOR: 'Solo Supervisor',
  USER: 'Solo Usuarios',
}

export default function ModuleAlertBanner({ alerts, userRole, onConfigure, onDismiss }: ModuleAlertBannerProps) {
  const today = new Date()
  const currentDay = today.getDate()

  // Filter alerts that should be shown to this user
  const visibleAlerts = alerts.filter(alert => {
    if (!alert.active) return false
    // Auto alerts: show if current day >= dayOfMonth
    if (alert.auto && currentDay < alert.dayOfMonth) return false
    // Check role visibility
    if (alert.targetRole === 'ALL') return true
    if (alert.targetRole === 'ADMIN' && userRole === 'ADMIN') return true
    if (alert.targetRole === 'SUPERVISOR' && userRole === 'SUPERVISOR') return true
    if (alert.targetRole === 'USER' && userRole === 'USER') return true
    // ADMIN sees everything
    if (userRole === 'ADMIN') return true
    return false
  })

  if (visibleAlerts.length === 0) return null

  return (
    <div className="space-y-2">
      {visibleAlerts.map(alert => {
        const cfg = priorityConfig[alert.priority] || priorityConfig.warning
        return (
          <div key={alert.id} className={`rounded-lg p-4 flex items-start gap-3 border ${cfg.bgClass} ${cfg.borderClass}`}>
            <div className="mt-0.5 shrink-0">{cfg.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`font-semibold text-sm ${cfg.titleClass}`}>{alert.title}</p>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.textClass} ${cfg.bgClass} border-0`}>
                  {targetRoleLabels[alert.targetRole] || alert.targetRole}
                </Badge>
                {!alert.auto && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 border-0">
                    Manual
                  </Badge>
                )}
              </div>
              <p className={`text-sm mt-0.5 ${cfg.textClass}`}>{alert.message}</p>
              <p className={`text-xs mt-1 ${cfg.subClass}`}>
                {alert.auto ? `Se activa: día ${alert.dayOfMonth} de cada mes` : 'Alerta manual activada por Administrador'}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onConfigure && userRole === 'ADMIN' && (
                <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={onConfigure}>
                  <Settings className="h-3 w-3" /> Configurar
                </Button>
              )}
              {onDismiss && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onDismiss(alert.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
