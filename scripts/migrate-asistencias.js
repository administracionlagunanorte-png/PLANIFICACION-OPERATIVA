// One-time script to create asistencias tables in Neon
const SQL = `
-- AddForeignKey: worker -> asistencias
ALTER TABLE "workers" ADD COLUMN IF NOT EXISTS EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workers' AND column_name = 'id') 

-- CreateTable: asistencia_records
CREATE TABLE IF NOT EXISTS "asistencia_records" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "minutesLate" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "reportedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asistencia_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable: asistencia_alert_config
CREATE TABLE IF NOT EXISTS "asistencia_alert_config" (
    "id" TEXT NOT NULL,
    "dayOfMonth" INTEGER NOT NULL DEFAULT 29,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT NOT NULL DEFAULT 'Informe mensual de asistencias: Revisar y enviar listado de atrasos e inasistencias',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asistencia_alert_config_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "asistencia_records" ADD CONSTRAINT "asistencia_records_workerId_fkey" 
  FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
`

console.log(SQL)
