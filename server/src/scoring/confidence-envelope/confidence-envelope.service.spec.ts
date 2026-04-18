import { Test, TestingModule } from '@nestjs/testing';
import { ConfidenceEnvelopeService } from './confidence-envelope.service';
import { FraudTier } from '../firewall/types';
import { ConfidenceTier, RiskLevel } from '@prisma/client';
import { PillarKey } from '../signal-engine/types';

describe('ConfidenceEnvelopeService', () => {
  let service: ConfidenceEnvelopeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConfidenceEnvelopeService],
    }).compile();

    service = module.get<ConfidenceEnvelopeService>(ConfidenceEnvelopeService);
  });

  describe('buildEnvelope', () => {
    it('should respect FraudTier.LIKELY_FRAUDULENT requirement', () => {
      // Base coverage 100% -> base confidence 0.90
      // LIKELY_FRAUDULENT penalty: 0.90 * 0.50 = 0.45
      // Total reduction = (0.90 - 0.45) / 0.90 = 50% reduction (>= 45%)
      
      const result = service.buildEnvelope({
        dataCoveragePercent: 100,
        visibilityTier: 'FULL',
        overallConfidenceCap: null,
        fraudTier: FraudTier.LIKELY_FRAUDULENT,
        fraudScore: 80,
        excludedSignals: [],
        consistencyNotes: [],
        privateWorkNote: null,
        signalCount: 20,
      });

      expect(result.overallConfidence).toBe(0.45);
      expect(result.caveats).toContainEqual(expect.objectContaining({
        signalKey: 'fraudDetection',
        severity: 'WARNING',
      }));
    });

    it('should result in MINIMAL tier and INSUFFICIENT_DATA risk level for low confidence', () => {
      // Base coverage 20% -> base confidence 0.35
      // SUSPICIOUS penalty: 0.35 * 0.80 = 0.28 (< 0.35)
      
      const result = service.buildEnvelope({
        dataCoveragePercent: 20,
        visibilityTier: 'MINIMAL',
        overallConfidenceCap: 0.45,
        fraudTier: FraudTier.SUSPICIOUS,
        fraudScore: 30,
        excludedSignals: [],
        consistencyNotes: [],
        privateWorkNote: null,
        signalCount: 20,
      });

      expect(result.confidenceTier).toBe(ConfidenceTier.MINIMAL);
      expect(result.riskLevel).toBe(RiskLevel.INSUFFICIENT_DATA);
      expect(result.hrGuidance.toLowerCase()).toContain('withheld');
      expect(result.scoreWithheld).toBe(true);
    });

    it('should apply multiplicative penalties correctly (SUSPICIOUS + 60% coverage)', () => {
      // 60% coverage -> base confidence 0.72
      // SUSPICIOUS penalty -> 0.72 * 0.80 = 0.576
      
      const result = service.buildEnvelope({
        dataCoveragePercent: 60,
        visibilityTier: 'PARTIAL',
        overallConfidenceCap: null,
        fraudTier: FraudTier.SUSPICIOUS,
        fraudScore: 25,
        excludedSignals: [],
        consistencyNotes: [],
        privateWorkNote: null,
        signalCount: 20,
      });

      expect(result.overallConfidence).toBe(0.576);
      expect(result.confidenceTier).toBe(ConfidenceTier.PARTIAL);
    });

    it('should handle overallConfidenceCap from DataCompletenessEngine', () => {
      // 100% coverage -> base confidence 0.90
      // Cap 0.45 (MINIMAL)
      
      const result = service.buildEnvelope({
        dataCoveragePercent: 100,
        visibilityTier: 'FULL',
        overallConfidenceCap: 0.45,
        fraudTier: FraudTier.CLEAN,
        fraudScore: 0,
        excludedSignals: [],
        consistencyNotes: [],
        privateWorkNote: null,
        signalCount: 20,
      });

      expect(result.overallConfidence).toBe(0.45);
    });

    it('should add caveats for excluded signals', () => {
      const result = service.buildEnvelope({
        dataCoveragePercent: 90,
        visibilityTier: 'FULL',
        overallConfidenceCap: null,
        fraudTier: FraudTier.CLEAN,
        fraudScore: 0,
        excludedSignals: [
          { key: 'prAcceptanceRate' as any, reason: 'Need samples', sampleSize: 2, minimumRequired: 10 }
        ],
        consistencyNotes: [],
        privateWorkNote: null,
        signalCount: 20,
      });

      expect(result.caveats).toContainEqual(expect.objectContaining({
        signalKey: 'prAcceptanceRate',
        hrReadable: expect.stringContaining('2 of 10'),
      }));
    });
  });

  describe('enforceSignalDominanceCap', () => {
    it('should clamp Activity weight to 0.40 and redistribute excess', () => {
      const input: Record<PillarKey, number> = {
        ACTIVITY: 0.65,
        COLLABORATION: 0.10,
        QUALITY: 0.10,
        RELIABILITY: 0.05,
        IMPACT: 0.05,
        GROWTH: 0.05,
      };

      const result = service.enforceSignalDominanceCap(input);

      expect(result.ACTIVITY).toBe(0.40);
      
      // Total excess = 0.65 - 0.40 = 0.25
      // Remaining base weights sum = 0.10+0.10+0.05+0.05+0.05 = 0.35
      // New COLLABORATION = 0.10 + 0.25 * (0.10 / 0.35) = 0.10 + 0.0714 = 0.1714
      expect(result.COLLABORATION).toBeGreaterThan(0.17);
      
      const total = Object.values(result).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1.0, 5);
    });

    it('should handle cases where multiple pillars exceed the cap', () => {
        const input: Record<PillarKey, number> = {
          ACTIVITY: 0.50,
          COLLABORATION: 0.45,
          QUALITY: 0.05,
          RELIABILITY: 0.0,
          IMPACT: 0.0,
          GROWTH: 0.0,
        };
  
        const result = service.enforceSignalDominanceCap(input);
  
        expect(result.ACTIVITY).toBe(0.40);
        expect(result.COLLABORATION).toBe(0.40);
        
        // Excess = (0.50-0.40) + (0.45-0.40) = 0.10 + 0.05 = 0.15
        // Total excess redistributed to QUALITY (0.05)
        // New QUALITY = 0.05 + 0.15 = 0.20
        expect(result.QUALITY).toBeCloseTo(0.20);
        
        const total = Object.values(result).reduce((a, b) => a + b, 0);
        expect(total).toBeCloseTo(1.0, 5);
      });
  });
});
