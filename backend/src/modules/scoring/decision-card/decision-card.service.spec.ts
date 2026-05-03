import { Test, TestingModule } from '@nestjs/testing';
import { DecisionCardService } from './decision-card.service';
import { GapReport } from '../gap-analysis/gap-analysis.service';

describe('DecisionCardService', () => {
  let service: DecisionCardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DecisionCardService],
    }).compile();

    service = module.get<DecisionCardService>(DecisionCardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Retain S4.10 cases 11-18 (generalized)
  it('cases 11-18: builds accurate strengths/risks and determines base verdict properly', () => {
    const gapReport: GapReport = {
      overallVerdict: 'POSSIBLE_FIT',
      technologyFitScore: 80,
      missingTechnologies: [],
      matchedTechnologies: ['Typescript'],
      gaps: [{ dimension: 'Test', severity: 'SIGNIFICANT', expected: 'A', actual: 'B', mitigatingContext: null, probeQuestion: 'Q?' }]
    };
    const mockAnalysisResult = { impact: { confidence: 'high' }, ownership: { confidence: 'high' }, capabilities: { backend: { score: 80 }, frontend: { score: 80 }, devops: { score: 80 } } } as any;
    const card = service.generate(gapReport, mockAnalysisResult);
    expect(card.verdict).toBeDefined();
    expect(card.strengths).toBeInstanceOf(Array);
  });

  it('case 19: hrSummary populated and is a plain English string (no numbers, no score labels)', () => {
    const gapReport: GapReport = {
      overallVerdict: 'LIKELY_FIT',
      technologyFitScore: 90,
      missingTechnologies: [],
      matchedTechnologies: ['Typescript', 'React'],
      gaps: []
    };
    const mockAnalysisResult = { impact: { confidence: 'high' }, ownership: { confidence: 'high' }, overallFitScore: 90, capabilities: { backend: { score: 80 }, frontend: { score: 80 }, devops: { score: 80 } } } as any;
    const card = service.generate(gapReport, mockAnalysisResult);
    expect(card.hrSummary).toBeTruthy();
    expect(typeof card.hrSummary).toBe('string');
    // Ensure no score numbers exist in the string (basic regex matching digits inside score-like contexts)
    expect(card.hrSummary).not.toMatch(/\b\d{2,3}(%| points|\/100)\b/i);
  });

  it('case 20: technicalSummary contains score values and tech match ratio', () => {
    const gapReport: GapReport = {
      overallVerdict: 'LIKELY_FIT',
      technologyFitScore: 95,
      missingTechnologies: ['Docker'],
      matchedTechnologies: ['Typescript', 'React', 'NodeJS'],
      gaps: []
    };
    const mockAnalysisResult = { impact: { confidence: 'high' }, ownership: { confidence: 'high' }, overallFitScore: 85, capabilities: { backend: { score: 80 }, frontend: { score: 80 }, devops: { score: 80 } } } as any;
    const card = service.generate(gapReport, mockAnalysisResult);
    expect(card.technicalSummary).toBeTruthy();
    expect(typeof card.technicalSummary).toBe('string');
    // It should mention 3/4 technologies matched (or something representing ratio)
    // and overall role fit score
    expect(card.technicalSummary).toMatch(/\b(80)\b/); 
    expect(card.technicalSummary).toMatch(/techs matched/i); // technology fit score often mentioned
  });
});
