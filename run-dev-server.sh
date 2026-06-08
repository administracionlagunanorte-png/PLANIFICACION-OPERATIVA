#!/bin/bash
cd /home/z/my-project
while true; do
  PORT=3000 HOSTNAME=0.0.0.0 npx next dev -p 3000 --turbopack 2>&1
  echo "Dev server crashed at $(date). Restarting in 3s..." >&2
  sleep 3
done
