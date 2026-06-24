import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

// ============================================================
// XLS Import for Asistencias Module — Universal Version
// ============================================================
// Works with ANY biometric clock Excel file.
//
// Key features:
// - Flexible column name detection (multiple variations in Spanish/English)
// - No mandatory department filter (processes ALL workers by default)
// - Worker-specific schedule thresholds (from NOMINA data)
// - Falls back to 08:05/14:05 if no schedule is configured
// - Detects ATRASOS and AUSENCIAS
//
// Work days: Lunes a Sábado (no Sunday)
// ============================================================

// Default thresholds (used when worker has no specific schedule)
const DEFAULT_MORNING_THRESHOLD_HR = 8
const DEFAULT_MORNING_THRESHOLD_MIN = 5
const DEFAULT_AFTERNOON_THRESHOLD_HR = 14
const DEFAULT_AFTERNOON_THRESHOLD_MIN = 5
const GRACE_MINUTES = 5 // grace period added to scheduled entry time

// Column name variations for flexible matching
const COLUMN_VARIATIONS: Record<string, string[]> = {
  departamento: [
    'departamento',
    'department',
    'depto',
    'dept',
    'área',
    'area',
    'sección',
    'seccion',
    'unidad',
    'cargo',
    'posición',
    'posicion',
    'puesto',
  ],
  rut: [
    'rut',
    'r.u.t',
    'r.u.t.',
    'run',
    'r.u.n',
    'r.u.n.',
    'cedula',
    'cédula',
    'ci',
    'documento',
    'número documento',
    'numero documento',
    'num documento',
    'id',
    'identificación',
    'identificacion',
    'rut/pasaporte',
    'número',
    'numero',
    'código',
    'codigo',
    'code',
    'nº',
  ],
  nombre: [
    'nombre',
    'name',
    'nombres',
    'nombre completo',
    'trabajador',
    'empleado',
    'colaborador',
    'persona',
    'funcionario',
    'nombre y apellido',
    'apellidos y nombres',
    'apellido y nombre',
    'nombre y apellidos',
  ],
  fechaHora: [
    'fecha/hora',
    'fecha / hora',
    'fecha hora',
    'fechahora',
    'fecha y hora',
    'fecha',
    'date/time',
    'datetime',
    'date',
    'fecha_registro',
    'fecha registro',
    'marcación',
    'marcacion',
    'hora',
    'time',
    'timestamp',
    'fecha de marcación',
    'fecha de marcacion',
  ],
  tipoRegistro: [
    'tipo registro',
    'tipo de registro',
    'tipo_registro',
    'tiporegistro',
    'tipo',
    'type',
    'registro',
    'entrada/salida',
    'entrada / salida',
    'direccion',
    'dirección',
    'direction',
    'estado',
    'status',
    'marca',
    'evento',
  ],
}

interface ParsedRow {
  rut: string
  nombre: string
  departamento: string
  fechaHora: Date
  tipoRegistro: string
}

interface ImportDetail {
  rut: string
  nombre: string
  departamento: string
  date: string
  type: 'ATRASO' | 'AUSENCIA'
  entryTime?: string
  shift?: 'morning' | 'afternoon' | 'night'
  minutesLate?: number
  action: 'created' | 'skipped_existing'
}

interface ImportSummary {
  totalRecords: number
  atrasosFound: number
  atrasosCreated: number
  ausenciasFound: number
  ausenciasCreated: number
  workersCreated: number
  skipped: number
  details: ImportDetail[]
  columnMapping: Record<string, string>
}

function normalizeRut(rut: string): string {
  return rut.trim().replace(/\s+/g, '')
}

function parseExcelDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value
  }
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return new Date(date.y, date.m - 1, date.d, date.H || 0, date.M || 0, date.S || 0)
    }
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
    // Try common date formats: DD/MM/YYYY or DD-MM-YYYY
    const parts = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
    if (parts) {
      const day = parseInt(parts[1])
      const month = parseInt(parts[2]) - 1
      let year = parseInt(parts[3])
      if (year < 100) year += 2000
      return new Date(year, month, day)
    }
  }
  return null
}

