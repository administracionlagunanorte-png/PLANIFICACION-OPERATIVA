'use client'

import { useState, useEffect, useRef } from 'react'
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

// ============================================================
// LV Templates from document
// ============================================================
const LV_TEMPLATES = [
  { codigo: 'LV-01', nombre: 'Dotación diaria de personal y EPP', sector: 'General — Todos los sectores', frecuencia: 'Diaria',
    items: [
      { category: 'A', description: 'Verificación de dotación de personal presente' },
      { category: 'B', description: 'Verificación de EPP por puesto (guantes, antiparras, protector auditivo, mascarilla, chaleco, botas, protector solar)' },
      { category: 'C', description: 'Personal con baja / ausencia' },
      { category: 'C', description: 'EPP deteriorado o faltante' },
      { category: 'C', description: 'Equipos o maquinaria con falla' },
      { category: 'C', description: 'Incidencias reportadas de jornada anterior' },
      { category: 'C', description: 'Zonas con acceso restringido hoy' },
      { category: 'C', description: 'Trabajos de terceros en condominio hoy' },
    ]
  },
  { codigo: 'LV-02', nombre: 'Laguna artificial — Control diario de agua', sector: 'Laguna', frecuencia: 'Diaria',
    items: [
      { category: 'A', description: 'EPP y materiales requeridos disponibles y en buen estado' },
      { category: 'B', description: 'Medición pH (rango 7,2–8,0)' },
      { category: 'B', description: 'Medición Turbidez NTU (< 10 NTU)' },
      { category: 'B', description: 'Medición Temperatura (15–28°C)' },
      { category: 'B', description: 'Medición Oxígeno disuelto (≥ 5 mg/L)' },
      { category: 'B', description: 'Aspecto visual del agua' },
      { category: 'C', description: 'Color del agua normal' },
      { category: 'C', description: 'Ausencia de espuma o películas en superficie' },
      { category: 'C', description: 'Ausencia de olores inusuales' },
      { category: 'C', description: 'Bordes y muretes sin grietas ni desprendimientos' },
      { category: 'C', description: 'Cierros perimetrales en buen estado' },
      { category: 'C', description: 'Embarcadero y muelle sin daños visibles' },
      { category: 'C', description: 'Rack de botes en buen estado' },
      { category: 'C', description: 'Playas sin residuos peligrosos' },
      { category: 'C', description: 'Señalética de seguridad completa y legible' },
      { category: 'C', description: 'Sin presencia de fauna muerta' },
      { category: 'C', description: 'Sistema de aireación/circulación funcionando' },
      { category: 'D', description: 'Dosificación de floculante registrada' },
      { category: 'D', description: 'Dosificación de algicida registrada (si aplica)' },
    ]
  },
  { codigo: 'LV-03', nombre: 'Piscinas 1–3 — Control diario de agua y limpieza', sector: 'Piscinas 1–2–3', frecuencia: 'Diaria',
    items: [
      { category: 'A', description: 'EPP y equipos requeridos disponibles' },
      { category: 'B', description: 'Medición pH mañana (rango 7,2–7,6)' },
      { category: 'B', description: 'Medición Cloro libre mañana (1,0–3,0 ppm)' },
      { category: 'B', description: 'Medición Temperatura mañana (24–28°C)' },
      { category: 'C', description: 'Medición pH tarde' },
      { category: 'C', description: 'Medición Cloro libre tarde' },
      { category: 'C', description: 'Medición Temperatura tarde' },
      { category: 'D', description: 'Robot aspirador operando (ciclo nocturno ejecutado)' },
      { category: 'D', description: 'Cepillado manual paredes y bordes' },
      { category: 'D', description: 'Vaciado y limpieza cesta prefiltro bomba' },
      { category: 'D', description: 'Retiro debris flotante (skimmer manual)' },
      { category: 'D', description: 'Limpieza cesto skimmer de pared' },
      { category: 'D', description: 'Limpieza borde perimetral y escalas' },
      { category: 'D', description: 'Piscina habilitada para uso residentes' },
    ]
  },
  { codigo: 'LV-04', nombre: 'Playas artificiales — Rastrillado y limpieza', sector: 'Playas 1–2–3', frecuencia: 'Diaria',
    items: [
      { category: 'A', description: 'Herramientas y materiales disponibles' },
      { category: 'B', description: 'Rastrillado profundo de toda la superficie de arena' },
      { category: 'B', description: 'Retiro manual de residuos sólidos' },
      { category: 'B', description: 'Inspección: ausencia de vidrios, metales u objetos cortantes' },
      { category: 'B', description: 'Nivelación de arena en bordes' },
      { category: 'B', description: 'Verificación nivel de arena (mínimo 30cm zona caída)' },
      { category: 'B', description: 'Limpieza de accesos y bordes perimetrales' },
      { category: 'B', description: 'Verificación señalética de playa' },
      { category: 'B', description: 'Inspección estado de reposeras y mobiliario cercano' },
      { category: 'B', description: 'Sin presencia de fauna nociva' },
    ]
  },
  { codigo: 'LV-05', nombre: 'Aseo y limpieza — Áreas comunes diaria', sector: 'Club House / Ciclovía / Estacionamientos', frecuencia: 'Diaria',
    items: [
      { category: 'A', description: 'Insumos y herramientas de aseo disponibles' },
      { category: 'B', description: 'Barrido y fregado de pisos interiores Club House' },
      { category: 'B', description: 'Limpieza y desinfección de mesones y superficies' },
      { category: 'B', description: 'Limpieza y desinfección completa de baños' },
      { category: 'B', description: 'Reposición de papel higiénico y jabón en baños' },
      { category: 'B', description: 'Vaciado y limpieza de papeleras interiores' },
      { category: 'B', description: 'Limpieza de vidrios y espejos Club House' },
      { category: 'B', description: 'Aseo de quinchos (post-uso): parrillas, mesas, pisos' },
      { category: 'B', description: 'Limpieza de cocina y área de servicios Club House' },
      { category: 'B', description: 'Desinfección de pomos de puertas e interruptores' },
      { category: 'C', description: 'Barrido ciclovía completa con soplador' },
      { category: 'C', description: 'Barrido sendero peatonal completo' },
      { category: 'C', description: 'Retiro de residuos en papeleras del circuito perimetral' },
      { category: 'C', description: 'Limpieza de acceso principal y portería exterior' },
      { category: 'C', description: 'Barrido estacionamientos' },
      { category: 'C', description: 'Limpieza zona de acopio de basura' },
      { category: 'C', description: 'Retiro de hojas y restos en zonas de juegos infantiles' },
    ]
  },
  { codigo: 'LV-06', nombre: 'Juegos infantiles — Inspección visual diaria', sector: 'Juegos Infantiles (5 sectores)', frecuencia: 'Diaria',
    items: [
      { category: 'A', description: 'Materiales requeridos para la inspección disponibles' },
      { category: 'B', description: 'Ausencia de residuos peligrosos (vidrios, agujas, excrementos)' },
      { category: 'B', description: 'Ausencia de objetos cortantes o filosos' },
      { category: 'B', description: 'Zona de caída sin objetos duros enterrados' },
      { category: 'B', description: 'Piezas metálicas sin bordes cortantes ni astillas' },
      { category: 'B', description: 'Toboganes sin grietas, bordes rotos o astillas' },
      { category: 'B', description: 'Balancines: resortes presentes, sin fracturas visibles' },
      { category: 'B', description: 'Escaleras de acceso: peldaños firmes y antideslizantes' },
      { category: 'B', description: 'Barandas y pasamanos firmes' },
      { category: 'B', description: 'Señalética de seguridad del sector presente y legible' },
      { category: 'B', description: 'Sin presencia de animales o nidos en estructura' },
      { category: 'B', description: 'SECTOR HABILITADO para uso de niños' },
      { category: 'C', description: 'Registro de sectores con cierre preventivo' },
    ]
  },
  { codigo: 'LV-07', nombre: 'Laguna — Control técnico semanal', sector: 'Laguna', frecuencia: 'Semanal',
    items: [
      { category: 'A', description: 'EPP y herramientas semana disponibles' },
      { category: 'B', description: 'Medición pH, turbidez y temperatura (3 puntos)' },
      { category: 'B', description: 'Retiro de algas flotantes con red en toda la orilla' },
      { category: 'B', description: 'Retiro de macroalgas del fondo (cerca de bordes)' },
      { category: 'B', description: 'Dosificación de floculante (según turbidez)' },
      { category: 'B', description: 'Inspección visual completa del perímetro (fotografiar anomalías)' },
      { category: 'B', description: 'Verificación funcionamiento bomba de circulación' },
      { category: 'B', description: 'Limpieza de reja de filtro de entrada' },
      { category: 'B', description: 'Rastrillado profundo playas 1–2–3' },
      { category: 'B', description: 'Registro de todos los parámetros en planilla semanal' },
      { category: 'C', description: 'Registro de parámetros semana (tendencia) completo' },
    ]
  },
  { codigo: 'LV-08', nombre: 'Piscinas — Mantenimiento semanal', sector: 'Piscinas 1–2–3', frecuencia: 'Semanal',
    items: [
      { category: 'A', description: 'Herramientas y materiales semana disponibles' },
      { category: 'B', description: 'Retrolavado de filtros — Girar válvula a BACKWASH' },
      { category: 'B', description: 'Retrolavado — Encender bomba y esperar agua clara' },
      { category: 'B', description: 'Retrolavado — Enjuague 30 segundos' },
      { category: 'B', description: 'Retrolavado — Volver a posición FILTRO y verificar presión' },
      { category: 'B', description: 'Registrar presión de trabajo post-retrolavado' },
      { category: 'C', description: 'Cepillado a fondo de paredes, escalas y fondo' },
      { category: 'C', description: 'Limpieza completa de skimmers de pared' },
      { category: 'C', description: 'Verificación y limpieza de canaletas de rebalse' },
      { category: 'C', description: 'Revisión de bombas (ruido, vibración, temperatura)' },
      { category: 'C', description: 'Verificación de cloro residual y ajuste de dosificación' },
    ]
  },
  { codigo: 'LV-09', nombre: 'Áreas verdes — Tareas semanales', sector: 'Jardines / Prados', frecuencia: 'Semanal',
    items: [
      { category: 'A', description: 'Maquinaria y herramientas — verificación pre-jornada' },
      { category: 'B', description: 'Corte de césped por sector' },
      { category: 'B', description: 'Bordeado de canteros y senderos' },
      { category: 'B', description: 'Soplado de restos de corte en ciclovía y senderos' },
      { category: 'B', description: 'Retiro de maleza en canteros y macizos' },
      { category: 'B', description: 'Riego complementario (si no llueve en 48 hrs)' },
      { category: 'C', description: 'Verificación sistema de riego (supervisión diaria incluida)' },
      { category: 'C', description: 'Revisión de aspersores (sin obstrucciones, cobertura ok)' },
      { category: 'C', description: 'Verificación programación controlador de riego' },
    ]
  },
  { codigo: 'LV-10', nombre: 'Ciclovía y sendero — Mantenimiento', sector: 'Ciclovía / Sendero Peatonal', frecuencia: 'Semanal',
    items: [
      { category: 'A', description: 'Herramientas y materiales disponibles' },
      { category: 'B', description: 'Barrido y soplado completo de ciclovía' },
      { category: 'B', description: 'Barrido de sendero peatonal' },
      { category: 'B', description: 'Retiro de maleza en bordes de ciclovía' },
      { category: 'B', description: 'Inspección visual de pavimento (grietas, hundimientos)' },
      { category: 'B', description: 'Verificación de señalética horizontal y vertical' },
    ]
  },
  { codigo: 'LV-11', nombre: 'Inspección quincenal infraestructura', sector: 'Ciclovía / Muelles / Iluminación', frecuencia: 'Quincenal',
    items: [
      { category: 'A', description: 'Equipos y herramientas disponibles' },
      { category: 'B', description: 'Muelles, embarcadero y rack de botes en buen estado' },
      { category: 'B', description: 'Iluminación exterior — circuito nocturno completo' },
      { category: 'B', description: 'Cierros, portones y accesos en buen estado' },
    ]
  },
  { codigo: 'LV-12', nombre: 'Piscinas — Control quincenal completo', sector: 'Piscinas 1–2–3', frecuencia: 'Quincenal',
    items: [
      { category: 'A', description: 'Materiales y equipos disponibles' },
      { category: 'B', description: 'Análisis completo de parámetros' },
      { category: 'B', description: 'Revisión dosificadores automáticos' },
    ]
  },
  { codigo: 'LV-13', nombre: 'Áreas verdes — Mantenimiento mensual', sector: 'Jardines / Prados', frecuencia: 'Mensual',
    items: [
      { category: 'A', description: 'Materiales e insumos del mes disponibles' },
      { category: 'B', description: 'Estado de prados por sector — evaluación mensual' },
      { category: 'B', description: 'Revisión árboles y arbustos' },
    ]
  },
  { codigo: 'LV-14', nombre: 'Laguna — Revisión mensual sala de máquinas', sector: 'Laguna / Sala de máquinas', frecuencia: 'Mensual',
    items: [
      { category: 'A', description: 'Equipos y herramientas para revisión disponibles' },
      { category: 'B', description: 'Verificación equipos sala de máquinas' },
    ]
  },
  { codigo: 'LV-15', nombre: 'Club House — Mantención mensual integral', sector: 'Club House / Canchas / Quinchos', frecuencia: 'Mensual',
    items: [
      { category: 'A', description: 'Materiales para mantención mensual disponibles' },
      { category: 'B', description: 'Verificación instalaciones eléctricas Club House' },
      { category: 'B', description: 'Verificación instalaciones sanitarias y civil' },
    ]
  },
  { codigo: 'LV-16', nombre: 'Juegos infantiles — Inspección técnica mensual', sector: 'Juegos Infantiles', frecuencia: 'Mensual',
    items: [
      { category: 'A', description: 'Herramientas de inspección técnica disponibles' },
      { category: 'B', description: 'Inspección técnica estructural — por sector' },
      { category: 'B', description: 'Lubricación de articulaciones' },
    ]
  },
  { codigo: 'LV-17', nombre: 'Estacionamientos — Mantención mensual', sector: 'Estacionamientos / Acceso', frecuencia: 'Mensual',
    items: [
      { category: 'A', description: 'Herramientas y materiales disponibles' },
      { category: 'B', description: 'Verificación de tareas mensuales' },
      { category: 'B', description: 'Mapa de daños detectados en pavimento' },
    ]
  },
  { codigo: 'LV-18', nombre: 'Mantención mayor trimestral', sector: 'Todos los sectores críticos', frecuencia: 'Trimestral',
    items: [
      { category: 'A', description: 'Personal y empresas convocadas' },
      { category: 'B', description: 'Laguna — actividades trimestrales' },
      { category: 'B', description: 'Piscinas — actividades trimestrales' },
      { category: 'B', description: 'Juegos infantiles — actividades trimestrales' },
    ]
  },
  { codigo: 'LV-19', nombre: 'Revisión semestral completa', sector: 'Condominio completo', frecuencia: 'Semestral',
    items: [
      { category: 'A', description: 'Certificaciones y servicios externos — verificación semestral' },
      { category: 'B', description: 'Estado de conservación por sector (escala 1-4)' },
      { category: 'B', description: 'Presupuesto semestral — ejecución vs. planificado' },
    ]
  },
  { codigo: 'LV-20', nombre: 'Revisión anual — Certificaciones y estado', sector: 'Condominio completo', frecuencia: 'Anual',
    items: [
      { category: 'A', description: 'Certificaciones obligatorias — vigencia al 31 de diciembre' },
      { category: 'B', description: 'KPIs anuales — resultados finales' },
      { category: 'B', description: 'Revisión y aprobación del plan para el próximo año' },
    ]
  },
]

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
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'calendar'>('list')
  const [lvs, setLvs] = useState<MantenimientoLV[]>([])
  const [selectedLV, setSelectedLV] = useState<MantenimientoLV | null>(null)
  const [loading, setLoading] = useState(false)

  // --- Filters ---
  const [filterFrecuencia, setFilterFrecuencia] = useState('all')
  const [filterStatus, setFilterStatus] = useState<string>(initialStatusFilter || 'all')
  const [searchQuery, setSearchQuery] = useState('')

  // --- Dialogs ---
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  // --- Form ---
  const [formDate, setFormDate] = useState('')
  const [formResponsable, setFormResponsable] = useState('')
  const [formTurno, setFormTurno] = useState('')

  // --- Attach upload ---
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // ============================================================
  // React to filter from parent
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
  const fetchLVs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterFrecuencia !== 'all') params.set('frecuencia', filterFrecuencia)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      const res = await fetch(`/api/mantenimiento-lv?${params.toString()}`)
      if (res.ok) setLvs(await res.json())
    } catch (err) {
      console.error(err)
      toast({ title: 'Error', description: 'No se pudieron cargar las listas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

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

  useEffect(() => { fetchLVs() }, [filterFrecuencia, filterStatus])

  // ============================================================
  // Create from template
  // ============================================================
  const handleCreateFromTemplate = async () => {
    const template = LV_TEMPLATES.find(t => t.codigo === selectedTemplate)
    if (!template) return

    try {
      const res = await fetch('/api/mantenimiento-lv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: template.codigo,
          nombre: template.nombre,
          sector: template.sector,
          frecuencia: template.frecuencia,
          scheduledDate: formDate || null,
          responsable: formResponsable || null,
          turno: formTurno || null,
          items: template.items,
        }),
      })
      if (res.ok) {
        toast({ title: 'Lista creada', description: `${template.codigo} — ${template.nombre}` })
        setCreateDialogOpen(false)
        setSelectedTemplate('')
        setFormDate('')
        setFormResponsable('')
        setFormTurno('')
        fetchLVs()
      } else {
        const err = await res.json()
        toast({ title: 'Error', description: err.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  // ============================================================
  // Update item status
  // ============================================================
  const handleItemStatusChange = async (itemId: string, newStatus: string) => {
    if (!selectedLV) return
    const updatedItems = selectedLV.items.map(item =>
      item.id === itemId ? { ...item, status: newStatus } : item
    )
    // Optimistic update
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
      if (selectedLV?.id === deleteId) { setCurrentView('list'); setSelectedLV(null) }
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
      .header{display:flex;justify-content:space-between;border-bottom:2px solid #2563eb;padding-bottom:8px;margin-bottom:12px}
      .meta{display:flex;gap:20px;font-size:11px;margin-bottom:8px}
      table{width:100%;border-collapse:collapse;margin-bottom:12px}
      th{background:#f1f5f9;padding:6px 8px;text-align:left;border:1px solid #cbd5e1;font-size:11px}
      td{padding:5px 8px;border:1px solid #e2e8f0;font-size:11px}
      .ok{color:#16a34a;font-weight:bold}.no{color:#dc2626;font-weight:bold}
      .progress-bar{height:16px;background:#e2e8f0;border-radius:4px;overflow:hidden;margin:4px 0}
      .progress-fill{height:100%;background:#2563eb}
      .signatures{display:flex;gap:40px;margin-top:30px;font-size:11px}
      .sig-line{border-top:1px solid #000;width:200px;padding-top:4px;margin-top:30px}
    </style></head><body>
    <div class="header"><div><h1>${lv.codigo} — ${lv.nombre}</h1><div style="font-size:11px;color:#64748b">Asesorías Integrales CyJ — Condominio Laguna Norte</div></div>
    <div style="text-align:right;font-size:11px">Progreso: ${lv.progress}%<div class="progress-bar" style="width:120px"><div class="progress-fill" style="width:${lv.progress}%"></div></div></div></div>
    <div class="meta"><div><b>Sector:</b> ${lv.sector}</div><div><b>Frecuencia:</b> ${lv.frecuencia}</div><div><b>Responsable:</b> ${lv.responsable || '-'}</div><div><b>Fecha:</b> ${lv.scheduledDate ? new Date(lv.scheduledDate).toLocaleDateString('es-CL') : '-'}</div></div>
    ${categories.map(cat => {
      const catItems = lv.items.filter(i => i.category === cat)
      return `<h2>${categoryLabels[cat] || cat}</h2><table><tr><th style="width:5%">N°</th><th style="width:55%">Descripción</th><th style="width:10%">Estado</th><th style="width:15%">Valor</th><th style="width:15%">Observación</th></tr>
      ${catItems.map((item, idx) => `<tr><td>${idx + 1}</td><td>${item.description}</td><td class="${item.status === 'OK' ? 'ok' : item.status === 'NO_OK' ? 'no' : ''}">${item.status === 'OK' ? '✓ OK' : item.status === 'NO_OK' ? '✗ NO OK' : item.status === 'N/A' ? 'N/A' : '☐'}</td><td>${item.value || ''}</td><td>${item.observation || ''}</td></tr>`).join('')}</table>`
    }).join('')}
    ${lv.observations ? `<h2>Observaciones</h2><p>${lv.observations}</p>` : ''}
    <div class="signatures"><div><div class="sig-line">Responsable — Nombre, Firma, RUT, Fecha</div></div><div><div class="sig-line">Supervisor — Nombre, Firma, RUT, Fecha</div></div></div>
    </body></html>`)
    w.document.close()
    w.print()
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
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())

  const getLVsForDate = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return lvs.filter(lv => lv.scheduledDate && lv.scheduledDate.startsWith(dateStr))
  }

  // ============================================================
  // Format
  // ============================================================
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('es-CL') : '-'

  // ============================================================
  // Filtered
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

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 border border-amber-200 shadow-sm text-center">
          <div className="text-xs text-amber-600 uppercase tracking-wider font-semibold">Pendientes</div>
          <div className="text-2xl font-bold text-amber-700">{pendientes}</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-blue-200 shadow-sm text-center">
          <div className="text-xs text-blue-600 uppercase tracking-wider font-semibold">En Progreso</div>
          <div className="text-2xl font-bold text-blue-700">{enProgreso}</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-emerald-200 shadow-sm text-center">
          <div className="text-xs text-emerald-600 uppercase tracking-wider font-semibold">Completadas</div>
          <div className="text-2xl font-bold text-emerald-700">{completadas}</div>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm text-center">
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Avance Promedio</div>
          <div className="text-2xl font-bold text-slate-800">{avgProgress}%</div>
          <Progress value={avgProgress} className="h-2 mt-1" />
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentView !== 'list' && (
            <Button variant="ghost" size="sm" onClick={() => { setCurrentView('list'); setSelectedLV(null) }} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Volver
            </Button>
          )}
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-teal-600" />
            Mantenimiento
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={currentView === 'calendar' ? 'default' : 'outline'} size="sm" className="gap-1" onClick={() => setCurrentView('calendar')}>
            <Calendar className="h-4 w-4" /> Calendario
          </Button>
          <Button variant={currentView === 'list' ? 'default' : 'outline'} size="sm" className="gap-1" onClick={() => setCurrentView('list')}>
            Lista
          </Button>
          {canEdit && (
            <Button className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Nueva LV
            </Button>
          )}
        </div>
      </div>

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
      </div>

      {/* ============================================================ */}
      {/* LIST VIEW                                                     */}
      {/* ============================================================ */}
      {currentView === 'list' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-slate-500">Cargando...</div>
          ) : filteredLVs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No hay listas de verificación</p>
              <p className="text-sm mt-1">Crea una nueva LV desde una plantilla</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLVs.map(lv => {
                const fc = freqColors[lv.frecuencia] || freqColors['Mensual']
                const sc = statusColors[lv.status] || statusColors['PENDIENTE']
                return (
                  <Card key={lv.id} className="border-l-4 border-l-teal-400 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => { fetchLVDetail(lv.id); setCurrentView('detail') }}>
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
                          <div className="w-24">
                            <div className="text-xs text-right text-slate-500 mb-0.5">{lv.progress}%</div>
                            <Progress value={lv.progress} className="h-2" />
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">{selectedLV.codigo} — {selectedLV.nombre}</h3>
              <p className="text-sm text-slate-500">{selectedLV.sector} · Frecuencia: {selectedLV.frecuencia} · Responsable: {selectedLV.responsable || '-'}</p>
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
              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => { setDeleteId(selectedLV.id); setDeleteDialogOpen(true) }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Avance: {selectedLV.progress}%</span>
              <Badge className={`${statusColors[selectedLV.status]?.bg} ${statusColors[selectedLV.status]?.text}`}>
                {selectedLV.status === 'PENDIENTE' ? 'Pendiente' : selectedLV.status === 'EN_PROGRESO' ? 'En Progreso' : 'Completada'}
              </Badge>
            </div>
            <Progress value={selectedLV.progress} className="h-3" />
          </div>

          {/* Attachments */}
          {JSON.parse(selectedLV.attachments || '[]').length > 0 && (
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Adjuntos</div>
              <div className="flex gap-2 flex-wrap">
                {JSON.parse(selectedLV.attachments).map((url: string, idx: number) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 underline">
                    Archivo {idx + 1}
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
              return (
                <Card key={cat} className="border border-slate-200">
                  <CardHeader className="py-2 px-4 bg-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-700">{categoryLabels[cat] || `Sección ${cat}`}</CardTitle>
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

      {/* ============================================================ */}
      {/* CALENDAR VIEW                                                 */}
      {/* ============================================================ */}
      {currentView === 'calendar' && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1) }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-base">{monthNames[calMonth]} {calYear}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1) }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
              ))}
              {Array.from({ length: getFirstDayOfMonth(calYear, calMonth) }, (_, i) => (
                <div key={`empty-${i}`} className="h-24" />
              ))}
              {Array.from({ length: getDaysInMonth(calYear, calMonth) }, (_, i) => {
                const day = i + 1
                const dayLVs = getLVsForDate(day)
                const isToday = calYear === new Date().getFullYear() && calMonth === new Date().getMonth() && day === new Date().getDate()
                return (
                  <div key={day} className={`h-24 border rounded-lg p-1 text-xs overflow-hidden ${isToday ? 'border-teal-400 bg-teal-50/30' : 'border-slate-200'}`}>
                    <div className={`font-semibold ${isToday ? 'text-teal-700' : 'text-slate-600'}`}>{day}</div>
                    <div className="space-y-0.5 mt-0.5">
                      {dayLVs.slice(0, 3).map(lv => (
                        <div key={lv.id} className={`truncate rounded px-1 py-0.5 text-[10px] cursor-pointer ${lv.status === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700' : lv.status === 'EN_PROGRESO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}
                          onClick={() => { fetchLVDetail(lv.id); setCurrentView('detail') }} title={`${lv.codigo} — ${lv.nombre}`}>
                          {lv.codigo}
                        </div>
                      ))}
                      {dayLVs.length > 3 && <div className="text-[10px] text-slate-400">+{dayLVs.length - 3} más</div>}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Pendiente</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" /> En Progreso</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" /> Completada</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/* CREATE DIALOG                                                 */}
      {/* ============================================================ */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Lista de Verificación</DialogTitle>
            <DialogDescription>Selecciona una plantilla para crear la lista de verificación</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plantilla LV *</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger><SelectValue placeholder="Seleccionar plantilla..." /></SelectTrigger>
                <SelectContent>
                  {LV_TEMPLATES.map(t => (
                    <SelectItem key={t.codigo} value={t.codigo}>
                      {t.codigo} — {t.nombre} ({t.frecuencia})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha Programada</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div>
                <Label>Responsable</Label>
                <Input placeholder="Nombre del responsable" value={formResponsable} onChange={(e) => setFormResponsable(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Turno</Label>
              <Input placeholder="Ej: Mañana 07:00" value={formTurno} onChange={(e) => setFormTurno(e.target.value)} />
            </div>
            {selectedTemplate && (
              <div className="border rounded-lg p-3 bg-slate-50 max-h-40 overflow-y-auto">
                <div className="text-xs font-semibold text-slate-600 mb-1">Items incluidos ({LV_TEMPLATES.find(t => t.codigo === selectedTemplate)?.items.length}):</div>
                {LV_TEMPLATES.find(t => t.codigo === selectedTemplate)?.items.map((item, idx) => (
                  <div key={idx} className="text-xs text-slate-500 py-0.5">
                    <span className="font-medium text-slate-600">{item.category}.</span> {item.description}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreateFromTemplate} disabled={!selectedTemplate}>
              Crear Lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
