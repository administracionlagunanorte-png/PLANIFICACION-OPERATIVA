'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Wrench, Plus, ChevronLeft, CheckCircle, XCircle, Clock,
  Printer, Upload, Calendar, ChevronRight, ChevronDown,
  RefreshCw, Play, Map, List, FileText, Trash2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ============================================================
// Types
// ============================================================
interface MantenimientoItem {
  id?: string
  category: string
  description: string
  status: string  // PENDIENTE, OK, NO_OK, N/A
  value?: string | null
  observation?: string | null
  order: number
}

interface MantenimientoLV {
  id: string
  codigo: string
  nombre: string
  sector: string
  frecuencia: string
  status: string
  progress: number
  scheduledDate: string | null
  completedDate: string | null
  responsable: string | null
  turno: string | null
  observations: string | null
  attachments: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
  items: MantenimientoItem[]
  _count?: { items: number }
}

// Frequency colors
const freqColors: Record<string, { bg: string; text: string; border: string }> = {
  'Diaria': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  'Semanal': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  'Quincenal': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  'Mensual': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  'Trimestral': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  'Semestral': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
  'Anual': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
}

const statusColors: Record<string, { bg: string; text: string }> = {
  'PENDIENTE': { bg: 'bg-amber-50', text: 'text-amber-700' },
  'EN_PROGRESO': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'COMPLETADA': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
}

// ============================================================
// Props
// ============================================================
interface MantenimientoPanelProps {
  userRole?: string
  initialStatusFilter?: string
  onStatusFilterConsumed?: () => void
}

