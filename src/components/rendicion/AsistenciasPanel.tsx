'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Clock,
  UserX,
  Plus,
  Pencil,
  Trash2,
  Bell,
  BellRing,
  Settings,
  AlertTriangle,
  Download,
  CalendarDays,
  Users,
  Save,
  FileText,
  ChevronLeft,
  X,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ModuleAlertBanner, { ModuleAlertItem } from './ModuleAlertBanner'
import AlertConfigDialog from './AlertConfigDialog'

// ============================================================
// Types
// ============================================================
interface Worker {
  id: string
  nombre: string
  rut: string
  cuentaBancaria: string
  active: boolean
}

interface AsistenciaRecord {
  id: string
  workerId: string
  worker: Worker
  date: string
  type: string
  minutesLate: number
  reason: string | null
  reportedBy: string | null
  createdAt: string
  updatedAt: string
}

// AlertConfig type is now ModuleAlertItem from the unified system

// ============================================================
// Status config
// ============================================================
const typeConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  AUSENCIA: { label: 'Inasistencia', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-l-red-500', icon: <UserX className="h-3.5 w-3.5" /> },
  ATRASO: { label: 'Atraso', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-l-amber-500', icon: <Clock className="h-3.5 w-3.5" /> },
}

// ============================================================
// Props
// ============================================================
interface AsistenciasPanelProps {
  userRole?: string
  userName?: string
}

// ============================================================
// Component
// ============================================================
export default function AsistenciasPanel({ userRole = 'USER', userName = '' }: AsistenciasPanelProps) {
  const { toast } = useToast()
  const isAdmin = userRole === 'ADMIN'
  const isSupervisor = userRole === 'SUPERVISOR'
  const canEdit = isAdmin || isSupervisor

  // --- State ---
  const [records, setRecords] = useState<AsistenciaRecord[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // --- Alert state (unified system) ---
  const [moduleAlerts, setModuleAlerts] = useState<ModuleAlertItem[]>([])
  const [alertConfigOpen, setAlertConfigOpen] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  // --- Dialog state ---
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AsistenciaRecord | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState({
    workerId: '',
    date: '',
    type: 'AUSENCIA',
    minutesLate: 0,
    reason: '',
  })

  // --- Filter state ---
  const [filterType, setFilterType] = useState<string>('all')
  const [filterWorker, setFilterWorker] = useState<string>('all')

  // ============================================================
  // Data fetching
  // ============================================================
  const fetchWorkers = async () => {
    try {
      const res = await fetch('/api/workers')
      if (res.ok) {
        const data = await res.json()
        setWorkers(data.filter((w: Worker) => w.active))
      }
    } catch (err) {
      console.error('Error fetching workers:', err)
    }
  }

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const [yearStr, monthStr] = selectedMonth.split('-')
      const params = new URLSearchParams({ month: monthStr, year: yearStr })
      const res = await fetch(`/api/asistencias?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRecords(data)
      }
    } catch (err) {
      console.error('Error fetching asistencias:', err)
      toast({ title: 'Error', description: 'No se pudieron cargar los registros', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchModuleAlerts = async () => {
    try {
      const res = await fetch('/api/module-alerts?module=asistencias')
      if (res.ok) {
        const data = await res.json()
        setModuleAlerts(data)
      }
    } catch (err) {
      console.error('Error fetching module alerts:', err)
    }
  }

  useEffect(() => {
    fetchWorkers()
    fetchModuleAlerts()
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [selectedMonth])

  // ============================================================
  // Alert logic
  // ============================================================
  const handleDismissAlert = (id: string) => {
    setDismissedAlerts(prev => new Set([...prev, id]))
  }

  const visibleAlerts = moduleAlerts.filter(a => !dismissedAlerts.has(a.id))

  // ============================================================
  // CRUD
  // ============================================================
  const openCreate = () => {
    setEditingRecord(null)
    setForm({
      workerId: '',
      date: new Date().toISOString().split('T')[0],
      type: 'AUSENCIA',
      minutesLate: 0,
      reason: '',
    })
    setDialogOpen(true)
  }

  const openEdit = (record: AsistenciaRecord) => {
    setEditingRecord(record)
    setForm({
      workerId: record.workerId,
      date: record.date.split('T')[0],
      type: record.type,
      minutesLate: record.minutesLate,
      reason: record.reason || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.workerId) {
      toast({ title: 'Error', description: 'Seleccione un trabajador', variant: 'destructive' })
      return
    }
    if (!form.date) {
      toast({ title: 'Error', description: 'Seleccione una fecha', variant: 'destructive' })
      return
    }
    if (form.type === 'ATRASO' && form.minutesLate <= 0) {
      toast({ title: 'Error', description: 'Ingrese los minutos de atraso', variant: 'destructive' })
      return
    }

    try {
      const payload = {
        ...form,
        reportedBy: userName || userRole,
        minutesLate: form.type === 'ATRASO' ? form.minutesLate : 0,
      }

      if (editingRecord) {
        const res = await fetch(`/api/asistencias/${editingRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          toast({ title: 'Registro actualizado', description: 'El registro de asistencia fue actualizado correctamente' })
        }
      } else {
        const res = await fetch('/api/asistencias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          toast({ title: 'Registro creado', description: 'El registro de asistencia fue creado correctamente' })
        }
      }
      setDialogOpen(false)
      fetchRecords()
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar el registro', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/asistencias/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Registro eliminado', description: 'El registro de asistencia fue eliminado' })
        fetchRecords()
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar el registro', variant: 'destructive' })
    }
    setDeleteConfirm(null)
  }

  // ============================================================
  // Export report
  // ============================================================
  const generateReport = () => {
    const [yearStr, monthStr] = selectedMonth.split('-')
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const monthName = monthNames[parseInt(monthStr) - 1]

    let html = `
    <html>
    <head>
      <title>Informe de Asistencias - ${monthName} ${yearStr}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #1e293b; }
        h1 { font-size: 22px; text-align: center; margin-bottom: 4px; color: #0f172a; }
        h2 { font-size: 16px; text-align: center; color: #64748b; margin-bottom: 20px; font-weight: 400; }
        .logo { text-align: center; margin-bottom: 16px; }
        .logo img { height: 60px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
        th { background: #0f172a; color: white; padding: 10px 12px; text-align: left; font-weight: 600; }
        td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #f8fafc; }
        .ausencia { background: #fef2f2; color: #991b1b; font-weight: 600; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
        .atraso { background: #fffbeb; color: #92400e; font-weight: 600; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
        .summary { margin-top: 24px; padding: 16px; background: #f1f5f9; border-radius: 8px; }
        .summary h3 { margin: 0 0 8px; font-size: 14px; color: #0f172a; }
        .summary-item { display: inline-block; margin-right: 24px; font-size: 13px; }
        .summary-number { font-size: 20px; font-weight: 700; }
        .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="logo"><img src="/logo-laguna-norte.jpg" alt="Laguna Norte" /></div>
      <h1>Informe de Asistencias</h1>
      <h2>Condominio Laguna Norte — ${monthName} ${yearStr}</h2>
      <table>
        <thead>
          <tr>
            <th>N°</th>
            <th>Trabajador</th>
            <th>RUT</th>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Min. Atraso</th>
            <th>Motivo</th>
            <th>Reportado por</th>
          </tr>
        </thead>
        <tbody>`

    const filtered = getFilteredRecords()
    filtered.forEach((r, i) => {
      const dateStr = new Date(r.date).toLocaleDateString('es-CL')
      const typeClass = r.type === 'AUSENCIA' ? 'ausencia' : 'atraso'
      const typeLabel = r.type === 'AUSENCIA' ? 'Inasistencia' : 'Atraso'
      html += `
          <tr>
            <td>${i + 1}</td>
            <td>${r.worker.nombre}</td>
            <td>${r.worker.rut}</td>
            <td>${dateStr}</td>
            <td><span class="${typeClass}">${typeLabel}</span></td>
            <td>${r.type === 'ATRASO' ? r.minutesLate + ' min' : '-'}</td>
            <td>${r.reason || '-'}</td>
            <td>${r.reportedBy || '-'}</td>
          </tr>`
    })

    const ausencias = filtered.filter(r => r.type === 'AUSENCIA')
    const atrasos = filtered.filter(r => r.type === 'ATRASO')
    const totalMinAtraso = atrasos.reduce((s, r) => s + r.minutesLate, 0)
    const uniqueWorkers = new Set(filtered.map(r => r.workerId))

    html += `
        </tbody>
      </table>
      <div class="summary">
        <h3>Resumen del Período</h3>
        <span class="summary-item"><span class="summary-number">${ausencias.length}</span> Inasistencias</span>
        <span class="summary-item"><span class="summary-number">${atrasos.length}</span> Atrasos</span>
        <span class="summary-item"><span class="summary-number">${totalMinAtraso}</span> Min. totales atraso</span>
        <span class="summary-item"><span class="summary-number">${uniqueWorkers.size}</span> Trabajadores afectados</span>
      </div>
      <div class="footer">Condominio Laguna Norte — Informe generado automáticamente — ${new Date().toLocaleDateString('es-CL')}</div>
    </body>
    </html>`

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.onload = () => printWindow.print()
    }
  }

  // ============================================================
  // Filters
  // ============================================================
  const getFilteredRecords = () => {
    return records.filter(r => {
      if (filterType !== 'all' && r.type !== filterType) return false
      if (filterWorker !== 'all' && r.workerId !== filterWorker) return false
      return true
    })
  }

  const filteredRecords = getFilteredRecords()

  // ============================================================
  // Stats
  // ============================================================
  const totalAusencias = records.filter(r => r.type === 'AUSENCIA').length
  const totalAtrasos = records.filter(r => r.type === 'ATRASO').length
  const totalMinAtraso = records.filter(r => r.type === 'ATRASO').reduce((s, r) => s + r.minutesLate, 0)
  const uniqueWorkersAffected = new Set(records.map(r => r.workerId)).size

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      {/* Alert Banner (unified system) */}
      <ModuleAlertBanner
        alerts={visibleAlerts}
        userRole={userRole}
        onConfigure={() => setAlertConfigOpen(true)}
        onDismiss={handleDismissAlert}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-rose-600" />
            Control de Asistencias
          </h2>
          <p className="text-sm text-slate-500 mt-1">Registro de inasistencias y atrasos de trabajadores</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Alert config button (always visible for admin) */}
          {isAdmin && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setAlertConfigOpen(true)}>
              <Bell className="h-3.5 w-3.5" /> Config. Alertas
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={generateReport}>
            <FileText className="h-3.5 w-3.5" /> Informe
          </Button>
          {canEdit && (
            <Button size="sm" className="gap-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Registrar
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalAusencias}</p>
                <p className="text-xs text-slate-500">Inasistencias</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalAtrasos}</p>
                <p className="text-xs text-slate-500">Atrasos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalMinAtraso}</p>
                <p className="text-xs text-slate-500">Min. atraso total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{uniqueWorkersAffected}</p>
                <p className="text-xs text-slate-500">Trab. afectados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Month Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-slate-500">Mes:</Label>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-[170px] h-8 text-sm"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="AUSENCIA">Inasistencias</SelectItem>
            <SelectItem value="ATRASO">Atrasos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterWorker} onValueChange={setFilterWorker}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Trabajador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los trabajadores</SelectItem>
            {workers.map(w => (
              <SelectItem key={w.id} value={w.id}>{w.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Records Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CalendarDays className="h-12 w-12 mb-3" />
              <p className="text-sm font-medium">No hay registros de asistencia</p>
              <p className="text-xs mt-1">Para el período seleccionado no se registraron inasistencias ni atrasos</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">N°</TableHead>
                  <TableHead>Trabajador</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Min. Atraso</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Reportado por</TableHead>
                  {canEdit && <TableHead className="w-[80px] text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record, idx) => {
                  const tc = typeConfig[record.type]
                  const dateStr = new Date(record.date).toLocaleDateString('es-CL')
                  return (
                    <TableRow key={record.id} className={tc?.bgColor}>
                      <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{record.worker.nombre}</TableCell>
                      <TableCell className="text-sm text-slate-600">{record.worker.rut}</TableCell>
                      <TableCell className="text-sm">{dateStr}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${tc?.color} ${tc?.bgColor} border-0 text-xs gap-1`}>
                          {tc?.icon} {tc?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.type === 'ATRASO' ? `${record.minutesLate} min` : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-[200px] truncate">
                        {record.reason || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{record.reportedBy || '-'}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(record)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => setDeleteConfirm(record.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingRecord ? (
                <><Pencil className="h-4 w-4" /> Editar Registro</>
              ) : (
                <><Plus className="h-4 w-4" /> Registrar Asistencia</>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingRecord ? 'Modifique los datos del registro' : 'Registre una inasistencia o atraso'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Trabajador</Label>
              <Select value={form.workerId} onValueChange={(v) => setForm(f => ({ ...f, workerId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un trabajador" />
                </SelectTrigger>
                <SelectContent>
                  {workers.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.nombre} — {w.rut}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v, minutesLate: v === 'AUSENCIA' ? 0 : f.minutesLate }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUSENCIA">Inasistencia</SelectItem>
                    <SelectItem value="ATRASO">Atraso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.type === 'ATRASO' && (
              <div>
                <Label>Minutos de atraso</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.minutesLate || ''}
                  onChange={(e) => setForm(f => ({ ...f, minutesLate: parseInt(e.target.value) || 0 }))}
                  placeholder="Ej: 15"
                />
              </div>
            )}
            <div>
              <Label>Motivo / Observación</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Ej: Sin aviso, transporte, etc."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white gap-1" onClick={handleSave}>
              <Save className="h-4 w-4" /> {editingRecord ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El registro de asistencia será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Config Dialog (unified system) */}
      <AlertConfigDialog
        open={alertConfigOpen}
        onOpenChange={setAlertConfigOpen}
        moduleName="asistencias"
        moduleLabel="Asistencias"
        userRole={userRole}
      />
    </div>
  )
}
