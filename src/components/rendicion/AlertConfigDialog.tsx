'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { Bell, Plus, Pencil, Trash2, Save, Settings, Info, AlertTriangle, BellRing } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { ModuleAlertItem } from './ModuleAlertBanner'

interface AlertConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  moduleName: string           // "mantenimiento", "rendicion", etc.
  moduleLabel: string          // "Mantenimiento", "Rendición de Gastos", etc.
  userRole: string
}

const priorityOptions = [
  { value: 'info', label: 'Informativa', color: 'bg-blue-100 text-blue-800' },
  { value: 'warning', label: 'Advertencia', color: 'bg-amber-100 text-amber-800' },
  { value: 'urgent', label: 'Urgente', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Crítica', color: 'bg-red-100 text-red-800' },
]

const targetRoleOptions = [
  { value: 'ALL', label: 'Todos los usuarios' },
  { value: 'ADMIN', label: 'Solo Administrador' },
  { value: 'SUPERVISOR', label: 'Solo Supervisor' },
  { value: 'USER', label: 'Solo Usuarios' },
]

const alertTypeOptions = [
  { value: 'vencimiento', label: 'Vencimiento' },
  { value: 'informe', label: 'Informe' },
  { value: 'recordatorio', label: 'Recordatorio' },
  { value: 'urgente', label: 'Urgente' },
]

export default function AlertConfigDialog({ open, onOpenChange, moduleName, moduleLabel, userRole }: AlertConfigDialogProps) {
  const { toast } = useToast()
  const [alerts, setAlerts] = useState<ModuleAlertItem[]>([])
  const [loading, setLoading] = useState(false)
  const [editAlert, setEditAlert] = useState<ModuleAlertItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({
    alertType: 'vencimiento',
    title: '',
    message: '',
    dayOfMonth: 1,
    active: true,
    auto: true,
    targetRole: 'ALL',
    priority: 'warning',
  })

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/module-alerts?module=${moduleName}`)
      if (res.ok) setAlerts(await res.json())
    } catch (err) {
      console.error('Error fetching alerts:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) fetchAlerts()
  }, [open])

  const openCreate = () => {
    setEditAlert(null)
    setForm({
      alertType: 'vencimiento',
      title: '',
      message: '',
      dayOfMonth: 1,
      active: true,
      auto: true,
      targetRole: 'ALL',
      priority: 'warning',
    })
    setShowForm(true)
  }

  const openEdit = (alert: ModuleAlertItem) => {
    setEditAlert(alert)
    setForm({
      alertType: alert.alertType,
      title: alert.title,
      message: alert.message,
      dayOfMonth: alert.dayOfMonth,
      active: alert.active,
      auto: alert.auto,
      targetRole: alert.targetRole,
      priority: alert.priority,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.message) {
      toast({ title: 'Error', description: 'Complete el título y mensaje', variant: 'destructive' })
      return
    }
    try {
      if (editAlert) {
        const res = await fetch(`/api/module-alerts/${editAlert.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, module: moduleName }),
        })
        if (res.ok) toast({ title: 'Alerta actualizada' })
      } else {
        const res = await fetch('/api/module-alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, module: moduleName }),
        })
        if (res.ok) toast({ title: 'Alerta creada' })
      }
      setShowForm(false)
      fetchAlerts()
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la alerta', variant: 'destructive' })
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

  const toggleActive = async (alert: ModuleAlertItem) => {
    try {
      await fetch(`/api/module-alerts/${alert.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !alert.active }),
      })
      fetchAlerts()
    } catch {
      toast({ title: 'Error', description: 'No se pudo cambiar el estado', variant: 'destructive' })
    }
  }

  const priorityIcon = (p: string) => {
    switch (p) {
      case 'info': return <Info className="h-3.5 w-3.5 text-blue-500" />
      case 'warning': return <Bell className="h-3.5 w-3.5 text-amber-500" />
      case 'urgent': return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
      case 'critical': return <BellRing className="h-3.5 w-3.5 text-red-500" />
      default: return <Bell className="h-3.5 w-3.5" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-amber-500" />
            Alertas — {moduleLabel}
          </DialogTitle>
          <DialogDescription>
            Solo el Administrador puede crear, modificar o eliminar alertas. Las alertas automáticas se activan según el día del mes; las manuales las activa el Administrador.
          </DialogDescription>
        </DialogHeader>

        {/* Alert list */}
        <div className="space-y-3">
          {alerts.length === 0 && !loading ? (
            <div className="text-center py-8 text-slate-400">
              <Bell className="h-10 w-10 mx-auto mb-2" />
              <p className="text-sm">No hay alertas configuradas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="w-[70px]">Día</TableHead>
                  <TableHead className="w-[90px]">Destino</TableHead>
                  <TableHead className="w-[60px]">Modo</TableHead>
                  <TableHead className="w-[50px]">Activa</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map(alert => {
                  const pCfg = priorityOptions.find(p => p.value === alert.priority)
                  const rCfg = targetRoleOptions.find(r => r.value === alert.targetRole)
                  return (
                    <TableRow key={alert.id} className={!alert.active ? 'opacity-50' : ''}>
                      <TableCell>{priorityIcon(alert.priority)}</TableCell>
                      <TableCell>
                        <p className="font-medium text-xs">{alert.title}</p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{alert.message}</p>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{alert.dayOfMonth}</TableCell>
                      <TableCell className="text-xs">{rCfg?.label || alert.targetRole}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${alert.auto ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'}`}>
                          {alert.auto ? 'Auto' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={alert.active}
                          onChange={() => toggleActive(alert)}
                          className="rounded"
                          disabled={userRole !== 'ADMIN'}
                        />
                      </TableCell>
                      <TableCell>
                        {userRole === 'ADMIN' && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(alert)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600" onClick={() => setDeleteId(alert.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {userRole === 'ADMIN' && !showForm && (
            <Button variant="outline" size="sm" className="w-full gap-1" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Nueva Alerta
            </Button>
          )}

          {/* Create/Edit Form */}
          {showForm && (
            <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
              <h4 className="font-semibold text-sm">{editAlert ? 'Editar Alerta' : 'Nueva Alerta'}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo de Alerta</Label>
                  <Select value={form.alertType} onValueChange={v => setForm(f => ({ ...f, alertType: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {alertTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Prioridad</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ej: LV Próximas a Vencer" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Mensaje</Label>
                <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Descripción de la alerta" rows={2} className="text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Día del mes</Label>
                  <Input type="number" min={1} max={31} value={form.dayOfMonth} onChange={e => setForm(f => ({ ...f, dayOfMonth: parseInt(e.target.value) || 1 }))} className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Destinatario</Label>
                  <Select value={form.targetRole} onValueChange={v => setForm(f => ({ ...f, targetRole: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {targetRoleOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Modo</Label>
                  <Select value={form.auto ? 'auto' : 'manual'} onValueChange={v => setForm(f => ({ ...f, auto: v === 'auto' }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automática</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>

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
    </Dialog>
  )
}
