#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=256"
while true; do
  node node_modules/.bin/next start -H 0.0.0.0 -p 3000 2>&1
  echo "[$(date)] Server crashed, restarting in 5s..."
  sleep 5
done
