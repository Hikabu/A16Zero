import { Test, TestingModule } from '@nestjs/testing';
import { SolanaAdapterService } from '../solana-adapter.service';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey } from '@solana/web3.js';

const mockGetProgramAccounts = jest.fn();
const mockGetSignaturesForAddress = jest.fn();

// Mock connection
jest.mock('@solana/web3.js', () => {
  return {
    Connection: jest.fn().mockImplementation(() => {
      return {
        getProgramAccounts: mockGetProgramAccounts,
        getSignaturesForAddress: mockGetSignaturesForAddress,
      };
    }),
    PublicKey: jest.fn().mockImplementation((key: string) => ({
      toBase58: () => key,
      toBuffer: () => Buffer.from(key),
    })) as any as (typeof import('@solana/web3.js'))['PublicKey'],
  };
});

describe('SolanaAdapterService', () => {
  let service: SolanaAdapterService;
  let mockRedis: any;
  let mockConfigService: any;
  let connectionInstance: any;

  beforeEach(async () => {
    // Clear mocks
    jest.clearAllMocks();

    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'SOLANA_RPC_URL') return 'http://mock-rpc-url';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolanaAdapterService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'REDIS', useValue: mockRedis },

      ],
    }).compile();

    service = module.get<SolanaAdapterService>(SolanaAdapterService);
    connectionInstance = new Connection('');
  });

  describe('fetchProgramsByAuthority', () => {
    it('1. mock returns 2 accounts -> 2 ProgramInfo items returned', async () => {
      const mockAccounts = [
        { pubkey: new PublicKey('mock-program-1') },
        { pubkey: new PublicKey('mock-program-2') },
      ];
      mockGetProgramAccounts.mockResolvedValue(mockAccounts);
      jest.spyOn(service, 'fetchProgramTraction').mockResolvedValue({
        uniqueCallers: 0,
        isActive: false,
        deployedAt: null,
      });
      jest.spyOn(service, 'fetchUpgradeCount').mockResolvedValue(0);

      const programs = await service.fetchProgramsByAuthority('mock-wallet');
      expect(programs.length).toBe(2);
      expect(programs[0].programId).toBe('mock-program-1');
      expect(programs[1].programId).toBe('mock-program-2');
      expect(service.fetchProgramTraction).toHaveBeenCalledTimes(2);
      expect(service.fetchUpgradeCount).toHaveBeenCalledTimes(2);
    });

    it('2. mock throws -> returns [] (no rethrow)', async () => {
      mockGetProgramAccounts.mockRejectedValue(new Error('RPC Error'));
      const programs = await service.fetchProgramsByAuthority('mock-wallet');
      expect(programs).toEqual([]);
    });
  });

  describe('fetchProgramTraction', () => {
    it('3. 5 sigs with unique feePayers -> uniqueCallers: 5', async () => {
      const mockSigs = [
        { feePayer: 'payer1', blockTime: Date.now() / 1000 },
        { feePayer: 'payer2', blockTime: Date.now() / 1000 },
        { feePayer: 'payer3', blockTime: Date.now() / 1000 },
        { feePayer: 'payer4', blockTime: Date.now() / 1000 },
        { feePayer: 'payer5', blockTime: Date.now() / 1000 },
      ];
      connectionInstance.getSignaturesForAddress.mockResolvedValue(mockSigs);

      const traction = await service.fetchProgramTraction(
        'mock-program',
        connectionInstance,
      );
      expect(traction.uniqueCallers).toBe(5);
    });

    it('4. sigs with duplicate feePayer -> uniqueCallers deduplicated', async () => {
      const mockSigs = [
        { feePayer: 'payer1', blockTime: Date.now() / 1000 },
        { feePayer: 'payer1', blockTime: Date.now() / 1000 },
        { feePayer: 'payer1', blockTime: Date.now() / 1000 },
      ];
      connectionInstance.getSignaturesForAddress.mockResolvedValue(mockSigs);

      const traction = await service.fetchProgramTraction(
        'mock-program',
        connectionInstance,
      );
      expect(traction.uniqueCallers).toBe(1);
    });

    it('5. sig.blockTime = now - 30 days -> isActive: true', async () => {
      const thirtyDaysAgo = Date.now() / 1000 - 30 * 24 * 60 * 60;
      const mockSigs = [{ feePayer: 'payer1', blockTime: thirtyDaysAgo }];
      connectionInstance.getSignaturesForAddress.mockResolvedValue(mockSigs);

      const traction = await service.fetchProgramTraction(
        'mock-program',
        connectionInstance,
      );
      expect(traction.isActive).toBe(true);
    });

    it('6. sig.blockTime = now - 100 days -> isActive: false', async () => {
      const hundredDaysAgo = Date.now() / 1000 - 100 * 24 * 60 * 60;
      const mockSigs = [{ feePayer: 'payer1', blockTime: hundredDaysAgo }];
      connectionInstance.getSignaturesForAddress.mockResolvedValue(mockSigs);

      const traction = await service.fetchProgramTraction(
        'mock-program',
        connectionInstance,
      );
      expect(traction.isActive).toBe(false);
    });

    it('7. throws -> { uniqueCallers:0, isActive:false, deployedAt:null }', async () => {
      connectionInstance.getSignaturesForAddress.mockRejectedValue(
        new Error('RPC Error'),
      );
      const traction = await service.fetchProgramTraction(
        'mock-program',
        connectionInstance,
      );
      expect(traction).toEqual({
        uniqueCallers: 0,
        isActive: false,
        deployedAt: null,
      });
    });

    it('8. feePayer is null in some sigs -> those sigs skipped from Set', async () => {
      const mockSigs = [
        { feePayer: 'payer1', blockTime: Date.now() / 1000 },
        { feePayer: null, blockTime: Date.now() / 1000 },
        { feePayer: undefined, blockTime: Date.now() / 1000 },
        { blockTime: Date.now() / 1000 }, // No feePayer property
      ];
      connectionInstance.getSignaturesForAddress.mockResolvedValue(mockSigs);

      const traction = await service.fetchProgramTraction(
        'mock-program',
        connectionInstance,
      );
      expect(traction.uniqueCallers).toBe(1); // Only payer1
    });
  });

  describe('fetchUpgradeCount', () => {
    beforeEach(() => {
      // Make findProgramAddressSync available on the mocked PublicKey constructor
      const { PublicKey: MockedPublicKey } =
        jest.requireMock('@solana/web3.js');
      MockedPublicKey.findProgramAddressSync = jest
        .fn()
        .mockReturnValue([{ toBase58: () => 'mock-program-data-address' }]);
    });

    it('a. programDataAccount has 10 sigs -> upgradeCount: 10', async () => {
      connectionInstance.getSignaturesForAddress.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({ signature: `sig${i}` })),
      );
      const count = await service.fetchUpgradeCount(
        'mock-program',
        connectionInstance,
      );
      expect(count).toBe(10);
    });

    it('b. getSignaturesForAddress throws -> upgradeCount: 0', async () => {
      connectionInstance.getSignaturesForAddress.mockRejectedValue(
        new Error('RPC Error'),
      );
      const count = await service.fetchUpgradeCount(
        'mock-program',
        connectionInstance,
      );
      expect(count).toBe(0);
    });
  });
});
