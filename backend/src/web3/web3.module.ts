import { Module } from '@nestjs/common';
import { SmartAccountService } from './smart-account.service';

@Module({
  providers: [SmartAccountService],
  exports: [SmartAccountService],
})
export class Web3Module {}
