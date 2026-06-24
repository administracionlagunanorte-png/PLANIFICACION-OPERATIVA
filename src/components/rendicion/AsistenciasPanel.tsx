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
  Settings,
  Download,
  CalendarDays,
  Users,
  Save,
  FileText,
  X,
  Upload,
  RotateCcw,
  Paperclip,
  ShieldCheck,
  FileCheck,
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
  tipoJustificacion?: string | null
  justificacion?: string | null
  comprobanteUrl?: string | null
  comprobanteNombre?: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================
// Status config
// ============================================================
const typeConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  AUSENCIA: { label: 'Inasistencia', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-l-red-500', icon: <UserX className="h-3.5 w-3.5" /> },
  ATRASO: { label: 'Atraso', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-l-amber-500', icon: <Clock className="h-3.5 w-3.5" /> },
}

const justificacionTipos = [
  { value: 'PERMISO', label: 'Permiso' },
  { value: 'VACACIONES', label: 'Vacaciones' },
  { value: 'LICENCIA', label: 'Licencia Médica' },
  { value: 'OTRO', label: 'Otro' },
]

const justificacionLabels: Record<string, string> = {
  PERMISO: 'Permiso',
  VACACIONES: 'Vacaciones',
  LICENCIA: 'Licencia Médica',
  OTRO: 'Otro',
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
    tipoJustificacion: '' as string,
    justificacion: '',
  })

  // --- Justificación dialog state ---
  const [justificacionDialogOpen, setJustificacionDialogOpen] = useState(false)
  const [justificacionRecord, setJustificacionRecord] = useState<AsistenciaRecord | null>(null)
  const [justificacionForm, setJustificacionForm] = useState({
    tipoJustificacion: '' as string,
    justificacion: '',
  })
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null)
  const [uploadingComprobante, setUploadingComprobante] = useState(false)
  const [savingJustificacion, setSavingJustificacion] = useState(false)
  const comprobanteInputRef = useRef<HTMLInputElement>(null)

  // --- Filter state ---
  const [filterType, setFilterType] = useState<string>('all')
  const [filterWorker, setFilterWorker] = useState<string>('all')

  // --- Report state ---
  const [reportHtml, setReportHtml] = useState<string>('')
  const [reportOpen, setReportOpen] = useState(false)

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
      tipoJustificacion: '',
      justificacion: '',
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
      tipoJustificacion: record.tipoJustificacion || '',
      justificacion: record.justificacion || '',
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
        tipoJustificacion: form.tipoJustificacion || null,
        justificacion: form.justificacion || null,
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
  // Justificación dialog
  // ============================================================
  const openJustificacion = (record: AsistenciaRecord) => {
    setJustificacionRecord(record)
    setJustificacionForm({
      tipoJustificacion: record.tipoJustificacion || '',
      justificacion: record.justificacion || '',
    })
    setComprobanteFile(null)
    setJustificacionDialogOpen(true)
  }

  const handleSaveJustificacion = async () => {
    if (!justificacionRecord) return
    if (!justificacionForm.tipoJustificacion) {
      toast({ title: 'Error', description: 'Seleccione el tipo de justificación', variant: 'destructive' })
      return
    }

    setSavingJustificacion(true)
    try {
      let comprobanteUrl = justificacionRecord.comprobanteUrl || null
      let comprobanteNombre = justificacionRecord.comprobanteNombre || null

      // Upload comprobante file if selected
      if (comprobanteFile) {
        setUploadingComprobante(true)
        const formData = new FormData()
        formData.append('file', comprobanteFile)

        const uploadRes = await fetch('/api/asistencias/upload-comprobante', {
          method: 'POST',
          body: formData,
        })

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          comprobanteUrl = uploadData.url
          comprobanteNombre = uploadData.nombre
        } else {
          toast({ title: 'Error', description: 'No se pudo subir el comprobante', variant: 'destructive' })
          setUploadingComprobante(false)
          setSavingJustificacion(false)
          return
        }
        setUploadingComprobante(false)
      }

      // Update the record with justificación
      const res = await fetch(`/api/asistencias/${justificacionRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoJustificacion: justificacionForm.tipoJustificacion,
          justificacion: justificacionForm.justificacion,
          comprobanteUrl,
          comprobanteNombre,
        }),
      })

      if (res.ok) {
        toast({
          title: 'Justificación guardada',
          description: `Se justificó el registro como ${justificacionLabels[justificacionForm.tipoJustificacion] || justificacionForm.tipoJustificacion}`,
        })
        setJustificacionDialogOpen(false)
        fetchRecords()
      } else {
        toast({ title: 'Error', description: 'No se pudo guardar la justificación', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la justificación', variant: 'destructive' })
    } finally {
      setSavingJustificacion(false)
    }
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

        // Build detailed description with diagnostics
        let desc = `${parts.join(', ')} creado(s), ${summary.workersCreated} trabajador(es) nuevo(s), ${summary.skipped} existente(s) omitido(s).`
        desc += ` Total filas: ${summary.totalRecords}, Atrasos encontrados: ${summary.atrasosFound}, Ausencias encontradas: ${summary.ausenciasFound}.`

        // Add diagnostics info
        if (summary.diagnostics) {
          const d = summary.diagnostics
          desc += ` Modo fecha: ${d.dateMode}.`
          if (d.parsingNotes && d.parsingNotes.length > 0) {
            desc += ` Notas: ${d.parsingNotes.filter((n: string) => !n.startsWith('Total') && !n.startsWith('Filas parseadas')).join('; ')}.`
          }
          const mapping = Object.entries(d.columnMapping || summary.columnMapping || {})
            .map(([k, v]) => `${k}→${v}`)
            .join(', ')
          desc += ` Mapeo: ${mapping}.`
        }

        const hasNoResults = summary.totalRecords > 0 && summary.atrasosFound === 0 && summary.ausenciasFound === 0

        toast({
          title: hasNoResults ? '⚠️ Importación sin resultados' : '✅ Importación completada',
          description: desc,
          duration: 30000,
          variant: hasNoResults ? 'destructive' : 'default',
        })

        // Auto-select the month based on imported data range
        if (summary.dataRange?.suggestedMonth) {
          setSelectedMonth(summary.dataRange.suggestedMonth)
        }

        fetchRecords()
        fetchWorkers()
      } else {
        const error = await res.json()
        let errDesc = error.error || 'No se pudo procesar el archivo'
        if (error.diagnostics) {
          errDesc += ` | Columnas: ${error.diagnostics.columnsFound?.join(', ') || 'ninguna'}`
          if (error.diagnostics.parsingNotes?.length > 0) {
            errDesc += ` | Notas: ${error.diagnostics.parsingNotes.join('; ')}`
          }
        }
        toast({
          title: 'Error de importación',
          description: errDesc,
          variant: 'destructive',
          duration: 30000,
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
  // Export report — Resumen por persona (narrativo + tabla detalle)
  // ============================================================
  const generateReport = () => {
    const [yearStr, monthStr] = selectedMonth.split('-')
    const monthNamesReport = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const monthName = monthNamesReport[parseInt(monthStr) - 1]

    const filtered = getFilteredRecords()

    // Group records by worker
    const workerMap = new Map<string, { worker: { nombre: string; rut: string; cargo?: string; horaEntrada?: string }; records: typeof filtered }>()
    filtered.forEach(r => {
      if (!workerMap.has(r.workerId)) {
        workerMap.set(r.workerId, { worker: r.worker as any, records: [] })
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

    const formatMinutes = (mins: number): string => {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      if (h > 0) return `${h} hr${h !== 1 ? 's' : ''}${m > 0 ? ' ' + m + ' min' : ''}`
      return `${m} min`
    }

    const escJustificacionTipo = (tipo: string | null | undefined): string => {
      if (!tipo) return ''
      return justificacionLabels[tipo] || tipo
    }

    let html = `<html lang="es"><head><meta charset="UTF-8"><title>Informe de Atrasos e Inasistencias - ${monthName} ${yearStr}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; margin: 30px 40px; color: #1e293b; background: #fff; line-height: 1.5; }
h1 { font-size: 20px; text-align: center; margin-bottom: 2px; color: #0f172a; letter-spacing: 0.5px; }
h2 { font-size: 14px; text-align: center; color: #64748b; margin-bottom: 28px; font-weight: 400; }

/* --- Resumen general al inicio --- */
.resumen-general { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 20px; margin-bottom: 30px; }
.resumen-general h3 { font-size: 13px; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.resumen-general .stat-line { font-size: 13px; color: #334155; margin-bottom: 3px; }
.resumen-general .stat-num { font-weight: 700; color: #0f172a; }

/* --- Sección por persona --- */
.persona { margin-bottom: 22px; page-break-inside: avoid; border-left: 4px solid #0f172a; padding-left: 14px; }
.persona-header { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
.persona-header .rut-inline { font-weight: 400; font-size: 12px; color: #64748b; margin-left: 8px; }
.persona-header .cargo-inline { font-weight: 400; font-size: 12px; color: #64748b; margin-left: 4px; }
.persona-header .horario-inline { font-weight: 400; font-size: 11px; color: #94a3b8; margin-left: 8px; }

/* --- Línea narrativa --- */
.persona-resumen { font-size: 13px; color: #334155; margin-bottom: 6px; line-height: 1.7; }
.persona-resumen .cant { font-weight: 700; color: #0f172a; }
.persona-resumen .tipo-atraso { color: #b45309; font-weight: 600; }
.persona-resumen .tipo-ausencia { color: #dc2626; font-weight: 600; }
.fecha-lista { font-weight: 400; color: #475569; }

/* --- Tabla detalle --- */
.detalle-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; margin-bottom: 4px; }
.detalle-table th { background: #475569; color: white; padding: 5px 8px; text-align: left; font-size: 10px; font-weight: 600; }
.detalle-table td { padding: 4px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
.detalle-table tr:nth-child(even) { background: #f8fafc; }

/* --- Justificación badges --- */
.just-badge { display: inline-block; padding: 1px 7px; border-radius: 8px; font-size: 9px; font-weight: 600; margin-right: 3px; }
.just-badge.vacaciones { background: #dcfce7; color: #166534; }
.just-badge.permiso { background: #fef3c7; color: #92400e; }
.just-badge.licencia { background: #ede9fe; color: #5b21b6; }
.just-badge.otro { background: #f1f5f9; color: #475569; }
.just-detalle { font-size: 10px; color: #64748b; }
.comp-link { color: #2563eb; text-decoration: underline; font-size: 10px; }

/* --- Subtotal por persona --- */
.persona-subtotal { font-size: 11px; color: #64748b; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1; }

/* --- Sin datos --- */
.no-data-message { text-align: center; padding: 40px 20px; color: #64748b; font-size: 16px; }
.no-data-message p { margin-top: 8px; font-size: 13px; color: #94a3b8; }

.footer { margin-top: 36px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }

@media print {
  body { margin: 15px 20px; }
  .persona { page-break-inside: avoid; }
}
</style></head><body>
<h1>INFORME DE ATRASOS E INASISTENCIAS</h1>
<h2>Condominio Laguna Norte &mdash; ${monthName} ${yearStr}</h2>`

    // --- Resumen general ---
    html += `<div class="resumen-general">
<h3>Resumen del Per&iacute;odo ${monthName} ${yearStr}</h3>
<div class="stat-line">&bull; Trabajadores con registros: <span class="stat-num">${uniqueWorkers.size}</span></div>
<div class="stat-line">&bull; Total atrasos: <span class="stat-num">${atrasos.length}</span> &mdash; Total inasistencias: <span class="stat-num">${ausencias.length}</span></div>
<div class="stat-line">&bull; Tiempo total de retraso acumulado: <span class="stat-num">${formatMinutes(totalMinAtraso)}</span></div>
</div>`

    if (filtered.length === 0) {
      html += `<div class="no-data-message"><strong>No se encontraron registros de atrasos ni inasistencias</strong><p>Período: ${monthName} ${yearStr} — No hay datos para el mes seleccionado. Verifique que se haya importado el archivo de asistencia correctamente.</p></div>`
    }

    // --- Detalle por persona ---
    sortedWorkers.forEach(([, data], workerIdx) => {
      const workerAtrasos = data.records.filter(r => r.type === 'ATRASO').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const workerAusencias = data.records.filter(r => r.type === 'AUSENCIA').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const workerCargo = data.worker.cargo || ''
      const workerHorario = data.worker.horaEntrada || ''
      const workerTotalMin = workerAtrasos.reduce((s, r) => s + r.minutesLate, 0)
      const workerJustificados = data.records.filter(r => r.tipoJustificacion).length

      // --- Header de persona ---
      html += `<div class="persona">`
      html += `<div class="persona-header">${workerIdx + 1}. ${data.worker.nombre}<span class="rut-inline">RUT: ${data.worker.rut}</span>${workerCargo ? `<span class="cargo-inline">&mdash; ${workerCargo}</span>` : ''}${workerHorario ? `<span class="horario-inline">Entrada: ${workerHorario}</span>` : ''}</div>`

      // --- Línea narrativa resumen ---
      html += `<div class="persona-resumen">`
      if (workerAtrasos.length > 0) {
        html += `<span class="tipo-atraso">Atrasos:</span> <span class="cant">${workerAtrasos.length}</span> &mdash; los d&iacute;as `
        const atrasoFechas = workerAtrasos.map(r => {
          const dateStr = new Date(r.date).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
          const mins = r.minutesLate > 0 ? ` (${formatMinutes(r.minutesLate)})` : ''
          const just = r.tipoJustificacion ? ` [${escJustificacionTipo(r.tipoJustificacion)}${r.justificacion ? ': ' + r.justificacion : ''}]` : ''
          return `<span class="fecha-lista">${dateStr}${mins}${just}</span>`
        })
        html += atrasoFechas.join('; ')
        html += `. Total retraso: <span class="cant">${formatMinutes(workerTotalMin)}</span>.`
      } else {
        html += `<span class="tipo-atraso">Atrasos:</span> <span class="cant">0</span>.`
      }

      html += `<br/>`

      if (workerAusencias.length > 0) {
        html += `<span class="tipo-ausencia">Ausencias:</span> <span class="cant">${workerAusencias.length}</span> &mdash; los d&iacute;as `
        const ausenciaFechas = workerAusencias.map(r => {
          const dateStr = new Date(r.date).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
          const just = r.tipoJustificacion ? ` [${escJustificacionTipo(r.tipoJustificacion)}${r.justificacion ? ': ' + r.justificacion : ''}]` : ''
          return `<span class="fecha-lista">${dateStr}${just}</span>`
        })
        html += ausenciaFechas.join('; ')
        html += `.`
      } else {
        html += `<span class="tipo-ausencia">Ausencias:</span> <span class="cant">0</span>.`
      }
      html += `</div>`

      // --- Tabla detalle con justificación y comprobante ---
      const hasAnyJust = data.records.some(r => r.tipoJustificacion)
      const hasAnyComp = data.records.some(r => r.comprobanteUrl)
      if (workerAtrasos.length > 0 || workerAusencias.length > 0) {
        html += `<table class="detalle-table"><thead><tr><th>Tipo</th><th>Fecha</th><th>Retraso</th>${hasAnyJust ? '<th>Justificaci&oacute;n</th>' : ''}${hasAnyComp ? '<th>Comprobante</th>' : ''}</tr></thead><tbody>`

        workerAtrasos.forEach(r => {
          const dateStr = new Date(r.date).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
          html += `<tr><td style="color:#b45309;font-weight:600;">Atraso</td><td>${dateStr}</td><td>${r.minutesLate > 0 ? formatMinutes(r.minutesLate) : '-'}</td>`
          if (hasAnyJust) {
            html += `<td>${r.tipoJustificacion ? `<span class="just-badge ${(r.tipoJustificacion).toLowerCase()}">${escJustificacionTipo(r.tipoJustificacion)}</span>${r.justificacion ? `<span class="just-detalle"> ${r.justificacion}</span>` : ''}` : '-'}</td>`
          }
          if (hasAnyComp) {
            html += `<td>${r.comprobanteUrl ? `<a class="comp-link" href="${r.comprobanteUrl}" target="_blank">${r.comprobanteNombre || 'Ver'}</a>` : '-'}</td>`
          }
          html += `</tr>`
        })

        workerAusencias.forEach(r => {
          const dateStr = new Date(r.date).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
          html += `<tr><td style="color:#dc2626;font-weight:600;">Ausencia</td><td>${dateStr}</td><td>-</td>`
          if (hasAnyJust) {
            html += `<td>${r.tipoJustificacion ? `<span class="just-badge ${(r.tipoJustificacion).toLowerCase()}">${escJustificacionTipo(r.tipoJustificacion)}</span>${r.justificacion ? `<span class="just-detalle"> ${r.justificacion}</span>` : ''}` : '-'}</td>`
          }
          if (hasAnyComp) {
            html += `<td>${r.comprobanteUrl ? `<a class="comp-link" href="${r.comprobanteUrl}" target="_blank">${r.comprobanteNombre || 'Ver'}</a>` : '-'}</td>`
          }
          html += `</tr>`
        })

        html += `</tbody></table>`
      }

      // --- Subtotal ---
      html += `<div class="persona-subtotal">${workerAtrasos.length} atraso${workerAtrasos.length !== 1 ? 's' : ''}${workerAusencias.length > 0 ? ', ' + workerAusencias.length + ' ausencia' + (workerAusencias.length !== 1 ? 's' : '') : ''}${workerTotalMin > 0 ? ' &mdash; Retraso acumulado: ' + formatMinutes(workerTotalMin) : ''}${workerJustificados > 0 ? ' &mdash; ' + workerJustificados + ' justificado' + (workerJustificados !== 1 ? 's' : '') : ''}</div>`

      html += `</div>` // close .persona
    })

    html += `<div class="footer">Condominio Laguna Norte &mdash; Informe generado autom&aacute;ticamente &mdash; ${new Date().toLocaleDateString('es-CL')}</div></body></html>`

    // Store HTML and open report dialog
    setReportHtml(html)
    setReportOpen(true)
  }

  // Print the report from the dialog
  const handlePrintReport = () => {
    const iframe = document.getElementById('report-iframe') as HTMLIFrameElement
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
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
  const totalJustificados = records.filter(r => r.tipoJustificacion).length

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
        <div className="flex items-center gap-2 flex-wrap">
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalJustificados}</p>
                <p className="text-xs text-slate-500">Justificados</p>
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
                  <TableHead>Justificación</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead className="w-[80px] text-right">Acciones</TableHead>
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
                      <TableCell className="text-sm max-w-[180px]">
                        {record.tipoJustificacion ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant="outline" className={
                              record.tipoJustificacion === 'VACACIONES' ? 'bg-green-50 text-green-700 border-green-200 text-xs' :
                              record.tipoJustificacion === 'PERMISO' ? 'bg-amber-50 text-amber-700 border-amber-200 text-xs' :
                              record.tipoJustificacion === 'LICENCIA' ? 'bg-purple-50 text-purple-700 border-purple-200 text-xs' :
                              'bg-slate-50 text-slate-700 border-slate-200 text-xs'
                            }>
                              {justificacionLabels[record.tipoJustificacion] || record.tipoJustificacion}
                            </Badge>
                            {record.justificacion && (
                              <span className="text-xs text-slate-500 truncate max-w-[120px]" title={record.justificacion}>
                                {record.justificacion}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sin justificar</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.comprobanteUrl ? (
                          <a href={record.comprobanteUrl} target="_blank" className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1">
                            <Paperclip className="h-3 w-3" /> {record.comprobanteNombre || 'Ver'}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Justificar" onClick={() => openJustificacion(record)}>
                              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(record)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => setDeleteConfirm(record.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
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

      {/* Justificación Dialog */}
      <Dialog open={justificacionDialogOpen} onOpenChange={setJustificacionDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" /> Justificar Registro
            </DialogTitle>
            <DialogDescription>
              {justificacionRecord && (
                <>Atraso/Inasistencia de <strong>{justificacionRecord.worker?.nombre}</strong> del {new Date(justificacionRecord.date).toLocaleDateString('es-CL')}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Justificación *</Label>
              <Select value={justificacionForm.tipoJustificacion} onValueChange={(v) => setJustificacionForm(f => ({ ...f, tipoJustificacion: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione tipo de justificación" />
                </SelectTrigger>
                <SelectContent>
                  {justificacionTipos.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Detalle de la Justificación</Label>
              <Textarea
                value={justificacionForm.justificacion}
                onChange={(e) => setJustificacionForm(f => ({ ...f, justificacion: e.target.value }))}
                placeholder="Ej: Permiso médico, vacaciones del 01 al 15..."
                rows={3}
              />
            </div>
            <div>
              <Label>Comprobante Adjunto</Label>
              <div className="flex items-center gap-3 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => comprobanteInputRef.current?.click()}
                >
                  <Paperclip className="h-3.5 w-3.5" /> Adjuntar archivo
                </Button>
                <input
                  ref={comprobanteInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                  onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {comprobanteFile && (
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <FileCheck className="h-3 w-3 text-green-600" /> {comprobanteFile.name}
                  </span>
                )}
                {!comprobanteFile && justificacionRecord?.comprobanteUrl && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    <a href={justificacionRecord.comprobanteUrl} target="_blank">{justificacionRecord.comprobanteNombre || 'Ver actual'}</a>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, GIF, WebP o PDF. Máximo 10MB.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJustificacionDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-1" onClick={handleSaveJustificacion} disabled={savingJustificacion || uploadingComprobante}>
              {savingJustificacion ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Guardando...</>
              ) : (
                <><Save className="h-4 w-4" /> Guardar Justificación</>
              )}
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

      {/* Report Dialog — shows report in-page with print button */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-4 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>Informe de Atrasos e Inasistencias</DialogTitle>
              <div className="flex gap-2">
                <Button size="sm" onClick={handlePrintReport} className="gap-1">
                  <Download className="h-3.5 w-3.5" /> Imprimir
                </Button>
                <Button size="sm" variant="outline" onClick={() => setReportOpen(false)}>
                  <X className="h-3.5 w-3.5" /> Cerrar
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-2 pb-2">
            <iframe
              id="report-iframe"
              srcDoc={reportHtml}
              className="w-full h-[75vh] border-0 rounded"
              title="Informe"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
