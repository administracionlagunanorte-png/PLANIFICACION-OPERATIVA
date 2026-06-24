import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

// ============================================================
// Setup endpoint — Syncs Prisma schema to the database
// Call this after deployment to ensure DB columns are up to date
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const output = execSync('npx prisma db push --accept-data-loss 2>&1', {
      encoding: 'utf-8',
      timeout: 60000,
      env: { ...process.env },
    })

    return NextResponse.json({
      success: true,
      message: 'Schema sincronizado correctamente',
      output: output.slice(-500),
    })
  } catch (error: any) {
    console.error('Error syncing schema:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Error al sincronizar schema',
      output: error.stdout?.slice(-500) || '',
    }, { status: 500 })
  }
}
