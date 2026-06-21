const { spawn } = require('child_process');
const fs = require('fs');

const logFd = fs.openSync('/home/z/my-project/server.log', 'w');

const server = spawn('node', ['node_modules/.bin/next', 'dev', '--port', '3000'], {
  cwd: '/home/z/my-project',
  detached: true,
  stdio: ['ignore', logFd, logFd]
});

server.unref();

console.log('Server PID:', server.pid);
fs.writeFileSync('/home/z/my-project/server.pid', String(server.pid));

setTimeout(() => {
  try {
    process.kill(server.pid, 0);
    console.log('Server is running');
  } catch(e) {
    console.log('Server failed to start');
  }
  process.exit(0);
}, 5000);
