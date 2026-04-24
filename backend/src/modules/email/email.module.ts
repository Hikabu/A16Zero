import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailProcessor } from '../../queues/email.processor';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
