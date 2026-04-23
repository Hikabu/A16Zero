import { Module, Global } from '@nestjs/common';
import { EmailService } from '../../shared/email/email.service';
import { EmailProcessor } from '../../queues/email.processor';

@Global()
@Module({
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class EmailModule {}
