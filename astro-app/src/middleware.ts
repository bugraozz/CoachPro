import type { MiddlewareHandler } from 'astro';
import { randomBytes } from 'crypto';
import { createClient } from 'redis';
import { getUserFromRequest, isBackofficeUser, isCoach, isStudent, isSuperAdmin, requiresPaymentStep } from './lib/auth';
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  getMaintenanceModeStatus,
  type MaintenanceModeStatus,
} from './lib/system-settings';

type RateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
  perPath?: boolean;
  match: (pathname: string, method: string) => boolean;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitState = {
  store: Map<string, RateLimitEntry>;
  requestsSinceCleanup: number;
  redisClient: ReturnType<typeof createClient> | null;
  redisInitPromise: Promise<ReturnType<typeof createClient> | null> | null;
  redisUnavailableUntil: number;
};

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    key: 'auth-login',
    limit: 20,
    windowMs: 15 * 60 * 1000,
    match: (pathname, method) => method === 'POST' && pathname === '/auth/login',
  },
  {
    key: 'auth-register',
    limit: 10,
    windowMs: 15 * 60 * 1000,
    match: (pathname, method) => method === 'POST' && pathname === '/auth/register',
  },
  {
    key: 'checkout',
    limit: 12,
    windowMs: 60 * 1000,
    match: (pathname, method) => method === 'POST' && pathname === '/api/payments/create-checkout-session',
  },
  {
    key: 'analysis-upload',
    limit: 30,
    windowMs: 60 * 1000,
    match: (pathname, method) => method === 'POST' && pathname === '/api/analysis/upload',
  },
  {
    key: 'contact-form',
    limit: 6,
    windowMs: 10 * 60 * 1000,
    match: (pathname, method) => method === 'POST' && pathname === '/api/contact',
  },
  {
    key: 'api-write',
    limit: 90,
    windowMs: 60 * 1000,
    perPath: true,
    match: (pathname, method) => pathname.startsWith('/api/') && UNSAFE_METHODS.has(method),
  },
  {
    key: 'api-read',
    limit: 240,
    windowMs: 60 * 1000,
    perPath: true,
    match: (pathname) => pathname.startsWith('/api/'),
  },
];

const CSRF_EXEMPT_PATHS = new Set([
  '/api/payments/webhook',
]);

const RATE_LIMIT_EXEMPT_PATHS = new Set([
  '/api/payments/webhook',
  '/api/analysis/health',
]);

const RATE_LIMIT_REDIS_URL = String(import.meta.env.RATE_LIMIT_REDIS_URL || import.meta.env.REDIS_URL || '').trim();
const RATE_LIMIT_REDIS_PREFIX = String(import.meta.env.RATE_LIMIT_REDIS_PREFIX || 'coach:rl').trim();
const RATE_LIMIT_REDIS_BACKOFF_MS = 30_000;
const MAINTENANCE_CACHE_TTL_MS = 10_000;

const MAINTENANCE_BYPASS_PATHS = new Set([
  '/auth/login',
  '/auth/logout',
  '/api/analysis/health',
  '/api/payments/webhook',
]);

type MaintenanceModeCacheState = {
  cachedValue: MaintenanceModeStatus | null;
  expiresAt: number;
  pendingPromise: Promise<MaintenanceModeStatus> | null;
};

function getGlobalMaintenanceModeCacheState(): MaintenanceModeCacheState {
  const globalObject = globalThis as typeof globalThis & {
    __coachMaintenanceModeCacheState?: MaintenanceModeCacheState;
  };

  if (!globalObject.__coachMaintenanceModeCacheState) {
    globalObject.__coachMaintenanceModeCacheState = {
      cachedValue: null,
      expiresAt: 0,
      pendingPromise: null,
    };
  }

  return globalObject.__coachMaintenanceModeCacheState;
}

function isStaticAssetPath(pathname: string): boolean {
  if (pathname.startsWith('/_astro/')) return true;
  if (pathname.startsWith('/uploads/')) return true;
  if (pathname.startsWith('/favicon')) return true;
  if (pathname.startsWith('/src/')) return true;

  return /\.[a-z0-9]{2,8}$/i.test(pathname);
}

