#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting Next.js server..."
  NODE_OPTIONS='--max-old-space-size=256' npx next start -H 0.0.0.0 -p 3000 2>&1
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE, restarting in 3 seconds..."
  sleep 3
done
