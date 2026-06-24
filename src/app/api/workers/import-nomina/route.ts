import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

// ============================================================
// NOMINA Import — Load worker schedules from roster file
// ============================================================
// Parses a NOMINA Excel file with columns:
//   Colaborador, RUT/Pasaporte, Cargo actual,
//   Horas pactadas semanales o diarias, turno a, turno b
//
// Creates/updates Worker records with schedule info.
// Extracts expected entry time from turno A for late detection.
// ============================================================

// Parse a schedule string to extract the entry time
// Examples:
//   "Lunes a Viernes de 07:00 a 15:00" → "07:00"
//   "TURNO 4 X 4 - 19:00 A 07:00 HRS" → "19:00"
//   "Lun a Miercoles: 08:00 a 18:00" → "08:00"
//   "Lunes -Jueves 08:00 a 18 hrs" → "08:00"
//   "Normal: Lun-MIER:09:00 a 18:30" → "09:00"
function extractEntryTime(scheduleStr: string): string | null {
  if (!scheduleStr || scheduleStr.trim() === '') return null

  const s = scheduleStr.trim()

  // Try to find a time pattern like "07:00", "08:00", "19:00" etc.
  // Look for the FIRST time mentioned after common separators
  const patterns = [
    // "de HH:MM a" or "de HH:MM a HH:MM"
    /de\s+(\d{1,2}:\d{2})\s+a/i,
    // "HH:MM a HH:MM" or "HH:MM a HH hrs"
    /(\d{1,2}:\d{2})\s+a\s+\d{1,2}/i,
    // "A HH:MM HRS" (for night shifts like "4X4 - 19:00 A 07:00")
    /-\s+(\d{1,2}:\d{2})\s+A/i,
    // "HH:MM a" at start of meaningful content
    /[:\s](\d{1,2}:\d{2})\s+a/i,
    // Direct time after colon "Miercoles: 08:00"
    /:\s*(\d{1,2}:\d{2})/i,
  ]

  for (const pattern of patterns) {
    const match = s.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  // Fallback: find first time-like pattern
  const fallbackMatch = s.match(/(\d{1,2}:\d{2})/)
  if (fallbackMatch) return fallbackMatch[1]

  return null
}

// Parse schedule string to extract exit time
function extractExitTime(scheduleStr: string): string | null {
  if (!scheduleStr || scheduleStr.trim() === '') return null

  const s = scheduleStr.trim()

  // Find the LAST time mentioned (after "a" separator)
  const patterns = [
    /a\s+(\d{1,2}:\d{2})\s*(?:hrs|hr|$)/i,
    /a\s+(\d{1,2}:\d{2})/i,
  ]

  for (const pattern of patterns) {
    const matches = [...s.matchAll(new RegExp(pattern.source, 'gi'))]
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1]
      if (lastMatch[1]) return lastMatch[1]
    }
  }

  // Fallback: find last time-like pattern
  const allTimes = [...s.matchAll(/(\d{1,2}:\d{2})/g)]
  if (allTimes.length >= 2) return allTimes[allTimes.length - 1][1]

  return null
}

// Flexible column name matching
const COLUMN_VARIATIONS: Record<string, string[]> = {
  colaborador: [
    'colaborador',
    'nombre',
    'name',
    'nombres',
    'nombre completo',
    'trabajador',
    'empleado',
    'funcionario',
    'persona',
    'nombre y apellido',
    'apellido y nombre',
  ],
  rut: [
    'rut/pasaporte',
    'rut',
    'r.u.t',
    'run',
    'cedula',
    'cédula',
    'ci',
    'documento',
    'número documento',
    'id',
    'identificación',
  ],
  cargo: [
    'cargo actual',
    'cargo',
    'posición',
    'posicion',
    'puesto',
    'rol',
    'departamento',
    'department',
    'depto',
    'área',
    'area',
    'función',
    'funcion',
  ],
  horas: [
    'horas pactadas semanales o diarias',
    'horas pactadas',
    'horas semanales',
    'horas diarias',
    'horas',
    'hours',
  ],
  turnoA: [
    'turno a',
    'turno_a',
    'turnoa',
    'turno',
    'horario a',
    'horario_a',
    'horario',
    'schedule',
  ],
  turnoB: [
    'turno b',
    'turno_b',
    'turnob',
    'horario b',
    'horario_b',
  ],
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
    const normalizedVariant = variant.replace(/[_\-\.\/]/g, ' ').replace(/\s+/g, ' ').trim()

    const exactMatch = normalizedColumns.find(c => c.normalized === normalizedVariant)
    if (exactMatch) return exactMatch.original

    const containsMatch = normalizedColumns.find(c =>
      c.normalized.includes(normalizedVariant) || normalizedVariant.includes(c.normalized)
    )
    if (containsMatch) return containsMatch.original
  }

  return null
}

