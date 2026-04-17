import { Test, TestingModule } from '@nestjs/testing';
import { PrivacyAdjustmentEngineService } from './privacy-adjustment-engine.service';
import { GithubEventsData } from '../github-adapter/types';

describe('PrivacyAdjustmentEngineService', () => {
  let service: PrivacyAdjustmentEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrivacyAdjustmentEngineService],
    }).compile();

    service = module.get<PrivacyAdjustmentEngineService>(PrivacyAdjustmentEngineService);
  });

  it('should detect 3 unique months of private organization activity', () => {
    const mockEvents: Partial<GithubEventsData> = {
      events: [
        { type: 'PushEvent', created_at: '2024-01-10T10:00:00Z', public: false, org: { id: 1 }, repo: { name: 'private-org-repo' } },
        { type: 'PushEvent', created_at: '2024-01-20T10:00:00Z', public: false, org: { id: 1 }, repo: { name: 'private-org-repo' } }, // Same month
        { type: 'PushEvent', created_at: '2024-02-15T10:00:00Z', public: false, org: { id: 1 }, repo: { name: 'private-org-repo' } },
        { type: 'PushEvent', created_at: '2024-03-05T10:00:00Z', public: false, org: { id: 1 }, repo: { name: 'private-org-repo' } },
      ] as any,
    };

    const result = service.compute(mockEvents as GithubEventsData);
    expect(result.verifiedPrivateMonths).toBe(3);
    expect(result.privateWorkNote).toContain('evidence of private');
  });

  it('should return 0 months and null note if only 2 unique months detected', () => {
    const mockEvents: Partial<GithubEventsData> = {
      events: [
        { type: 'PushEvent', created_at: '2024-01-10T10:00:00Z', public: false, org: { id: 1 }, repo: { name: 'private-org-repo' } },
        { type: 'PushEvent', created_at: '2024-02-15T10:00:00Z', public: false, org: { id: 1 }, repo: { name: 'private-org-repo' } },
      ] as any,
    };

    const result = service.compute(mockEvents as GithubEventsData);
    expect(result.verifiedPrivateMonths).toBe(2);
    expect(result.privateWorkNote).toBeNull();
  });

  it('should ignore non-PushEvents', () => {
    const mockEvents: Partial<GithubEventsData> = {
      events: [
        { type: 'PullRequestEvent', created_at: '2024-01-10T10:00:00Z', public: false, org: { id: 1 }, repo: { name: 'private-org-repo' } },
        { type: 'PushEvent', created_at: '2024-02-15T10:00:00Z', public: false, org: { id: 1 }, repo: { name: 'private-org-repo' } },
      ] as any,
    };

    const result = service.compute(mockEvents as GithubEventsData);
    expect(result.verifiedPrivateMonths).toBe(1);
  });

  it('should ignore private repos NOT owned by an organization', () => {
    const mockEvents: Partial<GithubEventsData> = {
      events: [
        { type: 'PushEvent', created_at: '2024-01-10T10:00:00Z', public: false, org: null, repo: { name: 'personal-private-repo' } },
        { type: 'PushEvent', created_at: '2024-02-15T10:00:00Z', public: false, org: { id: 1 }, repo: { name: 'private-org-repo' } },
      ] as any,
    };

    const result = service.compute(mockEvents as GithubEventsData);
    expect(result.verifiedPrivateMonths).toBe(1);
  });

  it('should ignore public repos owned by an organization', () => {
    const mockEvents: Partial<GithubEventsData> = {
      events: [
        { type: 'PushEvent', created_at: '2024-01-10T10:00:00Z', public: true, org: { id: 1 }, repo: { name: 'public-org-repo' } },
        { type: 'PushEvent', created_at: '2024-02-15T10:00:00Z', public: false, org: { id: 1 }, repo: { name: 'private-org-repo' } },
      ] as any,
    };

    const result = service.compute(mockEvents as GithubEventsData);
    expect(result.verifiedPrivateMonths).toBe(1);
  });
});
