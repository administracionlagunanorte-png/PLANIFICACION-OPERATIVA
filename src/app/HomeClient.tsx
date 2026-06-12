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
  ChevronUp,
  FileText,
  FileSpreadsheet,
  Package,
  DollarSign,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import ExcelJS from 'exceljs'
import { useToast } from '@/hooks/use-toast'

// Types
interface Task {
  id: string
  description: string
  sector: string
  repairType: string
  priority: string
  etapa: string
  status: string
  responsible: string | null
  estimatedTime: string | null
  amount: number | null
  startDate: string | null
  endDate: string | null
  comments: string | null
  beforePhotos: string
  afterPhotos: string
  workOrder: number
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

interface StatusItem {
  id: string
  name: string
  color: string
  order: number
}

interface ResponsibleItem {
  id: string
  name: string
}

interface EtapaItem {
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

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [repairTypes, setRepairTypes] = useState<RepairType[]>([])
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [etapas, setEtapas] = useState<EtapaItem[]>([])
  const [statuses, setStatuses] = useState<StatusItem[]>([])
  const [responsibles, setResponsibles] = useState<ResponsibleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'dashboard' | 'table' | 'cards' | 'gantt' | 'materials'>('dashboard')
  const [filterSector, setFilterSector] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRepairType, setFilterRepairType] = useState('all')
  const [filterEtapa, setFilterEtapa] = useState('all')

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
  const [deleteMaterialDialogOpen, setDeleteMaterialDialogOpen] = useState(false)
  const [deleteMaterialId, setDeleteMaterialId] = useState<string | null>(null)
  const [deleteMaterialName, setDeleteMaterialName] = useState('')

