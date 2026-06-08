---
Task ID: 3
Agent: Main Agent
Task: Fix 502 Bad Gateway + Fix Gantt export format (PDF/Excel not maintaining visual layout)

Work Log:
- Diagnosed 502 error: server was not running, needed to restart
- Pushed Prisma schema to database (already in sync with Material model)
- Rebuilt Next.js app successfully with no compilation errors
- Rewrote downloadGanttPDF function: replaced html2canvas approach with direct jsPDF rendering
  - Direct drawing of Gantt bars, labels, headers, weekends, today line using jsPDF primitives
  - Custom page width based on chart size for proper formatting
  - Month headers with merged cells, day numbers with weekend/today coloring
  - Task labels with priority color dots, status-colored Gantt bars
  - Legend at bottom with priority and status colors
- Rewrote downloadGanttExcel function: replaced SheetJS (xlsx) with ExcelJS for proper cell styling
  - ExcelJS supports fill colors, fonts, alignment natively (SheetJS community edition ignores styles)
  - Full colored Gantt bars in Excel cells matching status/priority colors
  - Weekend shading, today column highlighting, month header merging
  - Status column with colored fills
  - Legend sheet with colored priority and status rows
- Removed html2canvas-pro and xlsx dependencies from imports, added ExcelJS
- Verified all APIs working: 21 tasks, 10 sectors, 2 materials in database
- Materials feature already fully implemented from previous session (schema, API, UI tab, toggle)

Stage Summary:
- 502 error resolved: server can be started with `npx next dev -H 0.0.0.0` or production build
- Gantt PDF export completely rewritten with direct jsPDF drawing - maintains visual format perfectly
- Gantt Excel export completely rewritten with ExcelJS - proper cell styling now works
- Materials feature verified working (from previous session)
- Build compiles successfully with no errors
