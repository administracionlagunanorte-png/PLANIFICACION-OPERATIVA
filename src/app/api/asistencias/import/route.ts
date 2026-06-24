import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

// ============================================================
// XLS Import for Asistencias Module
// ============================================================
// Parses a biometric clock XLS file and creates ATRASO records
// for workers in 4 specific departments who arrived late.
//
// Morning shift threshold: 08:05 AM
// Afternoon shift threshold: 14:05 (2:05 PM)
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

interface AtrasoDetail {
  rut: string
  nombre: string
  departamento: string
  date: string
  entryTime: string
  shift: 'morning' | 'afternoon'
  minutesLate: number
  action: 'created' | 'skipped_existing' | 'skipped_no_worker'
}

interface ImportSummary {
  totalRecords: number
  atrasosFound: number
  atrasosCreated: number
  workersCreated: number
  skipped: number
  details: AtrasoDetail[]
}

function normalizeRut(rut: string): string {
  // Normalize RUT format: remove extra spaces, ensure consistent format
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
    // Excel serial date number
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return new Date(date.y, date.m - 1, date.d, date.H || 0, date.M || 0, date.S || 0)
    }
  }
  if (typeof value === 'string') {
    // Try parsing date string
    const parsed = new Date(value)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
    }

    // Validate file extension
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xls') && !fileName.endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'El archivo debe ser .xls o .xlsx' },
        { status: 400 }
      )
    }

    // Read the file buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Parse the XLS/XLSX file
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({ error: 'El archivo no contiene hojas' }, { status: 400 })
    }
    const sheet = workbook.Sheets[sheetName]

    // Convert to JSON with header at row 4 (0-indexed row 3)
    // The header row is row 4 in the Excel file, which is index 3
    const jsonData: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      range: 3, // Skip first 3 rows (0-indexed), so data starts from row 4
      defval: '',
    })

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'El archivo no contiene datos' }, { status: 400 })
    }

    // Find column names (they might have slight variations)
    const firstRow = jsonData[0]
    const columns = Object.keys(firstRow)

    // Try to find the matching columns (case-insensitive, trimmed)
    const findColumn = (target: string): string | null => {
      const normalized = target.trim().toLowerCase()
      return columns.find(c => c.trim().toLowerCase() === normalized) || null
    }

    const colDepartamento = findColumn(COL_DEPARTAMENTO)
    const colRut = findColumn(COL_RUT)
    const colNombre = findColumn(COL_NOMBRE)
    const colFechaHora = findColumn(COL_FECHA_HORA)
    const colTipoRegistro = findColumn(COL_TIPO_REGISTRO)

    if (!colDepartamento || !colRut || !colNombre || !colFechaHora || !colTipoRegistro) {
      return NextResponse.json({
        error: 'El archivo no tiene las columnas requeridas. Se esperan: Departamento, RUT, Nombre, Fecha/Hora, Tipo registro',
        foundColumns: columns,
      }, { status: 400 })
    }

    // Parse all rows
    const parsedRows: ParsedRow[] = []
    for (const row of jsonData) {
      const departamento = String(row[colDepartamento] || '').trim()
      const rut = normalizeRut(String(row[colRut] || ''))
      const nombre = String(row[colNombre] || '').trim()
      const tipoRegistro = String(row[colTipoRegistro] || '').trim()

      // Skip if not a target department
      if (!isTargetDepartment(departamento)) continue

      // Skip if not an "Entrada" record
      if (tipoRegistro.toLowerCase() !== 'entrada') continue

      // Parse the date/time
      const fechaHora = parseExcelDate(row[colFechaHora])
      if (!fechaHora) continue

      parsedRows.push({
        codigo: String(row[findColumn(COL_CODIGO) || ''] || '').trim(),
        rut,
        nombre,
        departamento,
        fechaHora,
        tipoRegistro,
      })
    }

    // Group entries by RUT + date to find first entry per shift
    // Key: "RUT|YYYY-MM-DD|shift"
    const entryMap = new Map<string, ParsedRow>()

    for (const row of parsedRows) {
      const dateStr = row.fechaHora.toISOString().split('T')[0]
      const hour = row.fechaHora.getHours()

      // Determine shift: morning (before 12:00) or afternoon (12:00-18:00)
      let shift: 'morning' | 'afternoon'
      if (hour < 12) {
        shift = 'morning'
      } else if (hour < 18) {
        shift = 'afternoon'
      } else {
        // Evening/night shift - skip
        continue
      }

      const key = `${row.rut}|${dateStr}|${shift}`
      const existing = entryMap.get(key)

      if (!existing || row.fechaHora < existing.fechaHora) {
        entryMap.set(key, row)
      }
    }

    // Check each first entry for atraso
    const summary: ImportSummary = {
      totalRecords: parsedRows.length,
      atrasosFound: 0,
      atrasosCreated: 0,
      workersCreated: 0,
      skipped: 0,
      details: [],
    }

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

      // Check if late
      const entryTotalMinutes = entryHour * 60 + entryMinute
      const thresholdTotalMinutes = thresholdHour * 60 + thresholdMinute

      if (entryTotalMinutes <= thresholdTotalMinutes) {
        // On time, not an atraso
        continue
      }

      const minutesLate = entryTotalMinutes - thresholdTotalMinutes
      summary.atrasosFound++

      // Find or create worker by RUT
      let worker = await db.worker.findFirst({
        where: { rut: row.rut },
      })

      if (!worker) {
        // Try with normalized RUT variations
        const rutVariations = [
          row.rut,
          row.rut.replace(/\./g, ''),  // Without dots
          row.rut.replace(/-/g, '.'),  // Dash to dot
        ]

        for (const rutVar of rutVariations) {
          worker = await db.worker.findFirst({
            where: { rut: rutVar },
          })
          if (worker) break
        }
      }

      if (!worker) {
        // Create new worker
        worker = await db.worker.create({
          data: {
            nombre: row.nombre,
            rut: row.rut,
            cuentaBancaria: '',
          },
        })
        summary.workersCreated++
      }

      // Check if an AsistenciaRecord already exists for this worker+date+type
      const dateStart = new Date(dateStr + 'T00:00:00.000Z')
      const dateEnd = new Date(dateStr + 'T23:59:59.999Z')

      const existingRecord = await db.asistenciaRecord.findFirst({
        where: {
          workerId: worker.id,
          date: {
            gte: dateStart,
            lte: dateEnd,
          },
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
          entryTime: `${String(entryHour).padStart(2, '0')}:${String(entryMinute).padStart(2, '0')}`,
          shift: shift as 'morning' | 'afternoon',
          minutesLate,
          action: 'skipped_existing',
        })
        continue
      }

      // Create the ATRASO record
      await db.asistenciaRecord.create({
        data: {
          workerId: worker.id,
          date: new Date(dateStr + 'T12:00:00.000Z'), // Use noon to avoid timezone issues
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
        entryTime: `${String(entryHour).padStart(2, '0')}:${String(entryMinute).padStart(2, '0')}`,
        shift: shift as 'morning' | 'afternoon',
        minutesLate,
        action: 'created',
      })
    }

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
