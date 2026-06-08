#!/bin/bash
# Start the Next.js production server with auto-restart
cd /home/z/my-project

# Sync all required files to standalone directory
sync_standalone() {
  mkdir -p .next/standalone/public
  cp -r public/* .next/standalone/public/ 2>/dev/null
  mkdir -p .next/standalone/.next/static
  cp -r .next/static/* .next/standalone/.next/static/ 2>/dev/null
  cp -r .next/server .next/standalone/.next/ 2>/dev/null
  # Copy Prisma client and engine to standalone for schema changes
  cp -r node_modules/.prisma .next/standalone/node_modules/.prisma 2>/dev/null
  cp -r node_modules/@prisma/client .next/standalone/node_modules/@prisma/client 2>/dev/null
}

sync_standalone

while true; do
  echo "[$(date)] Starting Next.js standalone server..." >> /tmp/server-restart.log
  cd /home/z/my-project/.next/standalone && node server.js >> /tmp/server-restart.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 3s..." >> /tmp/server-restart.log
  sleep 3
done
