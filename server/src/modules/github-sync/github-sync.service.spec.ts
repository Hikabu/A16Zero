import { Test, TestingModule } from '@nestjs/testing';
import { GithubSyncService } from './github-sync.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {};

const mockQueue = {
  add: jest.fn(),
  process: jest.fn(),
};

describe('GithubSyncService', () => {
  let service: GithubSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubSyncService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: 'BullQueue_github-sync', useValue: mockQueue },
      ],
    }).compile();

    service = module.get(GithubSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
