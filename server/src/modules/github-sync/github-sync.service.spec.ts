import { Test, TestingModule } from '@nestjs/testing';
import { GithubSyncService } from './github-sync.service';

describe('GithubSyncService', () => {
  let service: GithubSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GithubSyncService],
    }).compile();

    service = module.get<GithubSyncService>(GithubSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
