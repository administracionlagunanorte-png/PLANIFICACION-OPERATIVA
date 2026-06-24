import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================================
// Setup endpoint — Ensures all new columns exist in the database
// Uses raw SQL ALTER TABLE which is reliable on Vercel/PostgreSQL
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const results: string[] = []

    const columns = [
      { name: 'cargo', type: 'TEXT' },
      { name: 'turnoA', type: 'TEXT' },
      { name: 'turnoB', type: 'TEXT' },
      { name: 'horaEntrada', type: 'TEXT' },
      { name: 'horaSalida', type: 'TEXT' },
    ]

    for (const col of columns) {
      try {
        await db.$executeRawUnsafe(
          `ALTER TABLE workers ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}`
        )
        results.push(`✓ Columna "${col.name}" verificada`)
      } catch (err: any) {
        results.push(`⚠ Columna "${col.name}": ${err.message?.slice(0, 100)}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Schema sincronizado',
      details: results,
    })
  } catch (error: any) {
    console.error('Error syncing schema:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al sincronizar schema',
    }, { status: 500 })
  }
}
