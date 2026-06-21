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
  Wrench, ChevronLeft, CheckCircle, XCircle, Clock,
  Printer, Upload, Calendar, ChevronRight,
  RefreshCw, Map, FileText, Trash2, AlertTriangle,
  Eye, Save, MessageSquare, Paperclip,
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
  motivoPendiente: string | null
  attachments: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
  items: MantenimientoItem[]
  _count?: { items: number }
}

// Frequency colors - CALENDAR uses these group colors
const freqGroupColors: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  'Diaria': { bg: 'bg-blue-500', text: 'text-blue-700', dot: 'bg-blue-400', label: 'Diaria' },
  '3x Semanal': { bg: 'bg-sky-500', text: 'text-sky-700', dot: 'bg-sky-400', label: '3x Semanal' },
  'Semanal': { bg: 'bg-purple-500', text: 'text-purple-700', dot: 'bg-purple-400', label: 'Semanal' },
  'Quincenal': { bg: 'bg-cyan-500', text: 'text-cyan-700', dot: 'bg-cyan-400', label: 'Quincenal' },
  'Mensual': { bg: 'bg-amber-500', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Mensual' },
  'Trimestral': { bg: 'bg-orange-500', text: 'text-orange-700', dot: 'bg-orange-400', label: 'Trimestral' },
  'Semestral': { bg: 'bg-rose-500', text: 'text-rose-700', dot: 'bg-rose-400', label: 'Semestral' },
  'Anual': { bg: 'bg-red-600', text: 'text-red-700', dot: 'bg-red-500', label: 'Anual' },
}

