import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// LV Template definitions with frequencies and scheduling rules
interface LVTemplateDef {
  codigo: string
  nombre: string
  sector: string
  frecuencia: string
  items: { category: string; description: string }[]
  // Scheduling rules
  scheduleRule: 'daily' | '3x_week' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'
  // For monthly: which week (1=first, 2=second, 3=third, 4=last)
  monthWeek?: number
  // For annual: which month (1-12)
  annualMonth?: number
  // For quarterly: which months (1-12)
  quarterMonths?: number[]
  // For semiannual: which months
  semiMonths?: number[]
  // Preferred day of week for weekly (0=Sun, 1=Mon, etc.)
  weekDay?: number
  // Preferred day of month for monthly
  monthDay?: number
}

const LV_TEMPLATES: LVTemplateDef[] = [
  {
    codigo: 'LV-01', nombre: 'Dotación diaria de personal y EPP', sector: 'General — Todos los sectores', frecuencia: 'Diaria',
    scheduleRule: 'daily',
    items: [
      { category: 'A', description: 'Verificación de dotación de personal presente' },
      { category: 'B', description: 'Verificación de EPP por puesto (guantes, antiparras, protector auditivo, mascarilla, chaleco, botas, protector solar)' },
      { category: 'C', description: 'Personal con baja / ausencia' },
      { category: 'C', description: 'EPP deteriorado o faltante' },
      { category: 'C', description: 'Equipos o maquinaria con falla' },
      { category: 'C', description: 'Incidencias reportadas de jornada anterior' },
      { category: 'C', description: 'Zonas con acceso restringido hoy' },
      { category: 'C', description: 'Trabajos de terceros en condominio hoy' },
    ]
  },
  {
    codigo: 'LV-02', nombre: 'Laguna artificial — Control diario de agua', sector: 'Laguna', frecuencia: 'Diaria',
    scheduleRule: 'daily',
    items: [
      { category: 'A', description: 'EPP y materiales requeridos disponibles y en buen estado' },
      { category: 'B', description: 'Medición pH (rango 7,2–8,0)' },
      { category: 'B', description: 'Medición Turbidez NTU (< 10 NTU)' },
      { category: 'B', description: 'Medición Temperatura (15–28°C)' },
      { category: 'B', description: 'Medición Oxígeno disuelto (≥ 5 mg/L)' },
      { category: 'B', description: 'Aspecto visual del agua' },
      { category: 'C', description: 'Color del agua normal' },
      { category: 'C', description: 'Ausencia de espuma o películas en superficie' },
      { category: 'C', description: 'Ausencia de olores inusuales' },
      { category: 'C', description: 'Bordes y muretes sin grietas ni desprendimientos' },
      { category: 'C', description: 'Cierros perimetrales en buen estado' },
      { category: 'C', description: 'Embarcadero y muelle sin daños visibles' },
      { category: 'C', description: 'Rack de botes en buen estado' },
      { category: 'C', description: 'Playas sin residuos peligrosos' },
      { category: 'C', description: 'Señalética de seguridad completa y legible' },
      { category: 'C', description: 'Sin presencia de fauna muerta' },
      { category: 'C', description: 'Sistema de aireación/circulación funcionando' },
      { category: 'D', description: 'Dosificación de floculante registrada' },
      { category: 'D', description: 'Dosificación de algicida registrada (si aplica)' },
    ]
  },
  {
    codigo: 'LV-03', nombre: 'Piscinas 1–3 — Control diario de agua y limpieza', sector: 'Piscinas 1–2–3', frecuencia: 'Diaria',
    scheduleRule: 'daily',
    items: [
      { category: 'A', description: 'EPP y equipos requeridos disponibles' },
      { category: 'B', description: 'Medición pH mañana (rango 7,2–7,6)' },
      { category: 'B', description: 'Medición Cloro libre mañana (1,0–3,0 ppm)' },
      { category: 'B', description: 'Medición Temperatura mañana (24–28°C)' },
      { category: 'C', description: 'Medición pH tarde' },
      { category: 'C', description: 'Medición Cloro libre tarde' },
      { category: 'C', description: 'Medición Temperatura tarde' },
      { category: 'D', description: 'Robot aspirador operando (ciclo nocturno ejecutado)' },
      { category: 'D', description: 'Cepillado manual paredes y bordes' },
      { category: 'D', description: 'Vaciado y limpieza cesta prefiltro bomba' },
      { category: 'D', description: 'Retiro debris flotante (skimmer manual)' },
      { category: 'D', description: 'Limpieza cesto skimmer de pared' },
      { category: 'D', description: 'Limpieza borde perimetral y escalas' },
      { category: 'D', description: 'Piscina habilitada para uso residentes' },
    ]
  },
  {
    codigo: 'LV-04', nombre: 'Playas artificiales — Rastrillado y limpieza', sector: 'Playas 1–2–3', frecuencia: '3x Semanal',
    scheduleRule: '3x_week', // 3 veces por semana (Lun, Mié, Vie)
    weekDay: 1,
    items: [
      { category: 'A', description: 'Herramientas y materiales disponibles' },
      { category: 'B', description: 'Rastrillado profundo de toda la superficie de arena' },
      { category: 'B', description: 'Retiro manual de residuos sólidos' },
      { category: 'B', description: 'Inspección: ausencia de vidrios, metales u objetos cortantes' },
      { category: 'B', description: 'Nivelación de arena en bordes' },
      { category: 'B', description: 'Verificación nivel de arena (mínimo 30cm zona caída)' },
      { category: 'B', description: 'Limpieza de accesos y bordes perimetrales' },
      { category: 'B', description: 'Verificación señalética de playa' },
      { category: 'B', description: 'Inspección estado de reposeras y mobiliario cercano' },
      { category: 'B', description: 'Sin presencia de fauna nociva' },
    ]
  },
  {
    codigo: 'LV-05', nombre: 'Aseo y limpieza — Áreas comunes diaria', sector: 'Club House / Ciclovía / Estacionamientos', frecuencia: 'Diaria',
    scheduleRule: 'daily',
    items: [
      { category: 'A', description: 'Insumos y herramientas de aseo disponibles' },
      { category: 'B', description: 'Barrido y fregado de pisos interiores Club House' },
      { category: 'B', description: 'Limpieza y desinfección de mesones y superficies' },
      { category: 'B', description: 'Limpieza y desinfección completa de baños' },
      { category: 'B', description: 'Reposición de papel higiénico y jabón en baños' },
      { category: 'B', description: 'Vaciado y limpieza de papeleras interiores' },
      { category: 'B', description: 'Limpieza de vidrios y espejos Club House' },
      { category: 'B', description: 'Aseo de quinchos (post-uso): parrillas, mesas, pisos' },
      { category: 'B', description: 'Limpieza de cocina y área de servicios Club House' },
      { category: 'B', description: 'Desinfección de pomos de puertas e interruptores' },
      { category: 'C', description: 'Barrido ciclovía completa con soplador' },
      { category: 'C', description: 'Barrido sendero peatonal completo' },
      { category: 'C', description: 'Retiro de residuos en papeleras del circuito perimetral' },
      { category: 'C', description: 'Limpieza de acceso principal y portería exterior' },
      { category: 'C', description: 'Barrido estacionamientos' },
      { category: 'C', description: 'Limpieza zona de acopio de basura' },
      { category: 'C', description: 'Retiro de hojas y restos en zonas de juegos infantiles' },
    ]
  },
  {
    codigo: 'LV-06', nombre: 'Juegos infantiles — Inspección visual diaria', sector: 'Juegos Infantiles (5 sectores)', frecuencia: 'Diaria',
    scheduleRule: 'daily',
    items: [
      { category: 'A', description: 'Materiales requeridos para la inspección disponibles' },
      { category: 'B', description: 'Ausencia de residuos peligrosos (vidrios, agujas, excrementos)' },
      { category: 'B', description: 'Ausencia de objetos cortantes o filosos' },
      { category: 'B', description: 'Zona de caída sin objetos duros enterrados' },
      { category: 'B', description: 'Piezas metálicas sin bordes cortantes ni astillas' },
      { category: 'B', description: 'Toboganes sin grietas, bordes rotos o astillas' },
      { category: 'B', description: 'Balancines: resortes presentes, sin fracturas visibles' },
      { category: 'B', description: 'Escaleras de acceso: peldaños firmes y antideslizantes' },
      { category: 'B', description: 'Barandas y pasamanos firmes' },
      { category: 'B', description: 'Señalética de seguridad del sector presente y legible' },
      { category: 'B', description: 'Sin presencia de animales o nidos en estructura' },
      { category: 'B', description: 'SECTOR HABILITADO para uso de niños' },
      { category: 'C', description: 'Registro de sectores con cierre preventivo' },
    ]
  },
  {
    codigo: 'LV-07', nombre: 'Laguna — Control técnico semanal', sector: 'Laguna', frecuencia: 'Semanal',
    scheduleRule: 'weekly', weekDay: 1, // Lunes
    items: [
      { category: 'A', description: 'EPP y herramientas semana disponibles' },
      { category: 'B', description: 'Medición pH, turbidez y temperatura (3 puntos)' },
      { category: 'B', description: 'Retiro de algas flotantes con red en toda la orilla' },
      { category: 'B', description: 'Retiro de macroalgas del fondo (cerca de bordes)' },
      { category: 'B', description: 'Dosificación de floculante (según turbidez)' },
      { category: 'B', description: 'Inspección visual completa del perímetro (fotografiar anomalías)' },
      { category: 'B', description: 'Verificación funcionamiento bomba de circulación' },
      { category: 'B', description: 'Limpieza de reja de filtro de entrada' },
      { category: 'B', description: 'Rastrillado profundo playas 1–2–3' },
      { category: 'B', description: 'Registro de todos los parámetros en planilla semanal' },
      { category: 'C', description: 'Registro de parámetros semana (tendencia) completo' },
    ]
  },
  {
    codigo: 'LV-08', nombre: 'Piscinas — Mantenimiento semanal', sector: 'Piscinas 1–2–3', frecuencia: 'Semanal',
    scheduleRule: 'weekly', weekDay: 1, // Lunes
    items: [
      { category: 'A', description: 'Herramientas y materiales semana disponibles' },
      { category: 'B', description: 'Retrolavado de filtros — Girar válvula a BACKWASH' },
      { category: 'B', description: 'Retrolavado — Encender bomba y esperar agua clara' },
      { category: 'B', description: 'Retrolavado — Enjuague 30 segundos' },
      { category: 'B', description: 'Retrolavado — Volver a posición FILTRO y verificar presión' },
      { category: 'B', description: 'Registrar presión de trabajo post-retrolavado' },
      { category: 'C', description: 'Cepillado a fondo de paredes, escalas y fondo' },
      { category: 'C', description: 'Limpieza completa de skimmers de pared' },
      { category: 'C', description: 'Verificación y limpieza de canaletas de rebalse' },
      { category: 'C', description: 'Revisión de bombas (ruido, vibración, temperatura)' },
      { category: 'C', description: 'Verificación de cloro residual y ajuste de dosificación' },
    ]
  },
  {
    codigo: 'LV-09', nombre: 'Áreas verdes — Tareas semanales', sector: 'Jardines / Prados', frecuencia: 'Semanal',
    scheduleRule: 'weekly', weekDay: 2, // Martes
    items: [
      { category: 'A', description: 'Maquinaria y herramientas — verificación pre-jornada' },
      { category: 'B', description: 'Corte de césped por sector' },
      { category: 'B', description: 'Bordeado de canteros y senderos' },
      { category: 'B', description: 'Soplado de restos de corte en ciclovía y senderos' },
      { category: 'B', description: 'Retiro de maleza en canteros y macizos' },
      { category: 'B', description: 'Riego complementario (si no llueve en 48 hrs)' },
      { category: 'C', description: 'Verificación sistema de riego (supervisión diaria incluida)' },
      { category: 'C', description: 'Revisión de aspersores (sin obstrucciones, cobertura ok)' },
      { category: 'C', description: 'Verificación programación controlador de riego' },
    ]
  },
  {
    codigo: 'LV-10', nombre: 'Ciclovía y sendero — Mantenimiento', sector: 'Ciclovía / Sendero Peatonal', frecuencia: 'Semanal',
    scheduleRule: 'weekly', weekDay: 3, // Miércoles
    items: [
      { category: 'A', description: 'Herramientas y materiales disponibles' },
      { category: 'B', description: 'Barrido y soplado completo de ciclovía' },
      { category: 'B', description: 'Barrido de sendero peatonal' },
      { category: 'B', description: 'Retiro de maleza en bordes de ciclovía' },
      { category: 'B', description: 'Inspección visual de pavimento (grietas, hundimientos)' },
      { category: 'B', description: 'Verificación de señalética horizontal y vertical' },
    ]
  },
  {
    codigo: 'LV-11', nombre: 'Inspección quincenal infraestructura', sector: 'Ciclovía / Muelles / Iluminación', frecuencia: 'Quincenal',
    scheduleRule: 'biweekly',
    items: [
      { category: 'A', description: 'Equipos y herramientas disponibles' },
      { category: 'B', description: 'Muelles, embarcadero y rack de botes en buen estado' },
      { category: 'B', description: 'Iluminación exterior — circuito nocturno completo' },
      { category: 'B', description: 'Cierros, portones y accesos en buen estado' },
    ]
  },
  {
    codigo: 'LV-12', nombre: 'Piscinas — Control quincenal completo', sector: 'Piscinas 1–2–3', frecuencia: 'Quincenal',
    scheduleRule: 'biweekly',
    items: [
      { category: 'A', description: 'Materiales y equipos disponibles' },
      { category: 'B', description: 'Análisis completo de parámetros' },
      { category: 'B', description: 'Revisión dosificadores automáticos' },
    ]
  },
  {
    codigo: 'LV-13', nombre: 'Áreas verdes — Mantenimiento mensual', sector: 'Jardines / Prados', frecuencia: 'Mensual',
    scheduleRule: 'monthly', monthWeek: 1, // Primera semana del mes
    items: [
      { category: 'A', description: 'Materiales e insumos del mes disponibles' },
      { category: 'B', description: 'Estado de prados por sector — evaluación mensual' },
      { category: 'B', description: 'Revisión árboles y arbustos' },
    ]
  },
  {
    codigo: 'LV-14', nombre: 'Laguna — Revisión mensual sala de máquinas', sector: 'Laguna / Sala de máquinas', frecuencia: 'Mensual',
    scheduleRule: 'monthly', monthWeek: 4, // Última semana del mes
    items: [
      { category: 'A', description: 'Equipos y herramientas para revisión disponibles' },
      { category: 'B', description: 'Verificación equipos sala de máquinas' },
    ]
  },
  {
    codigo: 'LV-15', nombre: 'Club House — Mantención mensual integral', sector: 'Club House / Canchas / Quinchos', frecuencia: 'Mensual',
    scheduleRule: 'monthly', monthWeek: 2, // Segunda semana del mes
    items: [
      { category: 'A', description: 'Materiales para mantención mensual disponibles' },
      { category: 'B', description: 'Verificación instalaciones eléctricas Club House' },
      { category: 'B', description: 'Verificación instalaciones sanitarias y civil' },
    ]
  },
  {
    codigo: 'LV-16', nombre: 'Juegos infantiles — Inspección técnica mensual', sector: 'Juegos Infantiles', frecuencia: 'Mensual',
    scheduleRule: 'monthly', monthWeek: 2, // Segunda semana
    items: [
      { category: 'A', description: 'Herramientas de inspección técnica disponibles' },
      { category: 'B', description: 'Inspección técnica estructural — por sector' },
      { category: 'B', description: 'Lubricación de articulaciones' },
    ]
  },
  {
    codigo: 'LV-17', nombre: 'Estacionamientos — Mantención mensual', sector: 'Estacionamientos / Acceso', frecuencia: 'Mensual',
    scheduleRule: 'monthly', monthWeek: 1, // Primera semana
    items: [
      { category: 'A', description: 'Herramientas y materiales disponibles' },
      { category: 'B', description: 'Verificación de tareas mensuales' },
      { category: 'B', description: 'Mapa de daños detectados en pavimento' },
    ]
  },
  {
    codigo: 'LV-18', nombre: 'Mantención mayor trimestral', sector: 'Todos los sectores críticos', frecuencia: 'Trimestral',
    scheduleRule: 'quarterly', quarterMonths: [1, 4, 7, 10], // Ene, Abr, Jul, Oct
    items: [
      { category: 'A', description: 'Personal y empresas convocadas' },
      { category: 'B', description: 'Laguna — actividades trimestrales' },
      { category: 'B', description: 'Piscinas — actividades trimestrales' },
      { category: 'B', description: 'Juegos infantiles — actividades trimestrales' },
    ]
  },
  {
    codigo: 'LV-19', nombre: 'Revisión semestral completa', sector: 'Condominio completo', frecuencia: 'Semestral',
    scheduleRule: 'semiannual', semiMonths: [6, 12], // Jun, Dic
    items: [
      { category: 'A', description: 'Certificaciones y servicios externos — verificación semestral' },
      { category: 'B', description: 'Estado de conservación por sector (escala 1-4)' },
      { category: 'B', description: 'Presupuesto semestral — ejecución vs. planificado' },
    ]
  },
  {
    codigo: 'LV-20', nombre: 'Revisión anual — Certificaciones y estado', sector: 'Condominio completo', frecuencia: 'Anual',
    scheduleRule: 'annual', annualMonth: 1, // Enero
    items: [
      { category: 'A', description: 'Certificaciones obligatorias — vigencia al 31 de diciembre' },
      { category: 'B', description: 'KPIs anuales — resultados finales' },
      { category: 'B', description: 'Revisión y aprobación del plan para el próximo año' },
    ]
  },
  // ============================================================
  // NUEVAS LVs DEL PMI (Capítulos 1-6)
  // ============================================================
  {
    codigo: 'LV-21', nombre: 'Multicancha — Inspección mensual', sector: 'Club House — Multicancha', frecuencia: 'Mensual',
    scheduleRule: 'monthly', monthWeek: 1,
    items: [
      { category: 'A', description: 'Galga de fisuras o regla milimétrica' },
      { category: 'A', description: 'Cámara fotográfica / teléfono' },
      { category: 'A', description: 'Llave de torque' },
      { category: 'A', description: 'Marcadores para extremos de fisuras' },
      { category: 'A', description: 'Cinta señalización roja (si se detecta zona de riesgo)' },
      { category: 'B', description: 'Sin fisuras nuevas desde última inspección' },
      { category: 'B', description: 'Fisuras existentes sin aumento de longitud o ancho' },
      { category: 'B', description: 'Sin hundimientos o levantamientos visibles' },
      { category: 'B', description: 'Sin zonas huecas (percusión con martillo)' },
      { category: 'B', description: 'Superficie sin gravas o materiales sueltos' },
      { category: 'C', description: 'Líneas de juego visibles y completas' },
      { category: 'C', description: 'Pintura sin levantamiento ni descascaramiento activo' },
      { category: 'C', description: 'Textura antideslizante presente' },
      { category: 'C', description: 'Rejillas de drenaje perimetral libres de obstrucción' },
      { category: 'C', description: 'Sin acumulación de agua residual post-lluvia' },
      { category: 'D', description: 'Todas las luminarias activas (inspección nocturna)' },
      { category: 'D', description: 'Postes de iluminación sin inclinación ni corrosión visible' },
      { category: 'D', description: 'Tornillos y pernos de cierres metálicos con torque correcto' },
      { category: 'D', description: 'Malla de cierre sin roturas ni aperturas' },
      { category: 'D', description: 'Arcos/tableros firmemente anclados' },
      { category: 'D', description: 'Sin piezas metálicas con bordes cortantes expuestos' },
      { category: 'D', description: 'Señalética de seguridad presente y legible' },
    ]
  },
  {
    codigo: 'LV-22', nombre: 'Cancha pasto sintético — Verificación', sector: 'Club House — Cancha Baby Fútbol', frecuencia: 'Semanal',
    scheduleRule: 'weekly', weekDay: 4, // Jueves
    items: [
      { category: 'A', description: 'Cepillo stiff (fibras rígidas) para levante de fibra' },
      { category: 'A', description: 'Varilla graduada para medición de infill' },
      { category: 'A', description: 'Rastrillo suave para retiro de residuos' },
      { category: 'A', description: 'Cámara fotográfica para registro de daños' },
      { category: 'B', description: 'Sin zonas con fibra completamente aplastada o calva' },
      { category: 'B', description: 'Costuras perimetrales e internas sin levantamientos' },
      { category: 'B', description: 'Nivel de infill en zona de penalti >= 3/4 altura fibra' },
      { category: 'B', description: 'Nivel de infill en zona central >= 3/4 altura fibra' },
      { category: 'B', description: 'Sin residuos orgánicos o inorgánicos incrustados en la fibra' },
      { category: 'C', description: 'Sin acumulación de agua (post-lluvia: verificar en 30 min)' },
      { category: 'C', description: 'Canaletas perimetrales limpias y sin obstrucción' },
      { category: 'C', description: 'Sin ondulaciones ni desniveles visibles en la superficie' },
      { category: 'D', description: 'Arcos firmemente anclados (sin movimiento al jalar)' },
      { category: 'D', description: 'Cierre perimetral sin roturas ni aperturas' },
      { category: 'D', description: 'Sin elementos metálicos con bordes cortantes expuestos' },
      { category: 'D', description: 'Señalética de seguridad presente y legible' },
    ]
  },
  {
    codigo: 'LV-23', nombre: 'Sala de Bombas — Control diario', sector: 'Sala de Máquinas Piscinas', frecuencia: 'Diaria',
    scheduleRule: 'daily',
    items: [
      { category: 'A', description: 'Lectura presión manómetro P1 (anotar valor)' },
      { category: 'A', description: 'Lectura presión manómetro P2 (anotar valor)' },
      { category: 'A', description: 'Lectura presión manómetro P3 (anotar valor)' },
      { category: 'A', description: 'Cloro libre (1-3 ppm) verificado en todas las piscinas' },
      { category: 'A', description: 'pH (7,2-7,6) verificado en todas las piscinas' },
      { category: 'B', description: 'Sin fugas visibles en tuberías, bombas ni válvulas' },
      { category: 'B', description: 'Cesta prefiltro limpiada en todas las bombas' },
      { category: 'B', description: 'Sin olores anormales (quemado, químico) en la sala' },
      { category: 'C', description: 'Medición amperaje bombas (mensual)' },
      { category: 'C', description: 'Temperatura carcasa bombas < 70°C (mensual)' },
      { category: 'C', description: 'Tablero eléctrico: sin calor, olores ni disyuntores saltados' },
      { category: 'C', description: 'Prueba botón TEST diferencial — todos operativos' },
      { category: 'D', description: 'Dosificadores calibrados y entregando dosis correcta' },
      { category: 'D', description: 'Sala de máquinas limpia y ordenada' },
    ]
  },
  {
    codigo: 'LV-24', nombre: 'Sauna — Lista de verificación', sector: 'Club House — Área Wellness', frecuencia: 'Semanal',
    scheduleRule: 'weekly', weekDay: 5, // Viernes
    items: [
      { category: 'A', description: 'Temperatura alcanzada en tiempo normal (anotar minutos)' },
      { category: 'A', description: 'Extractor de aire funcionando (caudal verificado al tacto)' },
      { category: 'A', description: 'Sin olores anormales (quemado, eléctrico, moho)' },
      { category: 'B', description: 'Sensor temperatura: equipo se apaga al alcanzar temp. programada' },
      { category: 'B', description: 'Madera interior: sin astillas, manchas negras ni humedad excesiva' },
      { category: 'B', description: 'Junta puerta de vidrio: cierra correctamente, sin escapes de calor' },
      { category: 'B', description: 'Limpieza interior con solución vinagre diluido realizada' },
      { category: 'C', description: 'Consumo eléctrico medido y comparado con histórico (kWh)' },
      { category: 'C', description: 'Válvula de seguridad: accionada manualmente y libera presión' },
      { category: 'C', description: 'Cableado visible sin deterioro, rozaduras ni signos de quemado' },
      { category: 'C', description: 'Controlador responde correctamente a ajustes de temperatura' },
      { category: 'D', description: 'Tiempo de calentamiento registrado en bitácora (min)' },
      { category: 'D', description: 'Descalcificación ejecutada según protocolo (trimestral)' },
      { category: 'D', description: 'Resistencias inspeccionadas: sin sarro excesivo (trimestral)' },
    ]
  },
  {
    codigo: 'LV-25', nombre: 'Jacuzzi / Spa — Lista de verificación', sector: 'Club House — Área Wellness', frecuencia: 'Diaria',
    scheduleRule: 'daily',
    items: [
      { category: 'A', description: 'pH medido (rango 7,2-7,6)' },
      { category: 'A', description: 'Cloro libre medido (rango 3-5 ppm)' },
      { category: 'A', description: 'Temperatura medida (rango 36-38°C)' },
      { category: 'A', description: 'Nivel de agua adecuado (no por debajo de las boquillas)' },
      { category: 'A', description: 'Sin olores anormales (cloro excesivo, quemado, gas)' },
      { category: 'B', description: 'Filtro de cartucho extraído, lavado y reinstalado (semanal)' },
      { category: 'B', description: 'Sensor temperatura verificado con termómetro externo' },
      { category: 'B', description: 'Sistema alcanza 36-38°C en tiempo normal' },
      { category: 'B', description: 'Boquillas: flujo uniforme al activar el sistema' },
      { category: 'B', description: 'Caldera gas: llama azul, sin hollín, sin olor a gas' },
      { category: 'C', description: 'Diferencial RCD: prueba botón TEST — OPERATIVO (mensual)' },
      { category: 'C', description: 'Consumo eléctrico medido (kWh) y comparado con histórico' },
      { category: 'C', description: 'Limpieza profunda tuberías con limpiador de circuito' },
      { category: 'D', description: 'Tapa/cubierta: cierra correctamente, sin roturas' },
      { category: 'D', description: 'Panel de control: sin humedad interna ni calor anormal' },
    ]
  },
  {
    codigo: 'LV-26', nombre: 'Quincho / Parrillas — Verificación mensual', sector: 'Club House — Áreas Sociales', frecuencia: 'Mensual',
    scheduleRule: 'monthly', monthWeek: 1,
    items: [
      { category: 'A', description: 'Unión manguera-regulador: sin burbujas de jabón' },
      { category: 'A', description: 'Unión regulador-tubería: sin burbujas de jabón' },
      { category: 'A', description: 'Unión tubería-quemador(es): sin burbujas de jabón' },
      { category: 'A', description: 'Estado manguera flexible: sin grietas, sin aplastamientos' },
      { category: 'A', description: 'Regulador de gas sin daño visible ni deformaciones' },
      { category: 'A', description: 'Llave de paso general cierra completamente' },
      { category: 'B', description: 'Campana: sin acumulación de grasa en superficie interior' },
      { category: 'B', description: 'Extractor de aire funcionando correctamente (caudal verificado)' },
      { category: 'B', description: 'Fecha última limpieza profesional conductos registrada' },
      { category: 'B', description: 'Certificado de limpieza conductos vigente (< 3 meses)' },
      { category: 'C', description: 'Quemadores: todos encienden con llama azul uniforme' },
      { category: 'C', description: 'Orificios quemadores libres de obstrucciones' },
      { category: 'C', description: 'Extintor PQS: manómetro en zona verde (presión OK)' },
      { category: 'C', description: 'Extintor: precinto de seguridad intacto' },
      { category: 'C', description: 'Extintor: fecha última recarga dentro de vigencia' },
    ]
  },
]

