import Redis from 'ioredis';

export const RedisProvider = {
  provide: 'REDIS',
  useFactory: () => {
    return new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: 6379,
    });
  },
};