#!/usr/bin/env node

import http from 'node:http';
import https from 'node:https';

const baseUrl = (process.env.SECURITY_SMOKE_BASE_URL || 'http://localhost:4321').replace(/\/+$/, '');

function getUrl(pathname) {
  if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
    return pathname;
  }

  return `${baseUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function request(pathname, init = {}) {
  const target = new URL(getUrl(pathname));
  const transport = target.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: init.method || 'GET',
        headers: init.headers || {},
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            text: body,
          });
        });
      },
    );

    req.on('error', (error) => {
      if (error instanceof Error) {
        reject(error);
        return;
      }

      reject(new Error(String(error)));
    });

    if (init.body) {
      req.write(init.body);
    }

    req.end();
  });
}

function expectStatus(testName, actual, expectedList) {
  if (!expectedList.includes(actual)) {
    throw new Error(`${testName}: expected ${expectedList.join(' or ')}, got ${actual}`);
  }
}

async function run() {
  const failures = [];
  const checks = [];

  try {
    const health = await request('/api/analysis/health', { method: 'GET' });
    expectStatus('Health endpoint', health.status, [200]);
  } catch (error) {
    const message = error instanceof Error ? (error.message || 'Unknown error') : String(error || 'Unknown error');
    process.stderr.write(`Base URL is not reachable: ${baseUrl} (${message})\n`);
    process.exit(1);
  }

  checks.push({ name: 'Unauth admin page redirect', run: async () => {
    const result = await request('/admin/users', { method: 'GET' });
    expectStatus('Unauth admin page', result.status, [301, 302, 303]);
  }});

  checks.push({ name: 'Unauth message API blocked', run: async () => {
    const result = await request('/api/messages/security-smoke-user', { method: 'GET' });
    expectStatus('Unauth message API', result.status, [401]);
  }});

  checks.push({ name: 'CSRF write protection', run: async () => {
    const result = await request('/api/weight', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session_token=security-smoke-test',
      },
      body: JSON.stringify({ userId: 'securitysmokeuser1', weight: 80 }),
    });

    expectStatus('CSRF protection for API write', result.status, [403]);
  }});

  checks.push({ name: 'Malformed payment id blocked', run: async () => {
    const result = await request('/api/payments/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '../../etc/passwd' }),
    });

    expectStatus('Malformed payment identifier blocked', result.status, [400]);
  }});

  checks.push({ name: 'Checkout rate limit active', run: async () => {
    const statuses = [];

    for (let i = 0; i < 14; i += 1) {
      const result = await request('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'cmng5izb40006k3cc0c7odl4b' }),
      });

      statuses.push(result.status);
    }

    const hasRateLimited = statuses.includes(429);
    if (!hasRateLimited) {
      throw new Error(`Checkout rate limit not triggered. statuses=${statuses.join(',')}`);
    }
  }});

  checks.push({ name: 'Security headers present', run: async () => {
    const result = await request('/auth/login', { method: 'GET' });

    expectStatus('Login page reachable', result.status, [200]);

    const csp = String(result.headers['content-security-policy'] || '');
    const frame = String(result.headers['x-frame-options'] || '');

    if (!csp.includes("default-src 'self'")) {
      throw new Error('CSP header missing expected default-src policy');
    }

    if (frame.toUpperCase() !== 'DENY') {
      throw new Error(`X-Frame-Options mismatch: ${frame}`);
    }
  }});

  for (const check of checks) {
    try {
      await check.run();
      process.stdout.write(`PASS ${check.name}\n`);
    } catch (error) {
      const message = error instanceof Error
        ? (error.message || error.stack || 'Unknown error')
        : String(error || 'Unknown error');
      failures.push(message);
      process.stderr.write(`FAIL ${check.name}: ${message}\n`);
    }
  }

  if (failures.length > 0) {
    process.stderr.write(`\nSecurity smoke failed with ${failures.length} issue(s).\n`);
    for (const failure of failures) {
      process.stderr.write(`- ${failure}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('\nSecurity smoke passed.\n');
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Fatal error: ${message}\n`);
  process.exit(1);
});
