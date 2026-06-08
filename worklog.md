---
Task ID: 1
Agent: Main Agent
Task: Add work order numbering to task table and sort Gantt chart by work order

Work Log:
- Added `workOrder` Int field (default 0) to Task model in Prisma schema
- Ran `prisma db push` to migrate the database
- Updated API route (src/app/api/tasks/route.ts):
  - GET: Tasks now sorted by workOrder ASC, then createdAt DESC
  - POST: Auto-assigns next sequential workOrder if not provided
  - PUT: Handles workOrder updates with proper parsing
  - Added 'workOrder' to trackableFields for history logging
  - Added 'Orden de Trabajo' to FIELD_LABELS
- Updated page.tsx:
  - Added `workOrder: number` to Task interface
  - Added `handleUpdateWorkOrder` function for inline editing
  - Added "N° Orden" column to table header with inline editable input
  - Updated colSpan for empty state row
  - Updated filteredTasks sorting: workOrder > 0 first (ascending), then by createdAt
  - Updated tasksWithDates sorting for Gantt: same workOrder-first logic
  - Gantt chart rows now show workOrder number as a badge before task name
  - Increased Gantt task label width from 250px to 280px to accommodate badge
  - Updated Excel Gantt export: added 'N° Orden' header, workOrder data, fixed column indexes
  - Updated PDF table export: added 'N°' column with styled badge, fixed all column index refs
  - Updated individual task PDF: prepends workOrder number to activity name
  - Updated individual task Excel: added 'N° Orden' info row
- Assigned sequential workOrders (1-21) to all existing tasks via script
- Fixed critical deployment issue: standalone server was serving stale content
  - Root cause: old node processes still running on port 3000
  - Fix: Must use `lsof`/`fuser` to find and kill specific PIDs, not just `pkill`
- Updated start-server.sh to copy Prisma client files to standalone directory

Stage Summary:
- Tasks now have editable work order numbers in the table
- Gantt chart sorts by work order (ascending)
- All exports (PDF table, PDF individual, Excel Gantt, Excel individual) include work order
- Database has 21 tasks with workOrders 1-21 assigned
- Server running on port 3000, accessible via Caddy on port 81

---
Task ID: 2
Agent: Main Agent
Task: Fix Gantt chart not appearing - rebuild and redeploy production server

Work Log:
- User reported Gantt chart not appearing (screenshot showed empty Gantt with "0 de 21 tareas tienen fechas asignadas")
- Analyzed screenshot via VLM: confirmed Gantt tab was selected but showed empty state message about missing dates
- Investigated: found that the production server was not running (no node process on port 3000)
- The code already correctly shows ALL tasks in the Gantt (even those without dates, using dashed lines)
- Rebuilt the Next.js application with `npm run build`
- Restarted the production server and verified it responds with HTTP 200
- Encountered client-side hydration error on initial production deployment (blank page / "Application error")
- Debugged: found server was repeatedly crashing due to port conflicts from multiple start attempts
- Cleaned up all stale processes and restarted server cleanly
- Verified Gantt chart renders correctly in production: shows 21 tasks with "Sin fechas" dashed lines
- Confirmed Caddy proxy on port 81 correctly serves the page
- Verified via browser automation: Gantt tab works, shows task rows with dashed lines for tasks without dates

Stage Summary:
- Gantt chart now displays all 21 tasks even without assigned dates
- Tasks without dates show "Sin fechas" label and dashed line placeholder
- Tasks with dates will show colored bars as before
- Production server running on port 3000, accessible via Caddy on port 81
- The issue was a stale/offline server, not a code problem
