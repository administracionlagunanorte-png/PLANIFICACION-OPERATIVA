---
Task ID: 2
Agent: Main Agent
Task: Fix Gantt PDF/Excel export format + Add Materials tab feature

Work Log:
- Analyzed uploaded screenshot showing broken Gantt export format
- Fixed PDF export: changed from canvas-size pages to A3 landscape with proper scaling, margins, and multi-page support for very wide charts
- Fixed Excel export: added weekend shading, today marker, chronological sorting, month header merging, status-based bar colors, Total Materiales column
- Added Material model to Prisma schema with fields: name, quantity, unit, unitPrice, totalPrice, category, notes
- Created /api/materials API route with full CRUD (GET, POST, PUT, DELETE)
- Added Materials tab in UI view switcher with Package icon
- Materials tab shows: summary cards (total materials, tasks with materials, total cost), per-task material tables, add/edit/delete materials
- Added materials toggle switch for table/card views
- Added material dialog form with all fields
- Build verified successful, all APIs working

Stage Summary:
- Gantt PDF export fixed with A3 landscape format and proper image scaling
- Gantt Excel export fixed with weekend shading, status colors, chronological sort, month headers
- Materials feature fully implemented: schema, API, UI tab, toggle visibility
- 2 test materials created successfully via API
- All 21 tasks, 10 sectors, materials API working
