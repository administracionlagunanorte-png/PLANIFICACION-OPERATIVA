'use client'

import { Bell, BellRing, Settings, AlertTriangle, Info, X, Clock, CheckCircle2 } from 'lucide-react'
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

const priorityConfig: Record<string, { icon: React.ReactNode; bgClass: string; borderClass: string; textClass: string; titleClass: string; subClass: string; scheduledBg: string; scheduledBorder: string; scheduledText: string; scheduledTitle: string; scheduledSub: string; scheduledIcon: React.ReactNode }> = {
  info: {
    icon: <Info className="h-5 w-5 text-blue-600" />,
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    textClass: 'text-blue-800',
    titleClass: 'text-blue-900',
    subClass: 'text-blue-600',
    scheduledBg: 'bg-slate-50',
    scheduledBorder: 'border-slate-200 border-dashed',
    scheduledText: 'text-slate-600',
    scheduledTitle: 'text-slate-700',
    scheduledSub: 'text-slate-400',
    scheduledIcon: <Clock className="h-5 w-5 text-slate-400" />,
  },
  warning: {
    icon: <Bell className="h-5 w-5 text-amber-600" />,
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-800',
    titleClass: 'text-amber-900',
    subClass: 'text-amber-600',
    scheduledBg: 'bg-slate-50',
    scheduledBorder: 'border-slate-200 border-dashed',
    scheduledText: 'text-slate-600',
    scheduledTitle: 'text-slate-700',
    scheduledSub: 'text-slate-400',
    scheduledIcon: <Clock className="h-5 w-5 text-slate-400" />,
  },
  urgent: {
    icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    textClass: 'text-orange-800',
    titleClass: 'text-orange-900',
    subClass: 'text-orange-600',
    scheduledBg: 'bg-slate-50',
    scheduledBorder: 'border-slate-200 border-dashed',
    scheduledText: 'text-slate-600',
    scheduledTitle: 'text-slate-700',
    scheduledSub: 'text-slate-400',
    scheduledIcon: <Clock className="h-5 w-5 text-slate-400" />,
  },
  critical: {
    icon: <BellRing className="h-5 w-5 text-red-600" />,
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    textClass: 'text-red-800',
    titleClass: 'text-red-900',
    subClass: 'text-red-600',
    scheduledBg: 'bg-slate-50',
    scheduledBorder: 'border-slate-200 border-dashed',
    scheduledText: 'text-slate-600',
    scheduledTitle: 'text-slate-700',
    scheduledSub: 'text-slate-400',
    scheduledIcon: <Clock className="h-5 w-5 text-slate-400" />,
  },
}

const targetRoleLabels: Record<string, string> = {
  ALL: 'Todos',
  ADMIN: 'Solo Admin',
  SUPERVISOR: 'Solo Supervisor',
  USER: 'Solo Usuarios',
}

const alertTypeLabels: Record<string, string> = {
  vencimiento: 'Vencimiento',
  informe: 'Informe',
  recordatorio: 'Recordatorio',
  urgente: 'Urgente',
}

export default function ModuleAlertBanner({ alerts, userRole, onConfigure, onDismiss }: ModuleAlertBannerProps) {
  const today = new Date()
  const currentDay = today.getDate()

  // Show ALL active alerts to this user (no longer hiding by dayOfMonth)
  // Role-based visibility still applies
  const visibleAlerts = alerts.filter(alert => {
    if (!alert.active) return false
    // Check role visibility
    if (alert.targetRole === 'ALL') return true
    if (alert.targetRole === 'ADMIN' && userRole === 'ADMIN') return true
    if (alert.targetRole === 'SUPERVISOR' && userRole === 'SUPERVISOR') return true
    if (alert.targetRole === 'USER' && userRole === 'USER') return true
    // ADMIN sees everything
    if (userRole === 'ADMIN') return true
    return false
  })

  // Separate into "currently active" and "scheduled" (not yet reached dayOfMonth)
  const activeAlerts = visibleAlerts.filter(a => !a.auto || currentDay >= a.dayOfMonth)
  const scheduledAlerts = visibleAlerts.filter(a => a.auto && currentDay < a.dayOfMonth)

  if (visibleAlerts.length === 0) return null

  return (
    <div className="space-y-2">
      {/* Currently Active Alerts */}
      {activeAlerts.length > 0 && activeAlerts.map(alert => {
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
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.textClass} ${cfg.bgClass} border-0`}>
                  {alertTypeLabels[alert.alertType] || alert.alertType}
                </Badge>
                {!alert.auto ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-0">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Manual — Activa
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-0">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Activa hoy
                  </Badge>
                )}
              </div>
              <p className={`text-sm mt-0.5 ${cfg.textClass}`}>{alert.message}</p>
              <p className={`text-xs mt-1 ${cfg.subClass}`}>
                {alert.auto ? `Auto — se activa día ${alert.dayOfMonth} de cada mes (activa hoy)` : 'Manual — activada por Administrador'}
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

      {/* Scheduled Alerts (not yet active this month) */}
      {scheduledAlerts.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            <Clock className="h-3 w-3 inline mr-1" />
            Programadas ({scheduledAlerts.length})
          </p>
          {scheduledAlerts.map(alert => {
            const cfg = priorityConfig[alert.priority] || priorityConfig.warning
            return (
              <div key={alert.id} className={`rounded-lg p-3 flex items-start gap-3 border ${cfg.scheduledBg} ${cfg.scheduledBorder}`}>
                <div className="mt-0.5 shrink-0">{cfg.scheduledIcon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium text-sm ${cfg.scheduledTitle}`}>{alert.title}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-500 border-0">
                      {targetRoleLabels[alert.targetRole] || alert.targetRole}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-500 border-0">
                      {alertTypeLabels[alert.alertType] || alert.alertType}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-600 border-0">
                      <Clock className="h-2.5 w-2.5 mr-0.5" /> Día {alert.dayOfMonth}
                    </Badge>
                  </div>
                  <p className={`text-sm mt-0.5 ${cfg.scheduledText}`}>{alert.message}</p>
                  <p className={`text-xs mt-1 ${cfg.scheduledSub}`}>
                    Auto — se activa día {alert.dayOfMonth} de cada mes
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
      )}
    </div>
  )
}