  // Helper to clean up aria-hidden after dialog close
  const cleanupAriaHidden = useCallback(() => {
    setTimeout(() => {
      document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
        if (el.getAttribute('data-radix-popper-content-wrapper') === null && !el.closest('[role="dialog"]')) {
          el.removeAttribute('aria-hidden')
        }
      })
      document.body.removeAttribute('aria-hidden')
    }, 100)
  }, [])

  // Task form
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    description: '',
    sector: '',
    repairType: '',
    priority: '',
    etapa: '',
    status: 'Pendiente',
    responsible: 'none',
    estimatedTime: '',
    amount: '',
    startDate: '',
    endDate: '',
    comments: '',
    beforePhotos: [] as string[],
    afterPhotos: [] as string[],
    inlineMaterials: [] as Array<{name: string; quantity: string; unit: string; unitPrice: string; totalPrice: string; category: string; notes: string}>,
  })

  // Config form
  const [configTab, setConfigTab] = useState<'sectors' | 'repairTypes' | 'priorities' | 'etapas' | 'statuses' | 'responsibles'>('sectors')
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
  const [newStatusName, setNewStatusName] = useState('')
  const [newStatusColor, setNewStatusColor] = useState('#6b7280')
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
  const [editStatusName, setEditStatusName] = useState('')
  const [editStatusColor, setEditStatusColor] = useState('')
  const [newResponsibleName, setNewResponsibleName] = useState('')
  const [editingResponsibleId, setEditingResponsibleId] = useState<string | null>(null)
  const [editResponsibleName, setEditResponsibleName] = useState('')
  // Etapa config states
  const [newEtapaName, setNewEtapaName] = useState('')
  const [newEtapaColor, setNewEtapaColor] = useState('#6b7280')
  const [editingEtapaId, setEditingEtapaId] = useState<string | null>(null)
  const [editEtapaName, setEditEtapaName] = useState('')
  const [editEtapaColor, setEditEtapaColor] = useState('')

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

  const fetchEtapas = useCallback(async () => {
    try {
      const res = await fetch('/api/etapas')
      if (res.ok) setEtapas(await res.json())
    } catch (err) {
      console.error('Error fetching etapas:', err)
    }
  }, [])

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch('/api/status')
      if (res.ok) setStatuses(await res.json())
    } catch (err) {
      console.error('Error fetching statuses:', err)
    }
  }, [])

  const fetchResponsibles = useCallback(async () => {
    try {
      const res = await fetch('/api/responsibles')
      if (res.ok) setResponsibles(await res.json())
    } catch (err) {
      console.error('Error fetching responsibles:', err)
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
      await Promise.all([fetchTasks(), fetchSectors(), fetchRepairTypes(), fetchPriorities(), fetchEtapas(), fetchStatuses(), fetchResponsibles(), fetchMaterials()])
      setLoading(false)
    }
    loadAll()
  }, [fetchTasks, fetchSectors, fetchRepairTypes, fetchPriorities, fetchEtapas, fetchStatuses, fetchResponsibles, fetchMaterials])

  // Task CRUD
  const { toast } = useToast()
  const [savingTask, setSavingTask] = useState(false)

  const handleSaveTask = async () => {
    if (!formData.description || !formData.sector) {
      toast({ title: 'Campos requeridos', description: 'Descripción y Sector son obligatorios', variant: 'destructive' })
      return
    }
    if (!formData.repairType) {
      toast({ title: 'Campo requerido', description: 'Tipo de Reparación es obligatorio', variant: 'destructive' })
      return
    }
    try {
      setSavingTask(true)
      const body = {
        ...formData,
        responsible: formData.responsible === 'none' ? '' : formData.responsible,
        beforePhotos: JSON.stringify(formData.beforePhotos),
        afterPhotos: JSON.stringify(formData.afterPhotos),
      }
      delete (body as Record<string, unknown>).inlineMaterials

      if (editingTask) {
        const res = await fetch('/api/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTask.id, ...body }),
        })
        if (!res.ok) {
          const errText = await res.text()
          console.error('Error updating task:', errText)
          toast({ title: 'Error al actualizar', description: errText, variant: 'destructive' })
        } else {
          toast({ title: 'Tarea actualizada', description: 'Los cambios se guardaron correctamente' })
        }
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const errText = await res.text()
          console.error('Error creating task:', errText)
          toast({ title: 'Error al crear tarea', description: errText, variant: 'destructive' })
        } else {
          toast({ title: 'Tarea creada', description: 'La tarea se creó correctamente' })
          // Save inline materials for new task
          const newTask = await res.json()
          if (formData.inlineMaterials.length > 0 && newTask.id) {
            for (const mat of formData.inlineMaterials) {
              try {
                await fetch('/api/materials', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    taskId: newTask.id,
                    name: mat.name,
                    quantity: mat.quantity || null,
                    unit: mat.unit || null,
                    unitPrice: mat.unitPrice ? parseFloat(mat.unitPrice) : null,
                    totalPrice: mat.totalPrice ? parseFloat(mat.totalPrice) : null,
                    category: mat.category || null,
                    notes: mat.notes || null,
                  }),
                })
              } catch (matErr) {
                console.error('Error saving inline material:', matErr)
              }
            }
            fetchMaterials()
          }
        }
      }

      setTaskDialogOpen(false)
      setEditingTask(null)
      resetForm()
      fetchTasks()
      fetchPriorities()
    } catch (err) {
      console.error('Error saving task:', err)
    } finally {
      setSavingTask(false)
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

  // Update work order inline
  const handleUpdateWorkOrder = async (taskId: string, newOrder: number) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, workOrder: newOrder }),
      })
      fetchTasks()
    } catch (err) {
      console.error('Error updating work order:', err)
    }
  }

  const handleUpdateTaskPriority = async (taskId: string, newPriority: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, priority: newPriority }),
      })
      fetchTasks()
    } catch (err) {
      console.error('Error updating task priority:', err)
    }
  }

  const handleUpdateTaskEtapa = async (taskId: string, newEtapa: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, etapa: newEtapa }),
      })
      fetchTasks()
    } catch (err) {
      console.error('Error updating task etapa:', err)
    }
  }

  const openEditTask = (task: Task) => {
    setEditingTask(task)
    setFormData({
      description: task.description,
      sector: task.sector,
      repairType: task.repairType,
      priority: task.priority,
      etapa: task.etapa || '',
      status: task.status,
      responsible: task.responsible || 'none',
      estimatedTime: task.estimatedTime || '',
      amount: task.amount?.toString() || '',
      startDate: task.startDate ? task.startDate.split('T')[0] : '',
      endDate: task.endDate ? task.endDate.split('T')[0] : '',
      comments: task.comments || '',
      beforePhotos: JSON.parse(task.beforePhotos || '[]'),
      afterPhotos: JSON.parse(task.afterPhotos || '[]'),
      inlineMaterials: [],
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
      etapa: '',
      status: statuses[0]?.name || 'Pendiente',
      responsible: 'none',
      estimatedTime: '',
      amount: '',
      startDate: '',
      endDate: '',
      comments: '',
      beforePhotos: [],
      afterPhotos: [],
      inlineMaterials: [],
    })
  }

  // Photo upload
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  const handlePhotoUpload = async (file: File, type: 'before' | 'after') => {
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)
    try {
      setUploadingPhotos(true)
      const res = await fetch('/api/upload', { method: 'POST', body: formDataUpload })
      if (res.ok) {
        const data = await res.json()
        if (type === 'before') {
          setFormData(prev => ({ ...prev, beforePhotos: [...prev.beforePhotos, data.url] }))
        } else {
          setFormData(prev => ({ ...prev, afterPhotos: [...prev.afterPhotos, data.url] }))
        }
      } else {
        console.error('Upload failed:', res.status, await res.text())
      }
    } catch (err) {
      console.error('Error uploading photo:', err)
    } finally {
      setUploadingPhotos(false)
    }
  }

  const handleMultiplePhotoUpload = async (files: FileList, type: 'before' | 'after') => {
    setUploadingPhotos(true)
    const newUrls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formDataUpload })
        if (res.ok) {
          const data = await res.json()
          newUrls.push(data.url)
        }
      } catch (err) {
        console.error('Error uploading photo:', err)
      }
    }
    if (newUrls.length > 0) {
      if (type === 'before') {
        setFormData(prev => ({ ...prev, beforePhotos: [...prev.beforePhotos, ...newUrls] }))
      } else {
        setFormData(prev => ({ ...prev, afterPhotos: [...prev.afterPhotos, ...newUrls] }))
      }
    }
    setUploadingPhotos(false)
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
      body: JSON.stringify({ name: newPriorityName.trim(), color: newPriorityColor, order: Math.max(...priorities.map(p => p.order), 0) + 1 }),
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
    fetchTasks()
  }

  const handleDeletePriority = async (id: string) => {
    await fetch(`/api/priorities?id=${id}`, { method: 'DELETE' })
    // Re-fetch and recalculate orders
    const res = await fetch('/api/priorities')
    if (res.ok) {
      const updated = await res.json()
      // Re-index orders sequentially
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].order !== i + 1) {
          await fetch('/api/priorities', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: updated[i].id, order: i + 1 }) })
        }
      }
    }
    fetchPriorities()
    fetchTasks()
  }

  const handleAddEtapa = async () => {
    if (!newEtapaName.trim()) return
    await fetch('/api/etapas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newEtapaName.trim(), color: newEtapaColor, order: Math.max(...etapas.map(e => e.order), 0) + 1 }),
    })
    setNewEtapaName('')
    setNewEtapaColor('#6b7280')
    fetchEtapas()
  }

  const handleUpdateEtapa = async (id: string) => {
    if (!editEtapaName.trim()) return
    await fetch('/api/etapas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editEtapaName.trim(), color: editEtapaColor }),
    })
    setEditingEtapaId(null)
    fetchEtapas()
    fetchTasks()
  }

  const handleDeleteEtapa = async (id: string) => {
    await fetch(`/api/etapas?id=${id}`, { method: 'DELETE' })
    // Re-fetch and recalculate orders
    const res = await fetch('/api/etapas')
    if (res.ok) {
      const updated = await res.json()
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].order !== i + 1) {
          await fetch('/api/etapas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: updated[i].id, order: i + 1 }) })
        }
      }
    }
    fetchEtapas()
    fetchTasks()
  }

  const handleMovePriority = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...priorities].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex(p => p.id === id)
    if (direction === 'up' && idx <= 0) return
    if (direction === 'down' && idx >= sorted.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const item = sorted[idx]
    const swapItem = sorted[swapIdx]
    // Swap orders
    await Promise.all([
      fetch('/api/priorities', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, order: swapItem.order }) }),
      fetch('/api/priorities', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: swapItem.id, order: item.order }) }),
    ])
    fetchPriorities()
    fetchTasks()
  }

  const handleMoveEtapa = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...etapas].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex(e => e.id === id)
    if (direction === 'up' && idx <= 0) return
    if (direction === 'down' && idx >= sorted.length - 1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const item = sorted[idx]
    const swapItem = sorted[swapIdx]
    await Promise.all([
      fetch('/api/etapas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, order: swapItem.order }) }),
      fetch('/api/etapas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: swapItem.id, order: item.order }) }),
    ])
    fetchEtapas()
    fetchTasks()
  }

  const handleAddStatus = async () => {
    if (!newStatusName.trim()) return
    await fetch('/api/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newStatusName.trim(), color: newStatusColor, order: Math.max(...statuses.map(s => s.order), 0) + 1 }),
    })
    setNewStatusName('')
    setNewStatusColor('#6b7280')
    fetchStatuses()
  }

  const handleUpdateStatus = async (id: string) => {
    if (!editStatusName.trim()) return
    await fetch('/api/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editStatusName.trim(), color: editStatusColor }),
    })
    setEditingStatusId(null)
    fetchStatuses()
  }

  const handleDeleteStatus = async (id: string) => {
    await fetch(`/api/status?id=${id}`, { method: 'DELETE' })
    fetchStatuses()
  }

  const handleAddResponsible = async () => {
    if (!newResponsibleName.trim()) return
    await fetch('/api/responsibles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newResponsibleName.trim() }),
    })
    setNewResponsibleName('')
    fetchResponsibles()
  }

  const handleUpdateResponsible = async (id: string) => {
    if (!editResponsibleName.trim()) return
    await fetch('/api/responsibles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: editResponsibleName.trim() }),
    })
    setEditingResponsibleId(null)
    fetchResponsibles()
  }

  const handleDeleteResponsible = async (id: string) => {
    await fetch(`/api/responsibles?id=${id}`, { method: 'DELETE' })
    fetchResponsibles()
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

  const handleDeleteMaterial = async () => {
    if (!deleteMaterialId) return
    try {
      await fetch(`/api/materials?id=${deleteMaterialId}`, { method: 'DELETE' })
      setDeleteMaterialDialogOpen(false)
      setDeleteMaterialId(null)
      setDeleteMaterialName('')
      fetchMaterials()
    } catch (err) {
      console.error('Error deleting material:', err)
    }
  }

  const confirmDeleteMaterial = (material: Material) => {
    setDeleteMaterialId(material.id)
    setDeleteMaterialName(material.name)
    setDeleteMaterialDialogOpen(true)
  }

  // Auto-calculate total price when quantity or unitPrice changes
  const handleMaterialQuantityChange = (value: string) => {
    const qty = parseFloat(value) || 0
    const price = parseFloat(materialFormData.unitPrice) || 0
    const total = qty * price
    setMaterialFormData(prev => ({
      ...prev,
      quantity: value,
      totalPrice: total > 0 ? total.toString() : ''
    }))
  }

  const handleMaterialUnitPriceChange = (value: string) => {
    const price = parseFloat(value) || 0
    const qty = parseFloat(materialFormData.quantity) || 0
    const total = qty * price
    setMaterialFormData(prev => ({
      ...prev,
      unitPrice: value,
      totalPrice: total > 0 ? total.toString() : ''
    }))
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
  // Helper: get priority order for sorting (Alta=1, Media=2, Baja=3, etc.)
  const getPriorityOrder = (priorityName: string): number => {
    const p = priorities.find(pr => pr.name === priorityName)
    return p?.order ?? 999
  }

  // Helper: get etapa order for sorting
  const getEtapaOrder = (etapaName: string): number => {
    const e = etapas.find(et => et.name === etapaName)
    return e?.order ?? 999
  }

  const getEtapaColor = (name: string) => {
    const e = etapas.find(et => et.name === name)
    return e?.color || '#6b7280'
  }

  const filteredTasks = tasks.filter(t => {
    if (filterSector !== 'all' && t.sector !== filterSector) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterRepairType !== 'all' && t.repairType !== filterRepairType) return false
    if (filterEtapa !== 'all' && t.etapa !== filterEtapa) return false
    return true
  }).sort((a, b) => {
    // First sort by priority order (Alta first, then Media, then Baja)
    const priorityA = getPriorityOrder(a.priority)
    const priorityB = getPriorityOrder(b.priority)
    if (priorityA !== priorityB) return priorityA - priorityB
    // Within same priority, sort by etapa order
    const etapaA = getEtapaOrder(a.etapa)
    const etapaB = getEtapaOrder(b.etapa)
    if (etapaA !== etapaB) return etapaA - etapaB
    // Within same priority+etapa, sort by creation date
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
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

  const getStatusColor = (name: string) => {
    const s = statuses.find(st => st.name === name)
    return s?.color || '#6b7280'
  }

  const getStatusBadgeClass = (name: string) => {
    const fallbackMap: Record<string, string> = {
      Pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'En Proceso': 'bg-blue-100 text-blue-800 border-blue-300',
      Completada: 'bg-green-100 text-green-800 border-green-300',
      Cancelada: 'bg-red-100 text-red-800 border-red-300',
    }
    return fallbackMap[name] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  // Gantt chart helpers
  // All filtered tasks sorted by priority, then etapa, then creation date for Gantt display
  const ganttTasks = [...filteredTasks].sort((a, b) => {
    // First sort by priority order (Alta first, then Media, then Baja)
    const priorityA = getPriorityOrder(a.priority)
    const priorityB = getPriorityOrder(b.priority)
    if (priorityA !== priorityB) return priorityA - priorityB
    // Within same priority, sort by etapa order
    const etapaA = getEtapaOrder(a.etapa)
    const etapaB = getEtapaOrder(b.etapa)
    if (etapaA !== etapaB) return etapaA - etapaB
    // Within same priority+etapa, sort by creation date
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
  // Only tasks with dates (for calculating date range)
  const tasksWithDates = filteredTasks.filter(t => t.startDate && t.endDate)
  const ganttStartDate = tasksWithDates.length > 0
    ? new Date(Math.min(...tasksWithDates.map(t => new Date(t.startDate!).getTime())))
    : new Date() // When no tasks have dates, start from today
  const ganttEndDate = tasksWithDates.length > 0
    ? new Date(Math.max(...tasksWithDates.map(t => new Date(t.endDate!).getTime())))
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30-day range when no dates

  // Extend gantt range slightly
  const ganttRangeStart = new Date(ganttStartDate)
  ganttRangeStart.setDate(ganttRangeStart.getDate() - 2)
  const ganttRangeEnd = new Date(ganttEndDate)
  ganttRangeEnd.setDate(ganttRangeEnd.getDate() + 2)

  // Minimum range of 7 days to ensure visible timeline
  if (ganttRangeEnd.getTime() - ganttRangeStart.getTime() < 7 * 24 * 60 * 60 * 1000) {
    ganttRangeEnd.setTime(ganttRangeStart.getTime() + 30 * 24 * 60 * 60 * 1000)
  }

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

  // Gantt download as PDF - Captures exact on-screen Gantt format via html2canvas
  const downloadGanttPDF = async () => {
    setDownloadingGantt(true)
    try {
      const element = document.getElementById('gantt-chart-content')
      if (!element) return

      // Dynamic import to avoid SSR issues
      const html2canvasModule = await import('html2canvas-pro')
      const html2canvas = html2canvasModule.default

      // Temporarily expand for full capture
      const originalOverflow = element.style.overflow
      const originalWidth = element.style.width
      element.style.overflow = 'visible'
      element.style.width = 'max-content'

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth,
      })

      element.style.overflow = originalOverflow
      element.style.width = originalWidth

      // A3 Landscape dimensions (mm)
      const pageWidthMM = 420
      const pageHeightMM = 297
      const marginMM = 8

      const imgWidth = pageWidthMM - 2 * marginMM
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3',
      })

      // If the image fits on one page
      if (imgHeight <= pageHeightMM - 2 * marginMM) {
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', marginMM, marginMM, imgWidth, imgHeight)
      } else {
        // Multi-page: split the canvas image vertically
        const usableHeightMM = pageHeightMM - 2 * marginMM
        const pxPerMM = canvas.width / imgWidth
        const pageHeightPx = usableHeightMM * pxPerMM
        const totalPages = Math.ceil(canvas.height / pageHeightPx)

        for (let page = 0; page < totalPages; page++) {
          if (page > 0) pdf.addPage('a3', 'landscape')

          const srcY = page * pageHeightPx
          const srcH = Math.min(pageHeightPx, canvas.height - srcY)

          // Create a sub-canvas for this page
          const pageCanvas = document.createElement('canvas')
          pageCanvas.width = canvas.width
          pageCanvas.height = srcH
          const ctx = pageCanvas.getContext('2d')!
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
          ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

          const pageImgHeight = (srcH * imgWidth) / canvas.width
          pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', marginMM, marginMM, imgWidth, pageImgHeight)

          // Add page number footer
          pdf.setFontSize(8)
          pdf.setTextColor(148, 163, 184)
          pdf.text(`Página ${page + 1} de ${totalPages}`, pageWidthMM - marginMM - 40, pageHeightMM - marginMM / 2)
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
      const sortedTasks = [...ganttTasks]

      const wb = new ExcelJS.Workbook()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // ===== GANTT SHEET =====
      const ws = wb.addWorksheet('Gantt', {
        properties: { defaultColWidth: 4 },
      })

      const fixedHeaders = ['N°', 'Descripción', 'Sector', 'Tipo', 'Prioridad', 'Estado', 'Responsable', 'Fecha Inicio', 'Fecha Término']
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
        const hasDates = !!(taskStart && taskEnd)
        const materialsTotal = getMaterialsTotal(task.id)
        const matCount = getMaterialsCount(task.id)

        const row = [
          sortedTasks.indexOf(task) + 1,
          task.description + (!hasDates ? ' ⚠' : ''),
          task.sector,
          task.repairType,
          task.priority,
          task.status,
          task.responsible || '',
          task.startDate ? new Date(task.startDate).toLocaleDateString('es-CL') : 'Sin fecha',
          task.endDate ? new Date(task.endDate).toLocaleDateString('es-CL') : 'Sin fecha',
        ]

        ganttDays.forEach((dayDate) => {
          const dayTime = dayDate.getTime()
          const inRange = taskStart && taskEnd && dayTime >= taskStart.getTime() && dayTime <= taskEnd.getTime()
          row.push(inRange ? ' ' : '')
        })

        row.push(matCount > 0 ? String(materialsTotal) : '')

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
        excelRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
        excelRow.getCell(2).font = { size: 10, bold: true }
        excelRow.getCell(3).font = { size: 9 }
        excelRow.getCell(4).font = { size: 9 }

        // Dim rows without dates
        if (!hasDates) {
          excelRow.getCell(2).font = { size: 10, bold: true, color: { argb: 'FF9CA3AF' } }
          excelRow.getCell(8).font = { size: 9, color: { argb: 'FFF97316' } }
          excelRow.getCell(9).font = { size: 9, color: { argb: 'FFF97316' } }
        }

        // Priority column (column 5)
        const pColor = getPriorityColor(task.priority)
        excelRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${pColor.replace('#', '')}` } }
        excelRow.getCell(5).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
        excelRow.getCell(5).alignment = { horizontal: 'center' }

        // Status column with color (column 6)
        const statusStyleMap: Record<string, string> = {
          'Pendiente': 'FFF59E0B',
          'En Proceso': 'FF2563EB',
          'Completada': 'FF16A34A',
          'Cancelada': 'FFDC2626',
        }
        const statusColor = statusStyleMap[task.status]
        if (statusColor) {
          excelRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } }
          excelRow.getCell(6).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
          excelRow.getCell(6).alignment = { horizontal: 'center' }
        }

        // Style day columns - gantt bars
        for (let c = fixedHeaders.length + 1; c <= fixedHeaders.length + ganttDays.length; c++) {
          const cell = excelRow.getCell(c)
          const dayIdx = c - fixedHeaders.length - 1
          const dayDate = ganttDays[dayIdx]
          const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6
          const isDayToday = dayDate.getTime() === today.getTime()
          const isBar = cell.value === ' '

          if (isBar) {
            // Gantt bar cell - fill with the bar color
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${barColorHex}` } }
            cell.font = { color: { argb: `FF${barColorHex}` }, size: 10 }
            cell.alignment = { horizontal: 'center' }
            cell.value = '' // Clear the space, fill provides the visual
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

  // Gantt download as PNG image - Captures exact on-screen format
  const downloadGanttPNG = async () => {
    setDownloadingGantt(true)
    try {
      const element = document.getElementById('gantt-chart-content')
      if (!element) return

      // Dynamic import to avoid SSR issues
      const html2canvasModule = await import('html2canvas-pro')
      const html2canvas = html2canvasModule.default

      // Temporarily make the element fully visible for capture
      const originalOverflow = element.style.overflow
      const originalWidth = element.style.width
      element.style.overflow = 'visible'
      element.style.width = 'max-content'

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth,
      })

      element.style.overflow = originalOverflow
      element.style.width = originalWidth

      const link = document.createElement('a')
      link.download = `gantt-planificacion-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Error downloading Gantt as PNG:', err)
    }
    setDownloadingGantt(false)
  }

  // Helper to convert hex color to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null
  }

  // Helper: fetch image as base64 data URL
  const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      const blob = await res.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  // Export individual task as PDF - Professional Template
  const exportTaskPDF = async (task: Task) => {
    const doc = new jsPDF()
    const taskMaterials = getMaterialsForTask(task.id)
    const materialsTotal = getMaterialsTotal(task.id)
    const beforePhotos = JSON.parse(task.beforePhotos || '[]') as string[]
    const afterPhotos = JSON.parse(task.afterPhotos || '[]') as string[]

    const margin = 15
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const contentWidth = pageWidth - 2 * margin

    // Helper to load image
    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => resolve(img)
        img.src = url
      })
    }

    // Fetch logo as base64 for reliable embedding
    const logoBase64 = await fetchImageAsBase64('/logo-laguna-norte.jpg')

    // Helper to add footer to current page
    const addFooter = () => {
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.text('Documento generado automáticamente por Sistema de Gestión Laguna Norte', margin, pageHeight - 10)
      doc.text('Administración - Asesorías Integrales CyJ', margin, pageHeight - 6)
      const pageCount = doc.getNumberOfPages()
      doc.text(`Página ${doc.getCurrentPageInfo().pageNumber} de ${pageCount}`, pageWidth - margin - 20, pageHeight - 6)
    }

    let y = 15

    // ===== HEADER =====
    // Logo
    if (logoBase64) {
      doc.addImage(logoBase64, 'JPEG', margin, y, 24, 24)
    }

    // Company title - centered on the page
    const centerX = pageWidth / 2
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('CONDOMINIO & PARQUE', centerX, y + 8, { align: 'center' })

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('REPORTE DE OPERACIÓN', centerX, y + 15, { align: 'center' })

    // Date on the right
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    const dateStr = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
    doc.text(dateStr, pageWidth - margin, y + 8, { align: 'right' })
    const createdStr = `Creada: ${formatDate(task.createdAt)}`
    doc.text(createdStr, pageWidth - margin, y + 14, { align: 'right' })

    y += 28

    // Separator line
    doc.setDrawColor(30, 41, 59)
    doc.setLineWidth(0.8)
    doc.line(margin, y, pageWidth - margin, y)
    y += 8

    // ===== INFORMACIÓN DE LA ORDEN =====
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('INFORMACIÓN DE LA ORDEN', margin, y)
    y += 7

    // Activity name - FULL WIDTH on its own line
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(margin, y - 4, contentWidth, 9, 1.5, 1.5, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('Actividad:', margin + 3, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(10)
    const taskNumber = tasks.indexOf(task) + 1
    const orderPrefix = `${taskNumber}. `
    doc.text(orderPrefix + task.description, margin + 3 + doc.getTextWidth('Actividad: '), y)
    y += 12

    // Two-column layout for short fields
    const shortFields = [
      ['Área / Sector', task.sector, 'Tipo Reparación', task.repairType],
      ['Prioridad', task.priority, 'Estado', task.status],
      ['Responsable', task.responsible || 'Sin asignar', 'Tiempo Estimado', task.estimatedTime || '-'],
      ['Fecha Inicio', formatDate(task.startDate), 'Fecha Término', formatDate(task.endDate)],
      ['Monto', task.amount ? formatCurrency(task.amount) : '-', '', ''],
    ]

    const labelColW = 38
    const halfW = contentWidth / 2
    const rowH = 8

    shortFields.forEach((row, rowIdx) => {
      if (y > pageHeight - 25) { addFooter(); doc.addPage(); y = 20 }

      // Alternating row background
      if (rowIdx % 2 === 0) {
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, y - 4, contentWidth, rowH, 'F')
      }

      // Left column
      if (row[0]) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(71, 85, 105)
        doc.text(`${row[0]}:`, margin + 2, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(30, 41, 59)
        doc.setFontSize(9)
        const leftLabelW = doc.getTextWidth(`${row[0]}: `)
        const leftMaxW = halfW - labelColW
        const leftVal = row[1]
        const leftLines = doc.splitTextToSize(leftVal, leftMaxW)
        doc.text(leftLines[0], margin + 2 + leftLabelW, y)
      }

      // Right column
      if (row[2]) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(71, 85, 105)
        doc.text(`${row[2]}:`, margin + halfW + 2, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(30, 41, 59)
        doc.setFontSize(9)
        const rightLabelW = doc.getTextWidth(`${row[2]}: `)
        const rightMaxW = halfW - labelColW
        const rightVal = row[3]
        const rightLines = doc.splitTextToSize(rightVal, rightMaxW)
        doc.text(rightLines[0], margin + halfW + 2 + rightLabelW, y)
      }

      y += rowH
    })

    y += 4

    // ===== DESCRIPCIÓN DEL TRABAJO =====
    if (y > pageHeight - 40) { addFooter(); doc.addPage(); y = 20 }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('DESCRIPCIÓN DEL TRABAJO', margin, y)
    y += 5

    // Description box
    doc.setDrawColor(203, 213, 225)
    doc.setFillColor(252, 252, 253)
    const descLines = doc.splitTextToSize(task.comments || task.description, contentWidth - 8)
    const descBoxH = Math.max(15, descLines.length * 5 + 6)
    doc.roundedRect(margin, y - 2, contentWidth, descBoxH, 2, 2, 'FD')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(51, 65, 85)
    descLines.forEach((line: string, i: number) => {
      doc.text(line, margin + 4, y + 3 + i * 5)
    })
    y += descBoxH + 6

    // ===== MATERIALES =====
    if (taskMaterials.length > 0) {
      if (y > pageHeight - 50) { addFooter(); doc.addPage(); y = 20 }

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text('MATERIALES', margin, y)
      y += 5

      // Table header
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      const matColWidths = [50, 25, 18, 18, 25, 25]
      let matColX = margin
      const matColPositions: number[] = []
      matColWidths.forEach(w => { matColPositions.push(matColX); matColX += w })

      doc.setFillColor(30, 41, 59)
      doc.setTextColor(255, 255, 255)
      doc.rect(margin, y - 4, contentWidth, 7, 'F')
      doc.text('Nombre', matColPositions[0] + 2, y)
      doc.text('Categoría', matColPositions[1] + 2, y)
      doc.text('Cantidad', matColPositions[2] + 2, y)
      doc.text('Unidad', matColPositions[3] + 2, y)
      doc.text('P. Unitario', matColPositions[4] + 2, y)
      doc.text('P. Total', matColPositions[5] + 2, y)
      y += 7

      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'normal')
      taskMaterials.forEach((mat, idx) => {
        if (y > pageHeight - 25) { addFooter(); doc.addPage(); y = 20 }
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margin, y - 4, contentWidth, 6, 'F')
        }
        doc.text(mat.name.substring(0, 28), matColPositions[0] + 2, y)
        doc.text((mat.category || '-').substring(0, 14), matColPositions[1] + 2, y)
        doc.text(mat.quantity || '-', matColPositions[2] + 2, y)
        doc.text(mat.unit || '-', matColPositions[3] + 2, y)
        doc.text(mat.unitPrice ? formatCurrency(mat.unitPrice) : '-', matColPositions[4] + 2, y)
        doc.setFont('helvetica', 'bold')
        doc.text(mat.totalPrice ? formatCurrency(mat.totalPrice) : '-', matColPositions[5] + 2, y)
        doc.setFont('helvetica', 'normal')
        y += 6
      })

      // Total row
      doc.setFillColor(226, 232, 240)
      doc.rect(margin, y - 4, contentWidth, 7, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(71, 85, 105)
      doc.text('Total Materiales:', matColPositions[4] + 2, y)
      doc.setTextColor(5, 150, 105)
      doc.setFontSize(10)
      doc.text(formatCurrency(materialsTotal), matColPositions[5] + 2, y)
      y += 12
    }

    // ===== EVIDENCIA FOTOGRÁFICA =====
    if (beforePhotos.length > 0 || afterPhotos.length > 0) {
      if (y > pageHeight - 60) { addFooter(); doc.addPage(); y = 20 }

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text('EVIDENCIA FOTOGRÁFICA', margin, y)
      y += 7

      const photoWidth = (contentWidth - 10) / 2
      const photoHeight = 55

      // ANTES column
      const colStartX1 = margin
      const colStartX2 = margin + photoWidth + 10

      // Column headers
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(71, 85, 105)
      doc.text('ANTES', colStartX1, y)
      doc.text('DESPUÉS', colStartX2, y)
      y += 4

      // Draw photos in ANTES and DESPUÉS columns
      const maxRows = Math.max(beforePhotos.length, afterPhotos.length)

      for (let row = 0; row < maxRows; row++) {
        if (y + photoHeight > pageHeight - 20) { addFooter(); doc.addPage(); y = 20 }

        // Before photo
        if (row < beforePhotos.length) {
          try {
            const img = await loadImage(beforePhotos[row])
            if (img.complete && img.naturalWidth > 0) {
              doc.addImage(img, 'JPEG', colStartX1, y, photoWidth, photoHeight)
            }
          } catch {
            doc.setDrawColor(203, 213, 225)
            doc.setFillColor(248, 250, 252)
            doc.rect(colStartX1, y, photoWidth, photoHeight, 'FD')
            doc.setFontSize(8)
            doc.setTextColor(148, 163, 184)
            doc.text('Foto no disponible', colStartX1 + photoWidth / 2 - 20, y + photoHeight / 2)
          }
          doc.setDrawColor(203, 213, 225)
          doc.rect(colStartX1, y, photoWidth, photoHeight)
        }

        // After photo
        if (row < afterPhotos.length) {
          try {
            const img = await loadImage(afterPhotos[row])
            if (img.complete && img.naturalWidth > 0) {
              doc.addImage(img, 'JPEG', colStartX2, y, photoWidth, photoHeight)
            }
          } catch {
            doc.setDrawColor(203, 213, 225)
            doc.setFillColor(248, 250, 252)
            doc.rect(colStartX2, y, photoWidth, photoHeight, 'FD')
            doc.setFontSize(8)
            doc.setTextColor(148, 163, 184)
            doc.text('Foto no disponible', colStartX2 + photoWidth / 2 - 20, y + photoHeight / 2)
          }
          doc.setDrawColor(203, 213, 225)
          doc.rect(colStartX2, y, photoWidth, photoHeight)
        }

        y += photoHeight + 5
      }
    }

    // Add footer to all pages
    const totalPageCount = doc.getNumberOfPages()
    for (let i = 1; i <= totalPageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.text('Documento generado automáticamente por Sistema de Gestión Laguna Norte', margin, pageHeight - 10)
      doc.text('Administración - Asesorías Integrales CyJ', margin, pageHeight - 6)
      doc.text(`Página ${i} de ${totalPageCount}`, pageWidth - margin - 20, pageHeight - 6)
    }

    const slug = task.description.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/g, '').substring(0, 30)
    doc.save(`tarea-${slug}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Export individual task as Excel
  const exportTaskExcel = async (task: Task) => {
    const taskMaterials = getMaterialsForTask(task.id)
    const materialsTotal = getMaterialsTotal(task.id)

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Detalle')

    // Set column widths
    ws.getColumn(1).width = 22
    ws.getColumn(2).width = 45

    // Title
    const titleRow = ws.addRow(['CONDOMINIO & PARQUE - Laguna Norte'])
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF0F172A' } }
    ws.mergeCells(1, 1, 1, 2)
    titleRow.height = 30

    // Subtitle
    const subtitleRow = ws.addRow(['REPORTE DE OPERACION'])
    subtitleRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF475569' } }
    ws.mergeCells(2, 1, 2, 2)
    subtitleRow.height = 22

    // Date row
    const codeRow = ws.addRow(['', `Generado: ${new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}`])
    codeRow.getCell(2).font = { size: 10, color: { argb: 'FF64748B' } }
    codeRow.getCell(2).alignment = { horizontal: 'right' }
    codeRow.height = 20

    ws.addRow([])

    // Task info
    const addInfoRow = (label: string, value: string) => {
      const row = ws.addRow([label, value])
      row.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF475569' } }
      row.getCell(2).font = { size: 10, color: { argb: 'FF1E293B' } }
      row.getCell(1).alignment = { vertical: 'middle' }
      row.getCell(2).alignment = { vertical: 'middle', wrapText: true }
    }

    addInfoRow('N° Tarea', String(tasks.indexOf(task) + 1))
    addInfoRow('Descripción', task.description)
    addInfoRow('Área / Sector', task.sector)
    addInfoRow('Tipo Reparación', task.repairType)
    addInfoRow('Prioridad', task.priority)
    addInfoRow('Estado', task.status)
    addInfoRow('Responsable', task.responsible || 'Sin asignar')
    addInfoRow('Fecha Inicio', formatDate(task.startDate))
    addInfoRow('Fecha Término', formatDate(task.endDate))
    addInfoRow('Tiempo Estimado', task.estimatedTime || '-')
    addInfoRow('Monto', task.amount ? formatCurrency(task.amount) : '-')
    addInfoRow('Comentarios', task.comments || '-')

    ws.addRow([])

    // Materials section
    if (taskMaterials.length > 0) {
      const matTitleRow = ws.addRow(['Materiales'])
      matTitleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF0F172A' } }
      ws.mergeCells(matTitleRow.number, 1, matTitleRow.number, 6)
      matTitleRow.height = 25

      ws.addRow([])

      // Adjust column widths for materials table
      ws.getColumn(1).width = 30
      ws.getColumn(2).width = 15
      ws.getColumn(3).width = 12
      ws.getColumn(4).width = 10
      ws.getColumn(5).width = 14
      ws.getColumn(6).width = 14

      // Header row
      const headerRow = ws.addRow(['Nombre', 'Categoría', 'Cantidad', 'Unidad', 'P. Unitario', 'P. Total'])
      headerRow.height = 22
      for (let c = 1; c <= 6; c++) {
        const cell = headerRow.getCell(c)
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF334155' } },
          bottom: { style: 'thin', color: { argb: 'FF334155' } },
          left: { style: 'thin', color: { argb: 'FF334155' } },
          right: { style: 'thin', color: { argb: 'FF334155' } },
        }
      }

      // Material rows
      taskMaterials.forEach((mat, idx) => {
        const row = ws.addRow([
          mat.name,
          mat.category || '',
          mat.quantity || '',
          mat.unit || '',
          mat.unitPrice || '',
          mat.totalPrice || '',
        ])
        row.getCell(5).numFmt = '$#,##0'
        row.getCell(6).numFmt = '$#,##0'
        row.getCell(6).font = { bold: true, color: { argb: 'FF059669' } }

        // Alternating row background
        if (idx % 2 === 0) {
          for (let c = 1; c <= 6; c++) {
            row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
          }
        }

        // Borders for all cells
        for (let c = 1; c <= 6; c++) {
          row.getCell(c).border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          }
        }
      })

      // Total row
      const totalRow = ws.addRow(['', '', '', '', 'Total:', materialsTotal])
      totalRow.getCell(5).font = { bold: true, size: 11, color: { argb: 'FF475569' } }
      totalRow.getCell(6).font = { bold: true, size: 12, color: { argb: 'FF059669' } }
      totalRow.getCell(6).numFmt = '$#,##0'
      for (let c = 1; c <= 6; c++) {
        totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
        totalRow.getCell(c).border = {
          top: { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
          left: { style: 'thin', color: { argb: 'FF94A3B8' } },
          right: { style: 'thin', color: { argb: 'FF94A3B8' } },
        }
      }
    }

    // Download
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const slug = task.description.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/g, '').substring(0, 30)
    a.download = `tarea-${slug}-${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export full table as PDF with colors matching on-screen view
  const [downloadingTable, setDownloadingTable] = useState(false)

  const downloadTablePDF = async () => {
    setDownloadingTable(true)
    try {
      // Landscape A3 for wide table
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 10
      const contentWidth = pageWidth - 2 * margin

      // Fetch logo
      const logoBase64 = await fetchImageAsBase64('/logo-laguna-norte.jpg')

      let y = 12

      // ===== HEADER =====
      if (logoBase64) {
        doc.addImage(logoBase64, 'JPEG', margin, y, 18, 18)
      }

      const centerX = pageWidth / 2
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text('CONDOMINIO & PARQUE', centerX, y + 6, { align: 'center' })

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(71, 85, 105)
      doc.text('Planificación de Mantención - Tabla de Tareas', centerX, y + 12, { align: 'center' })

      // Date right
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      const genDate = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })
      doc.text(genDate, pageWidth - margin, y + 6, { align: 'right' })
      doc.text(`${filteredTasks.length} tareas`, pageWidth - margin, y + 10, { align: 'right' })

      y += 22

      // Separator
      doc.setDrawColor(30, 41, 59)
      doc.setLineWidth(0.6)
      doc.line(margin, y, pageWidth - margin, y)
      y += 5

      // ===== TABLE HEADER =====
      const cols = [
        { header: 'N°', width: 14 },
        { header: 'Descripción', width: 65 },
        { header: 'Sector', width: 28 },
        { header: 'Tipo', width: 30 },
        { header: 'Prioridad', width: 26 },
        { header: 'Estado', width: 26 },
        { header: 'Responsable', width: 40 },
        { header: 'Tiempo Est.', width: 22 },
        { header: 'Monto', width: 28 },
        { header: 'Inicio', width: 22 },
        { header: 'Término', width: 22 },
        { header: 'Fotos', width: 14 },
      ]
      if (showMaterials) {
        cols.push({ header: 'Materiales', width: 24 })
      }

      const headerH = 8
      // Header background
      doc.setFillColor(30, 41, 59)
      doc.rect(margin, y - 1, contentWidth, headerH, 'F')

      // Header text
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      let colX = margin
      cols.forEach(col => {
        doc.text(col.header, colX + 2, y + 4)
        colX += col.width
      })
      y += headerH + 1

      // ===== TABLE ROWS =====
      const rowH = 7
      const statusColorMap: Record<string, { bg: string; text: string }> = {
        'Pendiente': { bg: 'FEF3C7', text: '92400E' },
        'En Proceso': { bg: 'DBEAFE', text: '1E40AF' },
        'Completada': { bg: 'DCFCE7', text: '166534' },
        'Cancelada': { bg: 'FEE2E2', text: '991B1B' },
      }

      filteredTasks.forEach((task, idx) => {
        if (y + rowH > pageHeight - 15) {
          // Footer
          doc.setFontSize(6)
          doc.setTextColor(148, 163, 184)
          doc.text(`Página ${doc.getNumberOfPages()}`, pageWidth - margin - 15, pageHeight - 6)

          doc.addPage()
          y = 15

          // Repeat header on new page
          doc.setFillColor(30, 41, 59)
          doc.rect(margin, y - 1, contentWidth, headerH, 'F')
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(255, 255, 255)
          colX = margin
          cols.forEach(col => {
            doc.text(col.header, colX + 2, y + 4)
            colX += col.width
          })
          y += headerH + 1
        }

        // Alternating row background
        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252)
          doc.rect(margin, y - 1, contentWidth, rowH, 'F')
        }

        // Row border
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.2)
        doc.line(margin, y + rowH - 1, pageWidth - margin, y + rowH - 1)

        colX = margin

        // N° Tarea (correlativo)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 23, 42)
        {
          const orderText = String(tableTasks.indexOf(task) + 1)
          const orderW = doc.getTextWidth(orderText) + 6
          doc.setFillColor(30, 41, 59)
          doc.roundedRect(colX + (cols[0].width - orderW) / 2, y + 0.5, orderW, 5, 1.5, 1.5, 'F')
          doc.setTextColor(255, 255, 255)
          doc.text(orderText, colX + cols[0].width / 2, y + 4, { align: 'center' })
        }
        colX += cols[0].width

        // Descripción
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 23, 42)
        const descText = task.description.length > 38 ? task.description.substring(0, 35) + '...' : task.description
        doc.text(descText, colX + 2, y + 4)
        colX += cols[1].width

        // Sector
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(51, 65, 85)
        doc.setFontSize(7)
        // Sector badge background
        const sectorW = doc.getTextWidth(task.sector) + 4
        doc.setFillColor(241, 245, 249)
        doc.roundedRect(colX + 1, y + 0.5, Math.min(sectorW, cols[2].width - 4), 5, 1, 1, 'F')
        doc.text(task.sector, colX + 3, y + 4)
        colX += cols[2].width

        // Tipo
        doc.setTextColor(51, 65, 85)
        doc.text(task.repairType, colX + 2, y + 4)
        colX += cols[3].width

        // Prioridad with colored dot
        const pColor = getPriorityColor(task.priority)
        const pRgb = hexToRgb(pColor)
        if (pRgb) {
          doc.setFillColor(pRgb.r, pRgb.g, pRgb.b)
          doc.circle(colX + 4, y + 3.2, 1.8, 'F')
        }
        doc.setTextColor(30, 41, 59)
        doc.setFontSize(7)
        doc.text(task.priority, colX + 8, y + 4)
        colX += cols[4].width

        // Estado with colored badge
        const sColors = statusColorMap[task.status]
        if (sColors) {
          const statusW = doc.getTextWidth(task.status) + 6
          doc.setFillColor(parseInt(sColors.bg.substring(0, 2), 16), parseInt(sColors.bg.substring(2, 4), 16), parseInt(sColors.bg.substring(4, 6), 16))
          doc.roundedRect(colX + 1, y + 0.5, Math.min(statusW, cols[5].width - 4), 5, 1, 1, 'F')
          doc.setTextColor(parseInt(sColors.text.substring(0, 2), 16), parseInt(sColors.text.substring(2, 4), 16), parseInt(sColors.text.substring(4, 6), 16))
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          doc.text(task.status, colX + 4, y + 4)
          doc.setFont('helvetica', 'normal')
        } else {
          // Custom status - use status color from config
          const stColor = getStatusColor(task.status)
          const stRgb = hexToRgb(stColor)
          if (stRgb) {
            const statusW = doc.getTextWidth(task.status) + 6
            doc.setFillColor(Math.min(255, stRgb.r + 150), Math.min(255, stRgb.g + 150), Math.min(255, stRgb.b + 150))
            doc.roundedRect(colX + 1, y + 0.5, Math.min(statusW, cols[5].width - 4), 5, 1, 1, 'F')
            doc.setTextColor(stRgb.r, stRgb.g, stRgb.b)
            doc.setFontSize(7)
            doc.setFont('helvetica', 'bold')
            doc.text(task.status, colX + 4, y + 4)
            doc.setFont('helvetica', 'normal')
          } else {
            doc.setTextColor(30, 41, 59)
            doc.text(task.status, colX + 2, y + 4)
          }
        }
        colX += cols[5].width

        // Responsable
        doc.setTextColor(51, 65, 85)
        doc.setFontSize(7)
        doc.text(task.responsible || '-', colX + 2, y + 4)
        colX += cols[6].width

        // Tiempo Est.
        doc.text(task.estimatedTime || '-', colX + 2, y + 4)
        colX += cols[7].width

        // Monto
        doc.setTextColor(15, 23, 42)
        doc.setFont('helvetica', 'bold')
        doc.text(task.amount ? formatCurrency(task.amount) : '-', colX + 2, y + 4)
        doc.setFont('helvetica', 'normal')
        colX += cols[8].width

        // Inicio
        doc.setTextColor(51, 65, 85)
        doc.text(formatDate(task.startDate), colX + 2, y + 4)
        colX += cols[9].width

        // Término
        doc.text(formatDate(task.endDate), colX + 2, y + 4)
        colX += cols[10].width

        // Fotos
        const beforePhotos = JSON.parse(task.beforePhotos || '[]') as string[]
        const afterPhotos = JSON.parse(task.afterPhotos || '[]') as string[]
        const totalPhotos = beforePhotos.length + afterPhotos.length
        doc.setTextColor(100, 116, 139)
        doc.text(totalPhotos > 0 ? String(totalPhotos) : '-', colX + 2, y + 4)
        colX += cols[11].width

        // Materiales
        if (showMaterials) {
          const matCount = getMaterialsCount(task.id)
          if (matCount > 0) {
            const matTotal = getMaterialsTotal(task.id)
            doc.setTextColor(5, 150, 105)
            doc.setFont('helvetica', 'bold')
            doc.text(`${matCount} / ${formatCurrency(matTotal)}`, colX + 2, y + 4)
            doc.setFont('helvetica', 'normal')
          } else {
            doc.setTextColor(100, 116, 139)
            doc.text('-', colX + 2, y + 4)
          }
        }

        y += rowH
      })

      // Summary row
      y += 2
      doc.setDrawColor(30, 41, 59)
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      y += 5

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(71, 85, 105)
      doc.text(`Total tareas: ${filteredTasks.length}`, margin + 2, y)

      const totalAmount = filteredTasks.reduce((sum, t) => sum + (t.amount || 0), 0)
      doc.text(`Monto total: ${formatCurrency(totalAmount)}`, margin + 60, y)

      const pendingCount = filteredTasks.filter(t => t.status === 'Pendiente').length
      const inProgressCount = filteredTasks.filter(t => t.status === 'En Proceso').length
      const completedCount = filteredTasks.filter(t => t.status === 'Completada').length
      doc.text(`Pendientes: ${pendingCount} | En Proceso: ${inProgressCount} | Completadas: ${completedCount}`, margin + 140, y)

      // Footer on all pages
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(6)
        doc.setTextColor(148, 163, 184)
        doc.text('Documento generado automáticamente por Sistema de Gestión Laguna Norte', margin, pageHeight - 6)
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 6)
      }

      doc.save(`tabla-tareas-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Error downloading table as PDF:', err)
    }
    setDownloadingTable(false)
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
        <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src="/logo-laguna-norte.jpg" alt="Laguna Norte" className="h-8 sm:h-10 w-auto rounded" />
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-900">Planificación de Mantención</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Condominio & Parque - Laguna Norte</p>
              </div>
            </div>
            {/* Desktop buttons */}
            <div className="hidden lg:flex items-center gap-2">
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
            {/* Mobile menu */}
            <div className="flex lg:hidden items-center gap-1">
              <Button onClick={openCreateTask} size="sm" className="h-9 w-9 p-0">
                <Plus className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setConfigDialogOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" /> Configurar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openHistory('all')}>
                    <History className="h-4 w-4 mr-2" /> Historial
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* View Tabs */}
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex bg-white rounded-lg border p-1 gap-1 overflow-x-auto scrollbar-none">
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
          <div className="flex items-center gap-2 flex-wrap max-w-full">
            <Select value={filterSector} onValueChange={setFilterSector}>
              <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs">
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
              <SelectTrigger className="w-[110px] sm:w-[130px] h-8 text-xs">
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
              <SelectTrigger className="w-[110px] sm:w-[130px] h-8 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRepairType} onValueChange={setFilterRepairType}>
              <SelectTrigger className="w-[120px] sm:w-[140px] h-8 text-xs">
                <SelectValue placeholder="Tipo Rep." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Tipos</SelectItem>
                {repairTypes.map(rt => (
                  <SelectItem key={rt.id} value={rt.name}>{rt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEtapa} onValueChange={setFilterEtapa}>
              <SelectTrigger className="w-[110px] sm:w-[130px] h-8 text-xs">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Etapas</SelectItem>
                {etapas.map(et => (
                  <SelectItem key={et.id} value={et.name}>{et.name}</SelectItem>
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
      <main className="max-w-[1600px] mx-auto px-3 sm:px-4 pb-8">
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
                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getPriorityColor(task.priority) }}></span>
                          <span className="text-sm font-medium truncate">{task.description}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{task.sector} · {task.repairType}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusBadgeClass(task.status) || ''}>
                          {task.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" title="Exportar">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportTaskPDF(task)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Exportar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportTaskExcel(task)}>
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Exportar Excel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditTask(task)} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tabla de Tareas</CardTitle>
                <Button variant="outline" size="sm" onClick={downloadTablePDF} disabled={downloadingTable} className="gap-1">
                  <FileText className="h-4 w-4" />
                  {downloadingTable ? 'Generando PDF...' : 'Exportar PDF'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="sm:hidden px-4 py-2 text-xs text-gray-400 flex items-center gap-1">
                <ChevronRight className="h-3 w-3" /> Desliza para ver más columnas
              </div>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      
                      <TableHead className="min-w-[200px]">Descripción</TableHead>
                      <TableHead>Sector</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Etapa</TableHead>
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
                        <TableCell colSpan={showMaterials ? 14 : 13} className="text-center py-8 text-gray-500">
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
                              <select
                                value={task.priority}
                                onChange={e => handleUpdateTaskPriority(task.id, e.target.value)}
                                className="text-sm border rounded px-1.5 py-0.5 bg-transparent cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary"
                                style={{ color: getPriorityColor(task.priority) }}
                              >
                                {priorities.map(p => (
                                  <option key={p.id} value={p.name} style={{ color: p.color }}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </TableCell>
                            <TableCell>
                              <select
                                value={task.etapa || ''}
                                onChange={e => handleUpdateTaskEtapa(task.id, e.target.value)}
                                className="text-sm border rounded px-1.5 py-0.5 bg-transparent cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary"
                                style={{ color: getEtapaColor(task.etapa) }}
                              >
                                <option value="" style={{ color: '#6b7280' }}>Sin etapa</option>
                                {etapas.map(et => (
                                  <option key={et.id} value={et.name} style={{ color: et.color }}>
                                    {et.name}
                                  </option>
                                ))}
                              </select>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getStatusBadgeClass(task.status) || ''}>
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
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Exportar">
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => exportTaskPDF(task)}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Exportar PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => exportTaskExcel(task)}>
                                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                                      Exportar Excel
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openHistory(task.id)} title="Historial">
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEditTask(task)} title="Editar tarea">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" onClick={() => { setDeleteId(task.id); setDeleteDialogOpen(true) }} title="Eliminar">
                                  <Trash2 className="h-4 w-4" />
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
                        <Badge variant="outline" className={`${getStatusBadgeClass(task.status) || ''} ml-2 shrink-0`}>
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
                        {task.etapa && (
                          <Badge variant="outline" className="flex items-center gap-1" style={{ borderColor: getEtapaColor(task.etapa), color: getEtapaColor(task.etapa) }}>
                            {task.etapa}
                          </Badge>
                        )}
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                              <Download className="h-3.5 w-3.5" /> Exportar
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportTaskPDF(task)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Exportar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportTaskExcel(task)}>
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Exportar Excel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => openHistory(task.id)}>
                          <History className="h-3.5 w-3.5" /> Historial
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => openEditTask(task)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-red-500" onClick={() => { setDeleteId(task.id); setDeleteDialogOpen(true) }}>
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
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
                    {filteredTasks.length} tareas · {tasksWithDates.length} con fechas asignadas
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingGantt || filteredTasks.length === 0}
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
                    <DropdownMenuItem onClick={downloadGanttPNG} disabled={downloadingGantt}>
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Descargar Imagen (PNG)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <GanttChart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay tareas para mostrar.</p>
                  <p className="text-sm mt-1">Cree tareas y asígneles fechas para generar el diagrama.</p>
                </div>
              ) : (
                <ScrollArea className="w-full gantt-scroll-area">
                  <div id="gantt-chart-content" className="min-w-[900px] p-4 bg-white">
                    {/* Title for exported image */}
                    <div className="mb-4 pb-3 border-b">
                      <h2 className="text-lg font-bold text-gray-900">Planificación de Mantención - Diagrama de Gantt</h2>
                      <p className="text-xs text-gray-500">Generado: {new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })} | {filteredTasks.length} tareas · {tasksWithDates.length} con fechas</p>
                    </div>
                    {/* Gantt Header - Month labels */}
                    <div className="flex border-b">
                      <div className="w-[280px] shrink-0 p-2 text-xs font-semibold text-gray-500 bg-gray-50">
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
                    {ganttTasks.map(task => {
                      const hasDates = task.startDate && task.endDate
                      const priorityColor = getPriorityColor(task.priority)
                      const statusColorMap: Record<string, string> = {
                        Pendiente: priorityColor,
                        'En Proceso': '#3b82f6',
                        Completada: '#22c55e',
                        Cancelada: '#ef4444',
                      }
                      const barColor = statusColorMap[task.status] || priorityColor
                      return (
                        <div key={task.id} className={`flex border-b hover:bg-gray-50 transition-colors group ${!hasDates ? 'bg-gray-50/50' : ''}`}>
                          <div className="w-[280px] shrink-0 p-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-700 text-white text-[9px] font-bold shrink-0">{ganttTasks.indexOf(task) + 1}</span>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityColor }}></span>
                              <span className="truncate font-medium" title={task.description}>{task.description}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5 ml-3.5">
                              {task.sector} · {hasDates ? `${formatDate(task.startDate)} - ${formatDate(task.endDate)}` : <span className="italic text-orange-400">Sin fechas</span>}
                            </div>
                          </div>
                          <div className="flex-1 relative py-2">
                            {hasDates ? (
                              <>
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
                                {(() => {
                                  const { left, width } = getBarPosition(task.startDate!, task.endDate!)
                                  return (
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
                                  )
                                })()}
                              </>
                            ) : (
                              /* No dates - show dashed placeholder bar */
                              <div className="flex items-center h-7 px-2">
                                <div className="w-full border-t-2 border-dashed border-gray-200 rounded"></div>
                              </div>
                            )}
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
                      <div className="flex items-center gap-1">
                        <div className="w-6 h-3 border-t-2 border-dashed border-gray-300"></div>
                        Sin fechas
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
                                    <Badge variant="outline" className={getStatusBadgeClass(task.status) || ''}>{task.status}</Badge>
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
                                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => confirmDeleteMaterial(mat)}>
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
      <Dialog open={taskDialogOpen} onOpenChange={(open) => { setTaskDialogOpen(open); if (!open) cleanupAriaHidden() }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto w-[calc(100vw-1rem)] sm:w-auto">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label>Etapa</Label>
                <Select value={formData.etapa || ''} onValueChange={v => setFormData(prev => ({ ...prev, etapa: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin etapa</SelectItem>
                    {etapas.map(et => (
                      <SelectItem key={et.id} value={et.name}>
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: et.color }}></span>
                          {et.name}
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
                    {statuses.map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Responsable</Label>
                <Select value={formData.responsible} onValueChange={v => setFormData(prev => ({ ...prev, responsible: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {responsibles.map(r => (
                      <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="space-y-4">
              {uploadingPhotos && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  Subiendo imágenes...
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Before Photos */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-orange-500" />
                    Fotos Antes ({formData.beforePhotos.length})
                  </Label>
                  {formData.beforePhotos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {formData.beforePhotos.map((url, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={url}
                            alt={`Antes ${i + 1}`}
                            className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              setFullscreenPhotos(formData.beforePhotos)
                              setFullscreenIndex(i)
                              setPhotoDialogOpen(true)
                            }}
                          />
                          <button
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removePhoto(i, 'before')}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className={`flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded cursor-pointer transition-colors ${uploadingPhotos ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-orange-300 hover:border-orange-400 hover:bg-orange-50'}`}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploadingPhotos}
                      onChange={e => {
                        const files = e.target.files
                        if (files && files.length > 0) {
                          if (files.length === 1) {
                            handlePhotoUpload(files[0], 'before')
                          } else {
                            handleMultiplePhotoUpload(files, 'before')
                          }
                        }
                        e.target.value = ''
                      }}
                    />
                    <Upload className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-gray-600">Agregar fotos antes</span>
                  </label>
                </div>

                {/* After Photos */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-green-500" />
                    Fotos Después ({formData.afterPhotos.length})
                  </Label>
                  {formData.afterPhotos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {formData.afterPhotos.map((url, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={url}
                            alt={`Después ${i + 1}`}
                            className="w-20 h-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              setFullscreenPhotos(formData.afterPhotos)
                              setFullscreenIndex(i)
                              setPhotoDialogOpen(true)
                            }}
                          />
                          <button
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removePhoto(i, 'after')}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className={`flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded cursor-pointer transition-colors ${uploadingPhotos ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-green-300 hover:border-green-400 hover:bg-green-50'}`}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploadingPhotos}
                      onChange={e => {
                        const files = e.target.files
                        if (files && files.length > 0) {
                          if (files.length === 1) {
                            handlePhotoUpload(files[0], 'after')
                          } else {
                            handleMultiplePhotoUpload(files, 'after')
                          }
                        }
                        e.target.value = ''
                      }}
                    />
                    <Upload className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">Agregar fotos después</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Materials Section */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <Package className="h-4 w-4 text-green-600" />
                  Materiales {editingTask ? `(${getMaterialsCount(editingTask.id)})` : ''}
                </Label>
                {editingTask && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 h-7 text-xs"
                    onClick={() => {
                      setMaterialTaskId(editingTask.id)
                      setEditingMaterial(null)
                      setMaterialFormData({ name: '', quantity: '', unit: '', unitPrice: '', totalPrice: '', category: '', notes: '' })
                      setMaterialDialogOpen(true)
                    }}
                  >
                    <Plus className="h-3 w-3" /> Agregar Material
                  </Button>
                )}
              </div>
              {!editingTask ? (
                <div className="space-y-3">
                  {/* Add inline material form */}
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="flex-1 min-w-[120px]">
                      <Label className="text-xs">Nombre</Label>
                      <Input placeholder="Material..." className="h-8 text-sm" id="inline-mat-name" />
                    </div>
                    <div className="w-[70px]">
                      <Label className="text-xs">Cant.</Label>
                      <Input placeholder="0" type="number" className="h-8 text-sm" id="inline-mat-qty" />
                    </div>
                    <div className="w-[60px]">
                      <Label className="text-xs">Unidad</Label>
                      <Input placeholder="un" className="h-8 text-sm" id="inline-mat-unit" />
                    </div>
                    <div className="w-[90px]">
                      <Label className="text-xs">P. Unit.</Label>
                      <Input placeholder="$" type="number" className="h-8 text-sm" id="inline-mat-unitprice" />
                    </div>
                    <div className="w-[90px]">
                      <Label className="text-xs">Categoría</Label>
                      <Input placeholder="Cat." className="h-8 text-sm" id="inline-mat-cat" />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 shrink-0"
                      onClick={() => {
                        const nameEl = document.getElementById('inline-mat-name') as HTMLInputElement
                        const qtyEl = document.getElementById('inline-mat-qty') as HTMLInputElement
                        const unitEl = document.getElementById('inline-mat-unit') as HTMLInputElement
                        const priceEl = document.getElementById('inline-mat-unitprice') as HTMLInputElement
                        const catEl = document.getElementById('inline-mat-cat') as HTMLInputElement
                        const name = nameEl?.value || ''
                        if (!name.trim()) return
                        const qty = qtyEl?.value || ''
                        const unit = unitEl?.value || ''
                        const unitPrice = priceEl?.value || ''
                        const qtyNum = parseFloat(qty) || 0
                        const priceNum = parseFloat(unitPrice) || 0
                        const totalPrice = (qtyNum * priceNum) > 0 ? (qtyNum * priceNum).toString() : ''
                        const category = catEl?.value || ''
                        setFormData(prev => ({
                          ...prev,
                          inlineMaterials: [...prev.inlineMaterials, { name: name.trim(), quantity: qty, unit, unitPrice, totalPrice, category, notes: '' }],
                        }))
                        if (nameEl) nameEl.value = ''
                        if (qtyEl) qtyEl.value = ''
                        if (unitEl) unitEl.value = ''
                        if (priceEl) priceEl.value = ''
                        if (catEl) catEl.value = ''
                      }}
                    >
                      <Plus className="h-3 w-3" /> Agregar
                    </Button>
                  </div>
                  {/* Inline materials list */}
                  {formData.inlineMaterials.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Nombre</TableHead>
                            <TableHead className="text-xs text-center">Cant.</TableHead>
                            <TableHead className="text-xs">Unidad</TableHead>
                            <TableHead className="text-xs text-right">P.Unit.</TableHead>
                            <TableHead className="text-xs text-right">P.Total</TableHead>
                            <TableHead className="text-xs w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formData.inlineMaterials.map((mat, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs font-medium">{mat.name}</TableCell>
                              <TableCell className="text-xs text-center">{mat.quantity || '-'}</TableCell>
                              <TableCell className="text-xs">{mat.unit || '-'}</TableCell>
                              <TableCell className="text-xs text-right">{mat.unitPrice ? formatCurrency(parseFloat(mat.unitPrice)) : '-'}</TableCell>
                              <TableCell className="text-xs text-right font-medium">{mat.totalPrice ? formatCurrency(parseFloat(mat.totalPrice)) : '-'}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    inlineMaterials: prev.inlineMaterials.filter((_, i) => i !== idx),
                                  }))
                                }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {formData.inlineMaterials.length === 0 && (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
                      <Package className="h-4 w-4 text-gray-300" />
                      Agregue materiales que se guardarán junto con la tarea
                    </div>
                  )}
                </div>
              ) : getMaterialsForTask(editingTask.id).length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-400">
                  <Package className="h-4 w-4 text-gray-300" />
                  Sin materiales registrados
                </div>
              ) : (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Nombre</TableHead>
                          <TableHead className="text-xs">Categoría</TableHead>
                          <TableHead className="text-xs text-center">Cant.</TableHead>
                          <TableHead className="text-xs">Unidad</TableHead>
                          <TableHead className="text-xs text-right">P.Unit.</TableHead>
                          <TableHead className="text-xs text-right">P.Total</TableHead>
                          <TableHead className="text-xs text-right w-[70px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getMaterialsForTask(editingTask.id).map(mat => (
                          <TableRow key={mat.id}>
                            <TableCell className="text-xs font-medium">{mat.name}</TableCell>
                            <TableCell className="text-xs">{mat.category ? <Badge variant="outline" className="text-[10px]">{mat.category}</Badge> : '-'}</TableCell>
                            <TableCell className="text-xs text-center">{mat.quantity || '-'}</TableCell>
                            <TableCell className="text-xs">{mat.unit || '-'}</TableCell>
                            <TableCell className="text-xs text-right">{mat.unitPrice ? formatCurrency(mat.unitPrice) : '-'}</TableCell>
                            <TableCell className="text-xs text-right font-medium">{mat.totalPrice ? formatCurrency(mat.totalPrice) : '-'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-0.5">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEditMaterial(mat)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => confirmDeleteMaterial(mat)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-end items-center gap-2 text-sm">
                    <span className="text-gray-500">Total Materiales:</span>
                    <span className="font-bold text-green-600">{formatCurrency(getMaterialsTotal(editingTask.id))}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)} disabled={savingTask}>Cancelar</Button>
            <Button onClick={handleSaveTask} disabled={!formData.description || !formData.sector || savingTask || uploadingPhotos}>
              {savingTask ? 'Guardando...' : editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={(open) => { setConfigDialogOpen(open); if (!open) cleanupAriaHidden() }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto w-[calc(100vw-1rem)] sm:w-auto">
          <DialogHeader>
            <DialogTitle>Configuración</DialogTitle>
            <DialogDescription className="sr-only">Administrar sectores, tipos de reparación, prioridades, estados y responsables</DialogDescription>
          </DialogHeader>
          <Tabs value={configTab} onValueChange={v => setConfigTab(v as 'sectors' | 'repairTypes' | 'priorities' | 'etapas' | 'statuses' | 'responsibles')}>
            <TabsList className="w-full flex-wrap h-auto gap-1">
              <TabsTrigger value="sectors" className="flex-1">Sectores</TabsTrigger>
              <TabsTrigger value="repairTypes" className="flex-1">Tipos Rep.</TabsTrigger>
              <TabsTrigger value="priorities" className="flex-1">Priorid.</TabsTrigger>
              <TabsTrigger value="etapas" className="flex-1">Etapas</TabsTrigger>
              <TabsTrigger value="statuses" className="flex-1">Estados</TabsTrigger>
              <TabsTrigger value="responsibles" className="flex-1">Respons.</TabsTrigger>
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
                          <div className="flex items-center gap-0.5">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleMovePriority(p.id, 'up')} disabled={priorities.sort((a,b) => a.order - b.order).findIndex(x => x.id === p.id) === 0} title="Subir">
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleMovePriority(p.id, 'down')} disabled={priorities.sort((a,b) => a.order - b.order).findIndex(x => x.id === p.id) === priorities.length - 1} title="Bajar">
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

            {/* Etapas Tab */}
            <TabsContent value="etapas" className="space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    placeholder="Nueva etapa..."
                    value={newEtapaName}
                    onChange={e => setNewEtapaName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddEtapa()}
                  />
                </div>
                <div className="w-16">
                  <Label className="text-xs">Color</Label>
                  <Input
                    type="color"
                    value={newEtapaColor}
                    onChange={e => setNewEtapaColor(e.target.value)}
                    className="h-9 p-1"
                  />
                </div>
                <Button onClick={handleAddEtapa} size="sm" className="gap-1 shrink-0">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1">
                  {etapas.map(et => (
                    <div key={et.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      {editingEtapaId === et.id ? (
                        <>
                          <Input
                            value={editEtapaName}
                            onChange={e => setEditEtapaName(e.target.value)}
                            className="h-8 text-sm flex-1"
                            onKeyDown={e => e.key === 'Enter' && handleUpdateEtapa(et.id)}
                          />
                          <Input
                            type="color"
                            value={editEtapaColor}
                            onChange={e => setEditEtapaColor(e.target.value)}
                            className="h-8 w-10 p-1"
                          />
                          <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => handleUpdateEtapa(et.id)}>OK</Button>
                          <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => setEditingEtapaId(null)}>X</Button>
                        </>
                      ) : (
                        <>
                          <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: et.color }}></span>
                          <span className="flex-1 text-sm">{et.name}</span>
                          <div className="flex items-center gap-0.5">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleMoveEtapa(et.id, 'up')} disabled={etapas.sort((a,b) => a.order - b.order).findIndex(x => x.id === et.id) === 0} title="Subir">
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleMoveEtapa(et.id, 'down')} disabled={etapas.sort((a,b) => a.order - b.order).findIndex(x => x.id === et.id) === etapas.length - 1} title="Bajar">
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingEtapaId(et.id); setEditEtapaName(et.name); setEditEtapaColor(et.color) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteEtapa(et.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Statuses Tab */}
            <TabsContent value="statuses" className="space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    placeholder="Nuevo estado..."
                    value={newStatusName}
                    onChange={e => setNewStatusName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddStatus()}
                  />
                </div>
                <div className="w-16">
                  <Label className="text-xs">Color</Label>
                  <Input
                    type="color"
                    value={newStatusColor}
                    onChange={e => setNewStatusColor(e.target.value)}
                    className="h-9 p-1"
                  />
                </div>
                <Button onClick={handleAddStatus} size="sm" className="gap-1 shrink-0">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1">
                  {statuses.map(s => (
                    <div key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      {editingStatusId === s.id ? (
                        <>
                          <Input
                            value={editStatusName}
                            onChange={e => setEditStatusName(e.target.value)}
                            className="h-8 text-sm flex-1"
                            onKeyDown={e => e.key === 'Enter' && handleUpdateStatus(s.id)}
                          />
                          <Input
                            type="color"
                            value={editStatusColor}
                            onChange={e => setEditStatusColor(e.target.value)}
                            className="h-8 w-10 p-1"
                          />
                          <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => handleUpdateStatus(s.id)}>OK</Button>
                          <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => setEditingStatusId(null)}>X</Button>
                        </>
                      ) : (
                        <>
                          <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: s.color }}></span>
                          <span className="flex-1 text-sm">{s.name}</span>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingStatusId(s.id); setEditStatusName(s.name); setEditStatusColor(s.color) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteStatus(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Responsibles Tab */}
            <TabsContent value="responsibles" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nuevo responsable..."
                  value={newResponsibleName}
                  onChange={e => setNewResponsibleName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddResponsible()}
                />
                <Button onClick={handleAddResponsible} size="sm" className="gap-1 shrink-0">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
              </div>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1">
                  {responsibles.map(r => (
                    <div key={r.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      {editingResponsibleId === r.id ? (
                        <>
                          <Input
                            value={editResponsibleName}
                            onChange={e => setEditResponsibleName(e.target.value)}
                            className="h-8 text-sm"
                            onKeyDown={e => e.key === 'Enter' && handleUpdateResponsible(r.id)}
                          />
                          <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => handleUpdateResponsible(r.id)}>OK</Button>
                          <Button size="sm" variant="ghost" className="h-7 shrink-0" onClick={() => setEditingResponsibleId(null)}>X</Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm">{r.name}</span>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingResponsibleId(r.id); setEditResponsibleName(r.name) }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteResponsible(r.id)}>
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
      <Dialog open={materialDialogOpen} onOpenChange={(open) => { setMaterialDialogOpen(open); if (!open) cleanupAriaHidden() }}>
        <DialogContent className="sm:max-w-lg w-[calc(100vw-1rem)] sm:w-auto">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  type="number"
                  value={materialFormData.quantity}
                  onChange={e => handleMaterialQuantityChange(e.target.value)}
                  placeholder="Ej: 10"
                  min="0"
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
                  onChange={e => handleMaterialUnitPriceChange(e.target.value)}
                  placeholder="$"
                  min="0"
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
                  min="0"
                />
                {materialFormData.quantity && materialFormData.unitPrice && (
                  <span className="text-[10px] text-gray-400">Auto-calculado: qty x p.unit</span>
                )}
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

      {/* Delete Material Confirmation Dialog */}
      <AlertDialog open={deleteMaterialDialogOpen} onOpenChange={setDeleteMaterialDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Material</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar el material "{deleteMaterialName}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMaterial} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fullscreen Photo Viewer */}
      <Dialog open={photoDialogOpen} onOpenChange={(open) => { setPhotoDialogOpen(open); if (!open) cleanupAriaHidden() }}>
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
      <Dialog open={historyDialogOpen} onOpenChange={(open) => { setHistoryDialogOpen(open); if (!open) cleanupAriaHidden() }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto w-[calc(100vw-1rem)] sm:w-auto">
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
