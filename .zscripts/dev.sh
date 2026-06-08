#!/bin/bash
cd /home/z/my-project

# Setup database
npx prisma generate 2>/dev/null
npx prisma db push --skip-generate 2>/dev/null

# Build if needed
if [ ! -f ".next/standalone/server.js" ]; then
  npx next build
fi

# Ensure standalone is fully prepared
cp -r .next/static .next/standalone/.next/ 2>/dev/null
cp -r public .next/standalone/ 2>/dev/null
mkdir -p .next/standalone/uploads
cp .env .next/standalone/.env 2>/dev/null

# Start server using start-stop-daemon for proper daemonization
# This ensures the server survives process group cleanup
mkdir -p /tmp/run

# Stop any existing server
if [ -f /tmp/run/next-server.pid ]; then
  start-stop-daemon --stop --pidfile /tmp/run/next-server.pid 2>/dev/null || true
  rm -f /tmp/run/next-server.pid
fi

# Wait for port to be free
while ss -tlnp 2>/dev/null | grep -q ':3000 '; do
  fuser -k 3000/tcp 2>/dev/null
  sleep 1
done

# Start the server with auto-restart loop
start-stop-daemon --start --background --make-pidfile --pidfile /tmp/run/next-server.pid \
  --exec /bin/bash -- -c "cd /home/z/my-project/.next/standalone && while true; do node server.js; sleep 2; done"

echo "[$(date)] Server started via start-stop-daemon" >> /tmp/server-lifecycle.log
