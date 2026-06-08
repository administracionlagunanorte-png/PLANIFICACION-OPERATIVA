#!/bin/bash
while true; do
  if ! curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    # Server not responding, wait for port to be free
    while ss -tlnp 2>/dev/null | grep -q ':3000 '; do
      fuser -k 3000/tcp 2>/dev/null
      sleep 1
    done
    echo "[$(date)] Starting server..." >> /tmp/watchdog.log
    cd /home/z/my-project/.next/standalone
    node server.js >> /tmp/watchdog.log 2>&1 &
  fi
  sleep 5
done