// Helper: adjust a date to the nearest weekday (Mon-Fri)
// If Saturday -> move to Monday, if Sunday -> move to Monday
function adjustToWeekday(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay()
  if (dow === 0) { // Sunday -> Monday
    d.setDate(d.getDate() + 1)
  } else if (dow === 6) { // Saturday -> Monday
    d.setDate(d.getDate() + 2)
  }
  return d
}

// Helper: check if a date is a weekday (Mon-Fri)
function isWeekday(date: Date): boolean {
  const dow = date.getDay()
  return dow >= 1 && dow <= 5
}

// Helper: get the first business day (Mon-Fri) of a month
function getFirstBusinessDayOfMonth(year: number, month: number): Date {
  let d = 1
  let date = new Date(year, month, d)
  while (!isWeekday(date)) {
    d++
    date = new Date(year, month, d)
  }
  return date
}

// Helper: get the nth occurrence of a specific weekday in a month
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const firstDay = new Date(year, month, 1)
  let firstWeekday = firstDay.getDay()
  let diff = weekday - firstWeekday
  if (diff < 0) diff += 7
  const firstOccurrence = 1 + diff
  if (n === 4) {
    // Last occurrence - find last
    const lastDay = new Date(year, month + 1, 0).getDate()
    let lastOccurrence = firstOccurrence
    while (lastOccurrence + 7 <= lastDay) {
      lastOccurrence += 7
    }
    return new Date(year, month, lastOccurrence)
  }
  return new Date(year, month, firstOccurrence + (n - 1) * 7)
}