function isWorkDay(date: Date): boolean {
  return date.getDay() !== 0 // Not Sunday
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function findColumnMatch(
  availableColumns: string[],
  fieldKey: string
): string | null {
  const variations = COLUMN_VARIATIONS[fieldKey]
  if (!variations) return null

  const normalizedColumns = availableColumns.map(c => ({
    original: c,
    normalized: c.trim().toLowerCase().replace(/[_\-\.\/]/g, ' ').replace(/\s+/g, ' ').trim(),
  }))

  for (const variant of variations) {
    const nv = variant.replace(/[_\-\.\/]/g, ' ').replace(/\s+/g, ' ').trim()

    const exactMatch = normalizedColumns.find(c => c.normalized === nv)
    if (exactMatch) return exactMatch.original

    const containsMatch = normalizedColumns.find(c =>
      c.normalized.includes(nv) || nv.includes(c.normalized)
    )
    if (containsMatch) return containsMatch.original
  }

  return null
}

function isEntradaType(value: string): boolean {
  const v = value.toLowerCase().trim()
  return v === 'entrada' || v === 'entry' || v === 'in' ||
    v === 'ingreso' || v === 'check in' || v === 'check-in' ||
    v === 'e/s: entrada' || v === '0'
}

function isSalidaType(value: string): boolean {
  const v = value.toLowerCase().trim()
  return v === 'salida' || v === 'exit' || v === 'out' ||
    v === 'egreso' || v === 'check out' || v === 'check-out' ||
    v === 'e/s: salida' || v === '1'
}

// Parse time string "HH:MM" to total minutes from midnight
function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null
  const match = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

// Get the threshold for a worker based on their schedule
// Returns { morningHr, morningMin, afternoonHr, afternoonMin }
function getWorkerThreshold(horaEntrada: string | null): {
  morningHr: number; morningMin: number;
  afternoonHr: number; afternoonMin: number;
} {
  const entryMinutes = parseTimeToMinutes(horaEntrada || '')

  if (entryMinutes !== null) {
    // Worker has a specific schedule — use it + grace period
    const thresholdMinutes = entryMinutes + GRACE_MINUTES
    const hr = Math.floor(thresholdMinutes / 60)
    const min = thresholdMinutes % 60

    // If entry is in the afternoon (>= 12:00), set morning to default
    if (entryMinutes >= 12 * 60) {
      return {
        morningHr: DEFAULT_MORNING_THRESHOLD_HR,
        morningMin: DEFAULT_MORNING_THRESHOLD_MIN,
        afternoonHr: hr,
        afternoonMin: min,
      }
    }

    return {
      morningHr: hr,
      morningMin: min,
      afternoonHr: DEFAULT_AFTERNOON_THRESHOLD_HR,
      afternoonMin: DEFAULT_AFTERNOON_THRESHOLD_MIN,
    }
  }

  // No schedule configured — use defaults
  return {
    morningHr: DEFAULT_MORNING_THRESHOLD_HR,
    morningMin: DEFAULT_MORNING_THRESHOLD_MIN,
    afternoonHr: DEFAULT_AFTERNOON_THRESHOLD_HR,
    afternoonMin: DEFAULT_AFTERNOON_THRESHOLD_MIN,
  }
}

async function findOrCreateWorker(rut: string, nombre: string, summary: ImportSummary) {
  let worker = null

  if (rut) {
    worker = await db.worker.findFirst({ where: { rut } })
    if (!worker) {
      // Try normalized RUT
      const rutVariations = [rut, rut.replace(/\./g, ''), rut.replace(/-/g, '.')]
      for (const rv of rutVariations) {
        worker = await db.worker.findFirst({ where: { rut: rv } })
        if (worker) break
      }
    }
  }

  if (!worker && nombre) {
    // Try to match by partial name
    const nameParts = nombre.trim().split(/\s+/).slice(0, 2).join(' ')
    worker = await db.worker.findFirst({
      where: { nombre: { contains: nameParts, mode: 'insensitive' } },
    })
  }

  if (!worker) {
    worker = await db.worker.create({
      data: {
        nombre,
        rut: rut || `SIN-RUT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        cuentaBancaria: '',
      },
    })
    summary.workersCreated++
  }

  return worker
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xls') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'El archivo debe ser .xls, .xlsx o .csv' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({ error: 'El archivo no contiene hojas' }, { status: 400 })
    }
    const sheet = workbook.Sheets[sheetName]

    // Auto-detect header row
    const MIN_REQUIRED = ['nombre', 'fechaHora']
    let headerRowIndex = -1
    let jsonData: Record<string, unknown>[] = []
    let columnMapping: Record<string, string> = {}

    for (let rangeAttempt = 0; rangeAttempt <= 15; rangeAttempt++) {
      const tryData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
        range: rangeAttempt,
        defval: '',
      })

      if (tryData.length === 0) continue

      const columns = Object.keys(tryData[0])
      const mapping: Record<string, string | null> = {}
      for (const fieldKey of Object.keys(COLUMN_VARIATIONS)) {
        mapping[fieldKey] = findColumnMatch(columns, fieldKey)
      }

      const minFound = MIN_REQUIRED.every(key => mapping[key] !== null)

      if (minFound) {
        headerRowIndex = rangeAttempt
        jsonData = tryData
        for (const [key, val] of Object.entries(mapping)) {
          if (val) columnMapping[key] = val
        }
        break
      }
    }

    if (headerRowIndex === -1 || jsonData.length === 0) {
      // Return helpful error with what columns were found
      const testCols = jsonData.length > 0 ? Object.keys(jsonData[0]).join(', ') : 'ninguna'
      return NextResponse.json({
        error: `No se pudieron identificar las columnas requeridas (Nombre y Fecha/Hora). Columnas encontradas: ${testCols}`,
      }, { status: 400 })
    }

    const colNombre = columnMapping['nombre']!
    const colFechaHora = columnMapping['fechaHora']!
    const colRut = columnMapping['rut'] || null
    const colDepartamento = columnMapping['departamento'] || null
    const colTipoRegistro = columnMapping['tipoRegistro'] || null

    const hasRut = !!colRut
    const hasDepartamento = !!colDepartamento
    const hasTipoRegistro = !!colTipoRegistro

    // ============================================================
    // STEP 1: Parse ALL rows
    // ============================================================
    const allRows: ParsedRow[] = []
    for (const row of jsonData) {
      const nombre = String(row[colNombre] || '').trim()
      if (!nombre) continue

      const fechaHora = parseExcelDate(row[colFechaHora])
      if (!fechaHora) continue

      const rut = colRut ? normalizeRut(String(row[colRut] || '')) : nombre
      if (!rut) continue

      const departamento = colDepartamento ? String(row[colDepartamento] || '').trim() : ''
      const tipoRegistro = colTipoRegistro ? String(row[colTipoRegistro] || '').trim() : 'entrada'

      allRows.push({ rut, nombre, departamento, fechaHora, tipoRegistro })
    }

    if (allRows.length === 0) {
      return NextResponse.json({
        error: 'No se encontraron registros válidos en el archivo',
      }, { status: 400 })
    }

    // ============================================================
    // STEP 2: Build worker-day entries map
    // ============================================================
    const workerDayEntries = new Map<string, Set<string>>()
    const workerInfo = new Map<string, { nombre: string; departamento: string }>()
    let minDate: Date | null = null
    let maxDate: Date | null = null

    for (const row of allRows) {
      const dateStr = formatDate(row.fechaHora)
      const key = `${row.rut}|${dateStr}`

      if (!workerDayEntries.has(key)) {
        workerDayEntries.set(key, new Set())
      }

      if (hasTipoRegistro) {
        if (isEntradaType(row.tipoRegistro)) {
          workerDayEntries.get(key)!.add('entrada')
        } else if (isSalidaType(row.tipoRegistro)) {
          workerDayEntries.get(key)!.add('salida')
        } else {
          workerDayEntries.get(key)!.add('entrada')
        }
      } else {
        workerDayEntries.get(key)!.add('entrada')
      }

      workerInfo.set(row.rut, { nombre: row.nombre, departamento: row.departamento })

      if (!minDate || row.fechaHora < minDate) minDate = row.fechaHora
      if (!maxDate || row.fechaHora > maxDate) maxDate = row.fechaHora
    }

    const targetRuts = new Set(allRows.map(r => r.rut))

    // ============================================================
    // STEP 3: Detect ATRASOS from Entrada records
    // ============================================================
    const entradaRows = allRows.filter(r => {
      if (hasTipoRegistro) return isEntradaType(r.tipoRegistro)
      return true
    })

    // Load all workers from DB for schedule lookup
    const dbWorkers = await db.worker.findMany({
      where: { active: true },
    })
    const workerScheduleMap = new Map<string, { horaEntrada: string | null; horaSalida: string | null }>()
    for (const w of dbWorkers) {
      // Index by RUT and by name
      if (w.rut) workerScheduleMap.set(w.rut, { horaEntrada: w.horaEntrada, horaSalida: w.horaSalida })
      // Also index by first two name words for matching
      const nameKey = w.nombre.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase()
      if (!workerScheduleMap.has(nameKey)) {
        workerScheduleMap.set(nameKey, { horaEntrada: w.horaEntrada, horaSalida: w.horaSalida })
      }
    }

    // Group entries by RUT + date + shift
    const entryMap = new Map<string, ParsedRow>()
    for (const row of entradaRows) {
      const dateStr = formatDate(row.fechaHora)
      const hour = row.fechaHora.getHours()

      let shift: 'morning' | 'afternoon' | 'night'
      if (hour >= 5 && hour < 12) {
        shift = 'morning'
      } else if (hour >= 12 && hour < 18) {
        shift = 'afternoon'
      } else {
        shift = 'night' // Night shift workers (19:00-07:00 etc.)
      }

      const key = `${row.rut}|${dateStr}|${shift}`
      const existing = entryMap.get(key)

      if (!existing || row.fechaHora < existing.fechaHora) {
        entryMap.set(key, row)
      }
    }

    const summary: ImportSummary = {
      totalRecords: allRows.length,
      atrasosFound: 0,
      atrasosCreated: 0,
      ausenciasFound: 0,
      ausenciasCreated: 0,
      workersCreated: 0,
      skipped: 0,
      details: [],
      columnMapping,
    }

    // Process atrasos
    for (const [key, row] of Array.from(entryMap.entries())) {
      const [, dateStr, shiftStr] = key.split('|')
      const entryHour = row.fechaHora.getHours()
      const entryMinute = row.fechaHora.getMinutes()

      // Skip night shift workers for atraso detection (they have different schedules)
      if (shiftStr === 'night') continue

      // Look up worker's schedule
      const schedule = workerScheduleMap.get(row.rut) ||
        workerScheduleMap.get(row.nombre.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase())
      const threshold = getWorkerThreshold(schedule?.horaEntrada || null)

      let thresholdHour: number
      let thresholdMinute: number

      if (shiftStr === 'morning') {
        thresholdHour = threshold.morningHr
        thresholdMinute = threshold.morningMin
      } else {
        thresholdHour = threshold.afternoonHr
        thresholdMinute = threshold.afternoonMin
      }

      const entryTotalMinutes = entryHour * 60 + entryMinute
      const thresholdTotalMinutes = thresholdHour * 60 + thresholdMinute

      if (entryTotalMinutes <= thresholdTotalMinutes) {
        continue // On time
      }

      const minutesLate = entryTotalMinutes - thresholdTotalMinutes
      summary.atrasosFound++

      const worker = await findOrCreateWorker(row.rut, row.nombre, summary)

      const dateStart = new Date(dateStr + 'T00:00:00.000Z')
      const dateEnd = new Date(dateStr + 'T23:59:59.999Z')

      const existingRecord = await db.asistenciaRecord.findFirst({
        where: {
          workerId: worker.id,
          date: { gte: dateStart, lte: dateEnd },
          type: 'ATRASO',
        },
      })

      if (existingRecord) {
        summary.skipped++
        summary.details.push({
          rut: row.rut,
          nombre: row.nombre,
          departamento: row.departamento,
          date: dateStr,
          type: 'ATRASO',
          entryTime: `${String(entryHour).padStart(2, '0')}:${String(entryMinute).padStart(2, '0')}`,
          shift: shiftStr as 'morning' | 'afternoon',
          minutesLate,
          action: 'skipped_existing',
        })
        continue
      }

      await db.asistenciaRecord.create({
        data: {
          workerId: worker.id,
          date: new Date(dateStr + 'T12:00:00.000Z'),
          type: 'ATRASO',
          minutesLate,
          reason: `Importado desde registro de asistencia (${shiftStr === 'morning' ? 'turno mañana' : 'turno tarde'})`,
          reportedBy: 'Importación XLS',
        },
      })

      summary.atrasosCreated++
      summary.details.push({
        rut: row.rut,
        nombre: row.nombre,
        departamento: row.departamento,
        date: dateStr,
        type: 'ATRASO',
        entryTime: `${String(entryHour).padStart(2, '0')}:${String(entryMinute).padStart(2, '0')}`,
        shift: shiftStr as 'morning' | 'afternoon',
        minutesLate,
        action: 'created',
      })
    }

    // ============================================================
    // STEP 4: Detect AUSENCIAS
    // ============================================================
    if (minDate && maxDate && targetRuts.size > 0) {
      const workDays: string[] = []
      const current = new Date(minDate)
      current.setHours(0, 0, 0, 0)
      const end = new Date(maxDate)
      end.setHours(23, 59, 59, 999)

      while (current <= end) {
        if (isWorkDay(current)) {
          workDays.push(formatDate(current))
        }
        current.setDate(current.getDate() + 1)
      }

      for (const rut of targetRuts) {
        const info = workerInfo.get(rut)
        if (!info) continue

        for (const dateStr of workDays) {
          const key = `${rut}|${dateStr}`
          const entries = workerDayEntries.get(key)

          if (!entries || !entries.has('entrada')) {
            summary.ausenciasFound++

            const worker = await findOrCreateWorker(rut, info.nombre, summary)

            const dateStart = new Date(dateStr + 'T00:00:00.000Z')
            const dateEnd = new Date(dateStr + 'T23:59:59.999Z')

            const existingAusencia = await db.asistenciaRecord.findFirst({
              where: {
                workerId: worker.id,
                date: { gte: dateStart, lte: dateEnd },
                type: 'AUSENCIA',
              },
            })

            if (existingAusencia) {
              summary.skipped++
              summary.details.push({
                rut,
                nombre: info.nombre,
                departamento: info.departamento,
                date: dateStr,
                type: 'AUSENCIA',
                action: 'skipped_existing',
              })
              continue
            }

            const existingAtraso = await db.asistenciaRecord.findFirst({
              where: {
                workerId: worker.id,
                date: { gte: dateStart, lte: dateEnd },
                type: 'ATRASO',
              },
            })

            if (existingAtraso) continue

            await db.asistenciaRecord.create({
              data: {
                workerId: worker.id,
                date: new Date(dateStr + 'T12:00:00.000Z'),
                type: 'AUSENCIA',
                minutesLate: 0,
                reason: 'Sin marcación de entrada en registro de asistencia',
                reportedBy: 'Importación XLS',
              },
            })

            summary.ausenciasCreated++
            summary.details.push({
              rut,
              nombre: info.nombre,
              departamento: info.departamento,
              date: dateStr,
              type: 'AUSENCIA',
              action: 'created',
            })
          }
        }
      }
    }

    summary.details.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.nombre.localeCompare(b.nombre)
    })

    return NextResponse.json(summary, { status: 200 })
  } catch (error) {
    console.error('Error importing XLS file:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: `Error al procesar el archivo: ${message}` },
      { status: 500 }
    )
  }
}
