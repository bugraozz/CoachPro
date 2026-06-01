import { createClient } from 'redis';

const redisUrl = process.env.RATE_LIMIT_REDIS_URL || 'redis://localhost:6379';

const client = createClient({
  url: redisUrl,
});

client.on('error', (err) => console.error('Redis Client Error', err));

if (!client.isOpen) {
  client.connect().catch(console.error);
}

export default client;