// Helper: get all Mondays (or any weekday) in a month
function getWeekdaysInMonth(year: number, month: number, weekday: number): Date[] {
  const dates: Date[] = []
  const firstDay = new Date(year, month, 1)
  let firstWeekday = firstDay.getDay()
  let diff = weekday - firstWeekday
  if (diff < 0) diff += 7
  const firstOccurrence = 1 + diff
  const lastDay = new Date(year, month + 1, 0).getDate()
  for (let d = firstOccurrence; d <= lastDay; d += 7) {
    dates.push(new Date(year, month, d))
  }
  return dates
}

// POST /api/mantenimiento-generate — Auto-generate LVs for a month
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { year, month } = body // month is 0-indexed (0=January)

    if (year === undefined || month === undefined) {
      return NextResponse.json({ error: 'year y month son obligatorios' }, { status: 400 })
    }

    const y = Number(year)
    const m = Number(month)
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const monthStart = new Date(y, m, 1)
    const monthEnd = new Date(y, m, daysInMonth, 23, 59, 59)

    let created = 0
    let skipped = 0

    for (const template of LV_TEMPLATES) {
      // Determine all scheduled dates for this template in this month
      const scheduledDates: Date[] = []

      switch (template.scheduleRule) {
        case 'daily': {
          // Every weekday (Mon-Fri) of the month — NO weekends
          for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(y, m, d)
            if (isWeekday(date)) {
              scheduledDates.push(date)
            }
          }
          break
        }
        case '3x_week': {
          // Monday, Wednesday, Friday
          for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(y, m, d)
            const dow = date.getDay()
            if (dow === 1 || dow === 3 || dow === 5) {
              scheduledDates.push(date)
            }
          }
          break
        }
        case 'weekly': {
          const wd = template.weekDay ?? 1 // Default Monday
          scheduledDates.push(...getWeekdaysInMonth(y, m, wd))
          break
        }
        case 'biweekly': {
          // Days 1 and 15 of the month, adjusted to nearest weekday if weekend
          const d1 = adjustToWeekday(new Date(y, m, 1))
          scheduledDates.push(d1)
          if (daysInMonth >= 15) {
            const d15 = adjustToWeekday(new Date(y, m, 15))
            scheduledDates.push(d15)
          }
          break
        }
        case 'monthly': {
          // First business day of the month
          const targetDate = getFirstBusinessDayOfMonth(y, m)
          scheduledDates.push(targetDate)
          break
        }
        case 'quarterly': {
          const qMonths = template.quarterMonths ?? []
          if (qMonths.includes(m + 1)) {
            const targetDate = getFirstBusinessDayOfMonth(y, m)
            scheduledDates.push(targetDate)
          }
          break
        }
        case 'semiannual': {
          const sMonths = template.semiMonths ?? []
          if (sMonths.includes(m + 1)) {
            const targetDate = getFirstBusinessDayOfMonth(y, m)
            scheduledDates.push(targetDate)
          }
          break
        }
        case 'annual': {
          const aMonth = template.annualMonth ?? 1
          if (m + 1 === aMonth) {
            const targetDate = getFirstBusinessDayOfMonth(y, m)
            scheduledDates.push(targetDate)
          }
          break
        }
      }

      // For each scheduled date, check if LV already exists, if not create it
      for (const date of scheduledDates) {
        // Use local date components to avoid timezone issues
        const localYear = date.getFullYear()
        const localMonth = String(date.getMonth() + 1).padStart(2, '0')
        const localDay = String(date.getDate()).padStart(2, '0')
        const dateStr = `${localYear}-${localMonth}-${localDay}`

        // Check if an LV with this codigo and date already exists
        const existing = await db.mantenimientoLV.findFirst({
          where: {
            codigo: template.codigo,
            scheduledDate: {
              gte: new Date(dateStr + 'T00:00:00.000Z'),
              lte: new Date(dateStr + 'T23:59:59.999Z'),
            },
          },
        })

        if (existing) {
          skipped++
          continue
        }

        // Create the LV with the date set to noon local to avoid timezone shift
        const scheduledDate = new Date(dateStr + 'T12:00:00.000Z')

        await db.mantenimientoLV.create({
          data: {
            codigo: template.codigo,
            nombre: template.nombre,
            sector: template.sector,
            frecuencia: template.frecuencia,
            scheduledDate,
            status: 'PENDIENTE',
            progress: 0,
            items: {
              create: template.items.map((item, idx) => ({
                category: item.category,
                description: item.description,
                status: 'PENDIENTE',
                order: idx,
              })),
            },
          },
        })
        created++
      }
    }

    return NextResponse.json({
      success: true,
      month: m + 1,
      year: y,
      created,
      skipped,
      message: `Se crearon ${created} listas de verificación (${skipped} ya existían)`,
    })
  } catch (error) {
    console.error('Error generating mantenimiento LVs:', error)
    return NextResponse.json({ error: 'Error al generar listas de verificación' }, { status: 500 })
  }
}
