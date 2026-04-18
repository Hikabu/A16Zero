import { Test, TestingModule } from '@nestjs/testing';
import { ScoringService } from './scoring.service';
import { SignalExtractorService } from '../signal-extractor/signal-extractor.service';
import { SummaryGeneratorService } from '../summary-generator/summary-generator.service';
import { ALEX_BACKEND, SARAH_FULLSTACK, MAYA_DEVOPS, NEW_DEV, GHOST_PROFILE } from '../signal-extractor/__fixtures__/seed-developers';

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringService,
        SignalExtractorService,
        SummaryGeneratorService,
      ],
    }).compile();

    service = module.get<ScoringService>(ScoringService);
  });

  describe('score()', () => {
    it('should calculate correct capabilities for ALEX_BACKEND (Go/Python)', () => {
      const result = service.score(ALEX_BACKEND);
      
      expect(result.capabilities.backend.score).toBeGreaterThan(0.7);
      expect(result.capabilities.frontend.score).toBeLessThan(0.3);
      expect(result.capabilities.backend.confidence).toBe('high');
      expect(result.summary).toContain('Go-focused developer');
    });

    it('should calculate correct capabilities for SARAH_FULLSTACK (TypeScript)', () => {
      const result = service.score(SARAH_FULLSTACK);
      
      expect(result.capabilities.frontend.score).toBeGreaterThan(0.6);
      expect(result.capabilities.backend.score).toBeGreaterThan(0.3);
      expect(result.capabilities.frontend.confidence).toBe('medium');
      expect(result.summary).toContain('TypeScript-focused developer');
    });

    it('should calculate correct capabilities for MAYA_DEVOPS (Shell/HCL)', () => {
      const result = service.score(MAYA_DEVOPS);
      
      expect(result.capabilities.devops.score).toBeGreaterThan(0.8);
      expect(result.capabilities.devops.confidence).toBe('low'); // S8 recalibrated results in low for 3 repos
      expect(result.privateWorkNote).toBeDefined();
    });

    it('should handle NEW_DEV (JavaScript, low activity)', () => {
      const result = service.score(NEW_DEV);
      
      expect(result.capabilities.frontend.score).toBeGreaterThan(0.5);
      expect(result.impact.activityLevel).toBe('low');
    });

    it('should handle GHOST_PROFILE (No owned repos)', () => {
      const result = service.score(GHOST_PROFILE);
      
      expect(result.capabilities.backend.score).toBeDefined();
      expect(result.ownership.ownedProjects).toBe(0);
    });
  });

  describe('Ownership Logic', () => {
    it('should correctly count maintained repos (within 180 days)', () => {
      // Alex has 5 non-fork repos, all pushed within few days of April 18
      const result = service.score(ALEX_BACKEND);
      expect(result.ownership.ownedProjects).toBe(5);
      expect(result.ownership.activelyMaintained).toBe(5);
    });
  });

  describe('Impact Logic', () => {
    it('should detect trends correctly', () => {
      const result = service.score(ALEX_BACKEND);
      expect(result.impact.consistency).toBe('moderate'); // Fixture has flat 10 per week
    });
  });
});
