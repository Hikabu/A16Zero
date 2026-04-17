import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST') || 'localhost',
          port: config.get('REDIS_PORT') || 6379,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 500,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'github-sync' },
      { name: 'signal-compute' },
      { name: 'rescore' },
      { name: 'notification' },
      { name: 'ats-sync' },
      { name: 'prior-calc' },
      { name: 'email' },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
