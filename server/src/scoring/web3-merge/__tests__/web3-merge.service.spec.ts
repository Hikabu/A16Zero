import { Test, TestingModule } from '@nestjs/testing';
import { Web3MergeService } from '../web3-merge.service';
import { AnalysisResult } from '../../types/result.types';

describe('Web3MergeService.applyVouchUpgrades', () => {
  let service: Web3MergeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Web3MergeService],
    }).compile();

    service = module.get<Web3MergeService>(Web3MergeService);
  });

  const baseResult = (confidence: 'low' | 'medium' | 'high' = 'low'): AnalysisResult => ({
    summary: 'Test summary',
    capabilities: {
      backend: { score: 0.5, confidence: 'medium' },
      frontend: { score: 0.5, confidence: 'medium' },
      devops: { score: 0.1, confidence: 'low' },
    },
    ownership: { activelyMaintained: 0, ownedProjects: 0, confidence: 'low' },
    impact: {
      activityLevel: 'low',
      consistency: 'sparse',
      externalContributions: 0,
      confidence,
    },
    reputation: null,
    stack: { languages: [], tools: [] },
    web3: null,
  });

  // 18. verifiedVouchCount:2 + impact.confidence:'low' → 'medium'
  it('upgrades "low" impact confidence to "medium" if verifiedVouchCount >= 2', () => {
    const result = baseResult('low');
    const updated = service.applyVouchUpgrades(result, 2, 2, []);
    expect(updated.impact.confidence).toBe('medium');
  });

  // 19. verifiedVouchCount:2 + impact.confidence:'medium' → 'high'
  it('upgrades "medium" impact confidence to "high" if verifiedVouchCount >= 2', () => {
    const result = baseResult('medium');
    const updated = service.applyVouchUpgrades(result, 2, 2, []);
    expect(updated.impact.confidence).toBe('high');
  });

  // 20. verifiedVouchCount:0 → impact unchanged
  it('does not change confidence if verifiedVouchCount is 0', () => {
    const result = baseResult('low');
    const updated = service.applyVouchUpgrades(result, 1, 0, []);
    expect(updated.impact.confidence).toBe('low');
  });

  // 21. verifiedVouchCount:5 → impact.confidence always 'high'
  it('upgrades confidence to "high" unconditionally if verifiedVouchCount >= 5', () => {
    const result = baseResult('low');
    const updated = service.applyVouchUpgrades(result, 10, 5, []);
    expect(updated.impact.confidence).toBe('high');
  });

  // 22. result.reputation null when vouchCount:0
  it('returns null reputation block if total vouch count is 0', () => {
    const result = baseResult();
    const updated = service.applyVouchUpgrades(result, 0, 0, []);
    expect(updated.reputation).toBeNull();
  });

  // 23. result.reputation.confidence:'high' when vouchCount:3
  it('sets reputation confidence based on verified status', () => {
    const result = baseResult();
    // verifiedVouchCount: 2/3 -> should be high confidence according to the logic?
    // Wait, let's check code:
    // confidence: verifiedVouchCount >= 2 ? 'high' : vouchCount >= 2 ? 'medium' : 'low',
    const updated = service.applyVouchUpgrades(result, 3, 2, []);
    expect(updated.reputation?.confidence).toBe('high');
  });

  // 24. capabilities unchanged in all cases
  it('never modifies capabilities', () => {
    const result = baseResult();
    const originalBackend = { ...result.capabilities.backend };
    const updated = service.applyVouchUpgrades(result, 5, 5, []);
    expect(updated.capabilities.backend).toEqual(originalBackend);
  });
});
