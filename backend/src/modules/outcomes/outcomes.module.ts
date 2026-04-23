import { Module } from '@nestjs/common';
import { OutcomesService } from './outcomes.service';
import { OutcomesController } from './outcomes.controller';

@Module({
  controllers: [OutcomesController],
  providers: [OutcomesService],
})
export class OutcomesModule {}
