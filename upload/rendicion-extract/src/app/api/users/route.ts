import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// GET /api/users - Listar usuarios (solo admin)
export async function GET(request: NextRequest) {
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
        { error: "No tiene permisos para acceder a este recurso" },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || undefined
    const withBudget = searchParams.get("withBudget") === "true"

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }

    if (withBudget) {
      // Get users with budget info computed from approved reports
      const users = await db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          montoAsignado: true,
          createdAt: true,
          reports: {
            where: { status: "APPROVED" },
            select: {
              totalAmount: true,
              items: {
                select: { montoRendir: true }
              }
            }
          },
          _count: {
            select: { reports: true }
          }
        },
        orderBy: { createdAt: "desc" },
      })

      // Compute budget data for each user
      const usersWithBudget = users.map((user: any) => {
        const montoAprobado = user.reports.reduce((sum: number, r: any) => sum + r.totalAmount, 0)
        const montoRendido = user.reports.reduce(
          (sum: number, r: any) => sum + r.items.reduce((s: number, i: any) => s + i.montoRendir, 0), 0
        )
        const montoRestante = user.montoAsignado - montoRendido

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          montoAsignado: user.montoAsignado,
          montoAprobado,
          montoRendido,
          montoRestante,
          reportsCount: user._count.reports,
          createdAt: user.createdAt,
        }
      })

      const totalUsers = await db.user.count({ where })
      const totalAdmins = await db.user.count({ where: { role: "ADMIN" } })

      return NextResponse.json({
        users: usersWithBudget,
        totalUsers,
        totalAdmins,
      })
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        montoAsignado: true,
        createdAt: true,
        _count: {
          select: { reports: true }
        }
      },
      orderBy: { createdAt: "desc" },
    })

    const totalUsers = await db.user.count({ where })
    const totalAdmins = await db.user.count({ where: { role: "ADMIN" } })

    return NextResponse.json({
      users,
      totalUsers,
      totalAdmins,
    })
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al obtener usuarios" },
      { status: 500 }
    )
  }
}

// POST /api/users - Crear nuevo usuario (solo admin)
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
        { error: "No tiene permisos para crear usuarios" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, name, password, role, montoAsignado } = body

    // Validaciones
    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "El email es requerido" },
        { status: 400 }
      )
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      )
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "El formato del email no es válido" },
        { status: 400 }
      )
    }

    // Verificar si el email ya existe
    const existingUser = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario con este email" },
        { status: 409 }
      )
    }

    // Validar rol
    const validRole = role && ["USER", "ADMIN"].includes(role) ? role : "USER"

    // Hashear contraseña
    const bcrypt = require("bcryptjs")
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear usuario
    const user = await db.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password: hashedPassword,
        role: validRole,
        montoAsignado: parseFloat(montoAsignado) || 0,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        montoAsignado: true,
        createdAt: true,
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Error al crear usuario:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al crear usuario" },
      { status: 500 }
    )
  }
}
