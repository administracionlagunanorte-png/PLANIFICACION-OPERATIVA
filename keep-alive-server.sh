#!/bin/bash
# This script keeps the Next.js server alive by respawning it when it dies
# It also ensures the SWC binary is in the standalone directory

cd /home/z/my-project

# Ensure SWC and Prisma are synced
mkdir -p .next/standalone/node_modules/@next/swc-linux-x64-gnu 2>/dev/null
cp -f node_modules/@next/swc-linux-x64-gnu/next-swc.linux-x64-gnu.node .next/standalone/node_modules/@next/swc-linux-x64-gnu/ 2>/dev/null
cp -f node_modules/@next/swc-linux-x64-gnu/package.json .next/standalone/node_modules/@next/swc-linux-x64-gnu/ 2>/dev/null
cp -rf node_modules/.prisma .next/standalone/node_modules/.prisma 2>/dev/null
cp -rf node_modules/@prisma/client .next/standalone/node_modules/@prisma/client 2>/dev/null

cd .next/standalone

while true; do
  PORT=3000 HOSTNAME=0.0.0.0 node server.js 2>&1
  echo "[$(date)] Server exited. Restarting in 1s..." >&2
  sleep 1
done
