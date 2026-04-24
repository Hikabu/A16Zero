import Redis from 'ioredis';

export const RedisProvider = {
  
  provide: 'REDIS',
  useFactory: () => {
    console.log('Connecting to Redis at:', process.env.REDIS_HOST);
    return new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: 6379,
    });
  },
};