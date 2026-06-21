import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// POST /api/items - Crear nuevo item de gasto
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para continuar." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      description,
      numeroBoleta,
      montoRendir,
      category,
      expenseDate,
      imageBoletaUrl,
      imageCompraUrl,
      reportId,
    } = body
    const userId = session.user.id
    const userRole = session.user.role

    // Validaciones
    if (!description || description.trim() === "") {
      return NextResponse.json(
        { error: "La descripción del gasto es requerida" },
        { status: 400 }
      )
    }

    if (!numeroBoleta || numeroBoleta.trim() === "") {
      return NextResponse.json(
        { error: "El número de boleta es requerido" },
        { status: 400 }
      )
    }

    if (!montoRendir || montoRendir <= 0) {
      return NextResponse.json(
        { error: "El monto a rendir debe ser mayor a 0" },
        { status: 400 }
      )
    }

    if (!category || category.trim() === "") {
      return NextResponse.json(
        { error: "La categoría es requerida" },
        { status: 400 }
      )
    }

    if (!expenseDate) {
      return NextResponse.json(
        { error: "La fecha del gasto es requerida" },
        { status: 400 }
      )
    }

    if (!imageBoletaUrl || imageBoletaUrl.trim() === "") {
      return NextResponse.json(
        { error: "La foto de la boleta es requerida" },
        { status: 400 }
      )
    }

    if (!imageCompraUrl || imageCompraUrl.trim() === "") {
      return NextResponse.json(
        { error: "La foto de la compra es requerida" },
        { status: 400 }
      )
    }

    if (!reportId) {
      return NextResponse.json(
        { error: "El ID del reporte es requerido" },
        { status: 400 }
      )
    }

    // Verificar que el reporte existe y pertenece al usuario
    const report = await db.expenseReport.findUnique({
      where: { id: reportId },
      include: { items: true },
    })

    if (!report) {
      return NextResponse.json(
        { error: "Reporte no encontrado" },
        { status: 404 }
      )
    }

    // Solo el dueño o admin puede agregar items
    if (report.userId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para agregar gastos a este reporte" },
        { status: 403 }
      )
    }

    // Solo se pueden agregar items a reportes en BORRADOR, MODIFICACIÓN SOLICITADA, o APROBADO (solo admin)
    const allowedStatuses = ["DRAFT", "MODIFICATION_REQUESTED"]
    if (userRole === "ADMIN") allowedStatuses.push("APPROVED")
    if (!allowedStatuses.includes(report.status)) {
      return NextResponse.json(
        { error: "Solo se pueden agregar gastos a reportes en borrador, con modificación solicitada, o aprobados (solo admin)" },
        { status: 400 }
      )
    }

    const montoRendirValue = parseFloat(montoRendir)

    // Crear item
    const item = await db.expenseItem.create({
      data: {
        description: description.trim(),
        numeroBoleta: numeroBoleta.trim(),
        montoRendir: montoRendirValue,
        category: category.trim(),
        expenseDate: new Date(expenseDate),
        imageBoletaUrl,
        imageCompraUrl,
        reportId,
      },
    })

    // Actualizar monto total del reporte (using montoRendir)
    const newTotal = report.totalAmount + montoRendirValue
    await db.expenseReport.update({
      where: { id: reportId },
      data: { totalAmount: newTotal },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error("Error al crear item de gasto:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al crear item de gasto" },
      { status: 500 }
    )
  }
}
