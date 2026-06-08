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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
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
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Package,
  DollarSign,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import ExcelJS from 'exceljs'

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

interface Material {
  id: string
  taskId: string
  name: string
  quantity: string | null
  unit: string | null
  unitPrice: number | null
  totalPrice: number | null
  category: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
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
  const [view, setView] = useState<'dashboard' | 'table' | 'cards' | 'gantt' | 'materials'>('dashboard')
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

  // Materials states
  const [materials, setMaterials] = useState<Material[]>([])
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [materialTaskId, setMaterialTaskId] = useState<string | null>(null)
  const [showMaterials, setShowMaterials] = useState(false)
  const [materialFormData, setMaterialFormData] = useState({
    name: '', quantity: '', unit: '', unitPrice: '', totalPrice: '', category: '', notes: ''
  })

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

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch('/api/materials')
      if (res.ok) setMaterials(await res.json())
    } catch (err) {
      console.error('Error fetching materials:', err)
    }
  }, [])

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await Promise.all([fetchTasks(), fetchSectors(), fetchRepairTypes(), fetchPriorities(), fetchMaterials()])
      setLoading(false)
    }
    loadAll()
  }, [fetchTasks, fetchSectors, fetchRepairTypes, fetchPriorities, fetchMaterials])

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

  // Material CRUD
  const handleSaveMaterial = async () => {
    if (!materialTaskId || !materialFormData.name.trim()) return
    try {
      const body = { ...materialFormData, taskId: materialTaskId }
      if (editingMaterial) {
        await fetch('/api/materials', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingMaterial.id, ...body }),
        })
      } else {
        await fetch('/api/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      setMaterialDialogOpen(false)
      setEditingMaterial(null)
      setMaterialFormData({ name: '', quantity: '', unit: '', unitPrice: '', totalPrice: '', category: '', notes: '' })
      fetchMaterials()
    } catch (err) {
      console.error('Error saving material:', err)
    }
  }

  const handleDeleteMaterial = async (id: string) => {
    await fetch(`/api/materials?id=${id}`, { method: 'DELETE' })
    fetchMaterials()
  }

  const openAddMaterial = (taskId: string) => {
    setMaterialTaskId(taskId)
    setEditingMaterial(null)
    setMaterialFormData({ name: '', quantity: '', unit: '', unitPrice: '', totalPrice: '', category: '', notes: '' })
    setMaterialDialogOpen(true)
  }

  const openEditMaterial = (material: Material) => {
    setMaterialTaskId(material.taskId)
    setEditingMaterial(material)
    setMaterialFormData({
      name: material.name,
      quantity: material.quantity || '',
      unit: material.unit || '',
      unitPrice: material.unitPrice?.toString() || '',
      totalPrice: material.totalPrice?.toString() || '',
      category: material.category || '',
      notes: material.notes || '',
    })
    setMaterialDialogOpen(true)
  }

  // Material helpers
  const getMaterialsForTask = (taskId: string) => materials.filter(m => m.taskId === taskId)
  const getMaterialsCount = (taskId: string) => materials.filter(m => m.taskId === taskId).length
  const getMaterialsTotal = (taskId: string) => materials.filter(m => m.taskId === taskId).reduce((sum, m) => sum + (m.totalPrice || 0), 0)

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

  // Gantt download as PDF - Professional A3 landscape with pagination
  const downloadGanttPDF = async () => {
    setDownloadingGantt(true)
    try {
      const sortedTasks = [...tasksWithDates].sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
        return dateA - dateB
      })

      if (sortedTasks.length === 0) return

      // A3 Landscape dimensions (mm)
      const pageWidth = 420
      const pageHeight = 297
      const margin = 10
      const labelColWidth = 85
      const rowHeight = 9
      const headerHeight = 16
      const titleBlockHeight = 18
      const footerHeight = 12

      // Calculate day column width to fit available space
      const availableGanttWidth = pageWidth - 2 * margin - labelColWidth
      const dayColWidth = availableGanttWidth / ganttDays.length

      const ganttAreaX = margin + labelColWidth
      const ganttAreaWidth = ganttDays.length * dayColWidth

      // Rows per page
      const usablePageHeight = pageHeight - margin - titleBlockHeight - headerHeight - footerHeight
      const rowsPerPage = Math.floor(usablePageHeight / rowHeight)
      const totalPages = Math.ceil(sortedTasks.length / rowsPerPage)

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3',
      })

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Helper: draw chart header on a page
      const drawChartHeader = (startY: number) => {
        // Month header row
        let currentMonth = ''
        let monthStartIdx = 0
        pdf.setFontSize(7)
        pdf.setFont('helvetica', 'bold')

        for (let i = 0; i < ganttDays.length; i++) {
          const monthLabel = ganttDays[i].toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
          const isLast = i === ganttDays.length - 1

          if (monthLabel !== currentMonth) {
            if (currentMonth !== '') {
              const x1 = ganttAreaX + monthStartIdx * dayColWidth
              const span = (i - monthStartIdx) * dayColWidth
              pdf.setFillColor(30, 41, 59)
              pdf.rect(x1, startY, span, headerHeight / 2, 'F')
              pdf.setTextColor(255, 255, 255)
              pdf.text(currentMonth, x1 + span / 2, startY + headerHeight / 4 + 1.2, { align: 'center' })
            }
            monthStartIdx = i
            currentMonth = monthLabel
          }

          if (isLast) {
            const x1 = ganttAreaX + monthStartIdx * dayColWidth
            const span = (i - monthStartIdx + 1) * dayColWidth
            pdf.setFillColor(30, 41, 59)
            pdf.rect(x1, startY, span, headerHeight / 2, 'F')
            pdf.setTextColor(255, 255, 255)
            pdf.text(currentMonth, x1 + span / 2, startY + headerHeight / 4 + 1.2, { align: 'center' })
          }
        }

        // Day numbers row
        const dayRowY = startY + headerHeight / 2
        pdf.setFontSize(5.5)
        pdf.setFont('helvetica', 'normal')

        for (let i = 0; i < ganttDays.length; i++) {
          const day = ganttDays[i]
          const x = ganttAreaX + i * dayColWidth
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          const isToday = day.getTime() === today.getTime()

          if (isToday) {
            pdf.setFillColor(220, 38, 38)
            pdf.rect(x, dayRowY, dayColWidth, headerHeight / 2, 'F')
            pdf.setTextColor(255, 255, 255)
            pdf.setFont('helvetica', 'bold')
            pdf.setFontSize(6)
          } else if (isWeekend) {
            pdf.setFillColor(209, 213, 219)
            pdf.rect(x, dayRowY, dayColWidth, headerHeight / 2, 'F')
            pdf.setTextColor(55, 65, 81)
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(5.5)
          } else {
            pdf.setFillColor(226, 232, 240)
            pdf.rect(x, dayRowY, dayColWidth, headerHeight / 2, 'F')
            pdf.setTextColor(55, 65, 81)
            pdf.setFont('helvetica', 'normal')
            pdf.setFontSize(5.5)
          }

          pdf.text(String(day.getDate()), x + dayColWidth / 2, dayRowY + headerHeight / 4 + 0.5, { align: 'center' })
        }

        // Label column header
        pdf.setFillColor(30, 41, 59)
        pdf.rect(margin, startY, labelColWidth, headerHeight, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Tarea', margin + 5, startY + headerHeight / 2 + 1.5)

        return startY + headerHeight
      }

      // Helper: draw a single data row
      const drawDataRow = (task: Task, rowY: number, rowIndex: number) => {
        const isOdd = rowIndex % 2 === 1

        // Row background
        if (isOdd) {
          pdf.setFillColor(248, 250, 252)
          pdf.rect(margin, rowY, labelColWidth + ganttAreaWidth, rowHeight, 'F')
        }

        // Weekend/today shading in gantt area
        for (let i = 0; i < ganttDays.length; i++) {
          const day = ganttDays[i]
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          const isDayToday = day.getTime() === today.getTime()
          if (isDayToday) {
            const x = ganttAreaX + i * dayColWidth
            pdf.setFillColor(254, 226, 226)
            pdf.rect(x, rowY, dayColWidth, rowHeight, 'F')
          } else if (isWeekend) {
            const x = ganttAreaX + i * dayColWidth
            pdf.setFillColor(241, 245, 249)
            pdf.rect(x, rowY, dayColWidth, rowHeight, 'F')
          }
        }

        // Today line
        if (today >= ganttRangeStart && today <= ganttRangeEnd) {
          const todayPercent = (today.getTime() - ganttRangeStart.getTime()) / (ganttRangeEnd.getTime() - ganttRangeStart.getTime())
          const todayX = ganttAreaX + todayPercent * ganttAreaWidth
          pdf.setDrawColor(220, 38, 38)
          pdf.setLineWidth(0.4)
          pdf.line(todayX, rowY, todayX, rowY + rowHeight)
        }

        // Gantt bar
        const taskStart = new Date(task.startDate!)
        const taskEnd = new Date(task.endDate!)
        const leftPercent = (taskStart.getTime() - ganttRangeStart.getTime()) / (ganttRangeEnd.getTime() - ganttRangeStart.getTime())
        const widthPercent = (taskEnd.getTime() - taskStart.getTime()) / (ganttRangeEnd.getTime() - ganttRangeStart.getTime())
        const barX = ganttAreaX + leftPercent * ganttAreaWidth
        const barWidth = Math.max(widthPercent * ganttAreaWidth, 3)
        const barY = rowY + 1.5
        const barHeight = rowHeight - 3

        // Bar color based on status
        const statusColorMap: Record<string, [number, number, number]> = {
          Pendiente: (() => {
            const hex = getPriorityColor(task.priority)
            const r = parseInt(hex.slice(1, 3), 16)
            const g = parseInt(hex.slice(3, 5), 16)
            const b = parseInt(hex.slice(5, 7), 16)
            return [r, g, b] as [number, number, number]
          })(),
          'En Proceso': [37, 99, 235],
          Completada: [22, 163, 74],
          Cancelada: [220, 38, 38],
        }
        const [br, bg, bb] = statusColorMap[task.status] || [107, 114, 128]
        pdf.setFillColor(br, bg, bb)
        pdf.roundedRect(barX, barY, barWidth, barHeight, 1.5, 1.5, 'F')

        // Bar text
        if (barWidth > 25 && task.responsible) {
          pdf.setTextColor(255, 255, 255)
          pdf.setFontSize(5.5)
          pdf.setFont('helvetica', 'bold')
          pdf.text(task.responsible, barX + 2, barY + barHeight / 2 + 1, { maxWidth: barWidth - 4 })
        }

        // Task label with priority dot
        pdf.setTextColor(31, 41, 55)
        pdf.setFontSize(7)
        pdf.setFont('helvetica', 'normal')
        const priorityDotX = margin + 4
        const priorityDotY = rowY + rowHeight / 2
        const pColor = getPriorityColor(task.priority)
        const pr = parseInt(pColor.slice(1, 3), 16)
        const pg = parseInt(pColor.slice(3, 5), 16)
        const pb = parseInt(pColor.slice(5, 7), 16)
        pdf.setFillColor(pr, pg, pb)
        pdf.circle(priorityDotX, priorityDotY, 1.2, 'F')
        pdf.text(task.description.substring(0, 40), margin + 7, rowY + rowHeight / 2 - 0.3)

        // Sub-info line
        pdf.setFontSize(5)
        pdf.setTextColor(107, 114, 128)
        pdf.text(
          `${task.sector} | ${formatDate(task.startDate)} - ${formatDate(task.endDate)}`,
          margin + 7, rowY + rowHeight / 2 + 3
        )

        // Row border
        pdf.setDrawColor(226, 232, 240)
        pdf.setLineWidth(0.1)
        pdf.line(margin, rowY + rowHeight, margin + labelColWidth + ganttAreaWidth, rowY + rowHeight)
      }

      // Draw pages
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage('a3', 'landscape')

        let y = margin

        // Title block
        pdf.setFillColor(15, 23, 42)
        pdf.rect(0, 0, pageWidth, titleBlockHeight + margin, 'F')
        pdf.setTextColor(255, 255, 255)
        pdf.setFontSize(16)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Planificación de Mantención - Diagrama de Gantt', margin, y + 8)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(148, 163, 184)
        pdf.text(
          `Generado: ${new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })} | ${sortedTasks.length} tareas | Página ${page + 1} de ${totalPages}`,
          margin, y + 13
        )
        y = titleBlockHeight + margin

        // Chart header
        const dataStartY = drawChartHeader(y)

        // Data rows for this page
        const startIdx = page * rowsPerPage
        const endIdx = Math.min(startIdx + rowsPerPage, sortedTasks.length)

        for (let r = startIdx; r < endIdx; r++) {
          const rowY = dataStartY + (r - startIdx) * rowHeight
          drawDataRow(sortedTasks[r], rowY, r)
        }

        // Outer border
        const chartBottomY = dataStartY + (endIdx - startIdx) * rowHeight
        pdf.setDrawColor(148, 163, 184)
        pdf.setLineWidth(0.3)
        pdf.rect(margin, y, labelColWidth + ganttAreaWidth, chartBottomY - y)
        pdf.line(ganttAreaX, y, ganttAreaX, chartBottomY)

        // Footer - Legend
        let footerY = pageHeight - footerHeight
        pdf.setFillColor(248, 250, 252)
        pdf.rect(0, footerY - 2, pageWidth, footerHeight + 2, 'F')
        pdf.setDrawColor(226, 232, 240)
        pdf.setLineWidth(0.2)
        pdf.line(0, footerY - 2, pageWidth, footerY - 2)

        pdf.setFontSize(7)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(75, 85, 99)
        pdf.text('Leyenda:', margin, footerY + 3)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(6)
        let lx = margin + 18

        pdf.setFillColor(220, 38, 38)
        pdf.rect(lx, footerY + 0.5, 4, 4, 'F')
        pdf.setTextColor(75, 85, 99)
        pdf.text('Hoy', lx + 6, footerY + 3.5)
        lx += 25

        pdf.setFillColor(209, 213, 219)
        pdf.rect(lx, footerY + 0.5, 4, 4, 'F')
        pdf.text('Fin de semana', lx + 6, footerY + 3.5)
        lx += 40

        for (const p of priorities) {
          const pr2 = parseInt(p.color.slice(1, 3), 16)
          const pg2 = parseInt(p.color.slice(3, 5), 16)
          const pb2 = parseInt(p.color.slice(5, 7), 16)
          pdf.setFillColor(pr2, pg2, pb2)
          pdf.rect(lx, footerY + 0.5, 4, 4, 'F')
          pdf.text(p.name, lx + 6, footerY + 3.5)
          lx += 6 + pdf.getTextWidth(p.name) + 8
        }

        const statusLegends: [string, [number, number, number]][] = [
          ['En Proceso', [37, 99, 235]],
          ['Completada', [22, 163, 74]],
          ['Cancelada', [220, 38, 38]],
        ]
        for (const [label, [sr, sg, sb]] of statusLegends) {
          pdf.setFillColor(sr, sg, sb)
          pdf.rect(lx, footerY + 0.5, 4, 4, 'F')
          pdf.text(label, lx + 6, footerY + 3.5)
          lx += 6 + pdf.getTextWidth(label) + 8
        }
      }

      pdf.save(`gantt-planificacion-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Error downloading Gantt as PDF:', err)
    }
    setDownloadingGantt(false)
  }


  // Gantt download as Excel - Professional format with materials sheet
  const downloadGanttExcel = async () => {
    setDownloadingGantt(true)
    try {
      const sortedTasks = [...tasksWithDates].sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0
        return dateA - dateB
      })

      const wb = new ExcelJS.Workbook()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // ===== GANTT SHEET =====
      const ws = wb.addWorksheet('Gantt', {
        properties: { defaultColWidth: 4 },
      })

      const fixedHeaders = ['Descripción', 'Sector', 'Tipo', 'Prioridad', 'Estado', 'Responsable', 'Fecha Inicio', 'Fecha Término']
      const allHeaders = [...fixedHeaders, ...ganttDays.map(d => String(d.getDate())), 'Total Mat.']

      // Title row
      const titleRow = ws.addRow(['Planificación de Mantención - Diagrama de Gantt'])
      titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF0F172A' } }
      titleRow.getCell(1).alignment = { horizontal: 'left' }
      ws.mergeCells(1, 1, 1, allHeaders.length)
      titleRow.height = 30

      // Subtitle row
      const dateRow = ws.addRow([
        `Generado: ${new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })} | ${sortedTasks.length} tareas`
      ])
      dateRow.getCell(1).font = { size: 10, color: { argb: 'FF64748B' } }
      ws.mergeCells(2, 1, 2, allHeaders.length)
      dateRow.height = 20

      // Blank row
      ws.addRow([])

      // Month header row
      const monthRowNum = 4
      const monthRow = ws.addRow([])
      let currentMonth = ''
      let monthStartCol = fixedHeaders.length + 1
      for (let i = 0; i < ganttDays.length; i++) {
        const monthLabel = ganttDays[i].toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
        const col = fixedHeaders.length + 1 + i
        if (monthLabel !== currentMonth) {
          if (currentMonth !== '') {
            if (col - 1 > monthStartCol) {
              ws.mergeCells(monthRowNum, monthStartCol, monthRowNum, col - 1)
            }
            const cell = ws.getCell(monthRowNum, monthStartCol)
            cell.value = currentMonth
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
            cell.border = { bottom: { style: 'thin', color: { argb: 'FF334155' } } }
          }
          monthStartCol = col
          currentMonth = monthLabel
        }
        if (i === ganttDays.length - 1) {
          if (col > monthStartCol) {
            ws.mergeCells(monthRowNum, monthStartCol, monthRowNum, col)
          }
          const cell = ws.getCell(monthRowNum, monthStartCol)
          cell.value = currentMonth
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        }
      }
      // Fill fixed header cells in month row
      for (let c = 1; c <= fixedHeaders.length; c++) {
        const cell = ws.getCell(monthRowNum, c)
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
      }
      // Total Mat header in month row
      const totalMatHeaderCell = ws.getCell(monthRowNum, fixedHeaders.length + ganttDays.length + 1)
      totalMatHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }

      // Day header row
      const dayHeaderRow = ws.addRow(allHeaders)
      dayHeaderRow.height = 22

      for (let c = 1; c <= allHeaders.length; c++) {
        const cell = dayHeaderRow.getCell(c)
        if (c <= fixedHeaders.length) {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        } else if (c <= fixedHeaders.length + ganttDays.length) {
          const dayIdx = c - fixedHeaders.length - 1
          const dayDate = ganttDays[dayIdx]
          const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6
          const isToday = dayDate.getTime() === today.getTime()

          if (isToday) {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 8 }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } }
          } else if (isWeekend) {
            cell.font = { bold: true, color: { argb: 'FF475569' }, size: 8 }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1D5DB' } }
          } else {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 8 }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } }
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        } else {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
        }
      }

      // Data rows
      for (const task of sortedTasks) {
        const taskStart = task.startDate ? new Date(task.startDate) : null
        const taskEnd = task.endDate ? new Date(task.endDate) : null
        const materialsTotal = getMaterialsTotal(task.id)
        const matCount = getMaterialsCount(task.id)

        const row = [
          task.description,
          task.sector,
          task.repairType,
          task.priority,
          task.status,
          task.responsible || '',
          task.startDate ? new Date(task.startDate).toLocaleDateString('es-CL') : '',
          task.endDate ? new Date(task.endDate).toLocaleDateString('es-CL') : '',
        ]

        ganttDays.forEach((dayDate) => {
          const dayTime = dayDate.getTime()
          const inRange = taskStart && taskEnd && dayTime >= taskStart.getTime() && dayTime <= taskEnd.getTime()
          row.push(inRange ? '\u2588' : '')
        })

        row.push(matCount > 0 ? materialsTotal : '')

        const excelRow = ws.addRow(row)
        excelRow.height = 18

        // Bar color
        const statusBarColorMap: Record<string, string> = {
          'Pendiente': getPriorityColor(task.priority).replace('#', ''),
          'En Proceso': '2563EB',
          'Completada': '16A34A',
          'Cancelada': 'DC2626',
        }
        const barColorHex = statusBarColorMap[task.status] || getPriorityColor(task.priority).replace('#', '')

        // Style fixed columns
        excelRow.getCell(1).font = { size: 10, bold: true }
        excelRow.getCell(2).font = { size: 9 }
        excelRow.getCell(3).font = { size: 9 }

        // Priority column
        const pColor = getPriorityColor(task.priority)
        excelRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${pColor.replace('#', '')}` } }
        excelRow.getCell(4).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
        excelRow.getCell(4).alignment = { horizontal: 'center' }

        // Status column with color
        const statusStyleMap: Record<string, string> = {
          'Pendiente': 'FFF59E0B',
          'En Proceso': 'FF2563EB',
          'Completada': 'FF16A34A',
          'Cancelada': 'FFDC2626',
        }
        const statusColor = statusStyleMap[task.status]
        if (statusColor) {
          excelRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } }
          excelRow.getCell(5).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
          excelRow.getCell(5).alignment = { horizontal: 'center' }
        }

        // Style day columns - gantt bars
        for (let c = fixedHeaders.length + 1; c <= fixedHeaders.length + ganttDays.length; c++) {
          const cell = excelRow.getCell(c)
          const dayIdx = c - fixedHeaders.length - 1
          const dayDate = ganttDays[dayIdx]
          const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6
          const isDayToday = dayDate.getTime() === today.getTime()

          if (cell.value && String(cell.value).trim() !== '') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${barColorHex}` } }
            cell.font = { color: { argb: `FF${barColorHex}` }, size: 10 }
            cell.alignment = { horizontal: 'center' }
          } else if (isDayToday) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
          } else if (isWeekend) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
          }
        }

        // Total Materiales column
        const totalMatCol = fixedHeaders.length + ganttDays.length + 1
        const totalMatCell = excelRow.getCell(totalMatCol)
        if (totalMatCell.value && Number(totalMatCell.value) > 0) {
          totalMatCell.font = { bold: true, color: { argb: 'FF059669' }, size: 10 }
          totalMatCell.numFmt = '$#,##0'
          totalMatCell.alignment = { horizontal: 'right' }
        }
      }

      // Set column widths
      ws.getColumn(1).width = 40
      ws.getColumn(2).width = 14
      ws.getColumn(3).width = 14
      ws.getColumn(4).width = 12
      ws.getColumn(5).width = 12
      ws.getColumn(6).width = 16
      ws.getColumn(7).width = 14
      ws.getColumn(8).width = 14
      for (let i = 1; i <= ganttDays.length; i++) {
        ws.getColumn(fixedHeaders.length + i).width = 3.5
      }
      ws.getColumn(fixedHeaders.length + ganttDays.length + 1).width = 16

      // Freeze panes
      ws.views = [{ state: 'frozen', xSplit: fixedHeaders.length, ySplit: 6 }]

      // ===== MATERIALES SHEET =====
      const wsMat = wb.addWorksheet('Materiales')
      wsMat.getColumn(1).width = 35
      wsMat.getColumn(2).width = 15
      wsMat.getColumn(3).width = 12
      wsMat.getColumn(4).width = 10
      wsMat.getColumn(5).width = 12
      wsMat.getColumn(6).width = 14
      wsMat.getColumn(7).width = 14
      wsMat.getColumn(8).width = 20

      const matTitleRow = wsMat.addRow(['Listado de Materiales por Tarea'])
      matTitleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF0F172A' } }
      wsMat.mergeCells(1, 1, 1, 8)
      matTitleRow.height = 30

      wsMat.addRow([])

      // Header row
      const matHeaderRow = wsMat.addRow(['Tarea', 'Sector', 'Material', 'Categoría', 'Cantidad', 'Unidad', 'P. Unitario', 'P. Total'])
      matHeaderRow.height = 22
      for (let c = 1; c <= 8; c++) {
        const cell = matHeaderRow.getCell(c)
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      }

      let grandTotal = 0
      for (const task of filteredTasks) {
        const taskMaterials = getMaterialsForTask(task.id)
        if (taskMaterials.length === 0) continue
        const taskTotal = getMaterialsTotal(task.id)
        grandTotal += taskTotal

        for (let mi = 0; mi < taskMaterials.length; mi++) {
          const mat = taskMaterials[mi]
          const row = wsMat.addRow([
            mi === 0 ? task.description : '',
            mi === 0 ? task.sector : '',
            mat.name,
            mat.category || '',
            mat.quantity || '',
            mat.unit || '',
            mat.unitPrice || '',
            mat.totalPrice || '',
          ])

          // Style material rows
          row.getCell(7).numFmt = '$#,##0'
          row.getCell(8).numFmt = '$#,##0'
          row.getCell(8).font = { bold: true, color: { argb: 'FF059669' } }

          // Alternate row background
          if (mi % 2 === 0) {
            for (let c = 1; c <= 8; c++) {
              row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
            }
          }
        }

        // Subtotal row for task
        const subtotalRow = wsMat.addRow(['', '', '', '', '', 'Subtotal:', '', taskTotal])
        subtotalRow.getCell(7).font = { bold: true, size: 10, color: { argb: 'FF475569' } }
        subtotalRow.getCell(8).font = { bold: true, size: 11, color: { argb: 'FF059669' } }
        subtotalRow.getCell(8).numFmt = '$#,##0'
        for (let c = 1; c <= 8; c++) {
          subtotalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
          subtotalRow.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } }, bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } }
        }
      }

      // Grand total
      wsMat.addRow([])
      const grandTotalRow = wsMat.addRow(['', '', '', '', '', 'TOTAL GENERAL:', '', grandTotal])
      grandTotalRow.getCell(7).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
      grandTotalRow.getCell(8).font = { bold: true, size: 14, color: { argb: 'FF22C55E' } }
      grandTotalRow.getCell(8).numFmt = '$#,##0'
      for (let c = 1; c <= 8; c++) {
        grandTotalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
      }

      // ===== LEYENDA SHEET =====
      const wsLegend = wb.addWorksheet('Leyenda')
      wsLegend.getColumn(1).width = 25
      wsLegend.getColumn(2).width = 30

      const legendTitle = wsLegend.addRow(['Leyenda de Prioridades'])
      legendTitle.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF0F172A' } }

      wsLegend.addRow(['Prioridad', 'Color'])
      for (const p of priorities) {
        const row = wsLegend.addRow([p.name, p.color])
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${p.color.replace('#', '')}` } }
        row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      }

      wsLegend.addRow([])
      wsLegend.addRow(['Leyenda de Estados'])
      const statusLegendData = [
        ['Pendiente', 'Color de la prioridad asignada'],
        ['En Proceso', 'Azul (#2563EB)'],
        ['Completada', 'Verde (#16A34A)'],
        ['Cancelada', 'Rojo (#DC2626)'],
      ]
      for (const [status, colorDesc] of statusLegendData) {
        const row = wsLegend.addRow([status, colorDesc])
        const statusFillMap: Record<string, string> = {
          'Pendiente': 'FFF59E0B',
          'En Proceso': 'FF2563EB',
          'Completada': 'FF16A34A',
          'Cancelada': 'FFDC2626',
        }
        if (statusFillMap[status]) {
          row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusFillMap[status] } }
          row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
        }
      }

      wsLegend.addRow([])
      wsLegend.addRow(['Convenciones'])
      wsLegend.addRow(['Columna roja', 'Día actual (hoy)'])
      wsLegend.addRow(['Columna gris clara', 'Fin de semana'])
      wsLegend.addRow(['Bloque colorido', 'Rango de la tarea (color por estado)'])

      // Generate and download
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gantt-planificacion-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading Gantt as Excel:', err)
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
            <Button
              variant={view === 'materials' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('materials')}
              className="gap-1"
            >
              <Package className="h-4 w-4" /> Materiales
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
            {/* Materials toggle for table/card views */}
            {(view === 'table' || view === 'cards') && (
              <div className="flex items-center gap-1.5 ml-2 pl-2 border-l">
                <Label htmlFor="show-materials" className="text-xs text-gray-500 cursor-pointer">Materiales</Label>
                <Switch
                  id="show-materials"
                  checked={showMaterials}
                  onCheckedChange={setShowMaterials}
                />
              </div>
            )}
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
                      {showMaterials && (
                        <TableHead className="text-center">
                          <span className="flex items-center gap-1 justify-center">
                            <Package className="h-3.5 w-3.5" /> Materiales
                          </span>
                        </TableHead>
                      )}
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={showMaterials ? 13 : 12} className="text-center py-8 text-gray-500">
                          No hay tareas que coincidan con los filtros
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTasks.map(task => {
                        const beforePhotos = JSON.parse(task.beforePhotos || '[]') as string[]
                        const afterPhotos = JSON.parse(task.afterPhotos || '[]') as string[]
                        const matCount = getMaterialsCount(task.id)
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
                            {showMaterials && (
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1"
                                  onClick={() => openAddMaterial(task.id)}
                                  title={matCount > 0 ? `${matCount} materiales - Total: ${formatCurrency(getMaterialsTotal(task.id))}` : 'Sin materiales'}
                                >
                                  {matCount > 0 ? (
                                    <Badge variant="secondary" className="gap-1 cursor-pointer">
                                      <Package className="h-3 w-3" />
                                      {matCount}
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-gray-300">-</span>
                                  )}
                                </Button>
                              </TableCell>
                            )}
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
                const matCount = getMaterialsCount(task.id)
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
                      {showMaterials && matCount > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-gray-500">
                            <Package className="h-3 w-3" /> Materiales: {matCount}
                          </span>
                          <span className="font-medium text-green-600 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />{formatCurrency(getMaterialsTotal(task.id))}
                          </span>
                        </div>
                      )}
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingGantt || tasksWithDates.length === 0}
                      className="gap-1"
                    >
                      <Download className="h-4 w-4" />
                      {downloadingGantt ? 'Generando...' : 'Descargar'}
                      <ChevronDown className="h-3 w-3 ml-0.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={downloadGanttPDF} disabled={downloadingGantt}>
                      <FileText className="h-4 w-4 mr-2" />
                      Descargar PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={downloadGanttExcel} disabled={downloadingGantt}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Descargar Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

        {/* Materials View */}
        {view === 'materials' && (
          <div className="space-y-6">
            {/* Materials Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Materiales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{materials.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Tareas con Materiales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {new Set(materials.map(m => m.taskId)).size}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" /> Costo Total Materiales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(materials.reduce((sum, m) => sum + (m.totalPrice || 0), 0))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tasks with materials */}
            {(() => {
              const tasksWithMaterials = filteredTasks.filter(t => getMaterialsCount(t.id) > 0)
              const tasksWithoutMaterials = filteredTasks.filter(t => getMaterialsCount(t.id) === 0)

              return (
                <>
                  {tasksWithMaterials.length === 0 && tasksWithoutMaterials.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No hay tareas que coincidan con los filtros</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {tasksWithMaterials.map(task => {
                        const taskMaterials = getMaterialsForTask(task.id)
                        const taskTotal = getMaterialsTotal(task.id)
                        return (
                          <Card key={task.id}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getPriorityColor(task.priority) }}></span>
                                    {task.description}
                                    <Badge variant="secondary">{task.sector}</Badge>
                                    <Badge variant="outline" className={statusColors[task.status] || ''}>{task.status}</Badge>
                                  </CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                                    <DollarSign className="h-3.5 w-3.5" />{formatCurrency(taskTotal)}
                                  </span>
                                  <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => openAddMaterial(task.id)}>
                                    <Plus className="h-3 w-3" /> Agregar Material
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-0">
                              <ScrollArea className="w-full">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="min-w-[150px]">Nombre</TableHead>
                                      <TableHead>Categoría</TableHead>
                                      <TableHead className="text-center">Cantidad</TableHead>
                                      <TableHead>Unidad</TableHead>
                                      <TableHead className="text-right">P.Unitario</TableHead>
                                      <TableHead className="text-right">P.Total</TableHead>
                                      <TableHead className="min-w-[120px]">Notas</TableHead>
                                      <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {taskMaterials.length === 0 ? (
                                      <TableRow>
                                        <TableCell colSpan={8} className="text-center py-4 text-gray-400 text-sm">
                                          Sin materiales registrados
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      taskMaterials.map(mat => (
                                        <TableRow key={mat.id}>
                                          <TableCell className="font-medium text-sm">{mat.name}</TableCell>
                                          <TableCell className="text-sm">
                                            {mat.category ? <Badge variant="outline">{mat.category}</Badge> : '-'}
                                          </TableCell>
                                          <TableCell className="text-center text-sm">{mat.quantity || '-'}</TableCell>
                                          <TableCell className="text-sm">{mat.unit || '-'}</TableCell>
                                          <TableCell className="text-right text-sm">{mat.unitPrice ? formatCurrency(mat.unitPrice) : '-'}</TableCell>
                                          <TableCell className="text-right text-sm font-medium">{mat.totalPrice ? formatCurrency(mat.totalPrice) : '-'}</TableCell>
                                          <TableCell className="text-sm text-gray-500 max-w-[150px]">
                                            <div className="truncate" title={mat.notes || ''}>{mat.notes || '-'}</div>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditMaterial(mat)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => handleDeleteMaterial(mat.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    )}
                                  </TableBody>
                                </Table>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        )
                      })}

                      {/* Tasks without materials - option to add */}
                      {tasksWithoutMaterials.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">
                              Tareas sin materiales ({tasksWithoutMaterials.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {tasksWithoutMaterials.map(task => (
                                <Button
                                  key={task.id}
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-xs h-8"
                                  onClick={() => openAddMaterial(task.id)}
                                >
                                  <Plus className="h-3 w-3" />
                                  <span className="max-w-[150px] truncate">{task.description}</span>
                                  <Badge variant="secondary" className="ml-1 text-[10px]">{task.sector}</Badge>
                                </Button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </>
              )
            })()}
          </div>
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

      {/* Material Create/Edit Dialog */}
      <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {editingMaterial ? 'Editar Material' : 'Agregar Material'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editingMaterial ? 'Modifique los datos del material' : 'Complete los datos para agregar un nuevo material'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="mat-name">Nombre *</Label>
              <Input
                id="mat-name"
                value={materialFormData.name}
                onChange={e => setMaterialFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre del material"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mat-category">Categoría</Label>
                <Input
                  id="mat-category"
                  value={materialFormData.category}
                  onChange={e => setMaterialFormData(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Ej: Eléctrico, Plomería..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mat-quantity">Cantidad</Label>
                <Input
                  id="mat-quantity"
                  value={materialFormData.quantity}
                  onChange={e => setMaterialFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Ej: 10"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="mat-unit">Unidad</Label>
                <Input
                  id="mat-unit"
                  value={materialFormData.unit}
                  onChange={e => setMaterialFormData(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="Ej: un, kg, m2"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mat-unitprice">P. Unitario</Label>
                <Input
                  id="mat-unitprice"
                  type="number"
                  value={materialFormData.unitPrice}
                  onChange={e => setMaterialFormData(prev => ({ ...prev, unitPrice: e.target.value }))}
                  placeholder="$"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mat-totalprice">P. Total</Label>
                <Input
                  id="mat-totalprice"
                  type="number"
                  value={materialFormData.totalPrice}
                  onChange={e => setMaterialFormData(prev => ({ ...prev, totalPrice: e.target.value }))}
                  placeholder="$"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mat-notes">Notas</Label>
              <Textarea
                id="mat-notes"
                value={materialFormData.notes}
                onChange={e => setMaterialFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaterialDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMaterial} disabled={!materialFormData.name.trim()}>
              {editingMaterial ? 'Guardar Cambios' : 'Agregar Material'}
            </Button>
          </DialogFooter>
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
              {historyTaskId === 'all' ? 'Historial de Modificaciones' : (() => {
                const t = tasks.find(tk => tk.id === historyTaskId)
                return t ? `Historial: ${t.description}` : 'Historial de Tarea'
              })()}
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
                  const task = tasks.find(t => t.id === entry.taskId)
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
                          {historyTaskId === 'all' && task && (
                            <Badge variant="secondary" className="text-xs max-w-[220px] truncate font-normal">
                              {task.description}
                            </Badge>
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
