import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const commands = [
  {
    label: 'web',
    args: ['--prefix', 'astro-app', 'run', 'dev', '--', '--host', '0.0.0.0'],
  },
  {
    label: 'mobile',
    args: ['--prefix', 'coach-mobile', 'run', 'start', '--', '--clear', '--port', '8082'],
  },
];

const children = commands.map(({ label, args }) => {
  const child = spawn(npmCommand, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${label}] exited with signal ${signal}`);
    } else {
      console.log(`[${label}] exited with code ${code}`);
    }
  });

  return child;
});

function stopAll() {
  for (const child of children) {
    if (!child.killed) {
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