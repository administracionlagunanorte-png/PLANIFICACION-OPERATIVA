'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Bell, BellRing, AlertTriangle, Info, Clock, CheckCircle2, XCircle,
  Settings, Plus, Pencil, Trash2, Save, FileText, Upload,
  Shield, ShieldCheck, Eye, CheckCheck, RotateCcw,
  Wrench, DollarSign, CalendarDays, ShoppingBag, Users, LayoutDashboard,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ============================================================
// Types
// ============================================================
interface ModuleAlertItem {
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
  status: string
  monthYear: string | null
  completedBy: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

interface ReviewSubmission {
  id: string
  module: string
  itemId: string
  itemTitle: string
  submittedBy: string
  submittedRole: string
  attachmentUrl: string
  attachmentName: string | null
  notes: string | null
  status: string
  reviewedBy: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  createdAt: string
}

interface AlertasPanelProps {
  userRole?: string
  userName?: string
}

// ============================================================
// Constants
// ============================================================
const moduleConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  tareas: { label: 'Tareas', icon: <LayoutDashboard className="h-4 w-4" />, color: 'text-blue-600' },
  mantenimiento: { label: 'Mantenimiento', icon: <Wrench className="h-4 w-4" />, color: 'text-teal-600' },
  rendicion: { label: 'Rendición', icon: <DollarSign className="h-4 w-4" />, color: 'text-emerald-600' },
  compras: { label: 'Compras', icon: <ShoppingBag className="h-4 w-4" />, color: 'text-pink-600' },
  anticipos: { label: 'Anticipos', icon: <DollarSign className="h-4 w-4" />, color: 'text-cyan-600' },
  asistencias: { label: 'Asistencias', icon: <Users className="h-4 w-4" />, color: 'text-rose-600' },
}

const priorityConfig: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string }> = {
  info: { label: 'Informativa', icon: <Info className="h-3.5 w-3.5 text-blue-500" />, bg: 'bg-blue-100', text: 'text-blue-800' },
  warning: { label: 'Advertencia', icon: <Bell className="h-3.5 w-3.5 text-amber-500" />, bg: 'bg-amber-100', text: 'text-amber-800' },
  urgent: { label: 'Urgente', icon: <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />, bg: 'bg-orange-100', text: 'text-orange-800' },
  critical: { label: 'Crítica', icon: <BellRing className="h-3.5 w-3.5 text-red-500" />, bg: 'bg-red-100', text: 'text-red-800' },
}

const alertTypeLabels: Record<string, string> = {
  vencimiento: 'Vencimiento',
  informe: 'Informe',
  recordatorio: 'Recordatorio',
  urgente: 'Urgente',
}

const targetRoleLabels: Record<string, string> = {
  ALL: 'Todos',
  ADMIN: 'Solo Admin',
  SUPERVISOR: 'Solo Supervisor',
  USER: 'Solo Usuarios',
}

const reviewModuleLabels: Record<string, string> = {
  anticipos: 'Anticipos',
  asistencias: 'Asistencias',
  mantenimiento: 'Mantenimiento',
}

