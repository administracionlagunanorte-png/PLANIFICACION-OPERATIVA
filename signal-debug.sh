#!/bin/bash
trap 'echo "Got SIGTERM at $(date)" >> /tmp/signals.log' SIGTERM
trap 'echo "Got SIGINT at $(date)" >> /tmp/signals.log' SIGINT
trap 'echo "Got SIGHUP at $(date)" >> /tmp/signals.log' SIGHUP
trap 'echo "Got SIGKILL at $(date)" >> /tmp/signals.log' SIGKILL

cd /home/z/my-project/.next/standalone
echo "Starting server at $(date)" >> /tmp/signals.log
node server.js >> /tmp/signals.log 2>&1
echo "Server exited at $(date) with code $?" >> /tmp/signals.log
