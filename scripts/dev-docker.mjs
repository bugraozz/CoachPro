import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const dockerCommand = process.platform === 'win32' ? 'docker.exe' : 'docker';

const children = [];

console.log('[dev:docker] Starting Backend in Docker...');
const backendChild = spawn(dockerCommand, ['compose', 'up', '--build'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
});
children.push({ child: backendChild, label: 'backend' });

console.log('[dev:docker] Starting Mobile (Expo)...');
const mobileChild = spawn(npmCommand, ['--prefix', 'coach-mobile', 'run', 'start', '--', '--clear', '--port', '8082'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
});
children.push({ child: mobileChild, label: 'mobile' });

for (const { child, label } of children) {
  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${label}] exited with signal ${signal}`);
    } else {
      console.log(`[${label}] exited with code ${code}`);
    }
  });
}

let isShuttingDown = false;
function stopAll() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('\n[dev:docker] Shutting down backend Docker containers...');
  spawnSync(dockerCommand, ['compose', 'down'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });

  for (const { child, label } of children) {
    if (!child.killed) {
      console.log(`[dev:docker] Killing ${label}...`);
      child.kill('SIGINT');
    }
  }
}

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAll();
  process.exit(0);
});
