import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// GET /api/purchase-requests - Listar solicitudes de compra
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

    const status = searchParams.get("status") || undefined
    const priority = searchParams.get("priority") || undefined
    const filterUserId = searchParams.get("userId") || undefined
    const search = searchParams.get("search") || undefined
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")
    const skip = (page - 1) * pageSize
    const take = pageSize

    const where: any = {}

    // Usuarios normales solo ven sus propias solicitudes
    if (userRole !== "ADMIN") {
      where.userId = userId
    } else if (filterUserId) {
      where.userId = filterUserId
    }

    if (status) where.status = status
    if (priority) where.priority = priority

    if (search) {
      where.OR = [
        { productDescription: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { directProvider: { contains: search, mode: 'insensitive' } },
        ...(isNaN(parseInt(search)) ? [] : [{ correlativeNumber: parseInt(search) }]),
      ]
    }

    const [requests, total] = await Promise.all([
      db.purchaseRequest.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          },
          quotes: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      db.purchaseRequest.count({ where }),
    ])

    return NextResponse.json({
      requests,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("Error al obtener solicitudes de compra:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al obtener solicitudes de compra" },
      { status: 500 }
    )
  }
}

// POST /api/purchase-requests - Crear nueva solicitud de compra
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
      productDescription,
      brand,
      quantity,
      priority,
      productLink,
      referencePhotoUrl,
      directProvider,
      notes,
    } = body

    // Validación
    if (!productDescription || !productDescription.trim()) {
      return NextResponse.json(
        { error: "La descripción del producto es requerida" },
        { status: 400 }
      )
    }

    const validPriorities = ["BAJA", "MEDIA", "ALTA", "URGENTE"]
    const finalPriority = validPriorities.includes(priority) ? priority : "MEDIA"

    const finalQuantity = parseInt(quantity) || 1
    if (finalQuantity < 1) {
      return NextResponse.json(
        { error: "La cantidad debe ser al menos 1" },
        { status: 400 }
      )
    }

    // Generar número correlativo
    const lastRequest = await db.purchaseRequest.findFirst({
      orderBy: { correlativeNumber: 'desc' },
      select: { correlativeNumber: true },
    })
    const nextCorrelative = (lastRequest?.correlativeNumber || 0) + 1

    // Crear solicitud
    const newRequest = await db.purchaseRequest.create({
      data: {
        correlativeNumber: nextCorrelative,
        productDescription: productDescription.trim(),
        brand: brand?.trim() || null,
        quantity: finalQuantity,
        priority: finalPriority,
        productLink: productLink?.trim() || null,
        referencePhotoUrl: referencePhotoUrl || null,
        directProvider: directProvider?.trim() || null,
        notes: notes?.trim() || null,
        status: "PENDIENTE",
        userId: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        quotes: true,
      },
    })

    // Notificar a los administradores
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    })

    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "Nueva solicitud de compra",
          message: `${session.user.name} solicitó: ${productDescription.trim().slice(0, 60)}${productDescription.length > 60 ? '...' : ''}`,
          type: "PURCHASE_REQUEST",
          reportId: newRequest.id,
        })),
      })
    }

    return NextResponse.json(newRequest, { status: 201 })
  } catch (error) {
    console.error("Error al crear solicitud de compra:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al crear solicitud de compra" },
      { status: 500 }
    )
  }
}
