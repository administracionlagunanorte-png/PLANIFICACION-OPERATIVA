import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

// GET /api/seed - Crear datos de demostración (también acepta GET para facilidad)
export async function GET() {
  return POST()
}

// POST /api/seed - Crear datos de demostración
export async function POST() {
  try {
    // Verificar si ya existen usuarios
    const existingUsers = await db.user.count()
    if (existingUsers > 0) {
      return NextResponse.json(
        { message: "Ya existen datos en la base de datos. Seed omitido.", userCount: existingUsers },
        { status: 200 }
      )
    }

    const hashedPassword = await bcrypt.hash("password123", 10)

    // Crear usuarios
    const admin = await db.user.create({
      data: {
        email: "admin@empresa.com",
        name: "Administrador",
        password: hashedPassword,
        role: "ADMIN"
      }
    })

    const user1 = await db.user.create({
      data: {
        email: "maria@empresa.com",
        name: "María García",
        password: hashedPassword,
        role: "USER"
      }
    })

    const user2 = await db.user.create({
      data: {
        email: "carlos@empresa.com",
        name: "Carlos López",
        password: hashedPassword,
        role: "USER"
      }
    })

    // Placeholder image for seed data (1x1 green pixel PNG as base64 data URL)
    const placeholderImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

    // Crear reportes de ejemplo
    const report1 = await db.expenseReport.create({
      data: {
        correlativeNumber: 1,
        title: "Viaje de negocios - Madrid",
        description: "Gastos del viaje a la conferencia en Madrid del 15 al 18 de enero",
        userId: user1.id,
        status: "SUBMITTED",
        totalAmount: 850.50,
        reviewNote: null,
        reviewedBy: null,
        reviewedAt: null
      }
    })

    const report2 = await db.expenseReport.create({
      data: {
        correlativeNumber: 2,
        title: "Material de oficina - Enero",
        description: "Compra de suministros de oficina para el mes de enero",
        userId: user1.id,
        status: "APPROVED",
        totalAmount: 234.80,
        reviewedBy: admin.id,
        reviewedAt: new Date("2024-01-20")
      }
    })

    const report3 = await db.expenseReport.create({
      data: {
        correlativeNumber: 3,
        title: "Almuerzos con clientes",
        description: "Comidas de negocio con clientes potenciales",
        userId: user2.id,
        status: "DRAFT",
        totalAmount: 0
      }
    })

    const report4 = await db.expenseReport.create({
      data: {
        correlativeNumber: 4,
        title: "Capacitación online",
        description: "Cursos y certificaciones profesionales",
        userId: user2.id,
        status: "REJECTED",
        totalAmount: 450.00,
        reviewNote: "Los gastos no están dentro del presupuesto aprobado para capacitación",
        reviewedBy: admin.id,
        reviewedAt: new Date("2024-01-22")
      }
    })

    const report5 = await db.expenseReport.create({
      data: {
        correlativeNumber: 5,
        title: "Transporte febrero",
        description: "Gastos de transporte y movilidad del mes de febrero",
        userId: user1.id,
        status: "MODIFICATION_REQUESTED",
        totalAmount: 320.00,
        reviewNote: "Por favor adjuntar los recibos de taxi faltantes",
        reviewedBy: admin.id,
        reviewedAt: new Date("2024-02-10")
      }
    })

    // Crear items de gastos para reporte 1
    await db.expenseItem.createMany({
      data: [
        {
          description: "Vuelo ida y vuelta Madrid",
          numeroBoleta: "B001-00001",
          montoRendir: 350.00,
          category: "Transporte",
          expenseDate: new Date("2024-01-15"),
          imageBoletaUrl: placeholderImage,
          imageCompraUrl: placeholderImage,
          reportId: report1.id
        },
        {
          description: "Hotel 3 noches",
          numeroBoleta: "B001-00002",
          montoRendir: 300.50,
          category: "Alojamiento",
          expenseDate: new Date("2024-01-15"),
          imageBoletaUrl: placeholderImage,
          imageCompraUrl: placeholderImage,
          reportId: report1.id
        },
        {
          description: "Cena con cliente",
          numeroBoleta: "B001-00003",
          montoRendir: 120.00,
          category: "Alimentación",
          expenseDate: new Date("2024-01-16"),
          imageBoletaUrl: placeholderImage,
          imageCompraUrl: placeholderImage,
          reportId: report1.id
        },
        {
          description: "Taxi aeropuerto-hotel",
          numeroBoleta: "B001-00004",
          montoRendir: 80.00,
          category: "Transporte",
          expenseDate: new Date("2024-01-15"),
          imageBoletaUrl: placeholderImage,
          imageCompraUrl: placeholderImage,
          reportId: report1.id
        }
      ]
    })

    // Items para reporte 2
    await db.expenseItem.createMany({
      data: [
        {
          description: "Resmas de papel A4",
          numeroBoleta: "B002-00001",
          montoRendir: 45.80,
          category: "Oficina",
          expenseDate: new Date("2024-01-10"),
          imageBoletaUrl: placeholderImage,
          imageCompraUrl: placeholderImage,
          reportId: report2.id
        },
        {
          description: "Cartuchos de tinta impresora",
          numeroBoleta: "B002-00002",
          montoRendir: 89.00,
          category: "Oficina",
          expenseDate: new Date("2024-01-12"),
          imageBoletaUrl: placeholderImage,
          imageCompraUrl: placeholderImage,
          reportId: report2.id
        },
        {
          description: "Carpetas y archivadores",
          numeroBoleta: "B002-00003",
          montoRendir: 100.00,
          category: "Oficina",
          expenseDate: new Date("2024-01-14"),
          imageBoletaUrl: placeholderImage,
          imageCompraUrl: placeholderImage,
          reportId: report2.id
        }
      ]
    })

    // Items para reporte 4
    await db.expenseItem.createMany({
      data: [
        {
          description: "Curso AWS Solutions Architect",
          numeroBoleta: "B004-00001",
          montoRendir: 250.00,
          category: "Capacitación",
          expenseDate: new Date("2024-01-05"),
          imageBoletaUrl: placeholderImage,
          imageCompraUrl: placeholderImage,
          reportId: report4.id
        },
        {
          description: "Certificación Scrum Master",
          numeroBoleta: "B004-00002",
          montoRendir: 200.00,
          category: "Capacitación",
          expenseDate: new Date("2024-01-18"),
          imageBoletaUrl: placeholderImage,
          imageCompraUrl: placeholderImage,
          reportId: report4.id
        }
      ]
    })

    // Items para reporte 5
    await db.expenseItem.createMany({
      data: [
        {
          description: "Abono transporte público",
          numeroBoleta: "B005-00001",
          montoRendir: 120.00,
          category: "Transporte",
          expenseDate: new Date("2024-02-01"),
          imageBoletaUrl: placeholderImage,
          imageCompraUrl: placeholderImage,
          reportId: report5.id
        },
        {
          description: "Taxi reunión cliente",
          numeroBoleta: "B005-00002",
          montoRendir: 45.00,
          category: "Transporte",
          expenseDate: new Date("2024-02-05"),
          imageBoletaUrl: placeholderImage,
          imageCompraUrl: placeholderImage,
          reportId: report5.id
        },
        {
          description: "Estacionamiento oficina central",
          numeroBoleta: "B005-00003",
          montoRendir: 155.00,
          category: "Transporte",
          expenseDate: new Date("2024-02-08"),
          imageBoletaUrl: placeholderImage,
          imageCompraUrl: placeholderImage,
          reportId: report5.id
        }
      ]
    })

    // Crear notificaciones de ejemplo
    await db.notification.createMany({
      data: [
        {
          userId: user1.id,
          title: "Reporte aprobado",
          message: "Su reporte 'Material de oficina - Enero' ha sido aprobado",
          type: "SUCCESS",
          reportId: report2.id,
          read: true
        },
        {
          userId: user1.id,
          title: "Modificación solicitada",
          message: "Se han solicitado modificaciones en su reporte 'Transporte febrero'. Por favor adjuntar los recibos de taxi faltantes",
          type: "WARNING",
          reportId: report5.id,
          read: false
        },
        {
          userId: user2.id,
          title: "Reporte rechazado",
          message: "Su reporte 'Capacitación online' ha sido rechazado. Los gastos no están dentro del presupuesto aprobado para capacitación",
          type: "ERROR",
          reportId: report4.id,
          read: false
        }
      ]
    })

    return NextResponse.json({
      message: "Datos de demostración creados exitosamente",
      summary: {
        users: 3,
        reports: 5,
        notifications: 3,
        credentials: [
          { email: "admin@empresa.com", password: "password123", role: "ADMIN" },
          { email: "maria@empresa.com", password: "password123", role: "USER" },
          { email: "carlos@empresa.com", password: "password123", role: "USER" }
        ]
      }
    }, { status: 201 })
  } catch (error) {
    console.error("Error al crear datos de demostración:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al crear datos de demostración" },
      { status: 500 }
    )
  }
}
