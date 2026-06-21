import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// GET /api/reports/[id] - Obtener un reporte por ID
export async function GET(
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
    const userRole = session.user.role
    const userId = session.user.id

    const report = await db.expenseReport.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        items: {
          orderBy: { createdAt: "asc" }
        }
      }
    })

    if (!report) {
      return NextResponse.json(
        { error: "Reporte no encontrado" },
        { status: 404 }
      )
    }

    // Los usuarios normales solo pueden ver sus propios reportes
    if (userRole !== "ADMIN" && report.userId !== userId) {
      return NextResponse.json(
        { error: "No tiene permisos para ver este reporte" },
        { status: 403 }
      )
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("Error al obtener reporte:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al obtener reporte" },
      { status: 500 }
    )
  }
}

// PUT /api/reports/[id] - Actualizar un reporte
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
    const { title, description } = body
    const userRole = session.user.role
    const userId = session.user.id

    // Verificar que el reporte existe
    const existingReport = await db.expenseReport.findUnique({
      where: { id }
    })

    if (!existingReport) {
      return NextResponse.json(
        { error: "Reporte no encontrado" },
        { status: 404 }
      )
    }

    // Solo el dueño puede editar (y solo si está en BORRADOR o MODIFICACIÓN SOLICITADA)
    // Admin puede editar también reportes APROBADOS
    if (existingReport.userId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para editar este reporte" },
        { status: 403 }
      )
    }

    // Solo se puede editar si está en BORRADOR, MODIFICACIÓN SOLICITADA, o APROBADO (solo admin)
    const allowedStatuses = ["DRAFT", "MODIFICATION_REQUESTED"]
    if (userRole === "ADMIN") allowedStatuses.push("APPROVED")
    if (!allowedStatuses.includes(existingReport.status)) {
      return NextResponse.json(
        { error: "Solo se pueden editar reportes en borrador, con modificación solicitada, o aprobados (solo admin)" },
        { status: 400 }
      )
    }

    // Validar título si se proporciona
    if (title !== undefined) {
      if (title.trim() === "") {
        return NextResponse.json(
          { error: "El título no puede estar vacío" },
          { status: 400 }
        )
      }
      if (title.length > 200) {
        return NextResponse.json(
          { error: "El título no puede exceder los 200 caracteres" },
          { status: 400 }
        )
      }
    }

    // Actualizar reporte
    const updateData: any = {}
    if (title !== undefined) updateData.title = title.trim()
    if (description !== undefined) updateData.description = description?.trim() || null

    const report = await db.expenseReport.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        items: {
          orderBy: { createdAt: "asc" }
        }
      }
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error("Error al actualizar reporte:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al actualizar reporte" },
      { status: 500 }
    )
  }
}

