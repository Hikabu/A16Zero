import { Test, TestingModule } from '@nestjs/testing';
import { GithubSyncController } from './github-sync.controller';

describe('GithubSyncController', () => {
  let controller: GithubSyncController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GithubSyncController],
    }).compile();

    controller = module.get<GithubSyncController>(GithubSyncController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