// ============================================================
// Component
// ============================================================
export default function AlertasPanel({ userRole = 'USER', userName = '' }: AlertasPanelProps) {
  const { toast } = useToast()
  const isAdmin = userRole === 'ADMIN'
  const isSupervisor = userRole === 'SUPERVISOR'
  const [alerts, setAlerts] = useState<ModuleAlertItem[]>([])
  const [reviews, setReviews] = useState<ReviewSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'activas' | 'programadas' | 'completadas' | 'revision'>('activas')
  const [filterModule, setFilterModule] = useState<string>('all')

  // Alert form
  const [showForm, setShowForm] = useState(false)
  const [editAlert, setEditAlert] = useState<ModuleAlertItem | null>(null)
  const [form, setForm] = useState({
    module: 'tareas', alertType: 'vencimiento', title: '', message: '',
    dayOfMonth: 1, active: true, auto: true, targetRole: 'ALL', priority: 'warning',
  })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Review dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewingSubmission, setReviewingSubmission] = useState<ReviewSubmission | null>(null)
  const [reviewAction, setReviewAction] = useState<'aprobada' | 'rechazada'>('aprobada')
  const [reviewNotes, setReviewNotes] = useState('')

  // ============================================================
  // Data fetching
  // ============================================================
  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/module-alerts')
      if (res.ok) setAlerts(await res.json())
    } catch (err) {
      console.error('Error fetching alerts:', err)
    }
  }

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/review-submissions')
      if (res.ok) setReviews(await res.json())
    } catch (err) {
      console.error('Error fetching reviews:', err)
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchAlerts(), fetchReviews()])
      setLoading(false)
    }
    load()
  }, [])

  // ============================================================
  // Filtering
  // ============================================================
  const now = new Date()
  const currentDay = now.getDate()
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const filteredAlerts = alerts.filter(a => {
    if (filterModule !== 'all' && a.module !== filterModule) return false
    // Role visibility
    if (a.targetRole === 'ALL') return true
    if (a.targetRole === 'ADMIN' && userRole === 'ADMIN') return true
    if (a.targetRole === 'SUPERVISOR' && userRole === 'SUPERVISOR') return true
    if (a.targetRole === 'USER' && userRole === 'USER') return true
    if (userRole === 'ADMIN') return true
    return false
  })

  const activas = filteredAlerts.filter(a => a.active && a.status === 'activa' && (!a.auto || currentDay >= a.dayOfMonth))
  const programadas = filteredAlerts.filter(a => a.active && a.status === 'activa' && a.auto && currentDay < a.dayOfMonth)
  const completadas = filteredAlerts.filter(a => a.status === 'completada')
  const pendingReviews = reviews.filter(r => r.status === 'pendiente')
  const completedReviews = reviews.filter(r => r.status !== 'pendiente')

  // ============================================================
  // Alert CRUD
  // ============================================================
  const openCreate = () => {
    setEditAlert(null)
    setForm({ module: 'tareas', alertType: 'vencimiento', title: '', message: '', dayOfMonth: 1, active: true, auto: true, targetRole: 'ALL', priority: 'warning' })
    setShowForm(true)
  }

  const openEdit = (alert: ModuleAlertItem) => {
    setEditAlert(alert)
    setForm({
      module: alert.module, alertType: alert.alertType, title: alert.title, message: alert.message,
      dayOfMonth: alert.dayOfMonth, active: alert.active, auto: alert.auto, targetRole: alert.targetRole, priority: alert.priority,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.message) {
      toast({ title: 'Error', description: 'Complete título y mensaje', variant: 'destructive' })
      return
    }
    try {
      if (editAlert) {
        const res = await fetch(`/api/module-alerts/${editAlert.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) toast({ title: 'Alerta actualizada' })
      } else {
        const res = await fetch('/api/module-alerts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) toast({ title: 'Alerta creada' })
      }
      setShowForm(false)
      fetchAlerts()
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/module-alerts/${id}`, { method: 'DELETE' })
      toast({ title: 'Alerta eliminada' })
      fetchAlerts()
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' })
    }
    setDeleteId(null)
  }

  const handleComplete = async (alert: ModuleAlertItem) => {
    try {
      await fetch(`/api/module-alerts/${alert.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completada', completedBy: userName || userRole }),
      })
      toast({ title: 'Alerta completada', description: `"${alert.title}" marcada como cumplida` })
      fetchAlerts()
    } catch {
      toast({ title: 'Error', description: 'No se pudo completar', variant: 'destructive' })
    }
  }

  const handleReactivate = async (alert: ModuleAlertItem) => {
    try {
      await fetch(`/api/module-alerts/${alert.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'activa' }),
      })
      toast({ title: 'Alerta reactivada' })
      fetchAlerts()
    } catch {
      toast({ title: 'Error', description: 'No se pudo reactivar', variant: 'destructive' })
    }
  }

  const toggleActive = async (alert: ModuleAlertItem) => {
    try {
      await fetch(`/api/module-alerts/${alert.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !alert.active }),
      })
      fetchAlerts()
    } catch {
      toast({ title: 'Error', description: 'No se pudo cambiar', variant: 'destructive' })
    }
  }

  // ============================================================
  // Review actions
  // ============================================================
  const openReviewDialog = (submission: ReviewSubmission, action: 'aprobada' | 'rechazada') => {
    setReviewingSubmission(submission)
    setReviewAction(action)
    setReviewNotes('')
    setReviewDialogOpen(true)
  }

  const handleReview = async () => {
    if (!reviewingSubmission) return
    try {
      const res = await fetch(`/api/review-submissions/${reviewingSubmission.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: reviewAction, reviewedBy: userName || userRole, reviewNotes }),
      })
      if (res.ok) {
        toast({
          title: reviewAction === 'aprobada' ? 'Envío aprobado' : 'Envío rechazado',
          description: `"${reviewingSubmission.itemTitle}" — ${reviewAction === 'aprobada' ? 'Aprobado' : 'Rechazado'}`,
        })
        fetchReviews()
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo procesar', variant: 'destructive' })
    }
    setReviewDialogOpen(false)
  }

  // ============================================================
  // Stats
  // ============================================================
  const stats = {
    activas: activas.length,
    programadas: programadas.length,
    completadas: completadas.length,
    pendientes: pendingReviews.length,
  }

  // ============================================================
  // Render helpers
  // ============================================================
  const renderAlertRow = (alert: ModuleAlertItem, showActions = true) => {
    const pCfg = priorityConfig[alert.priority] || priorityConfig.warning
    const mCfg = moduleConfig[alert.module] || { label: alert.module, icon: <Bell className="h-4 w-4" />, color: 'text-slate-600' }
    const isActive = alert.status === 'activa' && (!alert.auto || currentDay >= alert.dayOfMonth)
    return (
      <TableRow key={alert.id} className={alert.status === 'completada' ? 'opacity-60' : !alert.active ? 'opacity-40' : ''}>
        <TableCell>
          <div className="flex items-center gap-1.5">
            {pCfg.icon}
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${pCfg.bg} ${pCfg.text} border-0`}>
              {pCfg.label}
            </Badge>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <span className={mCfg.color}>{mCfg.icon}</span>
            <span className="text-xs font-medium">{mCfg.label}</span>
          </div>
        </TableCell>
        <TableCell>
          <p className="font-medium text-xs">{alert.title}</p>
          <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{alert.message}</p>
        </TableCell>
        <TableCell className="text-xs">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 border-0">
            {alertTypeLabels[alert.alertType] || alert.alertType}
          </Badge>
        </TableCell>
        <TableCell className="text-xs font-mono">{alert.dayOfMonth}</TableCell>
        <TableCell className="text-xs">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-0 ${alert.auto ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
            {alert.auto ? 'Auto' : 'Manual'}
          </Badge>
        </TableCell>
        <TableCell className="text-xs">{targetRoleLabels[alert.targetRole] || alert.targetRole}</TableCell>
        <TableCell>
          {alert.status === 'completada' ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-0">
              <CheckCheck className="h-2.5 w-2.5 mr-0.5" /> Cumplida
            </Badge>
          ) : isActive ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-0">
              Activa
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-0">
              <Clock className="h-2.5 w-2.5 mr-0.5" /> Día {alert.dayOfMonth}
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <input type="checkbox" checked={alert.active} onChange={() => toggleActive(alert)} className="rounded" disabled={!isAdmin} />
        </TableCell>
        {showActions && isAdmin && (
          <TableCell>
            <div className="flex gap-1">
              {alert.status === 'activa' && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50" onClick={() => handleComplete(alert)} title="Marcar cumplida">
                  <CheckCheck className="h-3.5 w-3.5" />
                </Button>
              )}
              {alert.status === 'completada' && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50" onClick={() => handleReactivate(alert)} title="Reactivar">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(alert)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600" onClick={() => setDeleteId(alert.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>
    )
  }

  const renderReviewRow = (sub: ReviewSubmission) => {
    const mCfg = reviewModuleLabels[sub.module] || sub.module
    return (
      <TableRow key={sub.id} className={sub.status !== 'pendiente' ? 'opacity-60' : ''}>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-700 border-0">
              {mCfg}
            </Badge>
          </div>
        </TableCell>
        <TableCell>
          <p className="font-medium text-xs">{sub.itemTitle}</p>
          {sub.notes && <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{sub.notes}</p>}
        </TableCell>
        <TableCell className="text-xs">{sub.submittedBy}</TableCell>
        <TableCell>
          {sub.attachmentName ? (
            <a href={sub.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
              <FileText className="h-3 w-3" /> {sub.attachmentName}
            </a>
          ) : (
            <a href={sub.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
              <FileText className="h-3 w-3" /> Ver adjunto
            </a>
          )}
        </TableCell>
        <TableCell className="text-xs">
          {new Date(sub.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </TableCell>
        <TableCell>
          {sub.status === 'pendiente' ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-0">
              <Clock className="h-2.5 w-2.5 mr-0.5" /> Pendiente
            </Badge>
          ) : sub.status === 'aprobada' ? (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-0">
              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Aprobada
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 border-0">
              <XCircle className="h-2.5 w-2.5 mr-0.5" /> Rechazada
            </Badge>
          )}
        </TableCell>
        {isAdmin && sub.status === 'pendiente' && (
          <TableCell>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 p-0 px-1.5 text-emerald-600 hover:bg-emerald-50 text-[10px] gap-0.5" onClick={() => openReviewDialog(sub, 'aprobada')}>
                <CheckCircle2 className="h-3 w-3" /> Aprobar
              </Button>
              <Button variant="ghost" size="sm" className="h-6 p-0 px-1.5 text-red-600 hover:bg-red-50 text-[10px] gap-0.5" onClick={() => openReviewDialog(sub, 'rechazada')}>
                <XCircle className="h-3 w-3" /> Rechazar
              </Button>
            </div>
          </TableCell>
        )}
        {sub.status !== 'pendiente' && (
          <TableCell className="text-[11px] text-slate-500">
            {sub.reviewedBy && `Por ${sub.reviewedBy}`}
            {sub.reviewNotes && <p className="truncate max-w-[150px]">{sub.reviewNotes}</p>}
          </TableCell>
        )}
      </TableRow>
    )
  }

  // ============================================================
  // Render
  // ============================================================
  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400"><Clock className="h-6 w-6 animate-spin mr-2" /> Cargando alertas...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <BellRing className="h-5 w-5 text-amber-600" />
          Centro de Alertas
        </h2>
        {isAdmin && (
          <Button className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nueva Alerta
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-emerald-200" onClick={() => setActiveTab('activas')}>
          <CardContent className="p-3 text-center">
            <div className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold">Activas Hoy</div>
            <div className="text-2xl font-bold text-emerald-700">{stats.activas}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-amber-200" onClick={() => setActiveTab('programadas')}>
          <CardContent className="p-3 text-center">
            <div className="text-[10px] text-amber-600 uppercase tracking-wider font-semibold">Programadas</div>
            <div className="text-2xl font-bold text-amber-700">{stats.programadas}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-slate-200" onClick={() => setActiveTab('completadas')}>
          <CardContent className="p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Completadas</div>
            <div className="text-2xl font-bold text-slate-600">{stats.completadas}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-blue-200" onClick={() => setActiveTab('revision')}>
          <CardContent className="p-3 text-center">
            <div className="text-[10px] text-blue-600 uppercase tracking-wider font-semibold">En Revisión</div>
            <div className="text-2xl font-bold text-blue-700">{stats.pendientes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter by module */}
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs text-slate-500">Módulo:</Label>
        <Button variant={filterModule === 'all' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setFilterModule('all')}>Todos</Button>
        {Object.entries(moduleConfig).map(([key, cfg]) => (
          <Button key={key} variant={filterModule === key ? 'default' : 'outline'} size="sm" className={`h-7 text-xs gap-1 ${filterModule === key ? cfg.color : ''}`} onClick={() => setFilterModule(key)}>
            {cfg.icon} {cfg.label}
          </Button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-0">
        {[
          { key: 'activas', label: 'Activas', count: stats.activas, color: 'text-emerald-600' },
          { key: 'programadas', label: 'Programadas', count: stats.programadas, color: 'text-amber-600' },
          { key: 'completadas', label: 'Completadas', count: stats.completadas, color: 'text-slate-500' },
          { key: 'revision', label: 'En Revisión', count: stats.pendientes, color: 'text-blue-600' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? `border-current ${tab.color}` : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            onClick={() => setActiveTab(tab.key as any)}
          >
            {tab.label} <span className="text-xs ml-1 bg-slate-100 px-1.5 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {/* Activas */}
          {activeTab === 'activas' && (
            activas.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
                <p className="text-sm">No hay alertas activas hoy</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Prioridad</TableHead>
                    <TableHead className="w-[100px]">Módulo</TableHead>
                    <TableHead>Alerta</TableHead>
                    <TableHead className="w-[90px]">Tipo</TableHead>
                    <TableHead className="w-[40px]">Día</TableHead>
                    <TableHead className="w-[60px]">Modo</TableHead>
                    <TableHead className="w-[80px]">Destino</TableHead>
                    <TableHead className="w-[80px]">Estado</TableHead>
                    <TableHead className="w-[40px]">On</TableHead>
                    {isAdmin && <TableHead className="w-[100px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activas.map(a => renderAlertRow(a, true))}
                </TableBody>
              </Table>
            )
          )}

          {/* Programadas */}
          {activeTab === 'programadas' && (
            programadas.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Clock className="h-10 w-10 mx-auto mb-2" />
                <p className="text-sm">No hay alertas programadas para este mes</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Prioridad</TableHead>
                    <TableHead className="w-[100px]">Módulo</TableHead>
                    <TableHead>Alerta</TableHead>
                    <TableHead className="w-[90px]">Tipo</TableHead>
                    <TableHead className="w-[40px]">Día</TableHead>
                    <TableHead className="w-[60px]">Modo</TableHead>
                    <TableHead className="w-[80px]">Destino</TableHead>
                    <TableHead className="w-[80px]">Estado</TableHead>
                    <TableHead className="w-[40px]">On</TableHead>
                    {isAdmin && <TableHead className="w-[100px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programadas.map(a => renderAlertRow(a, true))}
                </TableBody>
              </Table>
            )
          )}

          {/* Completadas */}
          {activeTab === 'completadas' && (
            completadas.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCheck className="h-10 w-10 mx-auto mb-2" />
                <p className="text-sm">No hay alertas completadas</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Prioridad</TableHead>
                    <TableHead className="w-[100px]">Módulo</TableHead>
                    <TableHead>Alerta</TableHead>
                    <TableHead className="w-[90px]">Tipo</TableHead>
                    <TableHead className="w-[40px]">Día</TableHead>
                    <TableHead className="w-[60px]">Modo</TableHead>
                    <TableHead className="w-[80px]">Destino</TableHead>
                    <TableHead className="w-[80px]">Estado</TableHead>
                    <TableHead className="w-[40px]">On</TableHead>
                    {isAdmin && <TableHead className="w-[100px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completadas.map(a => renderAlertRow(a, true))}
                </TableBody>
              </Table>
            )
          )}

          {/* Revisión */}
          {activeTab === 'revision' && (
            <div className="space-y-4 p-4">
              <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" /> Pendientes de Revisión ({pendingReviews.length})
              </h3>
              {pendingReviews.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No hay envíos pendientes de revisión</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Módulo</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[100px]">Enviado por</TableHead>
                      <TableHead className="w-[130px]">Adjunto</TableHead>
                      <TableHead className="w-[120px]">Fecha</TableHead>
                      <TableHead className="w-[80px]">Estado</TableHead>
                      {isAdmin && <TableHead className="w-[130px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReviews.map(r => renderReviewRow(r))}
                  </TableBody>
                </Table>
              )}

              {completedReviews.length > 0 && (
                <>
                  <h3 className="font-semibold text-sm text-slate-500 flex items-center gap-2 mt-6">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Revisadas ({completedReviews.length})
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Módulo</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-[100px]">Enviado por</TableHead>
                        <TableHead className="w-[130px]">Adjunto</TableHead>
                        <TableHead className="w-[120px]">Fecha</TableHead>
                        <TableHead className="w-[80px]">Estado</TableHead>
                        <TableHead>Revisión</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedReviews.map(r => renderReviewRow(r))}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Month info */}
      <div className="text-xs text-slate-400 text-center">
        Mes actual: {now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })} — Las alertas automáticas se reinician al cambiar de mes
      </div>

      {/* Create/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-amber-500" />
              {editAlert ? 'Editar Alerta' : 'Nueva Alerta'}
            </DialogTitle>
            <DialogDescription>
              {editAlert ? 'Modifica la configuración de la alerta' : 'Configura una nueva alerta para el sistema'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Módulo</Label>
                <Select value={form.module} onValueChange={v => setForm(f => ({ ...f, module: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(moduleConfig).map(([k, cfg]) => (
                      <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo de Alerta</Label>
                <Select value={form.alertType} onValueChange={v => setForm(f => ({ ...f, alertType: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(alertTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Prioridad</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([k, cfg]) => (
                      <SelectItem key={k} value={k}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Destinatario</Label>
                <Select value={form.targetRole} onValueChange={v => setForm(f => ({ ...f, targetRole: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(targetRoleLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: Informe Mensual" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Mensaje</Label>
              <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Descripción detallada de la alerta" rows={2} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Día del mes</Label>
                <Input type="number" min={1} max={31} value={form.dayOfMonth} onChange={e => setForm(f => ({ ...f, dayOfMonth: parseInt(e.target.value) || 1 }))} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Modo</Label>
                <Select value={form.auto ? 'auto' : 'manual'} onValueChange={v => setForm(f => ({ ...f, auto: v === 'auto' }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automática</SelectItem>
                    <SelectItem value="manual">Manual (persiste hasta completar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="alertActiveForm" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
              <Label htmlFor="alertActiveForm" className="text-xs">Alerta activa</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" className="gap-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSave}>
                <Save className="h-3.5 w-3.5" /> {editAlert ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar alerta?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteId && handleDelete(deleteId)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewAction === 'aprobada' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
              {reviewAction === 'aprobada' ? 'Aprobar Envío' : 'Rechazar Envío'}
            </DialogTitle>
            <DialogDescription>
              {reviewingSubmission && `Revisar: "${reviewingSubmission.itemTitle}" enviado por ${reviewingSubmission.submittedBy}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {reviewingSubmission && (
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500">Adjunto:</p>
                <a href={reviewingSubmission.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                  <FileText className="h-4 w-4" /> {reviewingSubmission.attachmentName || 'Ver adjunto'}
                </a>
                {reviewingSubmission.notes && (
                  <p className="text-xs text-slate-500 mt-1">Notas: {reviewingSubmission.notes}</p>
                )}
              </div>
            )}
            <div>
              <Label className="text-xs">Notas de revisión (opcional)</Label>
              <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Comentarios sobre la revisión..." rows={2} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancelar</Button>
            <Button
              className={reviewAction === 'aprobada' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
              onClick={handleReview}
            >
              {reviewAction === 'aprobada' ? 'Aprobar' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