// ============================================================
// Component
// ============================================================
export default function MantenimientoPanel({ userRole = 'USER', initialStatusFilter, onStatusFilterConsumed }: MantenimientoPanelProps) {
  const { toast } = useToast()
  const canEdit = userRole === 'ADMIN' || userRole === 'SUPERVISOR'

  // --- View state ---
  const [currentView, setCurrentView] = useState<'calendar' | 'list' | 'detail'>('calendar')
  const [lvs, setLvs] = useState<MantenimientoLV[]>([])
  const [selectedLV, setSelectedLV] = useState<MantenimientoLV | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  // --- Filters ---
  const [filterFrecuencia, setFilterFrecuencia] = useState('all')
  const [filterStatus, setFilterStatus] = useState<string>(initialStatusFilter || 'all')
  const [searchQuery, setSearchQuery] = useState('')

  // --- Calendar state ---
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())

  // --- Dialogs ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // --- Attach upload ---
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  // ============================================================
  // React to filter from parent
  // ============================================================
  useEffect(() => {
    if (initialStatusFilter && initialStatusFilter !== 'all') {
      setFilterStatus(initialStatusFilter)
      setCurrentView('list')
      if (onStatusFilterConsumed) onStatusFilterConsumed()
    }
  }, [initialStatusFilter])

  // ============================================================
  // Data fetching
  // ============================================================
  const fetchLVs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterFrecuencia !== 'all') params.set('frecuencia', filterFrecuencia)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      // Fetch with date range for current calendar month + surrounding
      const from = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
      const lastDay = new Date(calYear, calMonth + 1, 0).getDate()
      const to = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${lastDay}`
      params.set('from', from)
      params.set('to', to)
      const res = await fetch(`/api/mantenimiento-lv?${params.toString()}`)
      if (res.ok) setLvs(await res.json())
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'No se pudieron cargar las listas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [filterFrecuencia, filterStatus, calYear, calMonth, toast])

  const fetchLVDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/mantenimiento-lv/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedLV(data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { fetchLVs() }, [fetchLVs])

  // ============================================================
  // Auto-generate LVs for current month
  // ============================================================
  const handleGenerate = async (year?: number, month?: number) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/mantenimiento-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: year ?? calYear, month: month ?? calMonth }),
      })
      if (res.ok) {
        const data = await res.json()
        toast({ title: 'Listas generadas', description: data.message })
        fetchLVs()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  // Auto-generate on first load for current month
  useEffect(() => {
    handleGenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============================================================
  // Update item status
  // ============================================================
  const handleItemStatusChange = async (itemId: string, newStatus: string) => {
    if (!selectedLV) return
    const updatedItems = selectedLV.items.map(item =>
      item.id === itemId ? { ...item, status: newStatus } : item
    )
    setSelectedLV({ ...selectedLV, items: updatedItems })

    try {
      await fetch(`/api/mantenimiento-lv/${selectedLV.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems }),
      })
      fetchLVs()
      fetchLVDetail(selectedLV.id)
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' })
    }
  }

  // ============================================================
  // Update item value/observation
  // ============================================================
  const handleItemValueChange = async (itemId: string, field: 'value' | 'observation', val: string) => {
    if (!selectedLV) return
    const updatedItems = selectedLV.items.map(item =>
      item.id === itemId ? { ...item, [field]: val } : item
    )
    setSelectedLV({ ...selectedLV, items: updatedItems })
  }

  const handleSaveItemChanges = async () => {
    if (!selectedLV) return
    try {
      await fetch(`/api/mantenimiento-lv/${selectedLV.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedLV.items, observations: selectedLV.observations }),
      })
      fetchLVs()
      fetchLVDetail(selectedLV.id)
      toast({ title: 'Guardado', description: 'Cambios guardados exitosamente' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
    }
  }

  // ============================================================
  // Delete
  // ============================================================
  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await fetch(`/api/mantenimiento-lv/${deleteId}`, { method: 'DELETE' })
      toast({ title: 'Eliminado', description: 'Lista eliminada exitosamente' })
      fetchLVs()
      if (selectedLV?.id === deleteId) { setCurrentView('calendar'); setSelectedLV(null) }
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' })
    } finally {
      setDeleteDialogOpen(false); setDeleteId(null)
    }
  }

  // ============================================================
  // Print
  // ============================================================
  const handlePrint = (lv: MantenimientoLV) => {
    const w = window.open('', '_blank')
    if (!w) return
    const categories = [...new Set(lv.items.map(i => i.category))]
    const categoryLabels: Record<string, string> = { A: 'A. EPP / Materiales', B: 'B. Verificación de Tareas', C: 'C. Inspección / Registros', D: 'D. Dosificaciones / Limpieza' }

    w.document.write(`<!DOCTYPE html><html><head><title>${lv.codigo} — ${lv.nombre}</title>
    <style>
      body{font-family:Arial,sans-serif;margin:20px;font-size:12px;color:#1e293b}
      h1{font-size:16px;margin:0 0 4px}h2{font-size:13px;margin:8px 0 4px;color:#475569}
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #0d9488;padding-bottom:8px;margin-bottom:12px}
      .meta{display:flex;gap:20px;font-size:11px;margin-bottom:8px}
      table{width:100%;border-collapse:collapse;margin-bottom:12px}
      th{background:#f1f5f9;padding:6px 8px;text-align:left;border:1px solid #cbd5e1;font-size:11px}
      td{padding:5px 8px;border:1px solid #e2e8f0;font-size:11px}
      .ok{color:#16a34a;font-weight:bold}.no{color:#dc2626;font-weight:bold}
      .progress-bar{height:16px;background:#e2e8f0;border-radius:4px;overflow:hidden;margin:4px 0}
      .progress-fill{height:100%;background:#0d9488}
      .signatures{display:flex;gap:40px;margin-top:30px;font-size:11px}
      .sig-line{border-top:1px solid #000;width:200px;padding-top:4px;margin-top:30px}
      .logo{font-weight:bold;font-size:13px;color:#0d9488}
      @media print{body{margin:10px}}
    </style></head><body>
    <div class="header"><div><div class="logo">Asesorías Integrales CyJ</div><h1>${lv.codigo} — ${lv.nombre}</h1><div style="font-size:11px;color:#64748b">Condominio Laguna Norte — Lampa, Santiago</div></div>
    <div style="text-align:right;font-size:11px">Progreso: ${lv.progress}%<div class="progress-bar" style="width:120px"><div class="progress-fill" style="width:${lv.progress}%"></div></div></div></div>
    <div class="meta"><div><b>Sector:</b> ${lv.sector}</div><div><b>Frecuencia:</b> ${lv.frecuencia}</div><div><b>Responsable:</b> ${lv.responsable || '-'}</div><div><b>Fecha:</b> ${lv.scheduledDate ? new Date(lv.scheduledDate).toLocaleDateString('es-CL') : '-'}</div><div><b>Turno:</b> ${lv.turno || '-'}</div></div>
    ${categories.map(cat => {
      const catItems = lv.items.filter(i => i.category === cat)
      return `<h2>${categoryLabels[cat] || cat}</h2><table><tr><th style="width:5%">N°</th><th style="width:50%">Descripción</th><th style="width:10%">Estado</th><th style="width:15%">Valor</th><th style="width:20%">Observación</th></tr>
      ${catItems.map((item, idx) => `<tr><td>${idx + 1}</td><td>${item.description}</td><td class="${item.status === 'OK' ? 'ok' : item.status === 'NO_OK' ? 'no' : ''}">${item.status === 'OK' ? '✓ OK' : item.status === 'NO_OK' ? '✗ NO OK' : item.status === 'N/A' ? 'N/A' : '☐ Pendiente'}</td><td>${item.value || ''}</td><td>${item.observation || ''}</td></tr>`).join('')}</table>`
    }).join('')}
    ${lv.observations ? `<h2>Observaciones / Acciones Correctivas</h2><p>${lv.observations}</p>` : ''}
    <div class="signatures"><div><div class="sig-line">Responsable — Nombre, Firma, RUT, Fecha</div></div><div><div class="sig-line">Supervisor — Nombre, Firma, RUT, Fecha</div></div></div>
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  // ============================================================
  // Upload attachment
  // ============================================================
  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedLV) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (res.ok) {
        const { url } = await res.json()
        const currentAttachments = JSON.parse(selectedLV.attachments || '[]')
        const newAttachments = [...currentAttachments, url]
        await fetch(`/api/mantenimiento-lv/${selectedLV.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attachments: JSON.stringify(newAttachments) }),
        })
        fetchLVDetail(selectedLV.id)
        toast({ title: 'Archivo adjuntado', description: file.name })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo subir el archivo', variant: 'destructive' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ============================================================
  // Calendar helpers
  // ============================================================
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

  const getLVsForDate = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return lvs.filter(lv => lv.scheduledDate && lv.scheduledDate.startsWith(dateStr))
  }

  // ============================================================
  // Format
  // ============================================================
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('es-CL') : '-'

  // ============================================================
  // Filtered for list view
  // ============================================================
  const filteredLVs = lvs.filter(lv => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return lv.nombre.toLowerCase().includes(q) || lv.codigo.toLowerCase().includes(q) || lv.sector.toLowerCase().includes(q)
    }
    return true
  })

  // Stats
  const totalLVs = lvs.length
  const pendientes = lvs.filter(l => l.status === 'PENDIENTE').length
  const enProgreso = lvs.filter(l => l.status === 'EN_PROGRESO').length
  const completadas = lvs.filter(l => l.status === 'COMPLETADA').length
  const avgProgress = totalLVs > 0 ? Math.round(lvs.reduce((s, l) => s + l.progress, 0) / totalLVs) : 0

  // Progress color helper
  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'text-emerald-600'
    if (progress >= 50) return 'text-blue-600'
    if (progress > 0) return 'text-amber-600'
    return 'text-slate-400'
  }

  const getProgressBg = (progress: number) => {
    if (progress === 100) return 'bg-emerald-500'
    if (progress >= 50) return 'bg-blue-500'
    if (progress > 0) return 'bg-amber-500'
    return 'bg-slate-300'
  }

  // ============================================================
  // Open LV directly from calendar
  // ============================================================
  const openLV = (id: string) => {
    fetchLVDetail(id)
    setCurrentView('detail')
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total LVs</div>
          <div className="text-2xl font-bold text-slate-800">{totalLVs}</div>
        </div>
        <div
          className={`bg-white rounded-xl p-3 border shadow-sm text-center cursor-pointer hover:shadow-md transition-all ${filterStatus === 'PENDIENTE' ? 'border-amber-400 ring-2 ring-amber-200' : 'border-amber-200'}`}
          onClick={() => { setFilterStatus(filterStatus === 'PENDIENTE' ? 'all' : 'PENDIENTE'); setCurrentView('list') }}
        >
          <div className="text-xs text-amber-600 uppercase tracking-wider font-semibold">Pendientes</div>
          <div className="text-2xl font-bold text-amber-700">{pendientes}</div>
        </div>
        <div
          className={`bg-white rounded-xl p-3 border shadow-sm text-center cursor-pointer hover:shadow-md transition-all ${filterStatus === 'EN_PROGRESO' ? 'border-blue-400 ring-2 ring-blue-200' : 'border-blue-200'}`}
          onClick={() => { setFilterStatus(filterStatus === 'EN_PROGRESO' ? 'all' : 'EN_PROGRESO'); setCurrentView('list') }}
        >
          <div className="text-xs text-blue-600 uppercase tracking-wider font-semibold">En Progreso</div>
          <div className="text-2xl font-bold text-blue-700">{enProgreso}</div>
        </div>
        <div
          className={`bg-white rounded-xl p-3 border shadow-sm text-center cursor-pointer hover:shadow-md transition-all ${filterStatus === 'COMPLETADA' ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-emerald-200'}`}
          onClick={() => { setFilterStatus(filterStatus === 'COMPLETADA' ? 'all' : 'COMPLETADA'); setCurrentView('list') }}
        >
          <div className="text-xs text-emerald-600 uppercase tracking-wider font-semibold">Completadas</div>
          <div className="text-2xl font-bold text-emerald-700">{completadas}</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-teal-200 shadow-sm text-center">
          <div className="text-xs text-teal-600 uppercase tracking-wider font-semibold">Avance Promedio</div>
          <div className="text-2xl font-bold text-teal-700">{avgProgress}%</div>
          <Progress value={avgProgress} className="h-2 mt-1" />
        </div>
      </div>

      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentView === 'detail' && (
            <Button variant="ghost" size="sm" onClick={() => { setCurrentView('calendar'); setSelectedLV(null) }} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Volver al Calendario
            </Button>
          )}
          {currentView === 'list' && (
            <Button variant="ghost" size="sm" onClick={() => setCurrentView('calendar')} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Volver al Calendario
            </Button>
          )}
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-teal-600" />
            Mantenimiento
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={currentView === 'calendar' ? 'default' : 'outline'}
            size="sm"
            className={`gap-1 ${currentView === 'calendar' ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}`}
            onClick={() => setCurrentView('calendar')}
          >
            <Map className="h-4 w-4" /> Calendario
          </Button>
          <Button
            variant={currentView === 'list' ? 'default' : 'outline'}
            size="sm"
            className={`gap-1 ${currentView === 'list' ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}`}
            onClick={() => setCurrentView('list')}
          >
            <List className="h-4 w-4" /> Lista
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 border-teal-300 text-teal-700 hover:bg-teal-50"
            onClick={() => handleGenerate()}
            disabled={generating}
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generando...' : 'Generar Mes'}
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CALENDAR VIEW (MAIN)                                         */}
      {/* ============================================================ */}
      {currentView === 'calendar' && (
        <Card className="border-teal-200">
          <CardHeader className="pb-2 bg-gradient-to-r from-teal-50 to-white border-b border-teal-100">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1) }} className="text-teal-700 hover:text-teal-900">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-lg font-bold text-teal-900">{monthNames[calMonth]} {calYear}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1) }} className="text-teal-700 hover:text-teal-900">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 gap-1">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className="text-center text-xs font-bold text-teal-700 py-2 bg-teal-50 rounded-t">{d}</div>
              ))}
              {Array.from({ length: getFirstDayOfMonth(calYear, calMonth) }, (_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] bg-slate-50 rounded" />
              ))}
              {Array.from({ length: getDaysInMonth(calYear, calMonth) }, (_, i) => {
                const day = i + 1
                const dayLVs = getLVsForDate(day)
                const isToday = calYear === new Date().getFullYear() && calMonth === new Date().getMonth() && day === new Date().getDate()
                const hasPending = dayLVs.some(lv => lv.status === 'PENDIENTE')
                const hasInProgress = dayLVs.some(lv => lv.status === 'EN_PROGRESO')
                const allComplete = dayLVs.length > 0 && dayLVs.every(lv => lv.status === 'COMPLETADA')
                // Calculate day's progress
                const dayProgress = dayLVs.length > 0 ? Math.round(dayLVs.reduce((s, l) => s + l.progress, 0) / dayLVs.length) : 0

                return (
                  <div key={day}
                    className={`min-h-[100px] border rounded-lg p-1.5 text-xs overflow-hidden transition-all ${isToday ? 'border-teal-400 bg-teal-50/30 ring-2 ring-teal-300' : allComplete ? 'border-emerald-200 bg-emerald-50/20' : hasPending ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold text-sm ${isToday ? 'text-teal-700 bg-teal-200 rounded-full w-7 h-7 flex items-center justify-center' : 'text-slate-700'}`}>{day}</span>
                      {dayLVs.length > 0 && (
                        <span className={`text-[10px] font-bold ${allComplete ? 'text-emerald-600' : hasInProgress ? 'text-blue-600' : 'text-amber-600'}`}>
                          {dayProgress}%
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayLVs.slice(0, 4).map(lv => (
                        <div key={lv.id}
                          className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium cursor-pointer transition-all hover:scale-105 hover:shadow-sm ${lv.status === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : lv.status === 'EN_PROGRESO' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}
                          onClick={() => openLV(lv.id)}
                          title={`${lv.codigo} — ${lv.nombre} (${lv.progress}%)`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{lv.codigo}</span>
                            <span className="shrink-0">{lv.progress}%</span>
                          </div>
                        </div>
                      ))}
                      {dayLVs.length > 4 && (
                        <div
                          className="text-[10px] text-teal-600 font-semibold cursor-pointer hover:text-teal-800"
                          onClick={() => { setFilterStatus('all'); setCurrentView('list') }}
                        >
                          +{dayLVs.length - 4} más
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-amber-100 border border-amber-300" /> Pendiente</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-blue-100 border border-blue-300" /> En Progreso</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300" /> Completada</div>
              <div className="flex items-center gap-1.5 ml-auto"><Wrench className="h-3.5 w-3.5 text-teal-600" /> Haz clic en cualquier LV para revisar su lista de verificación</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* LIST VIEW                                                     */}
      {/* ============================================================ */}
      {currentView === 'list' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterFrecuencia} onValueChange={setFilterFrecuencia}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Frecuencia" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Diaria">Diaria</SelectItem>
                <SelectItem value="Semanal">Semanal</SelectItem>
                <SelectItem value="Quincenal">Quincenal</SelectItem>
                <SelectItem value="Mensual">Mensual</SelectItem>
                <SelectItem value="Trimestral">Trimestral</SelectItem>
                <SelectItem value="Semestral">Semestral</SelectItem>
                <SelectItem value="Anual">Anual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="EN_PROGRESO">En Progreso</SelectItem>
                <SelectItem value="COMPLETADA">Completada</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-[200px] h-8 text-xs" />
            <Button
              variant="outline"
              size="sm"
              className="gap-1 ml-auto border-teal-300 text-teal-700 hover:bg-teal-50 h-8"
              onClick={() => handleGenerate()}
              disabled={generating}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generando...' : 'Generar Mes'}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500">Cargando...</div>
          ) : filteredLVs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No hay listas de verificación</p>
              <p className="text-sm mt-1">Genera las listas del mes haciendo clic en &quot;Generar Mes&quot;</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLVs.map(lv => {
                const fc = freqColors[lv.frecuencia] || freqColors['Mensual']
                const sc = statusColors[lv.status] || statusColors['PENDIENTE']
                return (
                  <Card key={lv.id} className="border-l-4 border-l-teal-400 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => openLV(lv.id)}>
                    <CardContent className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={`${fc.bg} ${fc.text} text-xs font-bold`}>{lv.codigo}</Badge>
                          <div>
                            <div className="font-semibold text-sm text-slate-800">{lv.nombre}</div>
                            <div className="text-xs text-slate-500">{lv.sector} · {lv.responsable || 'Sin responsable'} · {formatDate(lv.scheduledDate)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${fc.bg} ${fc.text} text-xs`}>{lv.frecuencia}</Badge>
                          <Badge className={`${sc.bg} ${sc.text} text-xs gap-1`}>
                            {lv.status === 'COMPLETADA' && <CheckCircle className="h-3 w-3" />}
                            {lv.status === 'EN_PROGRESO' && <Clock className="h-3 w-3" />}
                            {lv.status === 'PENDIENTE' && <Clock className="h-3 w-3" />}
                            {lv.status === 'PENDIENTE' ? 'Pendiente' : lv.status === 'EN_PROGRESO' ? 'En Progreso' : 'Completada'}
                          </Badge>
                          <div className="w-28">
                            <div className={`text-xs text-right font-bold ${getProgressColor(lv.progress)}`}>{lv.progress}%</div>
                            <div className="h-2 rounded-full bg-slate-200 mt-0.5 overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${getProgressBg(lv.progress)}`} style={{ width: `${lv.progress}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* DETAIL VIEW                                                   */}
      {/* ============================================================ */}
      {currentView === 'detail' && selectedLV && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-800">{selectedLV.codigo} — {selectedLV.nombre}</h3>
              <p className="text-sm text-slate-500">{selectedLV.sector} · Frecuencia: {selectedLV.frecuencia} · Responsable: {selectedLV.responsable || '-'} · Fecha: {formatDate(selectedLV.scheduledDate)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => handlePrint(selectedLV)}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Upload className="h-4 w-4" /> {uploading ? 'Subiendo...' : 'Adjuntar'}
              </Button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadAttachment} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" />
              {canEdit && (
                <Button size="sm" className="gap-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveItemChanges}>
                  Guardar Cambios
                </Button>
              )}
              {canEdit && (
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setDeleteId(selectedLV.id); setDeleteDialogOpen(true) }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Avance: <span className={getProgressColor(selectedLV.progress)}>{selectedLV.progress}%</span></span>
              <Badge className={`${statusColors[selectedLV.status]?.bg} ${statusColors[selectedLV.status]?.text}`}>
                {selectedLV.status === 'PENDIENTE' ? 'Pendiente' : selectedLV.status === 'EN_PROGRESO' ? 'En Progreso' : 'Completada'}
              </Badge>
            </div>
            <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${getProgressBg(selectedLV.progress)}`} style={{ width: `${selectedLV.progress}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-slate-400">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Attachments */}
          {JSON.parse(selectedLV.attachments || '[]').length > 0 && (
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Documentos Adjuntos (Respaldos)</div>
              <div className="flex gap-2 flex-wrap">
                {JSON.parse(selectedLV.attachments).map((url: string, idx: number) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200 hover:border-blue-400 transition-all">
                    <FileText className="h-3.5 w-3.5" />
                    Documento {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Checklist items by category */}
          {(() => {
            const categories = [...new Set(selectedLV.items.map(i => i.category))]
            const categoryLabels: Record<string, string> = { A: 'A. EPP / Materiales', B: 'B. Verificación de Tareas', C: 'C. Inspección / Registros', D: 'D. Dosificaciones / Limpieza' }
            return categories.map(cat => {
              const catItems = selectedLV.items.filter(i => i.category === cat)
              const catOk = catItems.filter(i => i.status === 'OK' || i.status === 'N/A').length
              const catProgress = catItems.length > 0 ? Math.round((catOk / catItems.length) * 100) : 0
              return (
                <Card key={cat} className="border border-slate-200">
                  <CardHeader className="py-2 px-4 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-slate-700">{categoryLabels[cat] || `Sección ${cat}`}</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${getProgressColor(catProgress)}`}>{catProgress}%</span>
                        <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div className={`h-full rounded-full ${getProgressBg(catProgress)}`} style={{ width: `${catProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30px] text-center px-2 py-1 text-xs">N°</TableHead>
                          <TableHead className="px-2 py-1 text-xs">Descripción</TableHead>
                          <TableHead className="w-[90px] text-center px-2 py-1 text-xs">Estado</TableHead>
                          <TableHead className="w-[100px] px-2 py-1 text-xs">Valor</TableHead>
                          <TableHead className="w-[120px] px-2 py-1 text-xs">Observación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {catItems.map((item, idx) => (
                          <TableRow key={item.id || idx} className={item.status === 'OK' ? 'bg-emerald-50/50' : item.status === 'NO_OK' ? 'bg-red-50/50' : ''}>
                            <TableCell className="text-center text-xs text-slate-400 px-2 py-1">{idx + 1}</TableCell>
                            <TableCell className="text-xs px-2 py-1 text-slate-700">{item.description}</TableCell>
                            <TableCell className="text-center px-2 py-1">
                              {canEdit ? (
                                <Select value={item.status} onValueChange={(v) => handleItemStatusChange(item.id!, v)}>
                                  <SelectTrigger className="h-7 text-xs w-[80px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PENDIENTE">☐ Pendiente</SelectItem>
                                    <SelectItem value="OK">✓ OK</SelectItem>
                                    <SelectItem value="NO_OK">✗ NO OK</SelectItem>
                                    <SelectItem value="N/A">N/A</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge className={`text-xs ${item.status === 'OK' ? 'bg-emerald-100 text-emerald-700' : item.status === 'NO_OK' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {item.status === 'OK' ? '✓ OK' : item.status === 'NO_OK' ? '✗ NO' : item.status === 'N/A' ? 'N/A' : '☐'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              {canEdit ? (
                                <Input className="h-7 text-xs" value={item.value || ''} onChange={(e) => handleItemValueChange(item.id!, 'value', e.target.value)} placeholder="Valor" />
                              ) : <span className="text-xs">{item.value || '-'}</span>}
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              {canEdit ? (
                                <Input className="h-7 text-xs" value={item.observation || ''} onChange={(e) => handleItemValueChange(item.id!, 'observation', e.target.value)} placeholder="Obs." />
                              ) : <span className="text-xs">{item.observation || '-'}</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )
            })
          })()}

          {/* Observations */}
          <Card className="border border-slate-200">
            <CardHeader className="py-2 px-4 bg-slate-50">
              <CardTitle className="text-sm font-bold text-slate-700">Observaciones / Acciones Correctivas</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {canEdit ? (
                <Textarea value={selectedLV.observations || ''} onChange={(e) => setSelectedLV({ ...selectedLV, observations: e.target.value })} placeholder="Ingrese observaciones..." rows={3} />
              ) : (
                <p className="text-sm text-slate-600">{selectedLV.observations || 'Sin observaciones'}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta lista?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará la lista de verificación y todos sus items. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
