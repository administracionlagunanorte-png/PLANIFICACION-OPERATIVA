# Task: Migrate Prisma from SQLite to PostgreSQL (Neon) and prepare for Vercel deployment

## Summary

Successfully migrated the Prisma configuration from SQLite to PostgreSQL (Neon) and prepared the project for Vercel deployment. All changes are backward-compatible and the app will work with a placeholder DATABASE_URL until a real Neon connection string is provided.

## Files Modified

### 1. `/home/z/my-project/prisma/schema.prisma`
- Changed `provider` from `"sqlite"` to `"postgresql"`
- Added `relationMode = "prisma"` for compatibility
- Kept all models unchanged (they are compatible with both SQLite and PostgreSQL)

### 2. `/home/z/my-project/.env`
- Changed DATABASE_URL from SQLite file path to PostgreSQL placeholder
- Added comments explaining local vs production configuration
- Includes placeholder Neon connection string

### 3. `/home/z/my-project/src/lib/db.ts`
- Updated PrismaClient logging to be environment-aware:
  - Development: `['query', 'error', 'warn']`
  - Production: `['error']`
- This optimizes for Vercel serverless (reduced logging overhead)

### 4. `/home/z/my-project/package.json`
- Changed `build` script from standalone build to simple `next build`
- Added `postinstall` script: `prisma generate`
- Added `db:seed` script: `prisma db seed`
- Added `migrate:data` script for SQLite-to-PostgreSQL migration
- Added `prisma.seed` configuration
- Added `better-sqlite3` and `ts-node` as devDependencies

### 5. `/home/z/my-project/next.config.ts`
- Added `remotePatterns` for Vercel Blob storage images
- Kept existing rewrites for `/uploads/:path*`

## Files Created

### 6. `/home/z/my-project/.env.example`
- Template for Neon PostgreSQL connection string
- Links to Neon dashboard

### 7. `/home/z/my-project/vercel.json`
- Build command: `prisma generate && next build`
- Install command: `npm install`
- Framework: nextjs
- Region: iad1

### 8. `/home/z/my-project/.gitignore`
- Comprehensive gitignore for the project
- Includes Prisma migrations, uploads, database files, logs, env files

### 9. `/home/z/my-project/prisma/seed.ts`
- Seeds default priorities (Alta, Media, Baja)
- Seeds default statuses (Pendiente, En Proceso, Completada, Cancelada)
- Seeds default sectors (9 sectors)
- Seeds default repair types (10 types)

### 10. `/home/z/my-project/scripts/migrate-data.ts`
- Reads data from existing SQLite database (`db/custom.db`)
- Migrates all tables: Sector, RepairType, Priority, Status, Responsible, Etapa, Task, TaskHistory, Material
- Uses upsert for idempotent migration
- Handles missing tables gracefully

### 11. `/home/z/my-project/src/app/api/upload/route.ts`
- Supports Vercel Blob (when BLOB_READ_WRITE_TOKEN is set)
- Falls back to local filesystem storage for development
- Generates unique filenames with timestamp + random suffix

## Next Steps for User

1. **Set up Neon database**: Go to https://console.neon.tech and create a new project
2. **Update DATABASE_URL**: Replace the placeholder in `.env` with your Neon connection string
3. **Push schema**: Run `bun run db:push` to create tables in PostgreSQL
4. **Seed database**: Run `bun run db:seed` to populate default values
5. **Migrate existing data** (optional): Run `bun run migrate:data` to transfer data from SQLite
6. **Deploy to Vercel**:
   - Set `DATABASE_URL` in Vercel environment variables
   - Set `BLOB_READ_WRITE_TOKEN` if using Vercel Blob for uploads
   - Deploy via `vercel` CLI or GitHub integration

## Lint Status

Pre-existing lint errors in `custom-server.js`, `keep-alive.js`, `persistent-server.js` (unrelated to migration). All migrated/created files pass lint cleanly.
