const { spawn } = require('child_process');

console.log('Starting keep-alive monitor...');

function startServer() {
  const start = Date.now();
  console.log('[' + new Date().toISOString() + '] Starting Next.js server...');
  
  const child = spawn('node', ['--max-old-space-size=256', 'node_modules/.bin/next', 'start', '-H', '0.0.0.0', '-p', '3000'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, PORT: '3000' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.log('[next] ' + msg);
  });

  child.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg && !msg.includes('prisma:query')) console.error('[next:err] ' + msg);
  });

  child.on('exit', (code, signal) => {
    const uptime = Math.round((Date.now() - start) / 1000);
    console.log('[' + new Date().toISOString() + '] Server exited: code=' + code + ' signal=' + signal + ' uptime=' + uptime + 's');
    const delay = uptime < 5 ? 10000 : 3000;
    console.log('Restarting in ' + (delay/1000) + 's...');
    setTimeout(startServer, delay);
  });

  child.on('error', (err) => {
    console.error('Failed to start:', err.message);
    setTimeout(startServer, 5000);
  });
}

process.on('SIGTERM', () => { console.log('Received SIGTERM, exiting...'); process.exit(0); });
process.on('SIGINT', () => { console.log('Received SIGINT, exiting...'); process.exit(0); });

startServer();