function shouldBypassMaintenance(pathname: string): boolean {
  return isStaticAssetPath(pathname) || MAINTENANCE_BYPASS_PATHS.has(pathname);
}

async function getCachedMaintenanceModeStatus(): Promise<MaintenanceModeStatus> {
  const cacheState = getGlobalMaintenanceModeCacheState();
  const now = Date.now();

  if (cacheState.cachedValue && cacheState.expiresAt > now) {
    return cacheState.cachedValue;
  }

  if (cacheState.pendingPromise) {
    return cacheState.pendingPromise;
  }

  cacheState.pendingPromise = (async () => {
    try {
      const value = await getMaintenanceModeStatus();
      cacheState.cachedValue = value;
      cacheState.expiresAt = Date.now() + MAINTENANCE_CACHE_TTL_MS;
      return value;
    } finally {
      cacheState.pendingPromise = null;
    }
  })();

  return cacheState.pendingPromise;
}

function createMaintenanceApiResponse(message: string): Response {
  return new Response(
    JSON.stringify({
      error: 'Sistem bakim modunda.',
      message,
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '120',
      },
    },
  );
}

function createMaintenanceHtmlResponse(message: string): Response {
  const safeMessage = String(message || DEFAULT_MAINTENANCE_MESSAGE)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return new Response(
    `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bakim Modu | CoachPro</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: radial-gradient(circle at top, #f9f3f3 0%, #efe8e8 45%, #e8e1e1 100%);
      color: #18181b;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      width: 100%;
      max-width: 560px;
      background: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 16px 30px rgba(0, 0, 0, 0.08);
    }
    h1 {
      margin: 0 0 10px 0;
      font-size: 26px;
      line-height: 1.2;
    }
    p {
      margin: 0;
      color: #4b5563;
      line-height: 1.6;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      border: 1px solid #fca5a5;
      background: #fef2f2;
      color: #b91c1c;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 14px;
    }
  </style>
</head>
<body>
  <section class="card">
    <div class="badge">Bakim Modu</div>
    <h1>Sistem Gecici Olarak Kapali</h1>
    <p>${safeMessage}</p>
  </section>
</body>
</html>`,
    {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Retry-After': '120',
      },
    },
  );
}

function getGlobalRateLimitState(): RateLimitState {
  const globalObject = globalThis as typeof globalThis & {
    __coachRateLimitState?: RateLimitState;
  };

  if (!globalObject.__coachRateLimitState) {
    globalObject.__coachRateLimitState = {
      store: new Map<string, RateLimitEntry>(),
      requestsSinceCleanup: 0,
      redisClient: null,
      redisInitPromise: null,
      redisUnavailableUntil: 0,
    };
  }

  return globalObject.__coachRateLimitState;
}

async function getRedisClient(state: RateLimitState): Promise<ReturnType<typeof createClient> | null> {
  if (!RATE_LIMIT_REDIS_URL) {
    return null;
  }

  const now = Date.now();
  if (state.redisUnavailableUntil > now) {
    return null;
  }

  if (state.redisClient?.isReady) {
    return state.redisClient;
  }

  if (state.redisInitPromise) {
    return state.redisInitPromise;
  }

  state.redisInitPromise = (async () => {
    try {
      if (!state.redisClient) {
        state.redisClient = createClient({
          url: RATE_LIMIT_REDIS_URL,
          socket: {
            connectTimeout: 1000,
            reconnectStrategy: () => false,
          },
        });

        state.redisClient.on('error', () => {
          // Fallback to in-memory when Redis is temporarily unavailable.
        });
      }

      if (!state.redisClient.isOpen) {
        await state.redisClient.connect();
      }

      if (!state.redisClient.isReady) {
        return null;
      }

      return state.redisClient;
    } catch {
      state.redisUnavailableUntil = Date.now() + RATE_LIMIT_REDIS_BACKOFF_MS;

      if (state.redisClient?.isOpen) {
        try {
          await state.redisClient.disconnect();
        } catch {
          // Ignore disconnect errors.
        }
      }

      return null;
    } finally {
      state.redisInitPromise = null;
    }
  })();

  return state.redisInitPromise;
}

