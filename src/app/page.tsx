'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Plus,
  Pencil,
  Trash2,
  LayoutDashboard,
  List,
  LayoutGrid,
  GanttChart,
  Settings,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  Image as ImageIcon,
  Download,
  History,
  Clock,
} from 'lucide-react'
import html2canvas from 'html2canvas-pro'

// Types
interface Task {
  id: string
  description: string
  sector: string
  repairType: string
  priority: string
  status: string
  responsible: string | null
  estimatedTime: string | null
  amount: number | null
  startDate: string | null
  endDate: string | null
  comments: string | null
  beforePhotos: string
  afterPhotos: string
  createdAt: string
  updatedAt: string
}

interface Sector {
  id: string
  name: string
}

interface RepairType {
  id: string
  name: string
}

interface Priority {
  id: string
  name: string
  color: string
  order: number
}

interface TaskHistoryEntry {
  id: string
  taskId: string
  action: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  changedBy: string | null
  createdAt: string
}

const statusOptions = ['Pendiente', 'En Proceso', 'Completada', 'Cancelada']

const statusColors: Record<string, string> = {
  Pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'En Proceso': 'bg-blue-100 text-blue-800 border-blue-300',
  Completada: 'bg-green-100 text-green-800 border-green-300',
  Cancelada: 'bg-red-100 text-red-800 border-red-300',
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'dashboard' | 'table' | 'cards' | 'gantt'>('dashboard')
  const [filterSector, setFilterSector] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRepairType, setFilterRepairType] = useState('all')

  // Dialog states
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Photo viewer
  const [fullscreenPhotos, setFullscreenPhotos] = useState<string[]>([])
  const [fullscreenIndex, setFullscreenIndex] = useState(0)

  // History viewer
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [historyTaskId, setHistoryTaskId] = useState<string | null>(null)
  const [historyEntries, setHistoryEntries] = useState<TaskHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [downloadingGantt, setDownloadingGantt] = useState(false)

  // Task form
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    description: '',
    sector: '',
    repairType: '',
    priority: '',
    status: 'Pendiente',
    responsible: '',
    estimatedTime: '',
    amount: '',
    startDate: '',
    endDate: '',
    comments: '',
    beforePhotos: [] as string[],
    afterPhotos: [] as string[],
  })

  // Config form
  const [configTab, setConfigTab] = useState<'sectors' | 'repairTypes' | 'priorities'>('sectors')
  const [newSectorName, setNewSectorName] = useState('')
  const [newRepairTypeName, setNewRepairTypeName] = useState('')
  const [newPriorityName, setNewPriorityName] = useState('')
  const [newPriorityColor, setNewPriorityColor] = useState('#6b7280')
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null)
  const [editingRepairTypeId, setEditingRepairTypeId] = useState<string | null>(null)
  const [editingPriorityId, setEditingPriorityId] = useState<string | null>(null)
  const [editSectorName, setEditSectorName] = useState('')
  const [editRepairTypeName, setEditRepairTypeName] = useState('')
  const [editPriorityName, setEditPriorityName] = useState('')
  const [editPriorityColor, setEditPriorityColor] = useState('')

  // Fetch functions
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      }
    } catch (err) {
      console.error('Error fetching tasks:', err)
    }
  }, [])

  const fetchSectors = useCallback(async () => {
    try {
      const res = await fetch('/api/sectors')
      if (res.ok) setSectors(await res.json())
    } catch (err) {
      console.error('Error fetching sectors:', err)
    }
  }, [])

  const fetchRepairTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/repair-types')
      if (res.ok) setRepairTypes(await res.json())
    } catch (err) {
      console.error('Error fetching repair types:', err)
    }
  }, [])

  const fetchPriorities = useCallback(async () => {
    try {
      const res = await fetch('/api/priorities')
      if (res.ok) setPriorities(await res.json())
    } catch (err) {
      console.error('Error fetching priorities:', err)
    }
  }, [])

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([fetchTasks(), fetchSectors(), fetchRepairTypes(), fetchPriorities()])
      setLoading(false)
    }
    loadAll()
  }, [fetchTasks, fetchSectors, fetchRepairTypes, fetchPriorities])

  // Task CRUD
  const handleSaveTask = async () => {
    try {
      const body = {
        ...formData,
        beforePhotos: JSON.stringify(formData.beforePhotos),
        afterPhotos: JSON.stringify(formData.afterPhotos),
      }

      if (editingTask) {
        await fetch('/api/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTask.id, ...body }),
        })
      } else {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }

      setTaskDialogOpen(false)
      setEditingTask(null)
      resetForm()
      fetchTasks()
    } catch (err) {
      console.error('Error saving task:', err)
    }
  }

  const handleDeleteTask = async () => {
    if (!deleteId) return
    try {
      await fetch(`/api/tasks?id=${deleteId}`, { method: 'DELETE' })
      setDeleteDialogOpen(false)
      setDeleteId(null)
      fetchTasks()
    } catch (err) {
      console.error('Error deleting task:', err)
    }
  }

  const openEditTask = (task: Task) => {
    setEditingTask(task)
    setFormData({
      description: task.description,
      sector: task.sector,
      repairType: task.repairType,
      priority: task.priority,
      status: task.status,
      responsible: task.responsible || '',
      estimatedTime: task.estimatedTime || '',
      amount: task.amount?.toString() || '',
      startDate: task.startDate ? task.startDate.split('T')[0] : '',
      endDate: task.endDate ? task.endDate.split('T')[0] : '',
      comments: task.comments || '',
      beforePhotos: JSON.parse(task.beforePhotos || '[]'),
      afterPhotos: JSON.parse(task.afterPhotos || '[]'),
    })
    setTaskDialogOpen(true)
  }

  const openCreateTask = () => {
    setEditingTask(null)
    resetForm()
    setTaskDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      description: '',
      sector: sectors[0]?.name || '',
      repairType: repairTypes[0]?.name || '',
      priority: priorities[0]?.name || '',
      status: 'Pendiente',
      responsible: '',
      estimatedTime: '',
      amount: '',
      startDate: '',
      endDate: '',
      comments: '',
      beforePhotos: [],
      afterPhotos: [],
    })
  }

  // Photo upload
  const handlePhotoUpload = async (file: File, type: 'before' | 'after') => {
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formDataUpload })
      if (res.ok) {
        const data = await res.json()
        if (type === 'before') {
          setFormData(prev => ({ ...prev, beforePhotos: [...prev.beforePhotos, data.url] }))
        } else {
          setFormData(prev => ({ ...prev, afterPhotos: [...prev.afterPhotos, data.url] }))
        }
      }
    } catch (err) {
      console.error('Error uploading photo:', err)
    }
  }

  const removePhoto = (index: number, type: 'before' | 'after') => {
    if (type === 'before') {
      setFormData(prev => ({
        ...prev,
        beforePhotos: prev.beforePhotos.filter((_, i) => i !== index),
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        afterPhotos: prev.afterPhotos.filter((_, i) => i !== index),
      }))
    }
  }

  // Config CRUD
  const handleAddSector = async () => {
    if (!newSectorName.trim()) return
    await fetch('/api/sectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSectorName.trim() }),
    })
    setNewSectorName('')
    fetchSectors()
  }

  const handleUpdateSector = async (id: string) => {
    if (!editSectorName.trim()) return
    await fetch('/api/sectors', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editSectorName.trim() }),
    })
    setEditingSectorId(null)
    fetchSectors()
  }

  const handleDeleteSector = async (id: string) => {
    await fetch(`/api/sectors?id=${id}`, { method: 'DELETE' })
    fetchSectors()
  }

  const handleAddRepairType = async () => {
    if (!newRepairTypeName.trim()) return
    await fetch('/api/repair-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRepairTypeName.trim() }),
    })
    setNewRepairTypeName('')
    fetchRepairTypes()
  }

  const handleUpdateRepairType = async (id: string) => {
    if (!editRepairTypeName.trim()) return
    await fetch('/api/repair-types', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editRepairTypeName.trim() }),
    })
    setEditingRepairTypeId(null)
    fetchRepairTypes()
  }

  const handleDeleteRepairType = async (id: string) => {
    await fetch(`/api/repair-types?id=${id}`, { method: 'DELETE' })
    fetchRepairTypes()
  }

  const handleAddPriority = async () => {
    if (!newPriorityName.trim()) return
    await fetch('/api/priorities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPriorityName.trim(), color: newPriorityColor, order: priorities.length + 1 }),
    })
    setNewPriorityName('')
    setNewPriorityColor('#6b7280')
    fetchPriorities()
  }

  const handleUpdatePriority = async (id: string) => {
    if (!editPriorityName.trim()) return
    await fetch('/api/priorities', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editPriorityName.trim(), color: editPriorityColor }),
    })
    setEditingPriorityId(null)
    fetchPriorities()
  }

  const handleDeletePriority = async (id: string) => {
    await fetch(`/api/priorities?id=${id}`, { method: 'DELETE' })
    fetchPriorities()
  }

  // Filtered tasks
  const filteredTasks = tasks.filter(t => {
    if (filterSector !== 'all' && t.sector !== filterSector) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterRepairType !== 'all' && t.repairType !== filterRepairType) return false
    return true
  })

  // Stats
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'Completada').length
  const inProgressTasks = tasks.filter(t => t.status === 'En Proceso').length
  const pendingTasks = tasks.filter(t => t.status === 'Pendiente').length
  const totalAmount = tasks.reduce((sum, t) => sum + (t.amount || 0), 0)
  const completedAmount = tasks.filter(t => t.status === 'Completada').reduce((sum, t) => sum + (t.amount || 0), 0)
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const getPriorityColor = (name: string) => {
    const p = priorities.find(pr => pr.name === name)
    return p?.color || '#6b7280'
  }

  // Gantt chart helpers
  const tasksWithDates = filteredTasks.filter(t => t.startDate && t.endDate)
  const ganttStartDate = tasksWithDates.length > 0
    ? new Date(Math.min(...tasksWithDates.map(t => new Date(t.startDate!).getTime())))
    : new Date()
  const ganttEndDate = tasksWithDates.length > 0
    ? new Date(Math.max(...tasksWithDates.map(t => new Date(t.endDate!).getTime())))
    : new Date()

  // Extend gantt range slightly
  const ganttRangeStart = new Date(ganttStartDate)
  ganttRangeStart.setDate(ganttRangeStart.getDate() - 2)
  const ganttRangeEnd = new Date(ganttEndDate)
  ganttRangeEnd.setDate(ganttRangeEnd.getDate() + 2)

  const totalGanttDays = Math.max(1, Math.ceil((ganttRangeEnd.getTime() - ganttRangeStart.getTime()) / (1000 * 60 * 60 * 24)))

  const getBarPosition = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const leftPercent = ((start.getTime() - ganttRangeStart.getTime()) / (ganttRangeEnd.getTime() - ganttRangeStart.getTime())) * 100
    const widthPercent = ((end.getTime() - start.getTime()) / (ganttRangeEnd.getTime() - ganttRangeStart.getTime())) * 100
    return { left: Math.max(0, leftPercent), width: Math.max(1, widthPercent) }
  }

  // Generate day columns for gantt
  const ganttDays: Date[] = []
  for (let d = new Date(ganttRangeStart); d <= ganttRangeEnd; d.setDate(d.getDate() + 1)) {
    ganttDays.push(new Date(d))
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
  }

  // History functions
  const openHistory = async (taskId: string) => {
    setHistoryTaskId(taskId)
    setHistoryDialogOpen(true)
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/task-history?taskId=${taskId}`)
      if (res.ok) {
        setHistoryEntries(await res.json())
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    }
    setHistoryLoading(false)
  }

  // Gantt download
  const downloadGantt = async () => {
    setDownloadingGantt(true)
    try {
      const ganttEl = document.getElementById('gantt-chart-content')
      if (!ganttEl) return
      const canvas = await html2canvas(ganttEl, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `gantt-planificacion-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Error downloading Gantt:', err)
    }
    setDownloadingGantt(false)
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      creada: 'Tarea creada',
      actualizada: 'Campo actualizado',
      eliminada: 'Tarea eliminada',
      cambio_estado: 'Cambio de estado',
    }
    return labels[action] || action
  }

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      creada: 'bg-green-100 text-green-700 border-green-200',
      actualizada: 'bg-blue-100 text-blue-700 border-blue-200',
      eliminada: 'bg-red-100 text-red-700 border-red-200',
      cambio_estado: 'bg-purple-100 text-purple-700 border-purple-200',
    }
    return colors[action] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getActionIcon = (action: string) => {
    if (action === 'creada') return '✓'
    if (action === 'eliminada') return '✗'
    if (action === 'cambio_estado') return '⟳'
    return '✎'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Planificación de Mantención</h1>
              <p className="text-sm text-gray-500">Residencial - Club House y Áreas Comunes</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={openCreateTask} size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Nueva Tarea
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfigDialogOpen(true)} className="gap-1">
                <Settings className="h-4 w-4" /> Configurar
              </Button>
              <Button variant="outline" size="sm" onClick={() => openHistory('all')} className="gap-1">
                <History className="h-4 w-4" /> Historial
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* View Tabs */}
      <div className="max-w-[1600px] mx-auto px-4 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex bg-white rounded-lg border p-1 gap-1">
            <Button
              variant={view === 'dashboard' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('dashboard')}
              className="gap-1"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Button>
            <Button
              variant={view === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('table')}
              className="gap-1"
            >
              <List className="h-4 w-4" /> Tabla
            </Button>
            <Button
              variant={view === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('cards')}
              className="gap-1"
            >
              <LayoutGrid className="h-4 w-4" /> Tarjetas
            </Button>
            <Button
              variant={view === 'gantt' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('gantt')}
              className="gap-1"
            >
              <GanttChart className="h-4 w-4" /> Gantt
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterSector} onValueChange={setFilterSector}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Sectores</SelectItem>
                {sectors.map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {priorities.map(p => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {statusOptions.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRepairType} onValueChange={setFilterRepairType}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Tipo Rep." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Tipos</SelectItem>
                {repairTypes.map(rt => (
                  <SelectItem key={rt.id} value={rt.name}>{rt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 pb-8">
        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Tareas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{totalTasks}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-600">Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{pendingTasks}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-600">En Proceso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{inProgressTasks}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600">Completadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{completedTasks}</div>
                </CardContent>
              </Card>
            </div>

            {/* Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Progreso General</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>{completedTasks} de {totalTasks} tareas completadas</span>
                    <span className="font-bold">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Presupuesto ejecutado: {formatCurrency(completedAmount)}</span>
                    <span>Total: {formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* By Sector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Por Sector</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sectors.map(sector => {
                      const sectorTasks = tasks.filter(t => t.sector === sector.name)
                      if (sectorTasks.length === 0) return null
                      const sectorCompleted = sectorTasks.filter(t => t.status === 'Completada').length
                      const percent = Math.round((sectorCompleted / sectorTasks.length) * 100)
                      return (
                        <div key={sector.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{sector.name}</span>
                            <span>{sectorCompleted}/{sectorTasks.length} ({percent}%)</span>
                          </div>
                          <Progress value={percent} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Por Prioridad</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {priorities.map(priority => {
                      const pTasks = tasks.filter(t => t.priority === priority.name)
                      if (pTasks.length === 0) return null
                      const pCompleted = pTasks.filter(t => t.status === 'Completada').length
                      const percent = Math.round((pCompleted / pTasks.length) * 100)
                      return (
                        <div key={priority.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: priority.color }}></span>
                              {priority.name}
                            </span>
                            <span>{pCompleted}/{pTasks.length} ({percent}%)</span>
                          </div>
                          <Progress value={percent} className="h-2" />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Tasks */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tareas Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks.slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getPriorityColor(task.priority) }}></span>
                          <span className="text-sm font-medium truncate">{task.description}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{task.sector} · {task.repairType}</div>
                      </div>
                      <Badge variant="outline" className={statusColors[task.status] || ''}>
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Table View */}
        {view === 'table' && (
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Descripción</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Tiempo Est.</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Término</TableHead>
                      <TableHead>Fotos</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                          No hay tareas que coincidan con los filtros
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTasks.map(task => {
                        const beforePhotos = JSON.parse(task.beforePhotos || '[]') as string[]
                        const afterPhotos = JSON.parse(task.afterPhotos || '[]') as string[]
                        return (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium max-w-[250px]">
                              <div className="truncate" title={task.description}>{task.description}</div>
                              {task.comments && (
                                <div className="text-xs text-gray-400 mt-1 truncate" title={task.comments}>{task.comments}</div>
                              )}
                            </TableCell>
                            <TableCell><Badge variant="secondary">{task.sector}</Badge></TableCell>
                            <TableCell className="text-sm">{task.repairType}</TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getPriorityColor(task.priority) }}></span>
                                {task.priority}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusColors[task.status] || ''}>
                                {task.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{task.responsible || '-'}</TableCell>
                            <TableCell className="text-sm">{task.estimatedTime || '-'}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(task.amount)}</TableCell>
                            <TableCell className="text-sm">{formatDate(task.startDate)}</TableCell>
                            <TableCell className="text-sm">{formatDate(task.endDate)}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {beforePhotos.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-gray-400 hover:text-orange-500"
                                    onClick={() => {
                                      setFullscreenPhotos(beforePhotos)
                                      setFullscreenIndex(0)
                                      setPhotoDialogOpen(true)
                                    }}
                                    title={`${beforePhotos.length} fotos antes`}
                                  >
                                    <Camera className="h-3.5 w-3.5" />
                                    <span className="text-xs ml-0.5">{beforePhotos.length}</span>
                                  </Button>
                                )}
                                {afterPhotos.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-gray-400 hover:text-green-500"
                                    onClick={() => {
                                      setFullscreenPhotos(afterPhotos)
                                      setFullscreenIndex(0)
                                      setPhotoDialogOpen(true)
                                    }}
                                    title={`${afterPhotos.length} fotos después`}
                                  >
                                    <ImageIcon className="h-3.5 w-3.5" />
                                    <span className="text-xs ml-0.5">{afterPhotos.length}</span>
                                  </Button>
                                )}
                                {beforePhotos.length === 0 && afterPhotos.length === 0 && (
                                  <span className="text-xs text-gray-300">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openHistory(task.id)} title="Historial">
                                  <History className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditTask(task)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => { setDeleteId(task.id); setDeleteDialogOpen(true) }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Card View */}
        {view === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                No hay tareas que coincidan con los filtros
              </div>
            ) : (
              filteredTasks.map(task => {
                const beforePhotos = JSON.parse(task.beforePhotos || '[]') as string[]
                const afterPhotos = JSON.parse(task.afterPhotos || '[]') as string[]
                return (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-semibold leading-tight flex-1">{task.description}</CardTitle>
                        <Badge variant="outline" className={`${statusColors[task.status] || ''} ml-2 shrink-0`}>
                          {task.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary">{task.sector}</Badge>
                        <Badge variant="outline">{task.repairType}</Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getPriorityColor(task.priority) }}></span>
                          {task.priority}
                        </Badge>
                      </div>
                      {task.responsible && (
                        <div className="text-xs text-gray-500">Responsable: {task.responsible}</div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Tiempo: {task.estimatedTime || '-'}</span>
                        <span className="font-medium text-gray-700">{formatCurrency(task.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Inicio: {formatDate(task.startDate)}</span>
                        <span>Término: {formatDate(task.endDate)}</span>
                      </div>
                      {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
                        <div className="flex gap-2">
                          {beforePhotos.length > 0 && (
                            <div className="flex-1">
                              <div className="text-xs text-gray-400 mb-1">Antes ({beforePhotos.length})</div>
                              <div className="flex gap-1 flex-wrap">
                                {beforePhotos.slice(0, 2).map((url, i) => (
                                  <img
                                    key={i}
                                    src={url}
                                    alt={`Antes ${i + 1}`}
                                    className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => {
                                      setFullscreenPhotos(beforePhotos)
                                      setFullscreenIndex(i)
                                      setPhotoDialogOpen(true)
                                    }}
                                  />
                                ))}
                                {beforePhotos.length > 2 && (
                                  <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded border text-xs text-gray-500">
                                    +{beforePhotos.length - 2}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {afterPhotos.length > 0 && (
                            <div className="flex-1">
                              <div className="text-xs text-gray-400 mb-1">Después ({afterPhotos.length})</div>
                              <div className="flex gap-1 flex-wrap">
                                {afterPhotos.slice(0, 2).map((url, i) => (
                                  <img
                                    key={i}
                                    src={url}
                                    alt={`Después ${i + 1}`}
                                    className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80"
                                    onClick={() => {
                                      setFullscreenPhotos(afterPhotos)
                                      setFullscreenIndex(i)
                                      setPhotoDialogOpen(true)
                                    }}
                                  />
                                ))}
                                {afterPhotos.length > 2 && (
                                  <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded border text-xs text-gray-500">
                                    +{afterPhotos.length - 2}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex justify-end gap-1 pt-2 border-t">
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openHistory(task.id)}>
                          <History className="h-3 w-3" /> Historial
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openEditTask(task)}>
                          <Pencil className="h-3 w-3" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-red-500" onClick={() => { setDeleteId(task.id); setDeleteDialogOpen(true) }}>
                          <Trash2 className="h-3 w-3" /> Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )}

        {/* Gantt View */}
        {view === 'gantt' && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <GanttChart className="h-5 w-5" /> Diagrama de Gantt
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    {tasksWithDates.length} de {filteredTasks.length} tareas tienen fechas asignadas
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadGantt}
                  disabled={downloadingGantt || tasksWithDates.length === 0}
                  className="gap-1"
                >
                  <Download className="h-4 w-4" /> {downloadingGantt ? 'Generando...' : 'Descargar PNG'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasksWithDates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <GanttChart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay tareas con fechas de inicio y término asignadas.</p>
                  <p className="text-sm mt-1">Edite las tareas para agregar fechas y generar el diagrama.</p>
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <div id="gantt-chart-content" className="min-w-[900px] p-4 bg-white">
                    {/* Title for exported image */}
                    <div className="mb-4 pb-3 border-b">
                      <h2 className="text-lg font-bold text-gray-900">Planificación de Mantención - Diagrama de Gantt</h2>
                      <p className="text-xs text-gray-500">Generado: {new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })} | {tasksWithDates.length} tareas</p>
                    </div>
                    {/* Gantt Header - Month labels */}
                    <div className="flex border-b">
                      <div className="w-[250px] shrink-0 p-2 text-xs font-semibold text-gray-500 bg-gray-50">
                        Tarea
                      </div>
                      <div className="flex-1 flex">
                        {ganttDays.map((day, i) => {
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6
                          const isFirst = day.getDate() === 1 || i === 0
                          return (
                            <div
                              key={i}
                              className={`flex-1 text-center text-[9px] py-1 border-l ${isWeekend ? 'bg-gray-100' : ''} ${isFirst ? 'border-l-gray-400' : 'border-l-gray-200'}`}
                              style={{ minWidth: '24px' }}
                            >
                              {isFirst || i % 7 === 0 ? (
                                <div>
                                  <div className="font-semibold">{day.toLocaleDateString('es-CL', { month: 'short' })}</div>
                                  <div>{day.getDate()}</div>
                                </div>
                              ) : (
                                <div className="text-gray-300">{day.getDate()}</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Gantt Rows */}
                    {tasksWithDates.map(task => {
                      const { left, width } = getBarPosition(task.startDate!, task.endDate!)
                      const priorityColor = getPriorityColor(task.priority)
                      const statusColorMap: Record<string, string> = {
                        Pendiente: priorityColor,
                        'En Proceso': '#3b82f6',
                        Completada: '#22c55e',
                        Cancelada: '#ef4444',
                      }
                      const barColor = statusColorMap[task.status] || priorityColor
                      return (
                        <div key={task.id} className="flex border-b hover:bg-gray-50 transition-colors group">
                          <div className="w-[250px] shrink-0 p-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityColor }}></span>
                              <span className="truncate font-medium" title={task.description}>{task.description}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5 ml-3.5">
                              {task.sector} · {formatDate(task.startDate)} - {formatDate(task.endDate)}
                            </div>
                          </div>
                          <div className="flex-1 relative py-2">
                            {/* Weekend shading */}
                            {ganttDays.map((day, i) => {
                              const isWeekend = day.getDay() === 0 || day.getDay() === 6
                              return isWeekend ? (
                                <div
                                  key={i}
                                  className="absolute top-0 bottom-0 bg-gray-50"
                                  style={{
                                    left: `${(i / ganttDays.length) * 100}%`,
                                    width: `${100 / ganttDays.length}%`,
                                  }}
                                />
                              ) : null
                            })}
                            {/* Today line */}
                            {(() => {
                              const today = new Date()
                              if (today >= ganttRangeStart && today <= ganttRangeEnd) {
                                const todayPercent = ((today.getTime() - ganttRangeStart.getTime()) / (ganttRangeEnd.getTime() - ganttRangeStart.getTime())) * 100
                                return (
                                  <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                                    style={{ left: `${todayPercent}%` }}
                                  />
                                )
                              }
                              return null
                            })()}
                            {/* Bar */}
                            <div
                              className="absolute h-7 rounded-md flex items-center px-2 text-white text-[10px] font-medium shadow-sm cursor-pointer transition-opacity hover:opacity-90 z-20"
                              style={{
                                left: `${left}%`,
                                width: `${Math.max(width, 1)}%`,
                                backgroundColor: barColor,
                              }}
                              title={`${task.description}\n${formatDate(task.startDate)} - ${formatDate(task.endDate)}\nEstado: ${task.status}\nPrioridad: ${task.priority}`}
                            >
                              {width > 5 && task.responsible && (
                                <span className="truncate">{task.responsible}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-red-400"></div>
                        Hoy
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-gray-100 border"></div>
                        Fin de semana
                      </div>
                      {priorities.map(p => (
                        <div key={p.id} className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }}></div>
                          {p.name}
                        </div>
                      ))}
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                        En Proceso
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                        Completada
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Task Create/Edit Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
            <DialogDescription className="sr-only">
              {editingTask ? 'Modifique los datos de la tarea' : 'Complete los datos para crear una nueva tarea'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Sector *</Label>
                <Select value={formData.sector} onValueChange={v => setFormData(prev => ({ ...prev, sector: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tipo de Reparación *</Label>
                <Select value={formData.repairType} onValueChange={v => setFormData(prev => ({ ...prev, repairType: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {repairTypes.map(rt => (
                      <SelectItem key={rt.id} value={rt.name}>{rt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Prioridad *</Label>
                <Select value={formData.priority} onValueChange={v => setFormData(prev => ({ ...prev, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(p => (
                      <SelectItem key={p.id} value={p.name}>
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Estado</Label>
                <Select value={formData.status} onValueChange={v => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="responsible">Responsable</Label>
                <Input
                  id="responsible"
                  value={formData.responsible}
                  onChange={e => setFormData(prev => ({ ...prev, responsible: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="estimatedTime">Tiempo Estimado</Label>
                <Input
                  id="estimatedTime"
                  value={formData.estimatedTime}
                  onChange={e => setFormData(prev => ({ ...prev, estimatedTime: e.target.value }))}
                  placeholder="Ej: 2 semanas"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Monto ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Fecha de Inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">Fecha de Término</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comments">Comentarios</Label>
              <Textarea
                id="comments"
                value={formData.comments}
                onChange={e => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Photo Upload Sections */}
            <div className="grid grid-cols-2 gap-4">
              {/* Before Photos */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-orange-500" />
                  Fotos Antes
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {formData.beforePhotos.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Antes ${i + 1}`} className="w-16 h-16 object-cover rounded border" />
                      <button
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(i, 'before')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoUpload(file, 'before')
                      }}
                    />
                    <Upload className="h-5 w-5 text-gray-400" />
                  </label>
                </div>
              </div>

              {/* After Photos */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-green-500" />
                  Fotos Después
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {formData.afterPhotos.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Después ${i + 1}`} className="w-16 h-16 object-cover rounded border" />
                      <button
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(i, 'after')}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoUpload(file, 'after')
                      }}
                    />
                    <Upload className="h-5 w-5 text-gray-400" />
                  </label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTask} disabled={!formData.description || !formData.sector}>
              {editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuración</DialogTitle>
            <DialogDescription className="sr-only">Administrar sectores, tipos de reparación y prioridades</DialogDescription>
          </DialogHeader>
          <Tabs value={configTab} onValueChange={v => setConfigTab(v as 'sectors' | 'repairTypes' | 'priorities')}>
            <TabsList className="w-full">
              <TabsTrigger value="sectors" className="flex-1">Sectores</TabsTrigger>
              <TabsTrigger value="repairTypes" className="flex-1">Tipos Reparación</TabsTrigger>
              <TabsTrigger value="priorities" className="flex-1">Prioridades</TabsTrigger>
            </TabsList>

            {/* Sectors Tab */}
            <TabsContent value="sectors" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nuevo sector..."
                  value={newSectorName}
                  onChange={e => setNewSectorName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddSector()}
                />
                <Button onClick={handleAddSector} size="sm" className="gap-1 shrink-0">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1">
                  {sectors.map(sector => (
                    <div key={sector.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      {editingSectorId === sector.id ? (
                        <>
                          <Input
                            value={editSectorName}
                            onChange={e => setEditSectorName(e.target.value)}
                            className="h-8 text-sm"
                            onKeyDown={e => e.key === 'Enter' && handleUpdateSector(sector.id)}
                          />
                          <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => handleUpdateSector(sector.id)}>OK</Button>
                          <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => setEditingSectorId(null)}>X</Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm">{sector.name}</span>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingSectorId(sector.id); setEditSectorName(sector.name) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteSector(sector.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Repair Types Tab */}
            <TabsContent value="repairTypes" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nuevo tipo de reparación..."
                  value={newRepairTypeName}
                  onChange={e => setNewRepairTypeName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddRepairType()}
                />
                <Button onClick={handleAddRepairType} size="sm" className="gap-1 shrink-0">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1">
                  {repairTypes.map(rt => (
                    <div key={rt.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      {editingRepairTypeId === rt.id ? (
                        <>
                          <Input
                            value={editRepairTypeName}
                            onChange={e => setEditRepairTypeName(e.target.value)}
                            className="h-8 text-sm"
                            onKeyDown={e => e.key === 'Enter' && handleUpdateRepairType(rt.id)}
                          />
                          <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => handleUpdateRepairType(rt.id)}>OK</Button>
                          <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => setEditingRepairTypeId(null)}>X</Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm">{rt.name}</span>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingRepairTypeId(rt.id); setEditRepairTypeName(rt.name) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteRepairType(rt.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Priorities Tab */}
            <TabsContent value="priorities" className="space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    placeholder="Nueva prioridad..."
                    value={newPriorityName}
                    onChange={e => setNewPriorityName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddPriority()}
                  />
                </div>
                <div className="w-16">
                  <Label className="text-xs">Color</Label>
                  <Input
                    type="color"
                    value={newPriorityColor}
                    onChange={e => setNewPriorityColor(e.target.value)}
                    className="h-9 p-1"
                  />
                </div>
                <Button onClick={handleAddPriority} size="sm" className="gap-1 shrink-0">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1">
                  {priorities.map(p => (
                    <div key={p.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      {editingPriorityId === p.id ? (
                        <>
                          <Input
                            value={editPriorityName}
                            onChange={e => setEditPriorityName(e.target.value)}
                            className="h-8 text-sm flex-1"
                            onKeyDown={e => e.key === 'Enter' && handleUpdatePriority(p.id)}
                          />
                          <Input
                            type="color"
                            value={editPriorityColor}
                            onChange={e => setEditPriorityColor(e.target.value)}
                            className="h-8 w-10 p-1"
                          />
                          <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => handleUpdatePriority(p.id)}>OK</Button>
                          <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => setEditingPriorityId(null)}>X</Button>
                        </>
                      ) : (
                        <>
                          <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: p.color }}></span>
                          <span className="flex-1 text-sm">{p.name}</span>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingPriorityId(p.id); setEditPriorityName(p.name); setEditPriorityColor(p.color) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeletePriority(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar esta tarea? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fullscreen Photo Viewer */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black">
          <DialogDescription className="sr-only">Visor de fotografías</DialogDescription>
          <div className="relative">
            {fullscreenPhotos.length > 0 && (
              <img
                src={fullscreenPhotos[fullscreenIndex]}
                alt={`Foto ${fullscreenIndex + 1}`}
                className="w-full max-h-[80vh] object-contain"
              />
            )}
            <button
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
              onClick={() => setPhotoDialogOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            {fullscreenPhotos.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                  onClick={() => setFullscreenIndex(prev => (prev - 1 + fullscreenPhotos.length) % fullscreenPhotos.length)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                  onClick={() => setFullscreenIndex(prev => (prev + 1) % fullscreenPhotos.length)}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {fullscreenIndex + 1} / {fullscreenPhotos.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {historyTaskId === 'all' ? 'Historial de Modificaciones' : 'Historial de Tarea'}
            </DialogTitle>
            <DialogDescription className="sr-only">Registro de cambios realizados en las tareas</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : historyEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>No hay registros de modificaciones</p>
                <p className="text-xs mt-1">Los cambios se registrarán automáticamente al editar tareas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyEntries.map((entry, idx) => {
                  const task = historyTaskId === 'all' ? tasks.find(t => t.id === entry.taskId) : null
                  return (
                    <div key={entry.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getActionColor(entry.action)}`}>
                          {getActionIcon(entry.action)}
                        </div>
                        {idx < historyEntries.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={getActionColor(entry.action)}>
                            {getActionLabel(entry.action)}
                          </Badge>
                          {task && (
                            <span className="text-xs text-gray-500 truncate max-w-[200px]">{task.description}</span>
                          )}
                        </div>
                        {entry.field && (
                          <div className="mt-1.5 text-sm">
                            <span className="font-medium text-gray-700">{entry.field}</span>
                            {entry.oldValue && entry.newValue ? (
                              <div className="flex items-center gap-2 mt-1 text-xs">
                                <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200 line-through max-w-[200px] truncate">
                                  {entry.oldValue}
                                </span>
                                <span className="text-gray-400">→</span>
                                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200 max-w-[200px] truncate">
                                  {entry.newValue}
                                </span>
                              </div>
                            ) : entry.newValue && !entry.oldValue ? (
                              <div className="mt-1 text-xs">
                                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
                                  {entry.newValue}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        )}
                        {!entry.field && entry.action === 'creada' && entry.newValue && (
                          <div className="mt-1 text-xs text-gray-500 truncate">
                            &quot;{entry.newValue}&quot;
                          </div>
                        )}
                        <div className="mt-1 text-[10px] text-gray-400">
                          {new Date(entry.createdAt).toLocaleString('es-CL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {entry.changedBy && (
                            <span className="ml-2">por {entry.changedBy}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