// PATCH /api/reports/[id] - Cambiar estado del reporte
export async function PATCH(
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
    const { status, reviewNote } = body
    const userRole = session.user.role
    const userId = session.user.id

    // Validar estado
    const validStatuses = ["SUBMITTED", "APPROVED", "REJECTED", "MODIFICATION_REQUESTED"]
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Estado inválido. Estados válidos: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    // Verificar que el reporte existe
    const existingReport = await db.expenseReport.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!existingReport) {
      return NextResponse.json(
        { error: "Reporte no encontrado" },
        { status: 404 }
      )
    }

    // Admin auto-aprobación: si el admin envía su propio reporte, se aprueba automáticamente
    const isAdminOwnReport = existingReport.userId === userId && userRole === "ADMIN"

    // Validar transiciones de estado
    if (status === "SUBMITTED") {
      // Solo el dueño puede enviar
      if (existingReport.userId !== userId) {
        return NextResponse.json(
          { error: "Solo el dueño del reporte puede enviarlo para revisión" },
          { status: 403 }
        )
      }
      // Solo se puede enviar desde BORRADOR o MODIFICACIÓN SOLICITADA
      if (!["DRAFT", "MODIFICATION_REQUESTED"].includes(existingReport.status)) {
        return NextResponse.json(
          { error: "Solo se pueden enviar reportes en borrador o con modificación solicitada" },
          { status: 400 }
        )
      }
      // Verificar que tiene al menos un item
      if (existingReport.items.length === 0) {
        return NextResponse.json(
          { error: "El reporte debe tener al menos un gasto para ser enviado" },
          { status: 400 }
        )
      }
      // Auto-aprobación para admin: cambiar estado a APPROVED directamente
      if (isAdminOwnReport) {
        const report = await db.expenseReport.update({
          where: { id },
          data: {
            status: "APPROVED",
            reviewedBy: userId,
            reviewedAt: new Date(),
            submittedAt: new Date(),
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true }
            },
            items: { orderBy: { createdAt: "asc" } }
          }
        })
        return NextResponse.json(report)
      }
    }

    if (["APPROVED", "REJECTED", "MODIFICATION_REQUESTED"].includes(status)) {
      // Solo admin puede aprobar, rechazar o solicitar modificaciones
      if (userRole !== "ADMIN") {
        return NextResponse.json(
          { error: "Solo un administrador puede realizar esta acción" },
          { status: 403 }
        )
      }
      // Solo se puede actuar sobre reportes enviados (o MODIFICACIÓN SOLICITADA para aprobar/rechazar)
      if (!["SUBMITTED", "MODIFICATION_REQUESTED"].includes(existingReport.status)) {
        return NextResponse.json(
          { error: "Solo se puede actuar sobre reportes enviados para revisión" },
          { status: 400 }
        )
      }
    }

    // Actualizar estado
    const updateData: any = {
      status,
      reviewedBy: userId,
      reviewedAt: new Date()
    }

    // Set submittedAt when status is SUBMITTED
    if (status === "SUBMITTED") {
      updateData.submittedAt = new Date()
    }

    // Set submittedAt when auto-approving (admin reviewing)
    if (["APPROVED", "REJECTED", "MODIFICATION_REQUESTED"].includes(status)) {
      // If the report hasn't been submitted yet, set submittedAt too
      if (!existingReport.submittedAt) {
        updateData.submittedAt = new Date()
      }
    }

    if (reviewNote) {
      updateData.reviewNote = reviewNote.trim()
    }

    const report = await db.expenseReport.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        items: {
          orderBy: { createdAt: "asc" }
        }
      }
    })

    // Crear notificación para el dueño del reporte
    let notificationTitle = ""
    let notificationMessage = ""
    let notificationType = "INFO"

    switch (status) {
      case "SUBMITTED":
        notificationTitle = "Reporte enviado"
        notificationMessage = `Su reporte "${report.title}" ha sido enviado para revisión`
        notificationType = "INFO"
        break
      case "APPROVED":
        notificationTitle = "Reporte aprobado"
        notificationMessage = `Su reporte "${report.title}" ha sido aprobado`
        notificationType = "SUCCESS"
        break
      case "REJECTED":
        notificationTitle = "Reporte rechazado"
        notificationMessage = `Su reporte "${report.title}" ha sido rechazado${reviewNote ? `. Motivo: ${reviewNote}` : ""}`
        notificationType = "ERROR"
        break
      case "MODIFICATION_REQUESTED":
        notificationTitle = "Modificación solicitada"
        notificationMessage = `Se han solicitado modificaciones en su reporte "${report.title}"${reviewNote ? `. Motivo: ${reviewNote}` : ""}`
        notificationType = "WARNING"
        break
    }

    if (notificationTitle) {
      await db.notification.create({
        data: {
          userId: report.userId,
          title: notificationTitle,
          message: notificationMessage,
          type: notificationType,
          reportId: report.id
        }
      })
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error("Error al cambiar estado del reporte:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al cambiar estado del reporte" },
      { status: 500 }
    )
  }
}

// DELETE /api/reports/[id] - Eliminar un reporte
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
    const userRole = session.user.role
    const userId = session.user.id

    // Verificar que el reporte existe
    const existingReport = await db.expenseReport.findUnique({
      where: { id }
    })

    if (!existingReport) {
      return NextResponse.json(
        { error: "Reporte no encontrado" },
        { status: 404 }
      )
    }

    // Solo el dueño puede eliminar (y solo si está en BORRADOR)
    if (existingReport.userId !== userId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para eliminar este reporte" },
        { status: 403 }
      )
    }

    // Solo se puede eliminar si está en BORRADOR
    if (existingReport.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar reportes en estado borrador" },
        { status: 400 }
      )
    }

    // Eliminar reporte (los items se eliminan en cascada)
    await db.expenseReport.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Reporte eliminado exitosamente" })
  } catch (error) {
    console.error("Error al eliminar reporte:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al eliminar reporte" },
      { status: 500 }
    )
  }
}