function getClientIp(request: Request, fallbackClientAddress: string): string {
  const cloudflareIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cloudflareIp) return cloudflareIp;

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return fallbackClientAddress || 'unknown';
}

function cleanupExpiredRateLimitEntries(state: RateLimitState, now: number): void {
  state.requestsSinceCleanup += 1;
  if (state.requestsSinceCleanup < 100) {
    return;
  }

  state.requestsSinceCleanup = 0;

  for (const [key, value] of state.store.entries()) {
    if (value.resetAt <= now) {
      state.store.delete(key);
    }
  }
}

function resolveRateLimitRule(pathname: string, method: string): RateLimitRule | null {
  for (const rule of RATE_LIMIT_RULES) {
    if (rule.match(pathname, method)) {
      return rule;
    }
  }

  return null;
}

function createRateLimitResponse(pathname: string, retryAfterSeconds: number): Response {
  const isApi = pathname.startsWith('/api/');

  if (isApi) {
    return new Response(
      JSON.stringify({ error: 'Cok fazla istek gonderildi. Lutfen tekrar deneyin.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSeconds),
        },
      },
    );
  }

  return new Response('Too Many Requests', {
    status: 429,
    headers: {
      'Retry-After': String(retryAfterSeconds),
    },
  });
}

function applyRateLimitInMemory(rule: RateLimitRule, pathname: string, bucketKey: string): Response | null {
  const now = Date.now();
  const state = getGlobalRateLimitState();
  cleanupExpiredRateLimitEntries(state, now);

  const existing = state.store.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    state.store.set(bucketKey, {
      count: 1,
      resetAt: now + rule.windowMs,
    });
    return null;
  }

  if (existing.count >= rule.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return createRateLimitResponse(pathname, retryAfterSeconds);
  }

  existing.count += 1;
  state.store.set(bucketKey, existing);
  return null;
}

async function applyRateLimit(request: Request, pathname: string, method: string, clientAddress: string): Promise<Response | null> {
  if (RATE_LIMIT_EXEMPT_PATHS.has(pathname)) {
    return null;
  }

  const rule = resolveRateLimitRule(pathname, method);
  if (!rule) {
    return null;
  }

  const state = getGlobalRateLimitState();

  const clientIp = getClientIp(request, clientAddress);
  const bucketSuffix = rule.perPath ? `${pathname}:${clientIp}` : clientIp;
  const bucketKey = `${rule.key}:${bucketSuffix}`;

  const redisClient = await getRedisClient(state);
  if (!redisClient) {
    return applyRateLimitInMemory(rule, pathname, bucketKey);
  }

  const redisBucketKey = `${RATE_LIMIT_REDIS_PREFIX}:${bucketKey}`;

  try {
    const hitCount = await redisClient.incr(redisBucketKey);
    if (hitCount === 1) {
      await redisClient.pExpire(redisBucketKey, rule.windowMs);
      return null;
    }

    if (hitCount > rule.limit) {
      const pttl = await redisClient.pTTL(redisBucketKey);
      const retryAfterSeconds = Math.max(1, Math.ceil((pttl > 0 ? pttl : rule.windowMs) / 1000));
      return createRateLimitResponse(pathname, retryAfterSeconds);
    }

    return null;
  } catch {
    state.redisUnavailableUntil = Date.now() + RATE_LIMIT_REDIS_BACKOFF_MS;
    return applyRateLimitInMemory(rule, pathname, bucketKey);
  }
}

function getAllowedOrigins(request: Request): Set<string> {
  const origins = new Set<string>();

  const trustedOriginsRaw = String(import.meta.env.TRUSTED_ORIGINS || '').trim();
  if (trustedOriginsRaw) {
    for (const candidate of trustedOriginsRaw.split(',')) {
      const trimmed = candidate.trim();
      if (!trimmed) continue;
      try {
        origins.add(new URL(trimmed).origin);
      } catch {
        // Ignore malformed trusted origin entries.
      }
    }
  }

  const envOrigin = String(import.meta.env.PUBLIC_APP_URL || '').trim();
  if (envOrigin && /^https?:\/\//.test(envOrigin)) {
    try {
      origins.add(new URL(envOrigin).origin);
    } catch {
      // Fall through to request origin.
    }
  }

  origins.add(new URL(request.url).origin);
  return origins;
}

