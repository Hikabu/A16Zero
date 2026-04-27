import { Module } from '@nestjs/common';
import { DecisionCardService } from './decision-card.service';

@Module({
  providers: [DecisionCardService],
  exports: [DecisionCardService],
})
export class DecisionCardModule {}
