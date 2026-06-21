import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// GET /api/categories - List all categories
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para continuar." },
        { status: 401 }
      )
    }

    const categories = await db.category.findMany({
      orderBy: { name: "asc" },
    })

    // Auto-seed if no categories exist
    if (categories.length === 0) {
      const defaultCategories = [
        { name: "Alimentación", icon: "🍽️" },
        { name: "Transporte", icon: "🚗" },
        { name: "Alojamiento", icon: "🏨" },
        { name: "Entretenimiento", icon: "🎭" },
        { name: "Oficina", icon: "🏢" },
        { name: "Capacitación", icon: "📚" },
        { name: "Otro", icon: "📦" },
      ]

      await db.category.createMany({ data: defaultCategories })

      const seeded = await db.category.findMany({ orderBy: { name: "asc" } })
      return NextResponse.json(seeded)
    }

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error al obtener categorías:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al obtener categorías" },
      { status: 500 }
    )
  }
}

// POST /api/categories - Create a new category (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para continuar." },
        { status: 401 }
      )
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo un administrador puede crear categorías" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, icon } = body

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "El nombre de la categoría es requerido" },
        { status: 400 }
      )
    }

    // Check for duplicate
    const existing = await db.category.findUnique({
      where: { name: name.trim() },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese nombre" },
        { status: 409 }
      )
    }

    const category = await db.category.create({
      data: {
        name: name.trim(),
        icon: icon || "📦",
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error("Error al crear categoría:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al crear categoría" },
      { status: 500 }
    )
  }
}
