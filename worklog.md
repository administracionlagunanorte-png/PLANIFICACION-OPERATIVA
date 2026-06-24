---
Task ID: 1
Agent: Main Agent
Task: Fix missing Alertas module visibility

Work Log:
- Investigated project structure - Next.js 16 SPA with tab navigation
- Found AlertasPanel.tsx already exists in code (commit 45e2148)
- Found Alertas button already exists in HomeClient.tsx navigation (line 3364-3371)
- Identified root cause: navigation bar used `overflow-x-auto scrollbar-none` which hides overflowed buttons without scrollbar
- Changed to `flex-wrap` so all navigation tabs are visible
- Fixed database configuration: changed Prisma from PostgreSQL to SQLite for local dev
- Fixed `mode: 'insensitive'` in 5 API files (SQLite incompatible)
- Removed `@db.Text` from Prisma schema (SQLite incompatible)
- Created seed script and seeded DB with admin user + 14 alerts across 6 modules
- Reverted SQLite changes in git, kept only the flex-wrap fix
- Pushed all commits to GitHub (origin/main now includes AlertasPanel + flex-wrap fix)
- Server runs briefly but gets killed by container process management

Stage Summary:
- Code fix: changed `overflow-x-auto scrollbar-none` to `flex-wrap` in navigation container
- All Alertas code (panel, API, components) was already in the codebase
- Pushed 6 commits to GitHub including the AlertasPanel and navigation fix
- Local server works but container kills the process after ~10 seconds
- Vercel should auto-deploy the latest code from GitHub
- Admin credentials: admin@lagunanorte.cl / admin123
