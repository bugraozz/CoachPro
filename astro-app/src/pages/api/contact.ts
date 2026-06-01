import type { APIRoute } from 'astro';

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  website?: unknown;
  submittedAt?: unknown;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 160;
const MAX_SUBJECT_LENGTH = 140;
const MAX_MESSAGE_LENGTH = 2500;
const MIN_MESSAGE_LENGTH = 10;
const MIN_FORM_FILL_MS = 2000;
const MAX_LINK_COUNT = 3;

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function extractClientIp(request: Request, fallbackClientAddress: string): string {
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

function hasSuspiciousLinkCount(value: string): boolean {
  const linkMatches = value.match(/https?:\/\//gi);
  return Boolean(linkMatches && linkMatches.length > MAX_LINK_COUNT);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function forwardContactPayload(payload: Record<string, unknown>): Promise<void> {
  const webhookUrl = String(import.meta.env.CONTACT_WEBHOOK_URL || '').trim();
  if (!webhookUrl) {
    console.info('Contact form submission received (no CONTACT_WEBHOOK_URL configured).', payload);
    return;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook returned status ${response.status}`);
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const contentType = String(request.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return new Response(JSON.stringify({ error: 'JSON formatinda istek gonderilmelidir.' }), {
      status: 415,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Gecersiz JSON govdesi.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isObject(rawBody)) {
    return new Response(JSON.stringify({ error: 'Istek govdesi gecersiz.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = rawBody as ContactPayload;

  const website = normalizeText(body.website);
  if (website) {
    return new Response(JSON.stringify({ success: true, accepted: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const name = normalizeText(body.name);
  const email = normalizeText(body.email).toLowerCase();
  const subject = normalizeText(body.subject);
  const message = normalizeText(body.message);
  const submittedAt = normalizeText(body.submittedAt);

  if (name.length < 2 || name.length > MAX_NAME_LENGTH) {
    return new Response(JSON.stringify({ error: 'Ad Soyad 2-80 karakter araliginda olmalidir.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
    return new Response(JSON.stringify({ error: 'Gecerli bir e-posta adresi giriniz.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (subject.length < 3 || subject.length > MAX_SUBJECT_LENGTH) {
    return new Response(JSON.stringify({ error: 'Konu 3-140 karakter araliginda olmalidir.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (message.length < MIN_MESSAGE_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
    return new Response(JSON.stringify({ error: 'Mesaj 10-2500 karakter araliginda olmalidir.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (hasSuspiciousLinkCount(subject) || hasSuspiciousLinkCount(message)) {
    return new Response(JSON.stringify({ error: 'Mesajiniz spam filtresine takildi.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (submittedAt) {
    const submittedAtTime = new Date(submittedAt).getTime();
    if (Number.isFinite(submittedAtTime) && Date.now() - submittedAtTime < MIN_FORM_FILL_MS) {
      return new Response(JSON.stringify({ error: 'Form cok hizli gonderildi. Lutfen tekrar deneyin.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const payload = {
    type: 'contact_form_submission',
    createdAt: new Date().toISOString(),
    name,
    email,
    subject,
    message,
    metadata: {
      ip: extractClientIp(request, clientAddress),
      userAgent: request.headers.get('user-agent') || null,
      referrer: request.headers.get('referer') || null,
      origin: request.headers.get('origin') || null,
    },
  };

  try {
    await forwardContactPayload(payload);
  } catch (error) {
    console.error('Contact form forwarding failed:', error);
    return new Response(JSON.stringify({ error: 'Mesaj su anda iletilemedi. Lutfen daha sonra tekrar deneyin.' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
