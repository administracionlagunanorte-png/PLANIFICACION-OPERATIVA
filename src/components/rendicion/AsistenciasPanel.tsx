'use client'

import { useState, useEffect, useRef } from 'react'
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
  Upload,
  RotateCcw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ModuleAlertBanner, { ModuleAlertItem } from './ModuleAlertBanner'
import AlertConfigDialog from './AlertConfigDialog'
import SendToReviewDialog from './SendToReviewDialog'

// ============================================================
// Types
// ============================================================
interface Worker {
  id: string
  nombre: string
  rut: string
  cuentaBancaria: string
  active: boolean
  cargo?: string | null
  turnoA?: string | null
  turnoB?: string | null
  horaEntrada?: string | null
  horaSalida?: string | null
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
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)

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

  // --- Import state ---
  const [importing, setImporting] = useState(false)
  const [importingNomina, setImportingNomina] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nominaInputRef = useRef<HTMLInputElement>(null)

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
  // Import XLS
  // ============================================================
  const handleImportXls = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validExtensions = ['.xls', '.xlsx', '.csv']
    const fileName = file.name.toLowerCase()
    if (!validExtensions.some(ext => fileName.endsWith(ext))) {
      toast({ title: 'Error', description: 'Seleccione un archivo .xls, .xlsx o .csv', variant: 'destructive' })
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/asistencias/import', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const summary = await res.json()
        const parts = []
        if (summary.atrasosCreated > 0) parts.push(`${summary.atrasosCreated} atraso(s)`)
        if (summary.ausenciasCreated > 0) parts.push(`${summary.ausenciasCreated} inasistencia(s)`)
        if (parts.length === 0) parts.push('0 registros nuevos')
        const desc = `${parts.join(', ')} creado(s), ${summary.workersCreated} trabajador(es) nuevo(s), ${summary.skipped} existente(s) omitido(s)`
        toast({
          title: 'Importación completada',
          description: desc,
        })
        fetchRecords()
        fetchWorkers()
      } else {
        const error = await res.json()
        toast({
          title: 'Error de importación',
          description: error.error || 'No se pudo procesar el archivo',
          variant: 'destructive',
        })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo importar el archivo', variant: 'destructive' })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ============================================================
  // Import NOMINA (worker schedules)
  // ============================================================
  const handleImportNomina = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validExtensions = ['.xls', '.xlsx', '.csv']
    const fileName = file.name.toLowerCase()
    if (!validExtensions.some(ext => fileName.endsWith(ext))) {
      toast({ title: 'Error', description: 'Seleccione un archivo .xls, .xlsx o .csv', variant: 'destructive' })
      return
    }

    setImportingNomina(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/workers/import-nomina', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const result = await res.json()
        toast({
          title: 'Nómina importada',
          description: `${result.workersCreated} trabajador(es) creado(s), ${result.workersUpdated} actualizado(s)`,
        })
        fetchWorkers()
      } else {
        const error = await res.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo procesar la nómina',
          variant: 'destructive',
        })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo importar la nómina', variant: 'destructive' })
    } finally {
      setImportingNomina(false)
      if (nominaInputRef.current) nominaInputRef.current.value = ''
    }
  }

  // ============================================================
  // Clear all records for current month
  // ============================================================
  const handleClearRecords = async () => {
    setClearing(true)
    try {
      const [yearStr, monthStr] = selectedMonth.split('-')
      const res = await fetch(`/api/asistencias?month=${monthStr}&year=${yearStr}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const data = await res.json()
        toast({
          title: 'Registros eliminados',
          description: `Se eliminaron ${data.deleted} registro(s) del mes seleccionado`,
        })
        fetchRecords()
      } else {
        const error = await res.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudieron eliminar los registros',
          variant: 'destructive',
        })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron eliminar los registros', variant: 'destructive' })
    } finally {
      setClearing(false)
      setClearConfirmOpen(false)
    }
  }

  // ============================================================
  // Export report
  // ============================================================
  const generateReport = () => {
    const [yearStr, monthStr] = selectedMonth.split('-')
    const monthNamesReport = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const monthName = monthNamesReport[parseInt(monthStr) - 1]

    const filtered = getFilteredRecords()

    if (filtered.length === 0) {
      toast({
        title: 'Sin datos',
        description: `No hay registros para ${monthName} ${yearStr}. Registros totales: ${records.length}, Filtro tipo: ${filterType}, Filtro trabajador: ${filterWorker}`,
        variant: 'destructive',
      })
      return
    }

    // Group records by worker
    const workerMap = new Map<string, { worker: { nombre: string; rut: string }; records: typeof filtered }>()
    filtered.forEach(r => {
      if (!workerMap.has(r.workerId)) {
        workerMap.set(r.workerId, { worker: r.worker, records: [] })
      }
      workerMap.get(r.workerId)!.records.push(r)
    })

    // Sort workers alphabetically by name
    const sortedWorkers = Array.from(workerMap.entries()).sort((a, b) =>
      a[1].worker.nombre.localeCompare(b[1].worker.nombre)
    )

    // Calculate totals
    const atrasos = filtered.filter(r => r.type === 'ATRASO')
    const ausencias = filtered.filter(r => r.type === 'AUSENCIA')
    const totalMinAtraso = atrasos.reduce((s, r) => s + r.minutesLate, 0)
    const uniqueWorkers = new Set(filtered.map(r => r.workerId))

    // Helper: format minutes to hours+minutes
    const formatMinutes = (mins: number): string => {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      if (h > 0) {
        return `${h} hr${h !== 1 ? 's' : ''}${m > 0 ? ' ' + m + ' min' : ''}`
      }
      return `${m} min`
    }

    let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Informe de Atrasos e Inasistencias - ${monthName} ${yearStr}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; margin: 20px; color: #1e293b; background: #fff; }
    h1 { font-size: 22px; text-align: center; margin-bottom: 4px; color: #0f172a; }
    h2 { font-size: 16px; text-align: center; color: #64748b; margin-bottom: 24px; font-weight: 400; }
    .worker-section { margin-bottom: 28px; page-break-inside: avoid; }
    .worker-header { background: #0f172a; color: white; padding: 10px 16px; font-size: 14px; font-weight: 700; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center; }
    .worker-header .rut { font-weight: 400; font-size: 12px; opacity: 0.85; }
    .worker-header .cargo { display: block; font-weight: 400; font-size: 11px; opacity: 0.7; margin-top: 2px; }
    .worker-header .horario { font-weight: 400; font-size: 11px; opacity: 0.8; margin-right: 12px; background: rgba(255,255,255,0.15); padding: 2px 6px; border-radius: 3px; }
    .sub-header { background: #334155; color: #e2e8f0; padding: 6px 16px; font-size: 12px; font-weight: 600; }
    .sub-header.atraso-header { border-left: 4px solid #f59e0b; }
    .sub-header.ausencia-header { border-left: 4px solid #ef4444; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #475569; color: white; padding: 8px 12px; text-align: left; font-weight: 600; font-size: 11px; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    .atraso { background: #fffbeb; color: #92400e; font-weight: 600; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .ausencia { background: #fef2f2; color: #991b1b; font-weight: 600; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .worker-total { background: #f1f5f9; font-weight: 600; font-size: 12px; color: #0f172a; padding: 8px 16px; display: flex; justify-content: space-between; border-radius: 0 0 6px 6px; border-top: 2px solid #cbd5e1; }
    .summary { margin-top: 32px; padding: 16px; background: #f1f5f9; border-radius: 8px; }
    .summary h3 { margin: 0 0 8px; font-size: 14px; color: #0f172a; }
    .summary-item { display: inline-block; margin-right: 24px; font-size: 13px; }
    .summary-number { font-size: 20px; font-weight: 700; }
    .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; }
    .date-cell { min-width: 100px; }
    .time-cell { min-width: 80px; }
    .no-records { text-align: center; padding: 12px; color: #94a3b8; font-size: 12px; font-style: italic; }
    .empty-section { padding: 8px 16px; color: #94a3b8; font-size: 11px; font-style: italic; background: #f8fafc; }
    @media print { body { margin: 0; } .worker-section { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>Informe de Atrasos e Inasistencias</h1>
  <h2>Condominio Laguna Norte &mdash; ${monthName} ${yearStr}</h2>`

    sortedWorkers.forEach(([, data]) => {
      // Separate atrasos and ausencias, sort each by date ascending
      const workerAtrasos = data.records
        .filter(r => r.type === 'ATRASO')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const workerAusencias = data.records
        .filter(r => r.type === 'AUSENCIA')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const workerCargo = (data.worker as any).cargo || ''
      const workerHorario = (data.worker as any).horaEntrada || ''
      const workerTotalMin = workerAtrasos.reduce((s, r) => s + r.minutesLate, 0)

      html += `
  <div class="worker-section">
    <div class="worker-header">
      <div>
        <span>${data.worker.nombre}</span>
        ${workerCargo ? `<span class="cargo">${workerCargo}</span>` : ''}
      </div>
      <div>
        ${workerHorario ? `<span class="horario">Entrada: ${workerHorario}</span>` : ''}
        <span class="rut">${data.worker.rut}</span>
      </div>
    </div>`

      // --- ATRASOS section ---
      html += `
    <div class="sub-header atraso-header">Atrasos (${workerAtrasos.length})</div>`

      if (workerAtrasos.length > 0) {
        html += `
    <table>
      <thead>
        <tr>
          <th>N&deg;</th>
          <th>Fecha</th>
          <th>Tiempo de Retraso</th>
        </tr>
      </thead>
      <tbody>`

        workerAtrasos.forEach((r, idx) => {
          const dateStr = new Date(r.date).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
          const timeDisplay = r.minutesLate > 0 ? formatMinutes(r.minutesLate) : '-'

          html += `
        <tr>
          <td>${idx + 1}</td>
          <td class="date-cell">${dateStr}</td>
          <td class="time-cell">${timeDisplay}</td>
        </tr>`
        })

        html += `
      </tbody>
    </table>`
      } else {
        html += `
    <div class="empty-section">Sin atrasos registrados</div>`
      }

      // --- AUSENCIAS section ---
      html += `
    <div class="sub-header ausencia-header">Inasistencias (${workerAusencias.length})</div>`

      if (workerAusencias.length > 0) {
        html += `
    <table>
      <thead>
        <tr>
          <th>N&deg;</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>`

        workerAusencias.forEach((r, idx) => {
          const dateStr = new Date(r.date).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

          html += `
        <tr>
          <td>${idx + 1}</td>
          <td class="date-cell">${dateStr}</td>
        </tr>`
        })

        html += `
      </tbody>
    </table>`
      } else {
        html += `
    <div class="empty-section">Sin inasistencias registradas</div>`
      }

      // Worker subtotal
      const totalStr = formatMinutes(workerTotalMin)
      html += `
    <div class="worker-total">
      <span>${workerAtrasos.length} atraso${workerAtrasos.length !== 1 ? 's' : ''}${workerAusencias.length > 0 ? ', ' + workerAusencias.length + ' inasistencia' + (workerAusencias.length !== 1 ? 's' : '') : ''}</span>
      <span>Total retraso: ${totalStr}</span>
    </div>
  </div>`
    })

    const totalStr = formatMinutes(totalMinAtraso)

    html += `
  <div class="summary">
    <h3>Resumen del Per&iacute;odo</h3>
    <span class="summary-item"><span class="summary-number">${uniqueWorkers.size}</span> Trabajadores</span>
    <span class="summary-item"><span class="summary-number">${atrasos.length}</span> Atrasos</span>
    <span class="summary-item"><span class="summary-number">${ausencias.length}</span> Inasistencias</span>
    <span class="summary-item"><span class="summary-number">${totalStr}</span> Total retraso</span>
  </div>
  <div class="footer">Condominio Laguna Norte &mdash; Informe generado autom&aacute;ticamente &mdash; ${new Date().toLocaleDateString('es-CL')}</div>
</body>
</html>`

    // Open report in new tab using Blob URL (reliable, avoids popup blockers)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    const newWindow = window.open(blobUrl, '_blank')
    if (newWindow) {
      // Auto-print once loaded
      const checkLoaded = setInterval(() => {
        try {
          if (newWindow.document && newWindow.document.readyState === 'complete') {
            clearInterval(checkLoaded)
            setTimeout(() => newWindow.print(), 300)
          }
        } catch {
          // Cross-origin restriction — just let user print manually
          clearInterval(checkLoaded)
        }
      }, 200)
      // Clean up after 60 seconds
      setTimeout(() => {
        clearInterval(checkLoaded)
        URL.revokeObjectURL(blobUrl)
      }, 60000)
    } else {
      // Ultimate fallback: download as HTML file
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `Informe_Atrasos_${monthName}_${yearStr}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
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
          {(isSupervisor || isAdmin) && (
            <Button variant="outline" size="sm" className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => setReviewDialogOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> Enviar a Revisión
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-emerald-600" /> Importando...</>
            ) : (
              <><Upload className="h-3.5 w-3.5" /> Importar Asistencia</>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={handleImportXls}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
            onClick={() => nominaInputRef.current?.click()}
            disabled={importingNomina}
          >
            {importingNomina ? (
              <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600" /> Importando...</>
            ) : (
              <><Users className="h-3.5 w-3.5" /> Importar Nómina</>
            )}
          </Button>
          <input
            ref={nominaInputRef}
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={handleImportNomina}
            className="hidden"
          />
          <Button variant="outline" size="sm" className="gap-1" onClick={generateReport}>
            <FileText className="h-3.5 w-3.5" /> Informe
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setClearConfirmOpen(true)}
              disabled={clearing || records.length === 0}
            >
              {clearing ? (
                <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-red-600" /> Limpiando...</>
              ) : (
                <><RotateCcw className="h-3.5 w-3.5" /> Limpiar</>
              )}
            </Button>
          )}
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

      {/* Clear All Records Confirm */}
      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Limpiar todos los registros del mes?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará <strong>todos los registros de atrasos e inasistencias</strong> del mes seleccionado. Esto le permitirá importar un archivo nuevo y generar un informe limpio. Esta acción <strong>no se puede deshacer</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleClearRecords} disabled={clearing}>
              {clearing ? 'Limpiando...' : 'Sí, limpiar todo'}
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
      <SendToReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        module="asistencias"
        moduleLabel="Asistencias"
        itemId="asistencias-informe"
        itemTitle="Informe de Asistencias"
        submittedBy={userName || userRole}
      />
    </div>
  )
}
