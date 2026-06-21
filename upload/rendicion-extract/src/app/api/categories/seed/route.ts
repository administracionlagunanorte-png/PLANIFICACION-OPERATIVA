import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// POST /api/categories/seed - Seed default categories if none exist
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para continuar." },
        { status: 401 }
      )
    }

    // Only admin can seed
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo un administrador puede inicializar categorías" },
        { status: 403 }
      )
    }

    const existingCategories = await db.category.count()

    if (existingCategories > 0) {
      return NextResponse.json({ message: "Las categorías ya existen", count: existingCategories })
    }

    const defaultCategories = [
      { name: "Alimentación", icon: "🍽️" },
      { name: "Transporte", icon: "🚗" },
      { name: "Alojamiento", icon: "🏨" },
      { name: "Entretenimiento", icon: "🎭" },
      { name: "Oficina", icon: "🏢" },
      { name: "Capacitación", icon: "📚" },
      { name: "Otro", icon: "📦" },
    ]

    const created = await db.category.createMany({
      data: defaultCategories,
    })

    return NextResponse.json({ message: "Categorías creadas exitosamente", count: created.count })
  } catch (error) {
    console.error("Error al crear categorías por defecto:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al crear categorías" },
      { status: 500 }
    )
  }
}
