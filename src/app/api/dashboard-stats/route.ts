import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/dashboard-stats — summary counts for the admin dashboard
export async function GET() {
  try {
    // Expense reports by status
    const expenseStatuses = ['BORRADOR', 'ENVIADO', 'APROBADO_SUPERVISOR', 'APROBADO', 'RECHAZADO']
    const expenseCounts: Record<string, number> = {}
    const expenseTotal = await db.expenseReport.count()

    await Promise.all(
      expenseStatuses.map(async (status) => {
        const count = await db.expenseReport.count({ where: { status } })
        expenseCounts[status] = count
      })
    )

    // Purchase requests by status
    const purchaseStatuses = ['PENDIENTE', 'APROBADA_SUPERVISOR', 'APROBADA', 'RECHAZADA', 'EN_COMPRA', 'COMPRADA', 'CANCELADA']
    const purchaseCounts: Record<string, number> = {}
    const purchaseTotal = await db.purchaseRequest.count()

    await Promise.all(
      purchaseStatuses.map(async (status) => {
        const count = await db.purchaseRequest.count({ where: { status } })
        purchaseCounts[status] = count
      })
    )

    // Total amounts for expense reports
    const expenseApprovedAmount = await db.expenseReport.aggregate({
      _sum: { totalAmount: true },
      where: { status: { in: ['APROBADO', 'APROBADO_SUPERVISOR'] } },
    })

    // Anticipos by status
    const anticipoStatuses = ['PENDIENTE', 'PAGADO', 'RECHAZADO']
    const anticipoCounts: Record<string, number> = {}
    const anticipoTotal = await db.anticipo.count()

    await Promise.all(
      anticipoStatuses.map(async (status) => {
        const count = await db.anticipo.count({ where: { status } })
        anticipoCounts[status] = count
      })
    )

    const anticipoTotalAmount = await db.anticipo.aggregate({
      _sum: { monto: true },
    })
    const anticipoPagadoAmount = await db.anticipo.aggregate({
      _sum: { monto: true },
      where: { status: 'PAGADO' },
    })

    return NextResponse.json({
      expenses: {
        total: expenseTotal,
        byStatus: expenseCounts,
        approvedAmount: expenseApprovedAmount._sum.totalAmount || 0,
      },
      purchases: {
        total: purchaseTotal,
        byStatus: purchaseCounts,
      },
      anticipos: {
        total: anticipoTotal,
        byStatus: anticipoCounts,
        totalAmount: anticipoTotalAmount._sum.monto || 0,
        pagadoAmount: anticipoPagadoAmount._sum.monto || 0,
      },
    })
  } catch (error) {
    console.error('[DASHBOARD_STATS_GET]', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
