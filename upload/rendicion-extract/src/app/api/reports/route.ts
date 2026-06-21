import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// GET /api/reports - Listar reportes de gastos
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado. Inicie sesión para continuar." },
        { status: 401 }
      )
    }

    const userRole = session.user.role
    const userId = session.user.id
    const searchParams = request.nextUrl.searchParams

    // Parámetros de filtrado
    const status = searchParams.get("status") || undefined
    const filterUserId = searchParams.get("userId") || undefined
    const category = searchParams.get("category") || undefined
    const search = searchParams.get("search") || undefined

    // Parámetros de paginación
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const skip = (page - 1) * pageSize
    const take = pageSize

    // Construir filtros
    const where: any = {}

    // Si es usuario normal, solo ve sus propios reportes
    if (userRole !== "ADMIN") {
      where.userId = userId
    } else if (filterUserId) {
      where.userId = filterUserId
    }

    if (status) {
      where.status = status
    }

    if (category) {
      where.items = {
        some: { category }
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        ...(isNaN(parseInt(search)) ? [] : [{ correlativeNumber: parseInt(search) }]),
      ]
    }

    // Obtener reportes con conteo total
    const [reports, total] = await Promise.all([
      db.expenseReport.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          items: true
        },
        orderBy: { createdAt: "desc" },
        skip,
        take
      }),
      db.expenseReport.count({ where })
    ])

    return NextResponse.json({
      reports,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (error) {
    console.error("Error al obtener reportes:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al obtener reportes" },
      { status: 500 }
    )
  }
}

// POST /api/reports - Crear nuevo reporte de gastos
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
    const { title, description, userId } = body

    // Validación
    if (!title || title.trim() === "") {
      return NextResponse.json(
        { error: "El título del reporte es requerido" },
        { status: 400 }
      )
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "El título no puede exceder los 200 caracteres" },
        { status: 400 }
      )
    }

    // Determinar el userId del reporte
    const reportUserId = userId || session.user.id
    const sessionUserId = session.user.id
    const userRole = session.user.role

    // Solo admin puede crear reportes para otros usuarios
    if (reportUserId !== sessionUserId && userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "No tiene permisos para crear reportes para otro usuario" },
        { status: 403 }
      )
    }

    // Verificar que el usuario existe
    const userExists = await db.user.findUnique({
      where: { id: reportUserId }
    })

    if (!userExists) {
      return NextResponse.json(
        { error: "El usuario especificado no existe" },
        { status: 404 }
      )
    }

    // Crear reporte
    // Get next correlative number
    const lastReport = await db.expenseReport.findFirst({
      orderBy: { correlativeNumber: 'desc' },
      select: { correlativeNumber: true },
    })
    const nextCorrelative = (lastReport?.correlativeNumber || 0) + 1

    const report = await db.expenseReport.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        userId: reportUserId,
        status: "DRAFT",
        correlativeNumber: nextCorrelative,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        items: true
      }
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error("Error al crear reporte:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al crear reporte" },
      { status: 500 }
    )
  }
}
