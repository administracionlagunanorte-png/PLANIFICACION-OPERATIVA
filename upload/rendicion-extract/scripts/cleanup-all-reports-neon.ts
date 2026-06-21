/**
 * Script de limpieza (Neon HTTP) - elimina TODAS las rendiciones del sistema.
 *
 * Usa @neondatabase/serverless (HTTP) en lugar de TCP directo, porque el
 * sandbox bloquea el puerto 5432.
 *
 * Elimina:
 *  - expense_items
 *  - expense_reports
 *  - notifications
 *  - purchase_quotes
 *  - purchase_requests
 *
 * Preserva:
 *  - users
 *  - categories
 *
 * Uso: DATABASE_URL=... npx tsx scripts/cleanup-all-reports-neon.ts
 */

import { neon } from '@neondatabase/serverless'

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_1P8ufNABjhmX@ep-twilight-frog-aj7ytggk.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require'

const sql = neon(DATABASE_URL)

async function countAll() {
  const [expenseItems] = await sql`SELECT COUNT(*)::int AS count FROM expense_items`
  const [expenseReports] = await sql`SELECT COUNT(*)::int AS count FROM expense_reports`
  const [notifications] = await sql`SELECT COUNT(*)::int AS count FROM notifications`
  const [purchaseQuotes] = await sql`SELECT COUNT(*)::int AS count FROM purchase_quotes`
  const [purchaseRequests] = await sql`SELECT COUNT(*)::int AS count FROM purchase_requests`
  const [users] = await sql`SELECT COUNT(*)::int AS count FROM "User"`
  const [categories] = await sql`SELECT COUNT(*)::int AS count FROM categories`
  return {
    expenseItems: expenseItems.count,
    expenseReports: expenseReports.count,
    notifications: notifications.count,
    purchaseQuotes: purchaseQuotes.count,
    purchaseRequests: purchaseRequests.count,
    users: users.count,
    categories: categories.count,
  }
}

async function main() {
  console.log('=== LIMPIEZA DEL SISTEMA DE RENDICIÓN DE GASTOS (Neon HTTP) ===\n')

  const before = await countAll()
  console.log('Conteo ANTES de la limpieza:')
  console.table(before)

  console.log('\nEliminando datos...')

  // 1. Notifications
  const notifRes = await sql`DELETE FROM notifications RETURNING id`
  console.log(`- Notificaciones eliminadas: ${notifRes.length}`)

  // 2. ExpenseItems
  const itemsRes = await sql`DELETE FROM expense_items RETURNING id`
  console.log(`- Ítems de gasto eliminados: ${itemsRes.length}`)

  // 3. ExpenseReports
  const reportsRes = await sql`DELETE FROM expense_reports RETURNING id`
  console.log(`- Rendiciones eliminadas: ${reportsRes.length}`)

  // 4. PurchaseQuotes
  const quotesRes = await sql`DELETE FROM purchase_quotes RETURNING id`
  console.log(`- Cotizaciones de compra eliminadas: ${quotesRes.length}`)

  // 5. PurchaseRequests
  const prRes = await sql`DELETE FROM purchase_requests RETURNING id`
  console.log(`- Solicitudes de compra eliminadas: ${prRes.length}`)

  const after = await countAll()
  console.log('\nConteo DESPUÉS de la limpieza:')
  console.table(after)

  console.log('\n=== RESUMEN ===')
  console.log(`✓ Rendiciones eliminadas:           ${reportsRes.length}`)
  console.log(`✓ Ítems de gasto eliminados:        ${itemsRes.length}`)
  console.log(`✓ Notificaciones eliminadas:         ${notifRes.length}`)
  console.log(`✓ Solicitudes de compra eliminadas:  ${prRes.length}`)
  console.log(`✓ Cotizaciones eliminadas:           ${quotesRes.length}`)
  console.log(`✓ Usuarios preservados:             ${after.users}`)
  console.log(`✓ Categorías preservadas:           ${after.categories}`)

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

main().catch((e) => {
  console.error('Error durante la limpieza:', e)
  process.exit(1)
})
