import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_CATEGORIES = [
  { name: 'Alimentación', icon: '🍽️' },
  { name: 'Transporte', icon: '🚗' },
  { name: 'Alojamiento', icon: '🏨' },
  { name: 'Materiales', icon: '🔧' },
  { name: 'Oficina', icon: '🏢' },
  { name: 'Capacitación', icon: '📚' },
  { name: 'Servicios', icon: '⚙️' },
  { name: 'Otro', icon: '📦' },
]

// GET /api/expense-categories — list all, auto-seed defaults if empty
export async function GET() {
  try {
    let categories = await db.expenseCategory.findMany({
      orderBy: { name: 'asc' },
    })

    // Auto-seed default categories if table is empty
    if (categories.length === 0) {
      await db.expenseCategory.createMany({
        data: DEFAULT_CATEGORIES,
        skipDuplicates: true,
      })
      categories = await db.expenseCategory.findMany({
        orderBy: { name: 'asc' },
      })
    }

    return NextResponse.json({ data: categories })
  } catch (error) {
    console.error('[EXPENSE_CATEGORIES_GET]', error)
    return NextResponse.json({ error: 'Error al obtener categorías de gastos' }, { status: 500 })
  }
}

// POST /api/expense-categories — create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, icon } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    // Check for duplicate name
    const existing = await db.expenseCategory.findUnique({
      where: { name: name.trim() },
    })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 })
    }

    const category = await db.expenseCategory.create({
      data: {
        name: name.trim(),
        icon: icon?.trim() || '📦',
      },
    })

    return NextResponse.json({ data: category }, { status: 201 })
  } catch (error) {
    console.error('[EXPENSE_CATEGORIES_POST]', error)
    return NextResponse.json({ error: 'Error al crear categoría de gasto' }, { status: 500 })
  }
}
