import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  ScorecardUiSchema,
  ScorecardPreviewRequestSchema,
} from './scorecard.contract';

export class ScorecardUiDto extends createZodDto(ScorecardUiSchema) {}
export class ScorecardPreviewRequestDto extends createZodDto(
  ScorecardPreviewRequestSchema,
) {}
export class ScorecardRawResponseDto extends createZodDto(z.any()) {} // Placeholder for raw data
