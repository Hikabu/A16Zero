import { PartialType } from '@nestjs/mapped-types';
import { CreateOutcomeDto } from './create-outcome.dto';

export class UpdateOutcomeDto extends PartialType(CreateOutcomeDto) {}
