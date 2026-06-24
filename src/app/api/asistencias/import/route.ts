import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

// ============================================================
// XLS Import for Asistencias Module — Universal Version v2
// ============================================================
// Works with ANY biometric clock Excel file.
//
// Key fixes from v1:
// - Handles SEPARATE date + time columns (most biometric exports)
// - Handles combined date/time column
// - Night shift: does NOT skip — only uses different threshold
// - Comprehensive diagnostic output
// ============================================================

const DEFAULT_MORNING_THRESHOLD_HR = 8
const DEFAULT_MORNING_THRESHOLD_MIN = 5
const DEFAULT_AFTERNOON_THRESHOLD_HR = 14
const DEFAULT_AFTERNOON_THRESHOLD_MIN = 5
const GRACE_MINUTES = 5

// Column name variations — now includes separate fecha and hora
const COLUMN_VARIATIONS: Record<string, string[]> = {
  departamento: [
    'departamento', 'department', 'depto', 'dept', 'área', 'area',
    'sección', 'seccion', 'unidad', 'cargo', 'posición', 'posicion', 'puesto',
  ],
  rut: [
    'rut', 'r.u.t', 'r.u.t.', 'run', 'r.u.n', 'r.u.n.',
    'cedula', 'cédula', 'ci', 'documento', 'número documento',
    'numero documento', 'num documento', 'id', 'identificación',
    'identificacion', 'rut/pasaporte', 'número', 'numero',
    'código', 'codigo', 'code', 'nº', 'n°',
  ],
  nombre: [
    'nombre', 'name', 'nombres', 'nombre completo', 'trabajador',
    'empleado', 'colaborador', 'persona', 'funcionario',
    'nombre y apellido', 'apellidos y nombres', 'apellido y nombre',
    'nombre y apellidos', 'apellido, nombre',
  ],
  // COMBINED date+time column — ONLY matches columns that clearly have both
  fechaHora: [
    'fecha/hora', 'fecha / hora', 'fecha hora', 'fechahora',
    'fecha y hora', 'date/time', 'datetime', 'timestamp',
    'marcación', 'marcacion', 'fecha de marcación', 'fecha de marcacion',
  ],
  // SEPARATE date column (no time) — matches columns that are clearly date-only
  fecha: [
    'fecha', 'date', 'día', 'dia', 'fecha_registro', 'fecha registro',
  ],
  // SEPARATE time column (no date) — matches columns that are clearly time-only
  hora: [
    'hora', 'time', 'hora_registro', 'hora registro',
    'hora de marcación', 'hora de marcacion', 'hora marcación',
  ],
  tipoRegistro: [
    'tipo registro', 'tipo de registro', 'tipo_registro', 'tiporegistro',
    'tipo', 'type', 'registro', 'entrada/salida', 'entrada / salida',
    'direccion', 'dirección', 'direction', 'estado', 'status',
    'marca', 'evento',
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
  rowsParsed: number
  atrasosFound: number
  atrasosCreated: number
  ausenciasFound: number
  ausenciasCreated: number
  workersCreated: number
  skipped: number
  details: ImportDetail[]
  columnMapping: Record<string, string>
  diagnostics: {
    columnsFound: string[]
    columnMapping: Record<string, string>
    sampleRows: Record<string, unknown>[]
    parsingNotes: string[]
    dateMode: 'combined' | 'separate' | 'unknown'
  }
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
    // Try DD/MM/YYYY or DD-MM-YYYY
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

// Parse a time-only value (from a separate "Hora" column)
// Returns { hours, minutes } or null
function parseTimeValue(value: unknown): { hours: number; minutes: number } | null {
  if (typeof value === 'string') {
    const v = value.trim()
    // "HH:MM" or "HH:MM:SS"
    const match = v.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/)
    if (match) {
      const h = parseInt(match[1])
      const m = parseInt(match[2])
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        return { hours: h, minutes: m }
      }
    }
    // "HHMM" (no colon)
    const match2 = v.match(/^(\d{1,2})(\d{2})$/)
    if (match2) {
      const h = parseInt(match2[1])
      const m = parseInt(match2[2])
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        return { hours: h, minutes: m }
      }
    }
  }
  if (typeof value === 'number') {
    // Excel time is stored as fraction of day (e.g. 0.333 = 8:00 AM)
    if (value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      return { hours, minutes }
    }
    // Could also be a date serial that contains time
    const date = XLSX.SSF.parse_date_code(value)
    if (date && (date.H !== undefined)) {
      return { hours: date.H, minutes: date.M || 0 }
    }
  }
  if (value instanceof Date) {
    return { hours: value.getHours(), minutes: value.getMinutes() }
  }
  return null
}

