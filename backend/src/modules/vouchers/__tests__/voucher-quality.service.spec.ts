import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VoucherQualityService } from '../voucher-quality.service';
import { SolanaAdapterService } from '../../../scoring/web3-adapter/solana-adapter.service';
import { Connection } from '@solana/web3.js';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetSignatures = jest.fn();
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getSignaturesForAddress: mockGetSignatures,
  })),
  PublicKey: jest.fn().mockImplementation((key) => ({
    toBase58: () => key,
  })),
}));

describe('VoucherQualityService', () => {
  let service: VoucherQualityService;
  let mockRedis: any;
  let mockSolanaAdapter: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    mockSolanaAdapter = {
      fetchProgramsByAuthority: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherQualityService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://mock-rpc') },
        },
        { provide: 'REDIS', useValue: mockRedis },
        { provide: SolanaAdapterService, useValue: mockSolanaAdapter },
      ],
    }).compile();

    service = module.get<VoucherQualityService>(VoucherQualityService);
  });

  // 1. Empty wallet (sigs=[]) → 'new'
  it('returns "new" if wallet has no transaction history', async () => {
    mockGetSignatures.mockResolvedValue([]);
    const result = await service.assessVoucherWallet('empty-wallet');
    expect(result).toBe('new');
    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.any(String),
      'new',
      'EX',
      86400,
    );
  });

  // 2. Wallet age 15 days → 'new'
  it('returns "new" if wallet is less than 30 days old', async () => {
    const fifteenDaysAgo = Date.now() / 1000 - 15 * 86400;
    mockGetSignatures.mockResolvedValue([{ blockTime: fifteenDaysAgo }]);

    const result = await service.assessVoucherWallet('young-wallet');
    expect(result).toBe('new');
  });

  // 3. Wallet age 60 days, no programs → 'standard'
  it('returns "standard" if wallet is old enough but has no programs', async () => {
    const sixtyDaysAgo = Date.now() / 1000 - 60 * 86400;
    mockGetSignatures.mockResolvedValue([{ blockTime: sixtyDaysAgo }]);
    mockSolanaAdapter.fetchProgramsByAuthority.mockResolvedValue([]);

    const result = await service.assessVoucherWallet('old-empty-wallet');
    expect(result).toBe('standard');
  });

  // 4. Wallet age 200 days, programs > 0 → 'verified'
  it('returns "verified" if wallet is old and has deployed programs', async () => {
    const twoHundredDaysAgo = Date.now() / 1000 - 200 * 86400;
    mockGetSignatures.mockResolvedValue([{ blockTime: twoHundredDaysAgo }]);
    mockSolanaAdapter.fetchProgramsByAuthority.mockResolvedValue(['program-1']);

    const result = await service.assessVoucherWallet('dev-wallet');
    expect(result).toBe('verified');
  });

  // 5. RPC throws → 'standard' (fail open)
  it('fails open and returns "standard" if RPC call fails', async () => {
    mockGetSignatures.mockRejectedValue(new Error('RPC Down'));

    const result = await service.assessVoucherWallet('error-wallet');
    expect(result).toBe('standard');
  });

  // 6. Cache hit → returns cached, no RPC call
  it('returns cached value on hit without calling RPC', async () => {
    mockRedis.get.mockResolvedValue('verified');

    const result = await service.assessVoucherWallet('cached-wallet');
    expect(result).toBe('verified');
    expect(mockGetSignatures).not.toHaveBeenCalled();
  });
});
