'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Wallet,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Upload,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ============================================================
// Types
// ============================================================
interface AnticipoPeriod {
  id: string
  name: string
  month: number
  year: number
  status: string
  totalAmount: number
  anticipoCount: number
  createdAt: string
}

interface Anticipo {
  id: string
  numero: number
  nombre: string
  rut: string
  monto: number
  cuentaBancaria: string
  periodoId: string
  status: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
  periodo?: AnticipoPeriod
}

// ============================================================
// Status config
// ============================================================
const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
  PENDIENTE: { label: 'Pendiente', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-l-amber-500', icon: <Clock className="h-3.5 w-3.5" /> },
  PAGADO: { label: 'Pagado', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-l-emerald-500', icon: <CheckCircle className="h-3.5 w-3.5" /> },
  RECHAZADO: { label: 'Rechazado', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-l-red-500', icon: <XCircle className="h-3.5 w-3.5" /> },
}

// ============================================================
// Props
// ============================================================
interface AnticiposPanelProps {
  userRole?: string
  initialStatusFilter?: string
  onStatusFilterConsumed?: () => void
}

// ============================================================
// Component
// ============================================================
export default function AnticiposPanel({ userRole = 'USER', initialStatusFilter, onStatusFilterConsumed }: AnticiposPanelProps) {
  const { toast } = useToast()
  const isAdmin = userRole === 'ADMIN'
  const isSupervisor = userRole === 'SUPERVISOR'
  const canEdit = isAdmin || isSupervisor

  // --- View state ---
  const [currentView, setCurrentView] = useState<'periods' | 'period-detail'>('periods')
  const [periods, setPeriods] = useState<AnticipoPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<AnticipoPeriod | null>(null)
  const [anticipos, setAnticipos] = useState<Anticipo[]>([])
  const [loading, setLoading] = useState(false)

  // --- Filters ---
  const [filterStatus, setFilterStatus] = useState<string>(initialStatusFilter || 'all')
  const [searchQuery, setSearchQuery] = useState('')

  // --- Dialogs ---
  const [periodFormOpen, setPeriodFormOpen] = useState(false)
  const [anticipoFormOpen, setAnticipoFormOpen] = useState(false)
  const [editingAnticipo, setEditingAnticipo] = useState<Anticipo | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'period' | 'anticipo'; id: string } | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // --- Forms ---
  const [periodForm, setPeriodForm] = useState({ name: '', month: '', year: '' })
  const [anticipoForm, setAnticipoForm] = useState({ nombre: '', rut: '', monto: '', cuentaBancaria: '' })

  // --- Import ---
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  // ============================================================
  // React to initialStatusFilter from parent (dashboard click)
  // ============================================================
  useEffect(() => {
    if (initialStatusFilter && initialStatusFilter !== 'all') {
      setFilterStatus(initialStatusFilter)
      if (onStatusFilterConsumed) onStatusFilterConsumed()
    }
  }, [initialStatusFilter])

  // ============================================================
  // Data fetching
  // ============================================================
  const fetchPeriods = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/anticipo-periods')
      if (res.ok) {
        const data = await res.json()
        setPeriods(data)
      }
    } catch (err) {
      console.error('Error fetching periods:', err)
      toast({ title: 'Error', description: 'No se pudieron cargar los periodos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchAnticipos = async (periodoId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/anticipos?periodoId=${periodoId}`)
      if (res.ok) {
        const data = await res.json()
        setAnticipos(data)
      }
    } catch (err) {
      console.error('Error fetching anticipos:', err)
      toast({ title: 'Error', description: 'No se pudieron cargar los anticipos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPeriods()
  }, [])

  // ============================================================
  // Period actions
  // ============================================================
  const handleCreatePeriod = async () => {
    if (!periodForm.name || !periodForm.month || !periodForm.year) {
      toast({ title: 'Campos requeridos', description: 'Nombre, mes y año son obligatorios', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch('/api/anticipo-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: periodForm.name,
          month: Number(periodForm.month),
          year: Number(periodForm.year),
        }),
      })
      if (res.ok) {
        toast({ title: 'Periodo creado', description: 'El periodo de anticipos fue creado exitosamente' })
        setPeriodFormOpen(false)
        setPeriodForm({ name: '', month: '', year: '' })
        fetchPeriods()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo crear el periodo', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  const handleOpenPeriod = (period: AnticipoPeriod) => {
    setSelectedPeriod(period)
    setCurrentView('period-detail')
    fetchAnticipos(period.id)
  }

  const handleBackToPeriods = () => {
    setCurrentView('periods')
    setSelectedPeriod(null)
    setAnticipos([])
    fetchPeriods()
  }

  const handleTogglePeriodStatus = async (period: AnticipoPeriod) => {
    const newStatus = period.status === 'ABIERTO' ? 'CERRADO' : 'ABIERTO'
    try {
      const res = await fetch(`/api/anticipo-periods/${period.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast({ title: `Periodo ${newStatus === 'CERRADO' ? 'cerrado' : 'abierto'}`, description: `El periodo fue ${newStatus === 'CERRADO' ? 'cerrado' : 'abierto'} exitosamente` })
        if (selectedPeriod?.id === period.id) {
          setSelectedPeriod({ ...period, status: newStatus })
        }
        fetchPeriods()
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el periodo', variant: 'destructive' })
    }
  }

  // ============================================================
  // Anticipo actions
  // ============================================================
  const handleCreateAnticipo = async () => {
    if (!anticipoForm.nombre || !anticipoForm.rut || !anticipoForm.monto) {
      toast({ title: 'Campos requeridos', description: 'Nombre, RUT y monto son obligatorios', variant: 'destructive' })
      return
    }
    if (!selectedPeriod) return

    try {
      const res = await fetch('/api/anticipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...anticipoForm,
          monto: Number(anticipoForm.monto),
          periodoId: selectedPeriod.id,
        }),
      })
      if (res.ok) {
        toast({ title: 'Anticipo creado', description: 'El anticipo fue agregado exitosamente' })
        setAnticipoFormOpen(false)
        setAnticipoForm({ nombre: '', rut: '', monto: '', cuentaBancaria: '' })
        fetchAnticipos(selectedPeriod.id)
        fetchPeriods()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error || 'No se pudo crear el anticipo', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  const handleUpdateAnticipo = async () => {
    if (!editingAnticipo) return
    try {
      const res = await fetch(`/api/anticipos/${editingAnticipo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: anticipoForm.nombre,
          rut: anticipoForm.rut,
          monto: Number(anticipoForm.monto),
          cuentaBancaria: anticipoForm.cuentaBancaria,
        }),
      })
      if (res.ok) {
        toast({ title: 'Anticipo actualizado', description: 'El anticipo fue actualizado exitosamente' })
        setAnticipoFormOpen(false)
        setEditingAnticipo(null)
        if (selectedPeriod) fetchAnticipos(selectedPeriod.id)
        fetchPeriods()
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el anticipo', variant: 'destructive' })
    }
  }

  const handleAnticipoStatusChange = async (anticipoId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/anticipos/${anticipoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast({ title: 'Estado actualizado', description: `El anticipo fue marcado como ${statusConfig[newStatus]?.label || newStatus}` })
        if (selectedPeriod) fetchAnticipos(selectedPeriod.id)
        fetchPeriods()
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const endpoint = deleteTarget.type === 'period'
        ? `/api/anticipo-periods/${deleteTarget.id}`
        : `/api/anticipos/${deleteTarget.id}`
      const res = await fetch(endpoint, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Eliminado', description: 'El registro fue eliminado exitosamente' })
        if (deleteTarget.type === 'period') {
          fetchPeriods()
          if (selectedPeriod?.id === deleteTarget.id) handleBackToPeriods()
        } else {
          if (selectedPeriod) fetchAnticipos(selectedPeriod.id)
          fetchPeriods()
        }
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' })
    } finally {
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }

  // ============================================================
  // Import from Excel
  // ============================================================
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedPeriod) return

    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()

      // Now parse the Excel file server-side by reading it directly
      // We'll use a client-side approach with a library
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const wb = XLSX.read(arrayBuffer)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })

      // Skip header rows (first 2 rows are title and headers)
      const dataRows = rows.slice(2)
      let created = 0

      for (const row of dataRows) {
        if (!row || row.length < 4) continue
        const nombre = String(row[1] || '').trim()
        const rut = String(row[2] || '').trim()
        const monto = Number(String(row[3] || '0').replace(/[^0-9.-]/g, ''))
        const cuentaBancaria = String(row[4] || '').trim()

        if (!nombre || !rut || !monto) continue

        try {
          const res = await fetch('/api/anticipos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, rut, monto, cuentaBancaria, periodoId: selectedPeriod.id }),
          })
          if (res.ok) created++
        } catch { /* skip */ }
      }

      toast({ title: 'Importación completa', description: `Se importaron ${created} anticipos` })
      fetchAnticipos(selectedPeriod.id)
      fetchPeriods()
      setImportDialogOpen(false)
    } catch (err) {
      console.error('Error importing:', err)
      toast({ title: 'Error', description: 'No se pudo importar el archivo', variant: 'destructive' })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ============================================================
  // Export to Excel
  // ============================================================
  const handleExportExcel = async () => {
    if (!selectedPeriod) return
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      const header = ['N°', 'NOMBRE', 'RUT', 'MONTO ANTICIPO', 'CUENTA BANCARIA', 'ESTADO']
      const data = filteredAnticipos.map((a, i) => [
        i + 1,
        a.nombre,
        a.rut,
        a.monto,
        a.cuentaBancaria,
        statusConfig[a.status]?.label || a.status,
      ])

      const totalRow = ['', '', 'TOTAL', filteredAnticipos.reduce((s, a) => s + a.monto, 0), '', '']

      const wsData = [
        [`ANTICIPOS "${selectedPeriod.name.toUpperCase()}"`],
        ['', '', 'COMENTARIO'],
        header,
        ...data,
        totalRow,
      ]

      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // Set column widths
      ws['!cols'] = [
        { wch: 5 },
        { wch: 35 },
        { wch: 15 },
        { wch: 18 },
        { wch: 45 },
        { wch: 12 },
      ]

      XLSX.utils.book_append_sheet(wb, ws, selectedPeriod.name.substring(0, 31))
      XLSX.writeFile(wb, `Anticipos_${selectedPeriod.name.replace(/\s+/g, '_')}.xlsx`)

      toast({ title: 'Exportado', description: 'El archivo Excel fue descargado' })
    } catch (err) {
      console.error('Error exporting:', err)
      toast({ title: 'Error', description: 'No se pudo exportar', variant: 'destructive' })
    }
  }

  // ============================================================
  // Format helpers
  // ============================================================
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
  }

  // ============================================================
  // Filtered anticipos
  // ============================================================
  const filteredAnticipos = anticipos.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return a.nombre.toLowerCase().includes(q) || a.rut.toLowerCase().includes(q)
    }
    return true
  })

  const totalMonto = filteredAnticipos.reduce((s, a) => s + a.monto, 0)

  // ============================================================
  // Month names
  // ============================================================
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* PERIODS LIST VIEW                                            */}
      {/* ============================================================ */}
      {currentView === 'periods' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-orange-600" />
                Anticipos
              </h2>
              <p className="text-sm text-slate-500 mt-1">Gestión de anticipos por periodo</p>
            </div>
            {canEdit && (
              <Button className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white" onClick={() => setPeriodFormOpen(true)}>
                <Plus className="h-4 w-4" /> Nuevo Periodo
              </Button>
            )}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ABIERTO">Abierto</SelectItem>
                <SelectItem value="CERRADO">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500">Cargando periodos...</div>
          ) : periods.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No hay periodos de anticipos</p>
              <p className="text-sm mt-1">Crea un nuevo periodo para comenzar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {periods
                .filter(p => filterStatus === 'all' || p.status === filterStatus)
                .map(period => {
                  const sc = period.status === 'ABIERTO'
                    ? { color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300' }
                    : { color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-300' }
                  return (
                    <Card
                      key={period.id}
                      className={`border-l-4 ${sc.borderColor} cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]`}
                      onClick={() => handleOpenPeriod(period)}
                    >
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-bold text-slate-800">{period.name}</CardTitle>
                          <Badge className={`${sc.bgColor} ${sc.color} text-xs`}>
                            {period.status === 'ABIERTO' ? 'Abierto' : 'Cerrado'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-1">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Anticipos</span>
                            <span className="font-semibold text-slate-700">{period.anticipoCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Monto Total</span>
                            <span className="font-bold text-orange-700">{formatCurrency(period.totalAmount)}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            {canEdit && period.status === 'ABIERTO' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={(e) => { e.stopPropagation(); handleTogglePeriodStatus(period) }}
                              >
                                Cerrar Periodo
                              </Button>
                            )}
                            {canEdit && period.status === 'CERRADO' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={(e) => { e.stopPropagation(); handleTogglePeriodStatus(period) }}
                              >
                                Reabrir Periodo
                              </Button>
                            )}
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-7 text-red-500 hover:text-red-700"
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'period', id: period.id }); setDeleteDialogOpen(true) }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
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
      {/* PERIOD DETAIL VIEW                                           */}
      {/* ============================================================ */}
      {currentView === 'period-detail' && selectedPeriod && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBackToPeriods} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Volver
              </Button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-orange-600" />
                  Anticipos - {selectedPeriod.name}
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedPeriod.anticipoCount} anticipos | Total: {formatCurrency(totalMonto)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={handleExportExcel}>
                <Download className="h-4 w-4" /> Exportar
              </Button>
              {canEdit && selectedPeriod.status === 'ABIERTO' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setImportDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4" /> Importar Excel
                  </Button>
                  <Button
                    className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => {
                      setEditingAnticipo(null)
                      setAnticipoForm({ nombre: '', rut: '', monto: '', cuentaBancaria: '' })
                      setAnticipoFormOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4" /> Agregar Anticipo
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="PAGADO">Pagado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar por nombre o RUT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[250px] h-8 text-xs"
            />
            <div className="ml-auto text-sm text-slate-500">
              Mostrando {filteredAnticipos.length} de {anticipos.length} | Total: <span className="font-bold text-orange-700">{formatCurrency(totalMonto)}</span>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 text-slate-500">Cargando anticipos...</div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[50px] text-center px-3 py-2 text-xs font-semibold">N°</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-semibold">Nombre</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-semibold w-[120px]">RUT</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-semibold text-right w-[130px]">Monto Anticipo</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-semibold">Cuenta Bancaria</TableHead>
                      <TableHead className="px-3 py-2 text-xs font-semibold text-center w-[100px]">Estado</TableHead>
                      {(canEdit || isAdmin) && (
                        <TableHead className="px-3 py-2 text-xs font-semibold text-right w-[120px]">Acciones</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnticipos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={canEdit ? 7 : 6} className="text-center py-8 text-slate-400">
                          No hay anticipos que coincidan con los filtros
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAnticipos.map((anticipo, idx) => {
                        const sc = statusConfig[anticipo.status] || statusConfig.PENDIENTE
                        return (
                          <TableRow key={anticipo.id} className={`border-l-4 ${sc.borderColor} hover:bg-slate-50/50`}>
                            <TableCell className="text-center font-bold text-slate-500 px-3 py-2 text-xs">{idx + 1}</TableCell>
                            <TableCell className="font-medium px-3 py-2 text-sm text-slate-800">{anticipo.nombre}</TableCell>
                            <TableCell className="px-3 py-2 text-xs text-slate-600">{anticipo.rut}</TableCell>
                            <TableCell className="text-right px-3 py-2 text-sm font-bold text-orange-700">{formatCurrency(anticipo.monto)}</TableCell>
                            <TableCell className="px-3 py-2 text-xs text-slate-600">{anticipo.cuentaBancaria || '-'}</TableCell>
                            <TableCell className="text-center px-3 py-2">
                              <Badge className={`${sc.bgColor} ${sc.color} text-xs gap-1`}>
                                {sc.icon} {sc.label}
                              </Badge>
                            </TableCell>
                            {(canEdit || isAdmin) && (
                              <TableCell className="text-right px-3 py-2">
                                <div className="flex justify-end gap-1">
                                  {anticipo.status === 'PENDIENTE' && (
                                    <>
                                      <Button
                                        size="sm"
                                        className="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => handleAnticipoStatusChange(anticipo.id, 'PAGADO')}
                                        title="Marcar como Pagado"
                                      >
                                        <CheckCircle className="h-3 w-3" /> Pagar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-7 gap-1 text-xs"
                                        onClick={() => handleAnticipoStatusChange(anticipo.id, 'RECHAZADO')}
                                        title="Rechazar"
                                      >
                                        <XCircle className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                  {canEdit && selectedPeriod.status === 'ABIERTO' && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={() => {
                                          setEditingAnticipo(anticipo)
                                          setAnticipoForm({
                                            nombre: anticipo.nombre,
                                            rut: anticipo.rut,
                                            monto: String(anticipo.monto),
                                            cuentaBancaria: anticipo.cuentaBancaria,
                                          })
                                          setAnticipoFormOpen(true)
                                        }}
                                        title="Editar"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                        onClick={() => setDeleteTarget({ type: 'anticipo', id: anticipo.id })}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })
                    )}
                    {filteredAnticipos.length > 0 && (
                      <TableRow className="bg-orange-50 font-bold">
                        <TableCell colSpan={3} className="text-right px-3 py-2 text-sm text-slate-700">TOTAL</TableCell>
                        <TableCell className="text-right px-3 py-2 text-sm text-orange-700">{formatCurrency(totalMonto)}</TableCell>
                        <TableCell colSpan={canEdit ? 3 : 2} />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* DIALOGS                                                      */}
      {/* ============================================================ */}

      {/* Period Form Dialog */}
      <Dialog open={periodFormOpen} onOpenChange={setPeriodFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Periodo de Anticipos</DialogTitle>
            <DialogDescription>Crea un nuevo periodo para registrar los anticipos del mes</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del Periodo</Label>
              <Input
                placeholder="Ej: Junio 2026"
                value={periodForm.name}
                onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mes</Label>
                <Select
                  value={periodForm.month}
                  onValueChange={(v) => setPeriodForm({ ...periodForm, month: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Año</Label>
                <Input
                  type="number"
                  placeholder="2026"
                  value={periodForm.year}
                  onChange={(e) => setPeriodForm({ ...periodForm, year: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodFormOpen(false)}>Cancelar</Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleCreatePeriod}>Crear Periodo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anticipo Form Dialog */}
      <Dialog open={anticipoFormOpen} onOpenChange={setAnticipoFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAnticipo ? 'Editar Anticipo' : 'Agregar Anticipo'}</DialogTitle>
            <DialogDescription>
              {editingAnticipo ? 'Modifica los datos del anticipo' : 'Ingresa los datos del nuevo anticipo'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre Completo *</Label>
              <Input
                placeholder="Ej: Cesar Edmundo Adasme Aravena"
                value={anticipoForm.nombre}
                onChange={(e) => setAnticipoForm({ ...anticipoForm, nombre: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>RUT *</Label>
                <Input
                  placeholder="Ej: 7151017-4"
                  value={anticipoForm.rut}
                  onChange={(e) => setAnticipoForm({ ...anticipoForm, rut: e.target.value })}
                />
              </div>
              <div>
                <Label>Monto Anticipo *</Label>
                <Input
                  type="number"
                  placeholder="Ej: 100000"
                  value={anticipoForm.monto}
                  onChange={(e) => setAnticipoForm({ ...anticipoForm, monto: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Cuenta Bancaria</Label>
              <Input
                placeholder="Ej: BCO ESTADO CUENTA RUT"
                value={anticipoForm.cuentaBancaria}
                onChange={(e) => setAnticipoForm({ ...anticipoForm, cuentaBancaria: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAnticipoFormOpen(false); setEditingAnticipo(null) }}>Cancelar</Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={editingAnticipo ? handleUpdateAnticipo : handleCreateAnticipo}>
              {editingAnticipo ? 'Guardar Cambios' : 'Agregar Anticipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar desde Excel</DialogTitle>
            <DialogDescription>
              Importa anticipos desde un archivo Excel (.xlsx). El archivo debe tener las columnas: N°, Nombre, RUT, Monto Anticipo, Cuenta Bancaria
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-orange-400 transition-colors">
              <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-500 mb-3">Selecciona el archivo Excel</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportExcel}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? 'Importando...' : 'Seleccionar Archivo'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'period'
                ? 'Se eliminará el periodo y todos sus anticipos. Esta acción no se puede deshacer.'
                : 'Se eliminará el anticipo. Esta acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