// Combine a date-only Date with a time value
function combineDateAndTime(dateOnly: Date, time: { hours: number; minutes: number }): Date {
  const result = new Date(dateOnly)
  result.setHours(time.hours, time.minutes, 0, 0)
  return result
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

    // Exact match first (highest priority)
    const exactMatch = normalizedColumns.find(c => c.normalized === nv)
    if (exactMatch) return exactMatch.original
  }

  // Second pass: contains match (lower priority)
  for (const variant of variations) {
    const nv = variant.replace(/[_\-\.\/]/g, ' ').replace(/\s+/g, ' ').trim()
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

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null
  const match = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

function getWorkerThreshold(horaEntrada: string | null): {
  morningHr: number; morningMin: number;
  afternoonHr: number; afternoonMin: number;
} {
  const entryMinutes = parseTimeToMinutes(horaEntrada || '')

  if (entryMinutes !== null) {
    const thresholdMinutes = entryMinutes + GRACE_MINUTES
    const hr = Math.floor(thresholdMinutes / 60)
    const min = thresholdMinutes % 60

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
      const rutVariations = [rut, rut.replace(/\./g, ''), rut.replace(/-/g, '.')]
      for (const rv of rutVariations) {
        worker = await db.worker.findFirst({ where: { rut: rv } })
        if (worker) break
      }
    }
  }

  if (!worker && nombre) {
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
    // Ensure new columns exist in the database (safe, idempotent)
    try {
      await db.$executeRawUnsafe(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS "cargo" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS "turnoA" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS "turnoB" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS "horaEntrada" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS "horaSalida" TEXT`)
    } catch (alterErr: any) {
      console.warn('Column sync warning:', alterErr.message?.slice(0, 200))
    }

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
    const MIN_REQUIRED_FIELDS = ['nombre'] // Only nombre is absolutely required
    let headerRowIndex = -1
    let jsonData: Record<string, unknown>[] = []
    let columnMapping: Record<string, string> = {}
    let allColumnsFound: string[] = []

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

      const minFound = MIN_REQUIRED_FIELDS.every(key => mapping[key] !== null)

      if (minFound) {
        headerRowIndex = rangeAttempt
        jsonData = tryData
        allColumnsFound = columns
        for (const [key, val] of Object.entries(mapping)) {
          if (val) columnMapping[key] = val
        }
        break
      }
    }

    if (headerRowIndex === -1 || jsonData.length === 0) {
      const testCols = jsonData.length > 0 ? Object.keys(jsonData[0]).join(', ') : 'ninguna'
      return NextResponse.json({
        error: `No se pudieron identificar las columnas requeridas (Nombre). Columnas encontradas: ${testCols}`,
      }, { status: 400 })
    }

    // ============================================================
    // SMART COLUMN CONFLICT RESOLUTION
    // ============================================================
    // If we have BOTH separate 'fecha' and 'hora' columns, we should
    // NOT use 'fechaHora' because that would match one of them
    // incorrectly (e.g., matching "Hora" to fechaHora would lose the date).
    // Priority: separate columns (fecha+hora) > combined column (fechaHora)
    const colFecha = columnMapping['fecha'] || null
    const colHora = columnMapping['hora'] || null
    const colFechaHora = columnMapping['fechaHora'] || null

    // If both fecha AND hora exist separately, remove fechaHora mapping
    // because we'll combine fecha+hora ourselves
    if (colFecha && colHora) {
      // Check if fechaHora was mapped to the same column as fecha or hora
      // If so, it's a false match — remove it
      if (colFechaHora && (colFechaHora === colFecha || colFechaHora === colHora)) {
        delete columnMapping['fechaHora']
      }
      // Even if fechaHora was mapped to a different column, prefer separate columns
      // because they're more reliable for biometric clock data
    }

    // If we have a fechaHora combined column that happens to match the same
    // column as 'fecha' or 'hora', remove the conflicting mappings
    if (colFechaHora) {
      if (colFechaHora === colFecha) {
        // fechaHora and fecha point to same column — likely just a date column
        // Remove fechaHora, keep fecha for separate processing
        delete columnMapping['fechaHora']
      } else if (colFechaHora === colHora) {
        // fechaHora was incorrectly matched to the Hora column
        delete columnMapping['fechaHora']
      }
    }

    // Re-read after conflict resolution
    const finalColFechaHora = columnMapping['fechaHora'] || null
    const finalColFecha = columnMapping['fecha'] || null
    const finalColHora = columnMapping['hora'] || null
    const colNombre = columnMapping['nombre']!
    const colRut = columnMapping['rut'] || null
    const colDepartamento = columnMapping['departamento'] || null
    const colTipoRegistro = columnMapping['tipoRegistro'] || null

    const hasRut = !!colRut
    const hasDepartamento = !!colDepartamento
    const hasTipoRegistro = !!colTipoRegistro

    // Determine the date parsing mode
    let dateMode: 'combined' | 'separate' | 'unknown' = 'unknown'
    const parsingNotes: string[] = []

    if (finalColFechaHora) {
      dateMode = 'combined'
      parsingNotes.push(`Modo: Columna combinada fecha/hora "${finalColFechaHora}"`)
    } else if (finalColFecha && finalColHora) {
      dateMode = 'separate'
      parsingNotes.push(`Modo: Columnas separadas "${finalColFecha}" + "${finalColHora}"`)
    } else if (finalColFecha) {
      // Only date column, no time — try to infer time from the date value itself
      // (Excel sometimes stores date+time in a "Fecha" column even if it's named just "Fecha")
      dateMode = 'separate'
      parsingNotes.push(`Modo: Solo columna de fecha "${finalColFecha}" sin hora separada. Se intentará extraer hora del valor de fecha.`)
    } else if (finalColHora) {
      // Only time, no date — can't process
      parsingNotes.push(`ERROR: Solo se encontró columna de hora "${finalColHora}" sin fecha. No se puede procesar.`)
    } else {
      parsingNotes.push('ERROR: No se encontró ninguna columna de fecha u hora.')
    }

    // Make sure we have at least some way to get dates
    if (!finalColFechaHora && !finalColFecha) {
      return NextResponse.json({
        error: `No se encontró columna de fecha. Columnas encontradas: ${allColumnsFound.join(', ')}`,
        columnMapping,
        diagnostics: {
          columnsFound: allColumnsFound,
          columnMapping,
          sampleRows: jsonData.slice(0, 3),
          parsingNotes,
          dateMode,
        },
      }, { status: 400 })
    }

    // ============================================================
    // STEP 1: Parse ALL rows with smart date/time handling
    // ============================================================
    const allRows: ParsedRow[] = []
    let rowsWithZeroHour = 0
    let rowsWithValidTime = 0

    for (const row of jsonData) {
      const nombre = String(row[colNombre] || '').trim()
      if (!nombre) continue

      const rut = colRut ? normalizeRut(String(row[colRut] || '')) : nombre
      if (!rut) continue

      const departamento = colDepartamento ? String(row[colDepartamento] || '').trim() : ''
      const tipoRegistro = colTipoRegistro ? String(row[colTipoRegistro] || '').trim() : 'entrada'

      let fechaHora: Date | null = null

      if (dateMode === 'combined' && finalColFechaHora) {
        // Combined date/time column
        fechaHora = parseExcelDate(row[finalColFechaHora])
      } else if (dateMode === 'separate') {
        // Separate date and time columns (or date-only with possible embedded time)
        const dateValue = finalColFecha ? row[finalColFecha] : null
        const timeValue = finalColHora ? row[finalColHora] : null

        const parsedDate = dateValue !== null ? parseExcelDate(dateValue) : null

        if (parsedDate) {
          if (timeValue !== null && finalColHora) {
            // We have both date and time columns
            const parsedTime = parseTimeValue(timeValue)
            if (parsedTime) {
              fechaHora = combineDateAndTime(parsedDate, parsedTime)
              rowsWithValidTime++
            } else {
              // Couldn't parse time — use date as-is (might have time embedded)
              fechaHora = parsedDate
              rowsWithZeroHour++
            }
          } else {
            // Date column only — check if it has time info embedded
            // (Excel sometimes stores full datetime in "Fecha" column)
            if (parsedDate.getHours() !== 0 || parsedDate.getMinutes() !== 0) {
              // The date value actually contains time info
              fechaHora = parsedDate
              rowsWithValidTime++
            } else {
              // Date at midnight — we have NO time info
              // Mark as having zero hour so we can handle it later
              fechaHora = parsedDate
              rowsWithZeroHour++
            }
          }
        }
      }

      if (!fechaHora) continue

      allRows.push({ rut, nombre, departamento, fechaHora, tipoRegistro })
    }

    if (allRows.length === 0) {
      return NextResponse.json({
        error: 'No se encontraron registros válidos en el archivo',
        columnMapping,
        diagnostics: {
          columnsFound: allColumnsFound,
          columnMapping,
          sampleRows: jsonData.slice(0, 5),
          parsingNotes: [...parsingNotes, `Filas parseadas: 0 de ${jsonData.length}`],
          dateMode,
        },
      }, { status: 400 })
    }

    // If most rows have zero hour, add a note and try alternative parsing
    if (rowsWithZeroHour > 0 && rowsWithValidTime === 0) {
      parsingNotes.push(
        `⚠️ ${rowsWithZeroHour} filas tienen hora 00:00 (medianoche). ` +
        `Intentando leer valores crudos de fecha/hora...`
      )

      // Try re-reading the Excel WITHOUT cellDates to get raw date values
      // Sometimes cellDates:true converts date+time to date-only at midnight
      const rawWorkbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
      const rawSheet = rawWorkbook.Sheets[rawWorkbook.SheetNames[0]]
      const rawJsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(rawSheet, {
        range: headerRowIndex,
        defval: '',
      })

      // Try to parse raw values — Excel serial numbers contain both date AND time
      let reParsedWithTime = 0
      for (let i = 0; i < allRows.length && i < rawJsonData.length; i++) {
        const rawRow = rawJsonData[i]
        const rawDateVal = finalColFecha ? rawRow[finalColFecha] : (finalColFechaHora ? rawRow[finalColFechaHora] : null)
        const rawTimeVal = finalColHora ? rawRow[finalColHora] : null

        // Try to parse the raw date value as a serial number
        if (typeof rawDateVal === 'number' && rawDateVal > 1) {
          // Excel serial number — contains both date and time
          const parsed = XLSX.SSF.parse_date_code(rawDateVal)
          if (parsed && (parsed.H !== undefined) && (parsed.H > 0 || parsed.M > 0)) {
            allRows[i].fechaHora = new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S || 0)
            reParsedWithTime++
          }
        }

        // If we have a separate time column, try combining
        if (finalColHora && rawTimeVal !== null && rawTimeVal !== '') {
          const parsedTime = parseTimeValue(rawTimeVal)
          if (parsedTime && (parsedTime.hours > 0 || parsedTime.minutes > 0)) {
            const dateOnly = allRows[i].fechaHora
            allRows[i].fechaHora = combineDateAndTime(dateOnly, parsedTime)
            reParsedWithTime++
          }
        }
      }

      if (reParsedWithTime > 0) {
        parsingNotes.push(`✅ Se recuperó hora de ${reParsedWithTime} registros usando lectura cruda del Excel.`)
        rowsWithZeroHour -= reParsedWithTime
        rowsWithValidTime += reParsedWithTime
      } else {
        parsingNotes.push(
          `❌ No se pudo recuperar información de hora. ` +
          `Los registros se procesarán sin detección de atrasos por hora. ` +
          `Solo se detectarán ausencias.`
        )
      }
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
      if (w.rut) workerScheduleMap.set(w.rut, { horaEntrada: w.horaEntrada, horaSalida: w.horaSalida })
      const nameKey = w.nombre.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase()
      if (!workerScheduleMap.has(nameKey)) {
        workerScheduleMap.set(nameKey, { horaEntrada: w.horaEntrada, horaSalida: w.horaSalida })
      }
    }

    // Group entries by RUT + date + shift
    // For each worker+date, find the EARLIEST entrada of the day
    const entryMap = new Map<string, ParsedRow>()
    for (const row of entradaRows) {
      const dateStr = formatDate(row.fechaHora)
      const key = `${row.rut}|${dateStr}`
      const existing = entryMap.get(key)

      // Keep the earliest entry of the day for each worker
      if (!existing || row.fechaHora < existing.fechaHora) {
        entryMap.set(key, row)
      }
    }

    const summary: ImportSummary = {
      totalRecords: allRows.length,
      rowsParsed: allRows.length,
      atrasosFound: 0,
      atrasosCreated: 0,
      ausenciasFound: 0,
      ausenciasCreated: 0,
      workersCreated: 0,
      skipped: 0,
      details: [],
      columnMapping,
      diagnostics: {
        columnsFound: allColumnsFound,
        columnMapping,
        sampleRows: jsonData.slice(0, 3),
        parsingNotes,
        dateMode,
      },
    }

    // Process atrasos — for each worker+date, check if the earliest entry is late
    for (const [key, row] of Array.from(entryMap.entries())) {
      const [rut, dateStr] = key.split('|')
      const entryHour = row.fechaHora.getHours()
      const entryMinute = row.fechaHora.getMinutes()

      // Determine shift based on entry hour
      // IMPORTANT: Night shift workers are NOT skipped anymore!
      let shift: 'morning' | 'afternoon' | 'night'
      if (entryHour >= 5 && entryHour < 12) {
        shift = 'morning'
      } else if (entryHour >= 12 && entryHour < 18) {
        shift = 'afternoon'
      } else {
        shift = 'night'
      }

      // Look up worker's schedule
      const schedule = workerScheduleMap.get(row.rut) ||
        workerScheduleMap.get(row.nombre.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase())
      const threshold = getWorkerThreshold(schedule?.horaEntrada || null)

      let thresholdHour: number
      let thresholdMinute: number

      if (shift === 'morning') {
        thresholdHour = threshold.morningHr
        thresholdMinute = threshold.morningMin
      } else if (shift === 'afternoon') {
        thresholdHour = threshold.afternoonHr
        thresholdMinute = threshold.afternoonMin
      } else {
        // Night shift — use the worker's schedule threshold if available
        // Otherwise use a reasonable default (e.g., 5 minutes after their scheduled start)
        if (schedule?.horaEntrada) {
          const nightEntry = parseTimeToMinutes(schedule.horaEntrada)
          if (nightEntry !== null) {
            const thresholdMin = nightEntry + GRACE_MINUTES
            thresholdHour = Math.floor(thresholdMin / 60)
            thresholdMinute = thresholdMin % 60
          } else {
            // No schedule for night worker — skip atraso detection
            // (can't determine if they're late without knowing their schedule)
            continue
          }
        } else {
          // No schedule configured for night worker — skip
          continue
        }
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
          shift,
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
          reason: `Importado desde registro de asistencia (${shift === 'morning' ? 'turno mañana' : shift === 'afternoon' ? 'turno tarde' : 'turno noche'})`,
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
        shift,
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

    // Add final diagnostics
    summary.diagnostics.parsingNotes.push(
      `Total filas en Excel: ${jsonData.length}`,
      `Filas parseadas: ${allRows.length}`,
      `RUTs únicos: ${targetRuts.size}`,
      `Entradas procesadas: ${entradaRows.length}`,
      `Días hábiles en rango: ${minDate && maxDate ? 'calculados' : 'sin rango'}`,
      `Filas con hora 00:00: ${rowsWithZeroHour}`,
      `Filas con hora válida: ${rowsWithValidTime}`,
      `Trabajadores con horario (NOMINA): ${workerScheduleMap.size}`,
    )

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
