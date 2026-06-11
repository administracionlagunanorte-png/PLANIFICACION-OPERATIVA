const { createServer } = require('http');
const path = require('path');
const fs = require('fs');

// Set env vars before requiring next
process.env.PORT = process.env.PORT || '3000';
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

// Prevent process from exiting
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

// Keep process alive
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`[heartbeat] RSS: ${Math.round(mem.rss/1024/1024)}MB, Heap: ${Math.round(mem.heapUsed/1024/1024)}/${Math.round(mem.heapTotal/1024/1024)}MB, PID: ${process.pid}`);
}, 30000);

const next = require('next');
const app = next({ dev: false, dir: path.join(__dirname) });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });
  
  server.on('error', (err) => {
    console.error('[SERVER ERROR]', err.message);
  });
  
  server.listen(parseInt(process.env.PORT), process.env.HOSTNAME, () => {
    console.log(`[READY] Server running at http://${process.env.HOSTNAME}:${process.env.PORT}`);
  });
  
  server.timeout = 120000;
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}).catch((err) => {
  console.error('[PREPARE ERROR]', err.message);
  console.error(err.stack);
  process.exit(1);
});
