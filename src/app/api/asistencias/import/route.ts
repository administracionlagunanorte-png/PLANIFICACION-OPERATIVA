import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

// ============================================================
// XLS Import for Asistencias Module
// ============================================================
// Parses a biometric clock XLS/XLSX file and creates:
//   - ATRASO records for workers who arrived late
//   - AUSENCIA records for workers with no entry on work days (Mon-Sat)
//
// Morning shift threshold: 08:05 AM
// Afternoon shift threshold: 14:05 (2:05 PM)
//
// Work days: Lunes a Sábado (no Sunday)
//
// Target departments (if Departamento column exists):
// - Auxiliares de Aseo
// - Auxiliares de Servicios Generales
// - Encargados de Laguna
// - Mantenimiento
//
// If NO Departamento column exists, ALL workers are processed.
//
// Column matching is flexible — multiple name variations are tried
// for each required field so that files from different biometric
// clock brands / configurations can be read.
// ============================================================

const TARGET_DEPARTMENTS = [
  'Auxiliares de Aseo',
  'Auxiliares de Servicios Generales',
  'Encargados de Laguna',
  'Mantenimiento',
]

// Column name variations for flexible matching
// Each key maps to an array of possible column names (lowercased)
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
  codigo: [
    'código',
    'codigo',
    'code',
    'código empleado',
    'codigo empleado',
    'emp_code',
    'empcode',
    'número',
    'numero',
    'num',
    'nº',
    'no.',
    'id empleado',
    'employee id',
  ],
}

interface ParsedRow {
  codigo: string
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
  shift?: 'morning' | 'afternoon'
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
  columnMapping: Record<string, string> // show user what was detected
}

function normalizeRut(rut: string): string {
  return rut.trim().replace(/\s+/g, '')
}