function normalizeRut(rut: string): string {
  return rut.trim().replace(/\s+/g, '')
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
    let headerRowIndex = -1
    let jsonData: Record<string, unknown>[] = []
    let colMapping: Record<string, string> = {}

    for (let rangeAttempt = 0; rangeAttempt <= 10; rangeAttempt++) {
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

      // Need at least colaborador (nombre) to identify workers
      if (mapping.colaborador) {
        headerRowIndex = rangeAttempt
        jsonData = tryData
        for (const [key, val] of Object.entries(mapping)) {
          if (val) colMapping[key] = val
        }
        break
      }
    }

    if (headerRowIndex === -1 || jsonData.length === 0) {
      return NextResponse.json({
        error: 'No se pudieron identificar las columnas. Se necesita al menos una columna de Nombre/Colaborador.',
      }, { status: 400 })
    }

    const colColaborador = colMapping['colaborador']!
    const colRut = colMapping['rut'] || null
    const colCargo = colMapping['cargo'] || null
    const colTurnoA = colMapping['turnoA'] || null
    const colTurnoB = colMapping['turnoB'] || null

    let workersCreated = 0
    let workersUpdated = 0
    let skipped = 0

    for (const row of jsonData) {
      const nombre = String(row[colColaborador] || '').trim()
      if (!nombre) continue

      const rut = colRut ? normalizeRut(String(row[colRut] || '')) : ''
      const cargo = colCargo ? String(row[colCargo] || '').trim() : ''
      const turnoA = colTurnoA ? String(row[colTurnoA] || '').trim() : ''
      const turnoB = colTurnoB ? String(row[colTurnoB] || '').trim() : ''

      // Extract entry/exit times from turno A (primary shift)
      const horaEntrada = extractEntryTime(turnoA)
      const horaSalida = extractExitTime(turnoA)

      // Find or create worker by RUT first, then by name
      let worker = null

      if (rut) {
        worker = await db.worker.findFirst({
          where: { rut },
        })
      }

      if (!worker && nombre) {
        // Try to find by name (in case RUT format differs)
        worker = await db.worker.findFirst({
          where: { nombre: { contains: nombre.split(' ').slice(0, 2).join(' '), mode: 'insensitive' } },
        })
      }

      if (worker) {
        await db.worker.update({
          where: { id: worker.id },
          data: {
            cargo: cargo || worker.cargo,
            turnoA: turnoA || worker.turnoA,
            turnoB: turnoB || worker.turnoB,
            horaEntrada: horaEntrada || worker.horaEntrada,
            horaSalida: horaSalida || worker.horaSalida,
            nombre: nombre || worker.nombre,
            ...(rut ? { rut } : {}),
          },
        })
        workersUpdated++
      } else {
        await db.worker.create({
          data: {
            nombre,
            rut: rut || `SIN-RUT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            cuentaBancaria: '',
            cargo,
            turnoA,
            turnoB,
            horaEntrada,
            horaSalida,
          },
        })
        workersCreated++
      }
    }

    return NextResponse.json({
      total: jsonData.length,
      workersCreated,
      workersUpdated,
      columnMapping: colMapping,
    }, { status: 200 })
  } catch (error) {
    console.error('Error importing NOMINA:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: `Error al procesar la nómina: ${message}` },
      { status: 500 }
    )
  }
}
