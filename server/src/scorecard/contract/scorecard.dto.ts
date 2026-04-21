import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { 
  ScorecardUiSchema 
} from './scorecard.schema';

export class ScorecardUiDto extends createZodDto(ScorecardUiSchema) {}
export class ScorecardRawResponseDto extends createZodDto(z.any()) {} // Placeholder for raw data