function extractRequestOrigin(request: Request): string | null {
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    try {
      return new URL(originHeader).origin;
    } catch {
      return null;
    }
  }

  const refererHeader = request.headers.get('referer');
  if (refererHeader) {
    try {
      return new URL(refererHeader).origin;
    } catch {
      return null;
    }
  }

  return null;
}

function requiresCsrfValidation(pathname: string, method: string, cookieHeader: string | null): boolean {
  if (!pathname.startsWith('/api/')) return false;
  if (!UNSAFE_METHODS.has(method)) return false;
  if (!cookieHeader) return false;
  if (CSRF_EXEMPT_PATHS.has(pathname)) return false;

  return true;
}

async function applySecurityHeaders(request: Request, response: Response, cspNonce: string): Promise<Response> {
  const headers = new Headers(response.headers);
  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  const isHttps = requestUrl.protocol === 'https:' || forwardedProto === 'https';
  const contentType = headers.get('content-type') || '';
  const isHtmlResponse = contentType.toLowerCase().includes('text/html');

  let responseBody: BodyInit | null = response.body;

  if (isHtmlResponse) {
    const html = await response.text();
    const htmlWithNonce = html.replace(/<script(?![^>]*\bnonce=)/gi, `<script nonce="${cspNonce}"`);
    responseBody = htmlWithNonce;
    headers.delete('content-length');
  }

  const scriptSrc = import.meta.env.PROD
    ? `'self' 'nonce-${cspNonce}'`
    : `'self' 'unsafe-inline' 'unsafe-eval' 'nonce-${cspNonce}'`;

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    "font-src 'self' data:",
    "connect-src 'self' ws: wss: http: https:",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set('Content-Security-Policy', csp);

  if (import.meta.env.PROD && isHttps) {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return new Response(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request, url } = context;
  const pathname = url.pathname;
  const method = request.method.toUpperCase();
  const cspNonce = randomBytes(16).toString('base64url');
  context.locals.cspNonce = cspNonce;

  const isPublicMobileAuthRoute =
    pathname === '/api/mobile/auth/login' ||
    pathname === '/api/mobile/auth/register' ||
    pathname === '/api/mobile/auth/forgot-password' ||
    pathname === '/api/mobile/auth/reset-password';

  const isPublicApiAuthRoute = pathname === '/api/auth/login';

  if (isPublicMobileAuthRoute || isPublicApiAuthRoute) {
    return applySecurityHeaders(request, await next(), cspNonce);
  }

  const maintenanceMode = await getCachedMaintenanceModeStatus();
  if (maintenanceMode.enabled && !shouldBypassMaintenance(pathname)) {
    const currentUser = await getUserFromRequest(request);
    const canBypassMaintenance = Boolean(currentUser && isBackofficeUser(currentUser));

    if (!canBypassMaintenance) {
      const maintenanceMessage = maintenanceMode.message || DEFAULT_MAINTENANCE_MESSAGE;
      const maintenanceResponse = pathname.startsWith('/api/')
        ? createMaintenanceApiResponse(maintenanceMessage)
        : createMaintenanceHtmlResponse(maintenanceMessage);

      return applySecurityHeaders(request, maintenanceResponse, cspNonce);
    }
  }

  const rateLimitResponse = await applyRateLimit(request, pathname, method, context.clientAddress);
  if (rateLimitResponse) {
    return applySecurityHeaders(request, rateLimitResponse, cspNonce);
  }

  const cookieHeader = request.headers.get('cookie');
  if (requiresCsrfValidation(pathname, method, cookieHeader)) {
    const allowedOrigins = getAllowedOrigins(request);
    const requestOrigin = extractRequestOrigin(request);

    if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
      const csrfResponse = new Response(
        JSON.stringify({ error: 'CSRF dogrulamasi basarisiz.' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      );

      return applySecurityHeaders(request, csrfResponse, cspNonce);
    }
  }

  // ===============================
  // ROLE-BASED ROUTE ACCESS CONTROL
  // ===============================

  const isApi = pathname.startsWith('/api/');
  const isAuthRoute = pathname.startsWith('/auth/');
  const isPublicRoute = 
    pathname === '/' || 
    isAuthRoute || 
    pathname === '/privacy' || 
    pathname === '/terms' || 
    pathname === '/faq' || 
    pathname === '/about' || 
    pathname === '/contact' ||
    isStaticAssetPath(pathname) ||
    pathname === '/api/contact' ||
    pathname === '/api/payments/webhook' ||
    pathname === '/api/payments/create-checkout-session' ||
    pathname === '/api/mobile/payments/create-checkout-session' ||
    pathname === '/api/analysis/health' ||
    pathname.startsWith('/api/auth/forgot-password') ||
    pathname.startsWith('/api/auth/reset-password') ||
    pathname.startsWith('/api/mobile/auth/');

  if (!isPublicRoute) {
    const user = await getUserFromRequest(request);

    // Oturum yoksa login'e at
    if (!user) {
      if (isApi) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      return context.redirect('/auth/login', 302);
    }

    // 1. Admin / SuperAdmin Rotaları
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (!isBackofficeUser(user)) {
        if (isApi) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
        return context.redirect(isCoach(user) ? '/dashboard' : isStudent(user) ? '/progress' : '/', 302);
      }
      
      // Süperadmin özel sayfaları
      if (pathname.startsWith('/admin/security') && !isSuperAdmin(user)) {
        if (isApi) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
        return context.redirect('/admin', 302);
      }
    }
    // 2. Coach (Eğitmen) Rotaları
    else if (
        pathname.startsWith('/dashboard') || 
        pathname.startsWith('/clients') || 
        pathname.startsWith('/programs') || 
        pathname.startsWith('/diet') ||
        (pathname.startsWith('/api/') && !pathname.startsWith('/api/admin') && !pathname.startsWith('/api/measurements') && !pathname.startsWith('/api/weight') && !pathname.startsWith('/api/messages')) 
        // Eğitmene özgü sayfalar: (Not: Mesajlar vs. dinamik rol kontrolüne sahip olabilir. Şimdilik admin vs değilse ve public değilse bakılır)
    ) {
      // Coach yetkisi var mı? 
      // (Öğrencilerin de api endpointleri veya ui viewları olabilir, ama /dashboard, /clients kesinlikle coachtur)
      if (pathname.startsWith('/dashboard') || pathname.startsWith('/clients') || pathname.startsWith('/api/clients') || pathname.startsWith('/api/programs/templates')) {
         if (!isCoach(user)) {
            if (isApi) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
            return context.redirect(isBackofficeUser(user) ? '/admin' : '/progress', 302);
         }
      }

      // Eğitmen ise, Ödeme kilitli mi?
      if (isCoach(user) && requiresPaymentStep(user)) {
         // Fatura/plan sayfasına değilse blokla
         if (!pathname.startsWith('/auth/payment') && !pathname.startsWith('/api/payments')) {
             if (isApi) return new Response(JSON.stringify({ error: 'Payment Required' }), { status: 403 });
             return context.redirect(`/auth/payment?userId=${user.id}`, 302);
         }
      }
    }
    // 3. Öğrenci Rotaları
    else if (
        pathname.startsWith('/progress') || 
        pathname.startsWith('/students')
    ) {
        // Hem öğrenci hem koç erişebilir. 
        if (!isStudent(user) && !isCoach(user)) {
           if (isApi) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
           return context.redirect('/', 302);
        }

        if (isStudent(user) && requiresPaymentStep(user)) {
           if (!pathname.startsWith('/auth/payment') && !pathname.startsWith('/api/payments')) {
              if (isApi) return new Response(JSON.stringify({ error: 'Payment Required' }), { status: 403 });
              return context.redirect(`/auth/payment?userId=${user.id}`, 302);
           }
        }
    }
  }

  const response = await next();
  return applySecurityHeaders(request, response, cspNonce);
};
