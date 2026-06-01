import type { APIRoute } from 'astro';
import { getUserFromRequest } from '../../../lib/auth';
import redis from '../../../lib/redis';

export const GET: APIRoute = async ({ request }) => {
  const user = await getUserFromRequest(request);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const channel = `chat:${user.id}`;
      const subscriber = redis.duplicate();
      
      try {
        await subscriber.connect();

        const onMessage = (message: string) => {
          try {
            controller.enqueue(encoder.encode(`data: ${message}\n\n`));
          } catch (e) {
            console.error('SSE enqueue error', e);
          }
        };

        await subscriber.subscribe(channel, onMessage);

        request.signal.addEventListener('abort', async () => {
          try {
            await subscriber.unsubscribe(channel);
            await subscriber.quit();
          } catch (e) {
            // Ignore quit errors on abort
          }
          try {
            controller.close();
          } catch (e) {}
        });
      } catch (err) {
        console.error('SSE Redis connection error', err);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Important for Nginx/Proxy
    },
  });
};
