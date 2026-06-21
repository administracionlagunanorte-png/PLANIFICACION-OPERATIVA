import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// PUT /api/categories/[id] - Update a category (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: "Solo un administrador puede editar categorías" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, icon } = body

    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      )
    }

    // Check for duplicate name (if changing name)
    if (name && name.trim() !== existing.name) {
      const duplicate = await db.category.findUnique({
        where: { name: name.trim() },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: "Ya existe una categoría con ese nombre" },
          { status: 409 }
        )
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (icon !== undefined) updateData.icon = icon

    // If name changed, also update all expense items with the old category name
    if (name && name.trim() !== existing.name) {
      await db.expenseItem.updateMany({
        where: { category: existing.name },
        data: { category: name.trim() },
      })
    }

    const category = await db.category.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error("Error al actualizar categoría:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al actualizar categoría" },
      { status: 500 }
    )
  }
}

// DELETE /api/categories/[id] - Delete a category (admin only, check if in use)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: "Solo un administrador puede eliminar categorías" },
        { status: 403 }
      )
    }

    const { id } = await params

    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      )
    }

    // Check if category is in use
    const itemsUsingCategory = await db.expenseItem.count({
      where: { category: existing.name },
    })

    if (itemsUsingCategory > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar la categoría "${existing.name}" porque está siendo usada en ${itemsUsingCategory} gasto(s). Cambie la categoría de esos gastos primero.` },
        { status: 400 }
      )
    }

    await db.category.delete({ where: { id } })

    return NextResponse.json({ message: "Categoría eliminada exitosamente" })
  } catch (error) {
    console.error("Error al eliminar categoría:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al eliminar categoría" },
      { status: 500 }
    )
  }
}
