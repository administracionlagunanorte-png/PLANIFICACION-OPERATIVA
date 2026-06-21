import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// PUT /api/items/[id] - Actualizar un item de gasto
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

    const { id } = await params
    const body = await request.json()
    const {
      description,
      numeroBoleta,
      montoRendir,
      category,
      expenseDate,
      imageBoletaUrl,
      imageCompraUrl,
    } = body
    const userId = session.user.id
    const userRole = session.user.role

    // Verificar que el item existe
    const existingItem = await db.expenseItem.findUnique({
      where: { id },
      include: { report: true },
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: "Item de gasto no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos
    if (existingItem.report.userId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para editar este gasto" },
        { status: 403 }
      )
    }

    // Solo se puede editar si el reporte está en BORRADOR, MODIFICACIÓN SOLICITADA, o si es admin y está APROBADO
    const allowedStatuses = ["DRAFT", "MODIFICATION_REQUESTED"]
    if (userRole === "ADMIN") allowedStatuses.push("APPROVED")
    if (!allowedStatuses.includes(existingItem.report.status)) {
      return NextResponse.json(
        { error: "Solo se pueden editar gastos de reportes en borrador, con modificación solicitada, o aprobados (solo admin)" },
        { status: 400 }
      )
    }

    // Validar monto a rendir si se proporciona
    if (montoRendir !== undefined && montoRendir <= 0) {
      return NextResponse.json(
        { error: "El monto a rendir debe ser mayor a 0" },
        { status: 400 }
      )
    }

    // If montoRendir is provided, use it
    const montoRendirValue = montoRendir !== undefined ? parseFloat(montoRendir) : existingItem.montoRendir

    // Calcular diferencia de monto para actualizar total del reporte
    const oldMontoRendir = existingItem.montoRendir
    const newMontoRendir = montoRendirValue

    // Actualizar item
    const updateData: any = {}
    if (description !== undefined) updateData.description = description.trim()
    if (montoRendir !== undefined) {
      updateData.montoRendir = montoRendirValue
    }
    if (numeroBoleta !== undefined) updateData.numeroBoleta = numeroBoleta.trim()
    if (category !== undefined) updateData.category = category.trim()
    if (expenseDate !== undefined) updateData.expenseDate = new Date(expenseDate)
    if (imageBoletaUrl !== undefined) updateData.imageBoletaUrl = imageBoletaUrl
    if (imageCompraUrl !== undefined) updateData.imageCompraUrl = imageCompraUrl

    const item = await db.expenseItem.update({
      where: { id },
      data: updateData,
    })

    // Actualizar monto total del reporte (using montoRendir)
    if (newMontoRendir !== oldMontoRendir) {
      await db.expenseReport.update({
        where: { id: existingItem.reportId },
        data: {
          totalAmount: existingItem.report.totalAmount - oldMontoRendir + newMontoRendir,
        },
      })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error("Error al actualizar item de gasto:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al actualizar item de gasto" },
      { status: 500 }
    )
  }
}

// DELETE /api/items/[id] - Eliminar un item de gasto
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

    const { id } = await params
    const userId = session.user.id
    const userRole = session.user.role

    // Verificar que el item existe
    const existingItem = await db.expenseItem.findUnique({
      where: { id },
      include: { report: true },
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: "Item de gasto no encontrado" },
        { status: 404 }
      )
    }

    // Verificar permisos
    if (existingItem.report.userId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para eliminar este gasto" },
        { status: 403 }
      )
    }

    // Solo se puede eliminar si el reporte está en BORRADOR, MODIFICACIÓN SOLICITADA, o si es admin y está APROBADO
    const allowedStatuses = ["DRAFT", "MODIFICATION_REQUESTED"]
    if (userRole === "ADMIN") allowedStatuses.push("APPROVED")
    if (!allowedStatuses.includes(existingItem.report.status)) {
      return NextResponse.json(
        { error: "Solo se pueden eliminar gastos de reportes en borrador, con modificación solicitada, o aprobados (solo admin)" },
        { status: 400 }
      )
    }

    // Eliminar item
    await db.expenseItem.delete({
      where: { id },
    })

    // Actualizar monto total del reporte (using montoRendir)
    await db.expenseReport.update({
      where: { id: existingItem.reportId },
      data: {
        totalAmount: existingItem.report.totalAmount - existingItem.montoRendir,
      },
    })

    return NextResponse.json({ message: "Gasto eliminado exitosamente" })
  } catch (error) {
    console.error("Error al eliminar item de gasto:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al eliminar item de gasto" },
      { status: 500 }
    )
  }
}
