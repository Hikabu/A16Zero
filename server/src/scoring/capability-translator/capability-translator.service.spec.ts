import { Test, TestingModule } from '@nestjs/testing';
import { CapabilityTranslatorService } from './capability-translator.service';

describe('CapabilityTranslatorService', () => {
  let service: CapabilityTranslatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapabilityTranslatorService],
    }).compile();

    service = module.get<CapabilityTranslatorService>(CapabilityTranslatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate consistent activity statement when activeWeeksRatio is high', () => {
    const engineResult: any = {
      signals: {
        activeWeeksRatio: { value: 0.8, confidence: 0.9 },
      },
      consistencyNotes: [],
    };
    const behaviorResult: any = { hrLabel: 'Balanced Contributor' };
    const confidenceResult: any = { riskLevel: 'LOW_RISK', overallConfidence: 0.8 };

    const result = service.translate(engineResult, behaviorResult, confidenceResult);
    
    const activityClaim = result.capabilityStatements.find(s => s.key === 'consistentActivity');
    expect(activityClaim).toBeDefined();
    expect(activityClaim?.text).toContain('consistent coding activity');
  });

  it('should generate code review statement when reviewDepth is high', () => {
    const engineResult: any = {
      signals: {
        reviewDepth: { value: 0.8, confidence: 0.9 },
        prReviewCount12m: { value: 25, confidence: 0.85 },
      },
    };
    const behaviorResult: any = { hrLabel: 'Senior' };
    const confidenceResult: any = { riskLevel: 'LOW_RISK', overallConfidence: 0.8 };

    const result = service.translate(engineResult, behaviorResult, confidenceResult);
    
    const reviewClaim = result.capabilityStatements.find(s => s.key === 'strongCodeReview');
    expect(reviewClaim).toBeDefined();
    expect(reviewClaim?.text).toContain('Strong code review');
  });

  it('should identify significant gaps if overall confidence is low', () => {
    const engineResult: any = { signals: {} };
    const behaviorResult: any = { hrLabel: 'Unknown' };
    const confidenceResult: any = { overallConfidence: 0.3 };

    const result = service.translate(engineResult, behaviorResult, confidenceResult);
    
    const gap = result.gapStatements.find(g => g.key === 'dataScarcity');
    expect(gap).toBeDefined();
    expect(gap?.severity).toBe('SIGNIFICANT');
  });
});
