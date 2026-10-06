import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const STREAM_TIMEOUT = 60_000;
const CHECK_INTERVAL = 1_500;

export async function GET(req: NextRequest) {
  // 1. Authenticate via the session cookie (EventSource sends it automatically)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.id && !token?.sub) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Use the user ID from the token (prefer `id` if you store it, fallback to `sub`)
  const userId = (token.id as string) || (token.sub as string);

  // 3. The webhook sets `wallet-ready:{userId}` after topping up the wallet
  const signalKey = `wallet-ready:${userId}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      // Heartbeat to keep the connection alive
      send('heartbeat', 'connected');

      const deadline = Date.now() + STREAM_TIMEOUT;

      const check = async () => {
        if (Date.now() >= deadline) {
          send('timeout', 'no-update');
          controller.close();
          return;
        }

        // 4. Atomically read and delete the signal from Redis
        const signal = await redis.getdel(signalKey);
        if (signal) {
          send('wallet-updated', JSON.stringify({ userId }));
          controller.close();
          return;
        }

        // 5. Poll again
        setTimeout(check, CHECK_INTERVAL);
      };

      // Start after a short delay (gives the webhook time to finish)
      setTimeout(check, 800);

      req.signal.addEventListener('abort', () => {
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}