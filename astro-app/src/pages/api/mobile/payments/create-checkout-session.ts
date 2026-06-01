import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const userId = String(body.userId || '').trim();
    const paymentToken = String(body.paymentToken || '').trim();

    if (!userId || !paymentToken) {
      return new Response(JSON.stringify({ error: 'Kullanici ve odeme tokeni gereklidir.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const forwardBody = { ...body } as Record<string, unknown>;
    delete forwardBody.paymentToken;

    const requestOrigin = new URL(request.url).origin;
    const forwardedRequest = new Request(new URL('/api/payments/create-checkout-session', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `payment_access_token=${encodeURIComponent(paymentToken)}`,
        Origin: requestOrigin,
        Referer: `${requestOrigin}/`,
      },
      body: JSON.stringify(forwardBody),
    });

    return await fetch(forwardedRequest);
  } catch (error) {
    console.error('Mobile checkout session olusturulamadi:', error);

    return new Response(JSON.stringify({ error: 'Odeme baslatilamadi.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};