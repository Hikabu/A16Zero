import Redis from 'ioredis';

export const RedisProvider = {
  provide: 'REDIS',
  useFactory: () => {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);

    console.log(`[Redis] Attempting to connect to ${host}:${port}`);

    const redis = new Redis({
      host,
      port,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: null, // Essential for BullMQ and long-running connections
    });

    redis.on('error', (err) => {
      console.error('[Redis] Error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    return redis;
  },
};