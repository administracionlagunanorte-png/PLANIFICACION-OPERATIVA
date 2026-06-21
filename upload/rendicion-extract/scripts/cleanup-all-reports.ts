/**
 * Script de limpieza: elimina TODAS las rendiciones del sistema.
 *
 * Elimina:
 *  - ExpenseItem (ítems de rendiciones)
 *  - ExpenseReport (rendiciones)
 *  - Notification (notificaciones relacionadas a rendiciones)
 *  - PurchaseQuote (cotizaciones de solicitudes de compra)
 *  - PurchaseRequest (solicitudes de compra)
 *
 * Preserva:
 *  - User (usuarios)
 *  - Category (categorías)
 *
 * Uso: npx tsx scripts/cleanup-all-reports.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Cargar variables de entorno desde .env
config({ path: resolve(__dirname, '..', '.env') })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== LIMPIEZA DEL SISTEMA DE RENDICIÓN DE GASTOS ===\n')

  // 1. Conteo antes de eliminar
  const before = {
    expenseItems: await prisma.expenseItem.count(),
    expenseReports: await prisma.expenseReport.count(),
    notifications: await prisma.notification.count(),
    purchaseQuotes: await prisma.purchaseQuote.count(),
    purchaseRequests: await prisma.purchaseRequest.count(),
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
  }

  console.log('Conteo ANTES de la limpieza:')
  console.table(before)

  // 2. Eliminar en orden (respetando foreign keys)
  console.log('\nEliminando datos...')

  // 2.1 Notifications (referencian reportId pero sin FK obligatoria)
  const notifDeleted = await prisma.notification.deleteMany({})
  console.log(`- Notificaciones eliminadas: ${notifDeleted.count}`)

  // 2.2 ExpenseItems (cascade desde ExpenseReport, pero eliminamos explícitamente por seguridad)
  const itemsDeleted = await prisma.expenseItem.deleteMany({})
  console.log(`- Ítems de gasto eliminados: ${itemsDeleted.count}`)

  // 2.3 ExpenseReports
  const reportsDeleted = await prisma.expenseReport.deleteMany({})
  console.log(`- Rendiciones eliminadas: ${reportsDeleted.count}`)

  // 2.4 PurchaseQuotes (cascade desde PurchaseRequest, pero explícito)
  const quotesDeleted = await prisma.purchaseQuote.deleteMany({})
  console.log(`- Cotizaciones de compra eliminadas: ${quotesDeleted.count}`)

  // 2.5 PurchaseRequests
  const prDeleted = await prisma.purchaseRequest.deleteMany({})
  console.log(`- Solicitudes de compra eliminadas: ${prDeleted.count}`)

  // 3. Conteo después de eliminar
  const after = {
    expenseItems: await prisma.expenseItem.count(),
    expenseReports: await prisma.expenseReport.count(),
    notifications: await prisma.notification.count(),
    purchaseQuotes: await prisma.purchaseQuote.count(),
    purchaseRequests: await prisma.purchaseRequest.count(),
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
  }

  console.log('\nConteo DESPUÉS de la limpieza:')
  console.table(after)

  // 4. Verificación
  console.log('\n=== RESUMEN ===')
  console.log(`✓ Rendiciones eliminadas:        ${reportsDeleted.count}`)
  console.log(`✓ Ítems de gasto eliminados:     ${itemsDeleted.count}`)
  console.log(`✓ Notificaciones eliminadas:     ${notifDeleted.count}`)
  console.log(`✓ Solicitudes de compra eliminadas: ${prDeleted.count}`)
  console.log(`✓ Cotizaciones eliminadas:       ${quotesDeleted.count}`)
  console.log(`✓ Usuarios preservados:          ${after.users}`)
  console.log(`✓ Categorías preservadas:        ${after.categories}`)

  if (
    after.expenseItems === 0 &&
    after.expenseReports === 0 &&
    after.notifications === 0 &&
    after.purchaseQuotes === 0 &&
    after.purchaseRequests === 0
  ) {
    console.log('\n✅ Limpieza exitosa. Sistema listo para reimplementación.')
  } else {
    console.log('\n⚠️  Quedan registros. Revisar.')
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error('Error durante la limpieza:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
