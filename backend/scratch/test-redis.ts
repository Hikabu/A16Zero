import Redis from 'ioredis';

async function testConnection() {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);

  console.log(`Testing Redis connection to ${host}:${port}...`);

  const redis = new Redis({
    host,
    port,
    connectTimeout: 5000,
    retryStrategy: (times) => {
      if (times > 3) {
        return null; // Stop retrying after 3 attempts
      }
      return 1000;
    }
  });

  try {
    const result = await redis.ping();
    console.log('✅ Redis connection successful! PING result:', result);
    
    await redis.set('test-key', 'Hello from Antigravity');
    const val = await redis.get('test-key');
    console.log('✅ Data write/read successful! Value:', val);
    
    await redis.del('test-key');
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    process.exit(1);
  } finally {
    redis.disconnect();
  }
}

testConnection();