// Frequency colors for badges/cards
const freqColors: Record<string, { bg: string; text: string; border: string }> = {
  'Diaria': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  '3x Semanal': { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300' },
  'Semanal': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  'Quincenal': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  'Mensual': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  'Trimestral': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  'Semestral': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
  'Anual': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
}

const statusConfig: Record<string, { bg: string; text: string; label: string; icon: typeof CheckCircle }> = {
  'PENDIENTE': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente', icon: Clock },
  'EN_PROGRESO': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En Progreso', icon: RefreshCw },
  'COMPLETADA': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Realizado', icon: CheckCircle },
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
  const [currentView, setCurrentView] = useState<'calendar' | 'day' | 'detail' | 'frequency'>('calendar')
  const [allLVs, setAllLVs] = useState<MantenimientoLV[]>([])
  const [selectedLV, setSelectedLV] = useState<MantenimientoLV | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedFrequency, setSelectedFrequency] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  // --- Calendar state ---
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())

  // --- Detail edit state ---
  const [editStatus, setEditStatus] = useState<string>('')
  const [editMotivoPendiente, setEditMotivoPendiente] = useState<string>('')
  const [editObservations, setEditObservations] = useState<string>('')
  const [editItems, setEditItems] = useState<MantenimientoItem[]>([])

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
      if (onStatusFilterConsumed) onStatusFilterConsumed()
    }
  }, [initialStatusFilter])

  // ============================================================
  // Data fetching - only LVs from today onwards
  // ============================================================
  const fetchLVs = useCallback(async () => {
    setLoading(true)
    try {
      // Get LVs from today onwards for the current calendar month
      const today = new Date()
      const fromStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      // Fetch for 3 months ahead to cover calendar navigation
      const futureDate = new Date(today)
      futureDate.setMonth(futureDate.getMonth() + 3)
      const toStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`

      const params = new URLSearchParams()
      params.set('from', fromStr)
      params.set('to', toStr)
      const res = await fetch(`/api/mantenimiento-lv?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        // Filter: only from today onwards
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const filtered = data.filter((lv: MantenimientoLV) => {
          const date = (lv.scheduledDate || '').substring(0, 10)
          return date >= todayStr
        })
        setAllLVs(filtered)
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'No se pudieron cargar las listas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchLVDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/mantenimiento-lv/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedLV(data)
        setEditStatus(data.status)
        setEditMotivoPendiente(data.motivoPendiente || '')
        setEditObservations(data.observations || '')
        setEditItems([...data.items])
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { fetchLVs() }, [fetchLVs])

  // ============================================================
  // Auto-generate LVs for current and next month
  // ============================================================
  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const now = new Date()
      // Generate for current month
      await fetch('/api/mantenimiento-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: now.getFullYear(), month: now.getMonth() }),
      })
      // Generate for next month too
      const next = new Date(now)
      next.setMonth(next.getMonth() + 1)
      await fetch('/api/mantenimiento-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: next.getFullYear(), month: next.getMonth() }),
      })
      fetchLVs()
      toast({ title: 'Listas generadas', description: 'Se generaron las listas de verificación pendientes' })
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  // Auto-generate on first load
  useEffect(() => {
    handleGenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============================================================
  // Calendar helpers
  // ============================================================
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

  const getLVsForDate = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return allLVs.filter(lv => lv.scheduledDate && lv.scheduledDate.startsWith(dateStr))
  }

  // LVs for the selected day (in day view)
  const dayLVs = selectedDate ? allLVs.filter(lv => lv.scheduledDate && lv.scheduledDate.startsWith(selectedDate)) : []

  // ============================================================
  // Open day / Open LV
  // ============================================================
  const openDay = (dateStr: string) => {
    setSelectedDate(dateStr)
    setCurrentView('day')
  }

  const openFrequency = (freq: string) => {
    setSelectedFrequency(freq)
    setCurrentView('frequency')
  }

  const openLV = (id: string, fromCalendar: boolean = false) => {
    if (fromCalendar) {
      // Find the LV to get its date, so "back" returns to the right day
      const lv = allLVs.find(l => l.id === id)
      if (lv?.scheduledDate) {
        setSelectedDate(lv.scheduledDate.substring(0, 10))
      }
    }
    // When coming from frequency view, keep selectedDate empty so goBack returns to frequency
    if (currentView === 'frequency') {
      setSelectedDate('')
    }
    fetchLVDetail(id)
    setCurrentView('detail')
  }

  const goBack = () => {
    if (currentView === 'detail') {
      if (selectedFrequency && !selectedDate) {
        setCurrentView('frequency')
      } else if (selectedDate) {
        setCurrentView('day')
      } else {
        setCurrentView('calendar')
      }
      setSelectedLV(null)
    } else if (currentView === 'day') {
      setCurrentView('calendar')
      setSelectedDate('')
    } else if (currentView === 'frequency') {
      setCurrentView('calendar')
      setSelectedFrequency('')
    }
  }

  // ============================================================
  // Save changes
  // ============================================================
  const handleSave = async () => {
    if (!selectedLV) return
    setSaving(true)
    try {
      const res = await fetch(`/api/mantenimiento-lv/${selectedLV.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editItems,
          observations: editObservations,
          motivoPendiente: editStatus === 'PENDIENTE' ? editMotivoPendiente : '',
          status: editStatus,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedLV({ ...selectedLV, ...data })
        fetchLVs()
        toast({ title: 'Guardado', description: 'Cambios guardados exitosamente' })
      } else {
        toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Quick status change (from day view)
  const handleQuickStatus = async (lvId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/mantenimiento-lv/${lvId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchLVs()
        toast({ title: 'Estado actualizado' })
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' })
    }
  }

  // ============================================================
  // Item status change
  // ============================================================
  const handleItemStatusChange = (itemId: string, newStatus: string) => {
    const updated = editItems.map(item =>
      item.id === itemId ? { ...item, status: newStatus } : item
    )
    setEditItems(updated)
  }

  const handleItemFieldChange = (itemId: string, field: 'value' | 'observation', val: string) => {
    const updated = editItems.map(item =>
      item.id === itemId ? { ...item, [field]: val } : item
    )
    setEditItems(updated)
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
      goBack()
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
    const logoUrl = `${window.location.origin}/logo-laguna-norte.jpg`

    w.document.write(`<!DOCTYPE html><html><head><title>${lv.codigo} — ${lv.nombre}</title>
    <style>
      @page{size:A4;margin:8mm}
      *{box-sizing:border-box}
      body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:0;font-size:8.5px;color:#1e293b;line-height:1.25}
      .header{display:flex;align-items:center;justify-content:space-between;border-bottom:2.5px solid #0d9488;padding-bottom:5px;margin-bottom:4px}
      .header-left{display:flex;align-items:center;gap:8px}
      .header-left img{height:42px;width:auto;object-fit:contain}
      .header-info h1{font-size:13px;margin:0 0 1px;color:#0f172a;font-weight:800;line-height:1.2}
      .header-info .sub{font-size:8px;color:#64748b;margin:0}
      .header-info .org{font-size:9px;color:#0d9488;font-weight:700;margin:0 0 1px}
      .header-right{text-align:right;font-size:8px}
      .status-badge{display:inline-block;padding:1px 7px;border-radius:3px;font-weight:700;font-size:8px;letter-spacing:.3px}
      .pendiente{background:#fef3c7;color:#92400e}.completada{background:#d1fae5;color:#065f46}.progreso{background:#dbeafe;color:#1e40af}
      .progress-bar{height:10px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin:2px 0;width:100px;display:inline-block;vertical-align:middle}
      .progress-fill{height:100%;background:#0d9488;border-radius:3px}
      .meta{display:flex;gap:12px;font-size:8px;margin-bottom:5px;flex-wrap:wrap;padding:3px 0;border-bottom:1px dashed #cbd5e1}
      .meta b{color:#475569}
      .cat-title{font-size:9.5px;font-weight:700;margin:5px 0 2px;padding:2px 5px;background:#f1f5f9;border-left:3px solid #0d9488;color:#334155}
      table{width:100%;border-collapse:collapse;margin-bottom:3px}
      th{background:#f8fafc;padding:2px 4px;text-align:left;border:1px solid #cbd5e1;font-size:7.5px;font-weight:700;color:#475569;white-space:nowrap}
      td{padding:1.5px 4px;border:1px solid #e2e8f0;font-size:7.5px;vertical-align:middle}
      tr:nth-child(even){background:#fafbfc}
      .ok{color:#16a34a;font-weight:700}.no{color:#dc2626;font-weight:700}
      .obs-section{margin-top:4px;padding:3px 5px;background:#fefce8;border:1px solid #fde68a;border-radius:3px;font-size:8px}
      .motivo-section{margin-top:3px;padding:3px 5px;background:#fef2f2;border:1px solid #fecaca;border-radius:3px;font-size:8px;color:#991b1b}
      .signatures{display:flex;justify-content:space-between;margin-top:8px;font-size:7.5px;padding-top:4px}
      .sig-line{border-top:1px solid #000;width:44%;padding-top:2px;margin-top:18px;text-align:center}
      @media print{body{margin:0;padding:0}.no-print{display:none}}
    </style></head><body>
    <div class="header">
      <div class="header-left">
        <img src="${logoUrl}" alt="Logo" />
        <div class="header-info">
          <div class="org">Asesorías Integrales CyJ</div>
          <h1>${lv.codigo} — ${lv.nombre}</h1>
          <div class="sub">Condominio Laguna Norte — Lampa, Santiago</div>
        </div>
      </div>
      <div class="header-right">
        <div class="status-badge ${lv.status === 'COMPLETADA' ? 'completada' : lv.status === 'EN_PROGRESO' ? 'progreso' : 'pendiente'}">${lv.status === 'COMPLETADA' ? 'REALIZADO' : lv.status === 'EN_PROGRESO' ? 'EN PROGRESO' : 'PENDIENTE'}</div>
        <div style="margin-top:2px">Avance: <b>${lv.progress}%</b></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${lv.progress}%"></div></div>
      </div>
    </div>
    <div class="meta">
      <div><b>Sector:</b> ${lv.sector}</div>
      <div><b>Frecuencia:</b> ${lv.frecuencia}</div>
      <div><b>Responsable:</b> ${lv.responsable || '-'}</div>
      <div><b>Fecha:</b> ${lv.scheduledDate ? new Date(lv.scheduledDate).toLocaleDateString('es-CL') : '-'}</div>
      <div><b>Turno:</b> ${lv.turno || '-'}</div>
    </div>
    ${categories.map(cat => {
      const catItems = lv.items.filter(i => i.category === cat)
      return `<div class="cat-title">${categoryLabels[cat] || cat}</div>
      <table>
        <colgroup><col style="width:4%"><col style="width:42%"><col style="width:9%"><col style="width:14%"><col style="width:31%"></colgroup>
        <tr><th>N°</th><th>Descripción</th><th>Estado</th><th>Valor</th><th>Observación</th></tr>
        ${catItems.map((item, idx) => `<tr><td style="text-align:center">${idx + 1}</td><td>${item.description}</td><td class="${item.status === 'OK' ? 'ok' : item.status === 'NO_OK' ? 'no' : ''}" style="text-align:center">${item.status === 'OK' ? '&#10003; OK' : item.status === 'NO_OK' ? '&#10007; NO OK' : item.status === 'N/A' ? 'N/A' : '&#9634; Pend.'}</td><td>${item.value || ''}</td><td>${item.observation || ''}</td></tr>`).join('')}
      </table>`
    }).join('')}
    ${lv.observations ? `<div class="obs-section"><b>Observaciones:</b> ${lv.observations}</div>` : ''}
    ${lv.motivoPendiente ? `<div class="motivo-section"><b>Motivo Pendiente:</b> ${lv.motivoPendiente}</div>` : ''}
    <div class="signatures">
      <div class="sig-line">Responsable — Nombre, Firma, RUT, Fecha</div>
      <div class="sig-line">Supervisor — Nombre, Firma, RUT, Fecha</div>
    </div>
    </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 600)
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
        fetchLVs()
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
  // Format helpers
  // ============================================================
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'
  const formatDateShort = (d: string | null) => d ? new Date(d).toLocaleDateString('es-CL') : '-'

  // Stats for current calendar month
  const monthLVs = allLVs.filter(lv => {
    if (!lv.scheduledDate) return false
    const d = new Date(lv.scheduledDate)
    return d.getFullYear() === calYear && d.getMonth() === calMonth
  })
  const pendientes = monthLVs.filter(l => l.status === 'PENDIENTE').length
  const enProgreso = monthLVs.filter(l => l.status === 'EN_PROGRESO').length
  const completadas = monthLVs.filter(l => l.status === 'COMPLETADA').length
  const avgProgress = monthLVs.length > 0 ? Math.round(monthLVs.reduce((s, l) => s + l.progress, 0) / monthLVs.length) : 0

  // Stats by frequency group
  const freqGroups = ['Diaria', '3x Semanal', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Semestral', 'Anual']
  const freqStats = freqGroups.map(freq => {
    const groupLVs = monthLVs.filter(l => l.frecuencia === freq)
    const total = groupLVs.length
    const done = groupLVs.filter(l => l.status === 'COMPLETADA').length
    const pending = groupLVs.filter(l => l.status === 'PENDIENTE').length
    const progress = total > 0 ? Math.round(groupLVs.reduce((s, l) => s + l.progress, 0) / total) : 0
    return { freq, total, done, pending, progress }
  }).filter(f => f.total > 0)

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
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total</div>
          <div className="text-2xl font-bold text-slate-800">{monthLVs.length}</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-amber-200 shadow-sm text-center">
          <div className="text-xs text-amber-600 uppercase tracking-wider font-semibold">Pendientes</div>
          <div className="text-2xl font-bold text-amber-700">{pendientes}</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-blue-200 shadow-sm text-center">
          <div className="text-xs text-blue-600 uppercase tracking-wider font-semibold">En Progreso</div>
          <div className="text-2xl font-bold text-blue-700">{enProgreso}</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-emerald-200 shadow-sm text-center">
          <div className="text-xs text-emerald-600 uppercase tracking-wider font-semibold">Realizadas</div>
          <div className="text-2xl font-bold text-emerald-700">{completadas}</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-teal-200 shadow-sm text-center">
          <div className="text-xs text-teal-600 uppercase tracking-wider font-semibold">Avance</div>
          <div className="text-2xl font-bold text-teal-700">{avgProgress}%</div>
          <Progress value={avgProgress} className="h-2 mt-1" />
        </div>
      </div>

      {/* Summary by frequency type */}
      {freqStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {freqStats.map(fs => {
            const gc = freqGroupColors[fs.freq] || freqGroupColors['Mensual']
            return (
              <div key={fs.freq} className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-slate-300 transition-all group"
                onClick={() => openFrequency(fs.freq)}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${gc.dot}`} />
                  <span className="text-[10px] font-bold text-slate-600 uppercase">{fs.freq}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-lg font-bold text-slate-800 group-hover:text-teal-700 transition-colors">{fs.total}</span>
                    <span className="text-[10px] text-slate-400 ml-0.5">LVs</span>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${fs.progress === 100 ? 'text-emerald-600' : fs.progress >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>
                      {fs.progress}%
                    </div>
                    <div className="w-12 h-1 rounded-full bg-slate-200 overflow-hidden">
                      <div className={`h-full rounded-full ${fs.progress === 100 ? 'bg-emerald-500' : fs.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${fs.progress}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-1 text-[9px]">
                  <span className="text-emerald-600">{fs.done} ok</span>
                  <span className="text-amber-600">{fs.pending} pend</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentView !== 'calendar' && (
            <Button variant="ghost" size="sm" onClick={goBack} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Volver
            </Button>
          )}
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-teal-600" />
            Mantenimiento
          </h2>
          {currentView === 'day' && selectedDate && (
            <Badge className="bg-teal-100 text-teal-700 text-sm">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Badge>
          )}
          {currentView === 'frequency' && selectedFrequency && (() => {
            const gc = freqGroupColors[selectedFrequency]
            return (
              <Badge className={`${gc?.bg || 'bg-slate-500'} text-white text-sm`}>
                {selectedFrequency}
              </Badge>
            )
          })()}
        </div>
        <div className="flex items-center gap-2">
          {currentView === 'calendar' && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 border-teal-300 text-teal-700 hover:bg-teal-50"
              onClick={handleGenerate}
              disabled={generating}
            >
              <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Generando...' : 'Generar'}
            </Button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* CALENDAR VIEW                                                 */}
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
                <div key={`empty-${i}`} className="min-h-[90px] bg-slate-50 rounded" />
              ))}
              {Array.from({ length: getDaysInMonth(calYear, calMonth) }, (_, i) => {
                const day = i + 1
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayLVs = getLVsForDate(day)
                const isToday = calYear === new Date().getFullYear() && calMonth === new Date().getMonth() && day === new Date().getDate()
                const isPast = new Date(dateStr + 'T12:00:00') < new Date(new Date().toDateString())
                const allComplete = dayLVs.length > 0 && dayLVs.every(lv => lv.status === 'COMPLETADA')
                const hasPending = dayLVs.some(lv => lv.status === 'PENDIENTE')
                const dayProgress = dayLVs.length > 0 ? Math.round(dayLVs.reduce((s, l) => s + l.progress, 0) / dayLVs.length) : 0

                return (
                  <div key={day}
                    className={`min-h-[90px] border rounded-lg p-1.5 text-xs overflow-hidden cursor-pointer transition-all hover:shadow-md ${isToday ? 'border-teal-400 bg-teal-50/30 ring-2 ring-teal-300' : allComplete ? 'border-emerald-300 bg-emerald-50/20' : hasPending && isPast ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 hover:border-teal-300'}`}
                    onClick={() => { if (dayLVs.length > 0) openDay(dateStr) }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold text-sm ${isToday ? 'text-teal-700 bg-teal-200 rounded-full w-7 h-7 flex items-center justify-center' : 'text-slate-700'}`}>{day}</span>
                      {dayLVs.length > 0 && (
                        <span className={`text-[10px] font-bold ${allComplete ? 'text-emerald-600' : hasPending && isPast ? 'text-amber-600' : 'text-slate-500'}`}>
                          {dayProgress}%
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayLVs.slice(0, 4).map(lv => {
                        const gc = freqGroupColors[lv.frecuencia] || freqGroupColors['Mensual']
                        const isDone = lv.status === 'COMPLETADA'
                        const isPending = lv.status === 'PENDIENTE'
                        return (
                          <div key={lv.id}
                            className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${gc.bg} text-white cursor-pointer hover:brightness-110 hover:shadow-sm transition-all flex items-center gap-0.5 ${isDone ? 'opacity-70 line-through decoration-1' : ''} ${isPending ? 'ring-1 ring-white/50' : ''}`}
                            title={`${lv.codigo} — ${lv.nombre} (${lv.frecuencia}, ${lv.progress}%) - Clic para revisar`}
                            onClick={(e) => { e.stopPropagation(); openLV(lv.id, true) }}
                          >
                            {isDone && <CheckCircle className="h-2.5 w-2.5 shrink-0" />}
                            {isPending && <Clock className="h-2.5 w-2.5 shrink-0" />}
                            {lv.codigo}
                          </div>
                        )
                      })}
                      {dayLVs.length > 4 && (
                        <div className="text-[10px] text-teal-600 font-semibold cursor-pointer hover:text-teal-800" onClick={(e) => { e.stopPropagation(); openDay(dateStr) }}>+{dayLVs.length - 4} más</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Legend - colors by frequency */}
            <div className="flex flex-wrap gap-3 mt-3 text-xs p-2 bg-slate-50 rounded-lg">
              {freqGroups.filter(f => monthLVs.some(l => l.frecuencia === f)).map(f => {
                const gc = freqGroupColors[f]
                return (
                  <div key={f} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded ${gc.dot}`} />
                    <span className="text-slate-600">{f}</span>
                  </div>
                )
              })}
              <div className="flex items-center gap-1 ml-auto text-teal-600">Clic en una LV para revisión directa · Clic en día para ver todas</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* DAY VIEW — Shows all LVs for the selected date              */}
      {/* ============================================================ */}
      {currentView === 'day' && selectedDate && (
        <div className="space-y-3">
          {dayLVs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No hay listas para este día</p>
            </div>
          ) : (
            dayLVs
              .sort((a, b) => a.codigo.localeCompare(b.codigo))
              .map(lv => {
                const sc = statusConfig[lv.status] || statusConfig['PENDIENTE']
                const fc = freqColors[lv.frecuencia] || freqColors['Mensual']
                const StatusIcon = sc.icon
                return (
                  <Card key={lv.id} className={`border-l-4 hover:shadow-lg transition-all cursor-pointer group ${lv.status === 'COMPLETADA' ? 'border-l-emerald-500 bg-emerald-50/30' : lv.status === 'EN_PROGRESO' ? 'border-l-blue-500 bg-blue-50/20' : 'border-l-amber-500 bg-amber-50/20'}`}
                    onClick={() => openLV(lv.id)}>
                    <CardContent className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-lg ${fc.bg} ${fc.text}`}>
                            <span className="text-[10px] font-black leading-none">{lv.codigo.replace('LV-', '')}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-slate-800 truncate group-hover:text-teal-700 transition-colors">{lv.nombre}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500">{lv.sector}</span>
                              <Badge className={`${fc.bg} ${fc.text} ${fc.border} text-[10px] px-1.5 py-0 border`}>{lv.frecuencia}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Quick action buttons */}
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button
                                variant={lv.status === 'COMPLETADA' ? 'default' : 'outline'}
                                size="sm"
                                className={`h-7 text-xs gap-1 ${lv.status === 'COMPLETADA' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-300 text-emerald-700'}`}
                                onClick={(e) => { e.stopPropagation(); handleQuickStatus(lv.id, 'COMPLETADA') }}
                              >
                                <CheckCircle className="h-3 w-3" /> OK
                              </Button>
                            </div>
                          )}
                          {/* Progress */}
                          <div className="w-20">
                            <div className={`text-xs text-right font-bold ${getProgressColor(lv.progress)}`}>{lv.progress}%</div>
                            <div className="h-1.5 rounded-full bg-slate-200 mt-0.5 overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${getProgressBg(lv.progress)}`} style={{ width: `${lv.progress}%` }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-teal-600 group-hover:text-teal-800 transition-colors">
                            <Eye className="h-4 w-4" />
                            <span className="text-[10px] font-semibold hidden sm:inline">Revisar</span>
                          </div>
                        </div>
                      </div>
                      {/* Show motivo if pending */}
                      {lv.status === 'PENDIENTE' && lv.motivoPendiente && (
                        <div className="mt-2 flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700"><span className="font-semibold">Motivo pendiente:</span> {lv.motivoPendiente}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* FREQUENCY VIEW — Shows all LVs for a selected frequency      */}
      {/* ============================================================ */}
      {currentView === 'frequency' && selectedFrequency && (
        <div className="space-y-3">
          {(() => {
            const freqLVs = allLVs
              .filter(lv => lv.frecuencia === selectedFrequency)
              .sort((a, b) => {
                // Sort by status: pendientes first, then en progreso, then completadas
                const statusOrder: Record<string, number> = { 'PENDIENTE': 0, 'EN_PROGRESO': 1, 'COMPLETADA': 2 }
                const statusDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0)
                if (statusDiff !== 0) return statusDiff
                // Then by date
                return (a.scheduledDate || '').localeCompare(b.scheduledDate || '')
              })
            const gc = freqGroupColors[selectedFrequency] || freqGroupColors['Mensual']
            const fc = freqColors[selectedFrequency] || freqColors['Mensual']
            const totalLVs = freqLVs.length
            const doneLVs = freqLVs.filter(l => l.status === 'COMPLETADA').length
            const pendingLVs = freqLVs.filter(l => l.status === 'PENDIENTE').length
            const progressLVs = freqLVs.filter(l => l.status === 'EN_PROGRESO').length
            const avgProg = totalLVs > 0 ? Math.round(freqLVs.reduce((s, l) => s + l.progress, 0) / totalLVs) : 0

            return (
              <>
                {/* Frequency summary header */}
                <Card className={`border-l-4 ${fc.border} overflow-hidden`}>
                  <CardContent className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${gc.bg} text-white`}>
                          <Wrench className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">Listas de Verificación — {selectedFrequency}</h3>
                          <p className="text-sm text-slate-500">{totalLVs} LVs en este período</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-amber-600">{pendingLVs}</div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Pendientes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{progressLVs}</div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">En Progreso</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-emerald-600">{doneLVs}</div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Realizadas</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-teal-700">{avgProg}%</div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">Avance</div>
                          <div className="w-16 h-1.5 rounded-full bg-slate-200 mt-1 overflow-hidden">
                            <div className={`h-full rounded-full ${avgProg === 100 ? 'bg-emerald-500' : avgProg >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${avgProg}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {freqLVs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="text-lg font-medium">No hay listas para esta frecuencia</p>
                  </div>
                ) : (
                  freqLVs.map(lv => {
                    const lvFc = freqColors[lv.frecuencia] || freqColors['Mensual']
                    return (
                      <Card key={lv.id} className={`border-l-4 hover:shadow-lg transition-all cursor-pointer group ${lv.status === 'COMPLETADA' ? 'border-l-emerald-500 bg-emerald-50/30' : lv.status === 'EN_PROGRESO' ? 'border-l-blue-500 bg-blue-50/20' : 'border-l-amber-500 bg-amber-50/20'}`}
                        onClick={() => openLV(lv.id)}>
                        <CardContent className="px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-lg ${lvFc.bg} ${lvFc.text}`}>
                                <span className="text-[10px] font-black leading-none">{lv.codigo.replace('LV-', '')}</span>
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-sm text-slate-800 truncate group-hover:text-teal-700 transition-colors">{lv.nombre}</div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-slate-500">{lv.sector}</span>
                                  <span className="text-xs text-slate-400">·</span>
                                  <span className="text-xs text-slate-500">{lv.scheduledDate ? new Date(lv.scheduledDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }) : '-'}</span>
                                  {lv.responsable && (
                                    <>
                                      <span className="text-xs text-slate-400">·</span>
                                      <span className="text-xs text-slate-500">{lv.responsable}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Quick complete button */}
                              {canEdit && lv.status !== 'COMPLETADA' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                  onClick={(e) => { e.stopPropagation(); handleQuickStatus(lv.id, 'COMPLETADA') }}
                                >
                                  <CheckCircle className="h-3 w-3" /> OK
                                </Button>
                              )}
                              {/* Status badge */}
                              <Badge className={`${statusConfig[lv.status]?.bg || 'bg-slate-100'} ${statusConfig[lv.status]?.text || 'text-slate-600'} text-[10px] gap-1`}>
                                {(() => { const Icon = statusConfig[lv.status]?.icon || Clock; return <Icon className="h-3 w-3" /> })()}
                                {statusConfig[lv.status]?.label}
                              </Badge>
                              {/* Progress */}
                              <div className="w-20">
                                <div className={`text-xs text-right font-bold ${getProgressColor(lv.progress)}`}>{lv.progress}%</div>
                                <div className="h-1.5 rounded-full bg-slate-200 mt-0.5 overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${getProgressBg(lv.progress)}`} style={{ width: `${lv.progress}%` }} />
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-teal-600 group-hover:text-teal-800 transition-colors">
                                <Eye className="h-4 w-4" />
                                <span className="text-[10px] font-semibold hidden sm:inline">Revisar</span>
                              </div>
                            </div>
                          </div>
                          {/* Show motivo if pending */}
                          {lv.status === 'PENDIENTE' && lv.motivoPendiente && (
                            <div className="mt-2 flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-amber-700"><span className="font-semibold">Motivo pendiente:</span> {lv.motivoPendiente}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* ============================================================ */}
      {/* DETAIL VIEW — Single LV with full checklist                  */}
      {/* ============================================================ */}
      {currentView === 'detail' && selectedLV && (
        <div className="space-y-4">
          {/* Header */}
          <Card className="border-teal-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-white border-b border-teal-100 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`${freqColors[selectedLV.frecuencia]?.bg || 'bg-slate-100'} ${freqColors[selectedLV.frecuencia]?.text || 'text-slate-700'} text-xs font-bold`}>
                      {selectedLV.codigo}
                    </Badge>
                    <Badge className={`${freqColors[selectedLV.frecuencia]?.bg || 'bg-slate-100'} ${freqColors[selectedLV.frecuencia]?.text || 'text-slate-700'} text-xs`}>
                      {selectedLV.frecuencia}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{selectedLV.nombre}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {selectedLV.sector} · {formatDateShort(selectedLV.scheduledDate)} · {selectedLV.responsable || 'Sin responsable'}
                  </p>
                </div>
                {/* Progress circle */}
                <div className="text-center shrink-0">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={selectedLV.progress === 100 ? '#10b981' : selectedLV.progress >= 50 ? '#3b82f6' : '#f59e0b'} strokeWidth="3" strokeDasharray={`${selectedLV.progress}, 100`} strokeLinecap="round" />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${getProgressColor(selectedLV.progress)}`}>{selectedLV.progress}%</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handlePrint(selectedLV)}>
                  <Printer className="h-4 w-4" /> Imprimir
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4" /> {uploading ? 'Subiendo...' : 'Adjuntar Respaldo'}
                </Button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadAttachment} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" />
                {canEdit && (
                  <Button size="sm" className="gap-1 bg-teal-600 hover:bg-teal-700 text-white ml-auto" onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                )}
                {canEdit && (
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setDeleteId(selectedLV.id); setDeleteDialogOpen(true) }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Status selector */}
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-semibold text-slate-700 shrink-0">Estado:</Label>
                  {canEdit ? (
                    <div className="flex gap-2">
                      <Button
                        variant={editStatus === 'COMPLETADA' ? 'default' : 'outline'}
                        size="sm"
                        className={`gap-1 ${editStatus === 'COMPLETADA' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-300 text-emerald-700'}`}
                        onClick={() => setEditStatus('COMPLETADA')}
                      >
                        <CheckCircle className="h-4 w-4" /> Realizado
                      </Button>
                      <Button
                        variant={editStatus === 'EN_PROGRESO' ? 'default' : 'outline'}
                        size="sm"
                        className={`gap-1 ${editStatus === 'EN_PROGRESO' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-blue-300 text-blue-700'}`}
                        onClick={() => setEditStatus('EN_PROGRESO')}
                      >
                        <RefreshCw className="h-4 w-4" /> En Progreso
                      </Button>
                      <Button
                        variant={editStatus === 'PENDIENTE' ? 'default' : 'outline'}
                        size="sm"
                        className={`gap-1 ${editStatus === 'PENDIENTE' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'border-amber-300 text-amber-700'}`}
                        onClick={() => setEditStatus('PENDIENTE')}
                      >
                        <Clock className="h-4 w-4" /> Pendiente
                      </Button>
                    </div>
                  ) : (
                    <Badge className={`${statusConfig[selectedLV.status]?.bg} ${statusConfig[selectedLV.status]?.text} gap-1`}>
                      {(() => { const Icon = statusConfig[selectedLV.status]?.icon || Clock; return <Icon className="h-3 w-3" /> })()}
                      {statusConfig[selectedLV.status]?.label}
                    </Badge>
                  )}
                </div>

                {/* Motivo pendiente - only shows when status is PENDIENTE */}
                {editStatus === 'PENDIENTE' && (
                  <div className="mt-3">
                    <Label className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Motivo por el que no se realizó
                    </Label>
                    <Textarea
                      value={editMotivoPendiente}
                      onChange={(e) => setEditMotivoPendiente(e.target.value)}
                      placeholder="Indique el motivo por el cual esta lista queda pendiente..."
                      rows={2}
                      className="mt-1 border-amber-300 focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Attachments */}
              {JSON.parse(selectedLV.attachments || '[]').length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-600 uppercase tracking-wider font-semibold mb-2 flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" /> Documentos Adjuntos (Respaldos)
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {JSON.parse(selectedLV.attachments).map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 hover:border-blue-400 transition-all">
                        <FileText className="h-3.5 w-3.5" />
                        Documento {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checklist preview */}
          {(() => {
            const categories = [...new Set(editItems.map(i => i.category))]
            const categoryLabels: Record<string, string> = { A: 'A. EPP / Materiales', B: 'B. Verificación de Tareas', C: 'C. Inspección / Registros', D: 'D. Dosificaciones / Limpieza' }
            return categories.map(cat => {
              const catItems = editItems.filter(i => i.category === cat)
              const catOk = catItems.filter(i => i.status === 'OK' || i.status === 'N/A').length
              const catProgress = catItems.length > 0 ? Math.round((catOk / catItems.length) * 100) : 0
              return (
                <Card key={cat} className="border border-slate-200">
                  <CardHeader className="py-2 px-4 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-slate-700">{categoryLabels[cat] || `Sección ${cat}`}</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{catOk}/{catItems.length}</span>
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
                                <Input className="h-7 text-xs" value={item.value || ''} onChange={(e) => handleItemFieldChange(item.id!, 'value', e.target.value)} placeholder="Valor" />
                              ) : <span className="text-xs">{item.value || '-'}</span>}
                            </TableCell>
                            <TableCell className="px-2 py-1">
                              {canEdit ? (
                                <Input className="h-7 text-xs" value={item.observation || ''} onChange={(e) => handleItemFieldChange(item.id!, 'observation', e.target.value)} placeholder="Obs." />
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
              <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" /> Comentarios / Observaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {canEdit ? (
                <Textarea value={editObservations} onChange={(e) => setEditObservations(e.target.value)} placeholder="Ingrese comentarios u observaciones..." rows={3} />
              ) : (
                <p className="text-sm text-slate-600">{selectedLV.observations || 'Sin observaciones'}</p>
              )}
            </CardContent>
          </Card>

          {/* Save button at bottom */}
          {canEdit && (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={goBack}>Cancelar</Button>
              <Button className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar Todos los Cambios'}
              </Button>
            </div>
          )}
        </div>
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
