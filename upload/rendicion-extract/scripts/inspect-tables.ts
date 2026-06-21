/**
 * Inspecciona las tablas reales en la base de datos Neon.
 */
import { neon } from '@neondatabase/serverless'

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_1P8ufNABjhmX@ep-twilight-frog-aj7ytggk.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require'

const sql = neon(DATABASE_URL)

async function main() {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `
  console.log('Tablas en la base de datos:')
  for (const t of tables) {
    console.log(`  - ${t.table_name}`)
  }

  // Contar registros de cada tabla
  console.log('\nConteo de registros:')
  for (const t of tables) {
    try {
      const [r] = await sql(`SELECT COUNT(*)::int AS count FROM "${t.table_name}"`)
      console.log(`  - ${t.table_name}: ${r.count}`)
    } catch (e) {
      console.log(`  - ${t.table_name}: error (${e.message})`)
    }
  }
}

main().catch(console.error)
