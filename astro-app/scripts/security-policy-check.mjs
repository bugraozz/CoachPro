#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const workspaceRoot = process.cwd();
const apiRoot = resolve(workspaceRoot, 'astro-app', 'src', 'pages', 'api');
const auditResultsPath = resolve(workspaceRoot, 'security-full-audit-results.json');

async function walkFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeEndpointPattern(filePath) {
  let rel = relative(apiRoot, filePath).replace(/\\/g, '/');

  if (rel.endsWith('/index.ts')) {
    rel = rel.slice(0, -('/index.ts'.length));
  } else if (rel.endsWith('.ts')) {
    rel = rel.slice(0, -('.ts'.length));
  }

  return `/api/${rel}`;
}

function parseMethods(source) {
  const methods = new Set();
  const methodRegex = /export\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*:/g;
  let match = methodRegex.exec(source);

  while (match) {
    methods.add(match[1]);
    match = methodRegex.exec(source);
  }

  return [...methods];
}

function routeMatchesPattern(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  for (let i = 0, j = 0; i < patternParts.length; i += 1, j += 1) {
    const segment = patternParts[i];

    if (/^\[\.\.\..+\]$/.test(segment)) {
      return j < pathParts.length;
    }

    if (j >= pathParts.length) {
      return false;
    }

    if (/^\[.+\]$/.test(segment)) {
      continue;
    }

    if (segment !== pathParts[j]) {
      return false;
    }
  }

  return patternParts.length === pathParts.length;
}

function formatMethodEndpoint(method, endpoint) {
  return `${method} ${endpoint}`;
}

async function main() {
  const apiFiles = await walkFiles(apiRoot);
  const required = [];

  for (const apiFile of apiFiles) {
    const source = await readFile(apiFile, 'utf8');
    const endpoint = normalizeEndpointPattern(apiFile);
    const methods = parseMethods(source);

    for (const method of methods) {
      required.push({ method, endpoint, sourceFile: apiFile });
    }
  }

  let rawResults;
  try {
    rawResults = await readFile(auditResultsPath, 'utf8');
  } catch {
    console.error('security-full-audit-results.json bulunamadi. Once npm run security:audit calistirin.');
    process.exit(1);
  }

  let auditResults;
  try {
    auditResults = JSON.parse(rawResults);
  } catch {
    console.error('security-full-audit-results.json gecersiz JSON.');
    process.exit(1);
  }

  if (!Array.isArray(auditResults)) {
    console.error('security-full-audit-results.json dizi formatinda olmali.');
    process.exit(1);
  }

  const failedAuditCases = auditResults.filter((item) => item && item.pass === false);

  const missingCoverage = [];
  for (const requiredItem of required) {
    const hasCoverage = auditResults.some((result) => {
      if (!result || typeof result !== 'object') return false;
      if (String(result.method || '').toUpperCase() !== requiredItem.method) return false;
      const resultPath = String(result.path || '');
      return routeMatchesPattern(requiredItem.endpoint, resultPath);
    });

    if (!hasCoverage) {
      missingCoverage.push(requiredItem);
    }
  }

  if (missingCoverage.length > 0) {
    console.error('Guvenlik policy ihlali: Asagidaki endpoint-method kombinasyonlari icin audit coverage yok.');
    for (const item of missingCoverage) {
      const relativeSource = relative(workspaceRoot, item.sourceFile).replace(/\\/g, '/');
      console.error(`- ${formatMethodEndpoint(item.method, item.endpoint)} | kaynak: ${relativeSource}`);
    }
    process.exit(1);
  }

  if (failedAuditCases.length > 0) {
    console.error('Guvenlik policy ihlali: security:audit basarisiz case iceriyor.');
    for (const item of failedAuditCases) {
      console.error(`- ${item.name} | ${item.method} ${item.path} | status=${item.status} | expected=${item.expected}`);
    }
    process.exit(1);
  }

  console.log(`Security policy passed. Endpoint-method coverage: ${required.length}, failed audit case: 0`);
}

main().catch((error) => {
  console.error('Policy kontrolu calisirken hata olustu:', error);
  process.exit(1);
});
