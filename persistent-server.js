const { fork } = require('child_process');
const path = require('path');

function startServer() {
  console.log(`[${new Date().toISOString()}] Starting server...`);
  const child = fork(path.join(__dirname, '.next/standalone/server.js'), [], {
    cwd: path.join(__dirname, '.next/standalone'),
    env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0' },
    stdio: 'inherit'
  });
  
  child.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Server exited with code ${code}, signal ${signal}. Restarting in 2s...`);
    setTimeout(startServer, 2000);
  });
  
  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Server error:`, err);
    setTimeout(startServer, 2000);
  });
}

startServer();