function isTargetDepartment(departamento: string): boolean {
  const normalized = departamento.trim()
  return TARGET_DEPARTMENTS.some(d => normalized === d || normalized.toLowerCase() === d.toLowerCase())
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
    // Try common date formats
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

// Check if a date is a work day (Monday=1 to Saturday=6, NOT Sunday=0)
function isWorkDay(date: Date): boolean {
  const day = date.getDay()
  return day !== 0 // Sunday = 0, everything else is a work day
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Flexible column matching: find the best column name from available columns
function findColumnMatch(
  availableColumns: string[],
  fieldKey: string
): string | null {
  const variations = COLUMN_VARIATIONS[fieldKey]
  if (!variations) return null

  // Normalize available columns for comparison
  const normalizedColumns = availableColumns.map(c => ({
    original: c,
    normalized: c.trim().toLowerCase().replace(/[_\-\.]/g, ' ').replace(/\s+/g, ' ').trim(),
  }))

  for (const variant of variations) {
    const normalizedVariant = variant.replace(/[_\-\.]/g, ' ').replace(/\s+/g, ' ').trim()

    // Exact match (normalized)
    const exactMatch = normalizedColumns.find(c => c.normalized === normalizedVariant)
    if (exactMatch) return exactMatch.original

    // Contains match
    const containsMatch = normalizedColumns.find(c => c.normalized.includes(normalizedVariant) || normalizedVariant.includes(c.normalized))
    if (containsMatch) return containsMatch.original
  }

  return null
}

// Determine if a tipoRegistro value means "Entrada" (entry/clock-in)
function isEntradaType(value: string): boolean {
  const v = value.toLowerCase().trim()
  return v === 'entrada' ||
    v === 'entry' ||
    v === 'in' ||
    v === 'entrar' ||
    v === 'ingreso' ||
    v === 'check in' ||
    v === 'check-in' ||
    v === 'e/s: entrada' ||
    v === '0' // some clocks use 0 for entrada, 1 for salida
}

// Determine if a tipoRegistro value means "Salida" (exit/clock-out)
function isSalidaType(value: string): boolean {
  const v = value.toLowerCase().trim()
  return v === 'salida' ||
    v === 'exit' ||
    v === 'out' ||
    v === 'salir' ||
    v === 'egreso' ||
    v === 'check out' ||
    v === 'check-out' ||
    v === 'e/s: salida' ||
    v === '1' // some clocks use 1 for salida
}

async function findOrCreateWorker(rut: string, nombre: string, summary: ImportSummary) {
  let worker = await db.worker.findFirst({
    where: { rut },
  })

  if (!worker) {
    // Try with normalized RUT variations
    const rutVariations = [
      rut,
      rut.replace(/\./g, ''),
      rut.replace(/-/g, '.'),
    ]
    for (const rutVar of rutVariations) {
      worker = await db.worker.findFirst({
        where: { rut: rutVar },
      })
      if (worker) break
    }
  }

  if (!worker) {
    worker = await db.worker.create({
      data: {
        nombre,
        rut,
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

    // Parse the XLS/XLSX/CSV file
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({ error: 'El archivo no contiene hojas' }, { status: 400 })
    }
    const sheet = workbook.Sheets[sheetName]

    // Auto-detect the header row by scanning rows for required columns
    // Required: nombre + fechaHora (minimum to identify a person and a date)
    // Optional: rut, departamento, tipoRegistro
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

      // Try to map each required/optional field
      const mapping: Record<string, string | null> = {}
      for (const fieldKey of Object.keys(COLUMN_VARIATIONS)) {
        mapping[fieldKey] = findColumnMatch(columns, fieldKey)
      }

      // Check if minimum required fields are found
      const minFound = MIN_REQUIRED.every(key => mapping[key] !== null)

      if (minFound) {
        headerRowIndex = rangeAttempt
        jsonData = tryData
        // Store the mapping (only non-null values)
        for (const [key, val] of Object.entries(mapping)) {
          if (val) columnMapping[key] = val
        }
        break
      }
    }

    if (headerRowIndex === -1 || jsonData.length === 0) {
      return NextResponse.json({
        error: 'No se pudieron identificar las columnas requeridas. Se necesitan al menos columnas de Nombre y Fecha/Hora. Columnas encontradas: ' + (jsonData.length > 0 ? Object.keys(jsonData[0]).join(', ') : 'ninguna'),
      }, { status: 400 })
    }

    const colNombre = columnMapping['nombre']!
    const colFechaHora = columnMapping['fechaHora']!
    const colRut = columnMapping['rut'] || null
    const colDepartamento = columnMapping['departamento'] || null
    const colTipoRegistro = columnMapping['tipoRegistro'] || null
    const colCodigo = columnMapping['codigo'] || null

    const hasRut = !!colRut
    const hasDepartamento = !!colDepartamento
    const hasTipoRegistro = !!colTipoRegistro

    // If no RUT column, use Nombre as identifier
    // If no Departamento column, process ALL workers (no department filter)
    // If no TipoRegistro column, treat all records as potential Entrada

    // ============================================================
    // STEP 1: Parse ALL rows
    // ============================================================
    const allTargetRows: ParsedRow[] = []
    for (const row of jsonData) {
      const nombre = String(row[colNombre] || '').trim()
      if (!nombre) continue

      const fechaHora = parseExcelDate(row[colFechaHora])
      if (!fechaHora) continue

      const rut = colRut ? normalizeRut(String(row[colRut] || '')) : nombre
      if (!rut) continue

      const departamento = colDepartamento ? String(row[colDepartamento] || '').trim() : ''
      const tipoRegistro = colTipoRegistro ? String(row[colTipoRegistro] || '').trim() : 'entrada'

      // Filter by department only if department column exists
      if (hasDepartamento && departamento && !isTargetDepartment(departamento)) {
        continue
      }

      allTargetRows.push({
        codigo: colCodigo ? String(row[colCodigo] || '').trim() : '',
        rut,
        nombre,
        departamento,
        fechaHora,
        tipoRegistro,
      })
    }

    if (allTargetRows.length === 0) {
      return NextResponse.json({
        error: 'No se encontraron registros para los departamentos objetivo en el archivo',
      }, { status: 400 })
    }

    // ============================================================
    // STEP 2: Build set of all dates and workers present per day
    // ============================================================
    const workerDayEntries = new Map<string, Set<string>>() // "RUT|date" → Set of "entrada"/"salida"
    const workerInfo = new Map<string, { nombre: string; departamento: string }>() // RUT → info
    let minDate: Date | null = null
    let maxDate: Date | null = null

    for (const row of allTargetRows) {
      const dateStr = formatDate(row.fechaHora)
      const key = `${row.rut}|${dateStr}`

      if (!workerDayEntries.has(key)) {
        workerDayEntries.set(key, new Set())
      }

      // Classify the type of record
      if (hasTipoRegistro) {
        if (isEntradaType(row.tipoRegistro)) {
          workerDayEntries.get(key)!.add('entrada')
        } else if (isSalidaType(row.tipoRegistro)) {
          workerDayEntries.get(key)!.add('salida')
        } else {
          // Unknown type — treat as entrada if it has a time component
          workerDayEntries.get(key)!.add('entrada')
        }
      } else {
        // No tipo registro column — assume all records are entrada
        workerDayEntries.get(key)!.add('entrada')
      }

      workerInfo.set(row.rut, { nombre: row.nombre, departamento: row.departamento })

      // Track date range
      if (!minDate || row.fechaHora < minDate) minDate = row.fechaHora
      if (!maxDate || row.fechaHora > maxDate) maxDate = row.fechaHora
    }

    // Get unique RUTs of target workers
    const targetRuts = new Set(allTargetRows.map(r => r.rut))

    // Get unique dates where target workers had any record
    const allDates = new Set<string>()
    for (const row of allTargetRows) {
      allDates.add(formatDate(row.fechaHora))
    }

    // ============================================================
    // STEP 3: Detect ATRASOS from Entrada records
    // ============================================================
    const entradaRows = allTargetRows.filter(r => {
      if (hasTipoRegistro) {
        return isEntradaType(r.tipoRegistro)
      }
      // If no tipo registro, treat all records as potential entrada
      return true
    })

    // Group entries by RUT + date + shift to find first entry per shift
    const entryMap = new Map<string, ParsedRow>()
    for (const row of entradaRows) {
      const dateStr = formatDate(row.fechaHora)
      const hour = row.fechaHora.getHours()

      let shift: 'morning' | 'afternoon'
      if (hour < 12) {
        shift = 'morning'
      } else if (hour < 18) {
        shift = 'afternoon'
      } else {
        continue
      }

      const key = `${row.rut}|${dateStr}|${shift}`
      const existing = entryMap.get(key)

      if (!existing || row.fechaHora < existing.fechaHora) {
        entryMap.set(key, row)
      }
    }

    const summary: ImportSummary = {
      totalRecords: allTargetRows.length,
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
      const [, dateStr, shift] = key.split('|')
      const entryHour = row.fechaHora.getHours()
      const entryMinute = row.fechaHora.getMinutes()

      let thresholdHour: number
      let thresholdMinute: number

      if (shift === 'morning') {
        thresholdHour = 8
        thresholdMinute = 5
      } else {
        thresholdHour = 14
        thresholdMinute = 5
      }

      const entryTotalMinutes = entryHour * 60 + entryMinute
      const thresholdTotalMinutes = thresholdHour * 60 + thresholdMinute

      if (entryTotalMinutes <= thresholdTotalMinutes) {
        continue // On time
      }

      const minutesLate = entryTotalMinutes - thresholdTotalMinutes
      summary.atrasosFound++

      const worker = await findOrCreateWorker(row.rut, row.nombre, summary)

      // Check if ATRASO already exists for this worker+date
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
          shift: shift as 'morning' | 'afternoon',
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
          reason: `Importado desde registro de asistencia (${shift === 'morning' ? 'turno mañana' : 'turno tarde'})`,
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
        shift: shift as 'morning' | 'afternoon',
        minutesLate,
        action: 'created',
      })
    }

    // ============================================================
    // STEP 4: Detect AUSENCIAS (no entry on work days Mon-Sat)
    // ============================================================
    if (minDate && maxDate && targetRuts.size > 0) {
      // Build the list of work days (Mon-Sat) in the date range
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

      // For each target worker, check each work day
      for (const rut of targetRuts) {
        const info = workerInfo.get(rut)
        if (!info) continue

        for (const dateStr of workDays) {
          const key = `${rut}|${dateStr}`
          const entries = workerDayEntries.get(key)

          // If no "entrada" was recorded for this worker on this day
          if (!entries || !entries.has('entrada')) {
            summary.ausenciasFound++

            const worker = await findOrCreateWorker(rut, info.nombre, summary)

            // Check if AUSENCIA already exists for this worker+date
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

            // Also skip if there's an ATRASO record for this day (already counted as present)
            const existingAtraso = await db.asistenciaRecord.findFirst({
              where: {
                workerId: worker.id,
                date: { gte: dateStart, lte: dateEnd },
                type: 'ATRASO',
              },
            })

            if (existingAtraso) {
              // Worker was present (just late) - not an absence
              continue
            }

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

    // Sort details: first by date, then by nombre
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
