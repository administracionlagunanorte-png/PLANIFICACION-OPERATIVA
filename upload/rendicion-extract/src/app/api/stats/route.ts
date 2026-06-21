import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helper"
import { db } from "@/lib/db"

// GET /api/stats - Obtener estadísticas del dashboard
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

    if (userRole === "ADMIN") {
      // Estadísticas para administrador
      const [
        totalReports,
        pendingReports,
        approvedReports,
        rejectedReports,
        totalUsers,
        totalAmount,
        reportsByStatus
      ] = await Promise.all([
        db.expenseReport.count(),
        db.expenseReport.count({ where: { status: "SUBMITTED" } }),
        db.expenseReport.count({ where: { status: "APPROVED" } }),
        db.expenseReport.count({ where: { status: "REJECTED" } }),
        db.user.count({ where: { role: "USER" } }),
        db.expenseReport.aggregate({
          _sum: { totalAmount: true },
          where: { status: "APPROVED" }
        }),
        db.expenseReport.groupBy({
          by: ["status"],
          _count: { status: true },
          _sum: { totalAmount: true }
        })
      ])

      // Obtener gastos por categoría
      const expensesByCategory = await db.expenseItem.groupBy({
        by: ["category"],
        _sum: { montoRendir: true },
        _count: { category: true }
      })

      // Obtener reportes recientes
      const recentReports = await db.expenseReport.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      // Time statistics: average time between submittedAt and reviewedAt for approved reports
      const approvedReportsWithDates = await db.expenseReport.findMany({
        where: {
          status: "APPROVED",
          submittedAt: { not: null },
          reviewedAt: { not: null },
        },
        select: {
          submittedAt: true,
          reviewedAt: true,
        },
      })

      let timeStats = {
        avgApprovalMs: 0,
        fastestApprovalMs: 0,
        slowestApprovalMs: 0,
        avgApprovalHours: 0,
        fastestApprovalHours: 0,
        slowestApprovalHours: 0,
        count: 0,
      }

      if (approvedReportsWithDates.length > 0) {
        const approvalTimes = approvedReportsWithDates
          .filter((r) => r.submittedAt && r.reviewedAt)
          .map((r) => new Date(r.reviewedAt!).getTime() - new Date(r.submittedAt!).getTime())
          .filter((ms) => ms > 0)

        if (approvalTimes.length > 0) {
          const avg = approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length
          const fastest = Math.min(...approvalTimes)
          const slowest = Math.max(...approvalTimes)
          timeStats = {
            avgApprovalMs: avg,
            fastestApprovalMs: fastest,
            slowestApprovalMs: slowest,
            avgApprovalHours: Math.round((avg / (1000 * 60 * 60)) * 100) / 100,
            fastestApprovalHours: Math.round((fastest / (1000 * 60 * 60)) * 100) / 100,
            slowestApprovalHours: Math.round((slowest / (1000 * 60 * 60)) * 100) / 100,
            count: approvalTimes.length,
          }
        }
      }

      // Per-worker statistics
      const users = await db.user.findMany({
        where: { role: "USER" },
        select: { id: true, name: true, email: true },
      })

      const workerStats = await Promise.all(
        users.map(async (user) => {
          const userReports = await db.expenseReport.findMany({
            where: { userId: user.id },
            include: { items: true },
          })

          const rendicionesCount = userReports.length
          const comprasCount = userReports.reduce(
            (sum, r) => sum + r.items.length,
            0
          )
          const totalRendido = userReports.reduce(
            (sum, r) => sum + r.items.reduce((s, i) => s + (i.montoRendir || 0), 0),
            0
          )

          // Average approval time for this user
          const approvedWithDates = userReports.filter(
            (r) => r.status === "APPROVED" && r.submittedAt && r.reviewedAt
          )
          let avgApprovalHours = 0
          if (approvedWithDates.length > 0) {
            const times = approvedWithDates
              .map((r) => new Date(r.reviewedAt!).getTime() - new Date(r.submittedAt!).getTime())
              .filter((ms) => ms > 0)
            if (times.length > 0) {
              avgApprovalHours =
                Math.round((times.reduce((a, b) => a + b, 0) / times.length / (1000 * 60 * 60)) * 100) / 100
            }
          }

          return {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            rendicionesCount,
            comprasCount,
            totalRendido,
            avgApprovalHours,
          }
        })
      )

      return NextResponse.json({
        totalReports,
        pendingReports,
        approvedReports,
        rejectedReports,
        totalUsers,
        totalAmountApproved: totalAmount._sum.totalAmount || 0,
        reportsByStatus,
        expensesByCategory,
        recentReports,
        timeStats,
        workerStats,
      })
    } else {
      // Estadísticas para usuario normal
      const [
        myReports,
        myDrafts,
        mySubmitted,
        myApproved,
        myRejected,
        myTotalAmount
      ] = await Promise.all([
        db.expenseReport.count({ where: { userId } }),
        db.expenseReport.count({ where: { userId, status: "DRAFT" } }),
        db.expenseReport.count({ where: { userId, status: "SUBMITTED" } }),
        db.expenseReport.count({ where: { userId, status: "APPROVED" } }),
        db.expenseReport.count({ where: { userId, status: "REJECTED" } }),
        db.expenseReport.aggregate({
          _sum: { totalAmount: true },
          where: { userId, status: "APPROVED" }
        })
      ])

      // Gastos por categoría del usuario
      const myExpensesByCategory = await db.expenseItem.groupBy({
        by: ["category"],
        _sum: { montoRendir: true },
        _count: { category: true },
        where: {
          report: { userId }
        }
      })

      // Reportes recientes del usuario
      const myRecentReports = await db.expenseReport.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          items: true
        }
      })

      return NextResponse.json({
        myReports,
        myDrafts,
        mySubmitted,
        myApproved,
        myRejected,
        myTotalApproved: myTotalAmount._sum.totalAmount || 0,
        myExpensesByCategory,
        myRecentReports
      })
    }
  } catch (error) {
    console.error("Error al obtener estadísticas:", error)
    return NextResponse.json(
      { error: "Error interno del servidor al obtener estadísticas" },
      { status: 500 }
    )
  }
}
