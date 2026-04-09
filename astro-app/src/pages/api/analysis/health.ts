import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    const pythonUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
    const res = await fetch(`${pythonUrl}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      return new Response(JSON.stringify({ status: 'ok', python: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw new Error('Python service unhealthy');
  } catch {
    return new Response(JSON.stringify({ status: 'offline', python: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
