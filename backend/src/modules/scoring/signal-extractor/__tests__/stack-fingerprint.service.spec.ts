import { Test, TestingModule } from '@nestjs/testing';
import { StackFingerprintService } from '../stack-fingerprint.service';

describe('StackFingerprintService', () => {
  let service: StackFingerprintService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StackFingerprintService],
    }).compile();

    service = module.get<StackFingerprintService>(StackFingerprintService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectTools', () => {
    it('detects bullmq and pg as BullMQ and PostgreSQL', () => {
      const manifestKeys = {
        repo1: ['bullmq', 'pg'],
      };
      const result = service.detectTools(manifestKeys);
      expect(result).toEqual(['BullMQ', 'PostgreSQL']);
    });

    it('detects anchor-lang and forge-std as Anchor and Foundry', () => {
      const manifestKeys = {
        repo1: ['anchor-lang', 'forge-std'],
      };
      const result = service.detectTools(manifestKeys);
      expect(result).toEqual(['Anchor', 'Foundry']);
    });

    it('deduplicated AWS SDK clients to a single AWS entry', () => {
      const manifestKeys = {
        repo1: ['@aws-sdk/client-s3', '@aws-sdk/client-ec2'],
      };
      const result = service.detectTools(manifestKeys);
      expect(result).toEqual(['AWS']);
    });

    it('returns empty array for random libraries', () => {
      const manifestKeys = {
        repo1: ['some-random-lib'],
      };
      const result = service.detectTools(manifestKeys);
      expect(result).toEqual([]);
    });

    it('deduplicates the same tool across multiple repos', () => {
      const manifestKeys = {
        repo1: ['prisma', 'bullmq'],
        repo2: ['prisma', 'pg'],
      };
      const result = service.detectTools(manifestKeys);
      expect(result).toEqual(['BullMQ', 'PostgreSQL', 'Prisma']);
    });

    it('handles empty input', () => {
      expect(service.detectTools({})).toEqual([]);
    });
  });

  describe('extract', () => {
    it('passes through languages unchanged while detecting tools', () => {
      const manifestKeys = { repo1: ['prisma'] };
      const languages = ['Rust', 'TypeScript'];
      const result = service.extract(manifestKeys, languages);
      expect(result).toEqual({
        languages: ['Rust', 'TypeScript'],
        tools: ['Prisma'],
      });
    });
  });
});
