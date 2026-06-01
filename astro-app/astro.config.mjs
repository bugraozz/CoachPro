import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';

function toAllowedDomainPattern(origin) {
  if (!origin) return null;

  try {
    const parsed = new URL(origin.trim());
    if (!/^https?:$/.test(parsed.protocol)) return null;

    return {
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      ...(parsed.port ? { port: parsed.port } : {}),
    };
  } catch {
    return null;
  }
}

function getAllowedDomains() {
  const trustedOrigins = String(process.env.TRUSTED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const candidates = new Set([
    'http://localhost:4321',
    'http://127.0.0.1:4321',
    String(process.env.PUBLIC_APP_URL || '').trim(),
    ...trustedOrigins,
  ]);

  return Array.from(candidates)
    .map((origin) => toAllowedDomainPattern(origin))
    .filter(Boolean);
}

const allowedDomains = getAllowedDomains();

export default defineConfig({
  output: 'server',

  adapter: node({
    mode: 'standalone',
  }),

  integrations: [react()],

  server: {
    port: 4321,
    host: true,
  },

  security: {
    // IyziCo checkout callback hits our webhook with an external POST.
    // We enforce CSRF/origin controls in src/middleware.ts with per-route exemptions,
    // so Astro's global checkOrigin must stay off to allow provider callbacks.
    checkOrigin: false,
    allowedDomains,
  },

  vite: {
    plugins: [tailwindcss()],
  },
});