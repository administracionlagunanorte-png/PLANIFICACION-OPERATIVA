import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

// ============================================================
// XLS Import for Asistencias Module
// ============================================================
// Parses a biometric clock XLS file and creates:
//   - ATRASO records for workers who arrived late
//   - AUSENCIA records for workers with no entry on work days (Mon-Sat)
//
// Morning shift threshold: 08:05 AM
// Afternoon shift threshold: 14:05 (2:05 PM)
//
// Work days: Lunes a Sábado (no Sunday)
//
// Target departments only:
// - Auxiliares de Aseo
// - Auxiliares de Servicios Generales
// - Encargados de Laguna
// - Mantenimiento
// ============================================================

const TARGET_DEPARTMENTS = [
  'Auxiliares de Aseo',
  'Auxiliares de Servicios Generales',
  'Encargados de Laguna',
  'Mantenimiento',
]

// Column names expected in the XLS file
const COL_CODIGO = 'Código'
const COL_RUT = 'RUT'
const COL_NOMBRE = 'Nombre'
const COL_SUCURSAL = 'Sucursal'
const COL_DEPARTAMENTO = 'Departamento'
const COL_RELOJ = 'Reloj'
const COL_FECHA_HORA = 'Fecha/Hora'
const COL_TIPO_REGISTRO = 'Tipo registro'
const COL_DIRECCION = 'Dirección'
const COL_ESTADO = 'Estado'
const COL_CHECKSUM = 'Checksum'

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
    if (!fileName.endsWith('.xls') && !fileName.endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'El archivo debe ser .xls o .xlsx' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Parse the XLS/XLSX file
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({ error: 'El archivo no contiene hojas' }, { status: 400 })
    }
    const sheet = workbook.Sheets[sheetName]

    // Auto-detect the header row by scanning rows for required columns
    const REQUIRED_COLS = [COL_DEPARTAMENTO, COL_RUT, COL_NOMBRE, COL_FECHA_HORA, COL_TIPO_REGISTRO]
    let headerRowIndex = -1
    let jsonData: Record<string, unknown>[] = []

    for (let rangeAttempt = 0; rangeAttempt <= 10; rangeAttempt++) {
      const tryData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
        range: rangeAttempt,
        defval: '',
      })

      if (tryData.length === 0) continue

      const columns = Object.keys(tryData[0])
      const findCol = (target: string): string | null => {
        const normalized = target.trim().toLowerCase()
        return columns.find(c => c.trim().toLowerCase() === normalized) || null
      }

      const allFound = REQUIRED_COLS.every(col => findCol(col) !== null)

      if (allFound) {
        headerRowIndex = rangeAttempt
        jsonData = tryData
        break
      }
    }

    if (headerRowIndex === -1 || jsonData.length === 0) {
      return NextResponse.json({
        error: 'El archivo no tiene las columnas requeridas. Se esperan: Departamento, RUT, Nombre, Fecha/Hora, Tipo registro',
      }, { status: 400 })
    }

    // Find column names
    const firstRow = jsonData[0]
    const columns = Object.keys(firstRow)

    const findColumn = (target: string): string | null => {
      const normalized = target.trim().toLowerCase()
      return columns.find(c => c.trim().toLowerCase() === normalized) || null
    }

    const colDepartamento = findColumn(COL_DEPARTAMENTO)!
    const colRut = findColumn(COL_RUT)!
    const colNombre = findColumn(COL_NOMBRE)!
    const colFechaHora = findColumn(COL_FECHA_HORA)!
    const colTipoRegistro = findColumn(COL_TIPO_REGISTRO)!
    const colCodigo = findColumn(COL_CODIGO)

    // ============================================================
    // STEP 1: Parse ALL rows from target departments (Entrada + Salida)
    // ============================================================
    const allTargetRows: ParsedRow[] = []
    for (const row of jsonData) {
      const departamento = String(row[colDepartamento] || '').trim()
      if (!isTargetDepartment(departamento)) continue

      const rut = normalizeRut(String(row[colRut] || ''))
      const nombre = String(row[colNombre] || '').trim()
      const tipoRegistro = String(row[colTipoRegistro] || '').trim()
      const fechaHora = parseExcelDate(row[colFechaHora])

      if (!fechaHora) continue
      if (!rut) continue

      allTargetRows.push({
        codigo: String(row[colCodigo || ''] || '').trim(),
        rut,
        nombre,
        departamento,
        fechaHora,
        tipoRegistro,
      })
    }

    // ============================================================
    // STEP 2: Build set of all dates and workers present per day
    // Key: "RUT|YYYY-MM-DD" → Set of tipoRegistro values
    // ============================================================
    const workerDayEntries = new Map<string, Set<string>>() // "RUT|date" → Set of "Entrada"/"Salida"
    const workerInfo = new Map<string, { nombre: string; departamento: string }>() // RUT → info
    let minDate: Date | null = null
    let maxDate: Date | null = null

    for (const row of allTargetRows) {
      const dateStr = formatDate(row.fechaHora)
      const key = `${row.rut}|${dateStr}`

      if (!workerDayEntries.has(key)) {
        workerDayEntries.set(key, new Set())
      }
      workerDayEntries.get(key)!.add(row.tipoRegistro.toLowerCase())

      workerInfo.set(row.rut, { nombre: row.nombre, departamento: row.departamento })

      // Track date range
      if (!minDate || row.fechaHora < minDate) minDate = row.fechaHora
      if (!maxDate || row.fechaHora > maxDate) maxDate = row.fechaHora
    }

    // Get unique RUTs of target department workers
    const targetRuts = new Set(allTargetRows.map(r => r.rut))

    // Get unique dates where target department workers had any record
    const allDates = new Set<string>()
    for (const row of allTargetRows) {
      allDates.add(formatDate(row.fechaHora))
    }

    // ============================================================
    // STEP 3: Detect ATRASOS from Entrada records
    // ============================================================
    const entradaRows = allTargetRows.filter(r => r.tipoRegistro.toLowerCase() === 'entrada')

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
    // For each worker in target departments and each work day in the
    // date range, if there's NO "entrada" record, register AUSENCIA.
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
