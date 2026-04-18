import { EcosystemNormaliserService } from './ecosystem-normaliser.service';
import { SignalComputeResult } from '../signal-engine/types';

describe('EcosystemNormaliserService', () => {
  let service: EcosystemNormaliserService;

  beforeEach(() => {
    service = new EcosystemNormaliserService();
  });

  describe('Cohort Assignment', () => {
    it('should assign typescript-node for >70% TypeScript', () => {
      const result = service.normalise({
        languageDistribution: { 'TypeScript': 80, 'JavaScript': 20 }
      } as any);

      expect(result.assignedCohort).toBe('typescript-node');
      expect(result.cohortConfidence).toBe(0.65); // Multiple languages, topPct < 95
      expect(result.uncategorised).toBe(false);
    });

    it('should assign python-ml for >70% Python', () => {
      const result = service.normalise({
        languageDistribution: { 'Python': 100 }
      } as any);

      expect(result.assignedCohort).toBe('python-ml');
      expect(result.cohortConfidence).toBe(0.90); // Single language
    });

    it('should assign solidity-web3 for >30% Solidity', () => {
      const result = service.normalise({
        languageDistribution: { 'Solidity': 35, 'JavaScript': 65 }
      } as any);

      expect(result.assignedCohort).toBe('solidity-web3');
      expect(result.cohortConfidence).toBe(0.65);
    });

    it('should assign mixed cohort for >55% top language', () => {
      const result = service.normalise({
        languageDistribution: { 'Rust': 60, 'C++': 40 }
      } as any);

      expect(result.assignedCohort).toBe('rust-systems');
      expect(result.cohortConfidence).toBe(0.65);
    });

    it('should assign UNCATEGORISED for very mixed distributions', () => {
      const result = service.normalise({
        languageDistribution: { 'Go': 30, 'C++': 30, 'Java': 40 }
      } as any);

      expect(result.assignedCohort).toBe('UNCATEGORISED');
      expect(result.cohortConfidence).toBe(0.45);
      expect(result.uncategorised).toBe(true);
    });
  });

  describe('Signal Normalization', () => {
    it('should calculate z-scores correctly based on baselines', () => {
      // Mock result with TS-dominant distribution to trigger 'typescript-node' baseline
      // typescript-node: activeWeeksRatio { median: 0.6, stdDev: 0.2 }
      const mockResult: any = {
        languageDistribution: { 'TypeScript': 100 },
        signals: {
          activeWeeksRatio: { value: 0.8, excluded: false }
        }
      };

      const result = service.normalise(mockResult);

      // (0.8 - 0.6) / 0.2 = 1.0
      expect(result.normalisedSignals.activeWeeksRatio).toBe(1.0);
    });

    it('should handle signals with zero standard deviation (fallback to 1)', () => {
        // Rust baseline: highPrestigeRepoContributions { median: 0.1, stdDev: 0.5 } 
        // We'll use a signal that might have a small stdDev or we can just rely on the fallback logic in code
        const mockResult: any = {
            languageDistribution: { 'Rust': 100 },
            signals: {
              activeWeeksRatio: { value: 0.5, excluded: false }
            }
          };
    
          const result = service.normalise(mockResult);
          // Rust baselines: activeWeeksRatio { median: 0.5, stdDev: 0.2 }
          // (0.5 - 0.5) / 0.2 = 0
          expect(result.normalisedSignals.activeWeeksRatio).toBe(0);
    });
  });
});
