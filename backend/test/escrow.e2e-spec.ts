import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { EscrowController } from '../src/modules/escrow/escrow.controller';
import { EscrowService } from '../src/modules/escrow/escrow.service';
import { JwtAuthGuard } from '../src/modules/auth-employer/guards/jwt-auth.guard';

type EscrowStatus =
  | 'CREATED'
  | 'FUNDED'
  | 'CANDIDATE_SET'
  | 'RELEASED'
  | 'REFUNDED';

type EscrowRecord = {
  jobPostId: string;
  ownerId: string;
  escrowId?: string;
  escrowAddress?: string;
  candidateWallet?: string;
  expectedAmount?: string;
  escrowStatus: EscrowStatus;
  transitionCount: number;
};

const ownerId = 'employer-1';
const wrongOwnerId = 'employer-2';
const createdJobId = '8d4fa8cc-7df5-4f0f-91a2-bc1a9b2b7c11';
const fundedJobId = '781a44f4-0ee7-4466-97cc-f834e4f2f222';
const candidateJobId = '5f6fab0e-8102-4326-b988-0dd442f51111';
const releasedJobId = 'acfb2ff8-947f-4202-8722-6f32cc0f3333';
const escrowAddress = '7eJ8hYqH6q6Gdfrb2uP83L6eJrwGQXSjQ2E6H6n8ZCwK';
const candidateWallet = 'GkYqf7H9jFQpMe6TNz6N6BZkdn4xB8oVeDxXM7dRrM2p';

const fundedDto = {
  jobPostId: createdJobId,
  escrowId: '42',
  escrowAddress,
  expectedAmount: '250000000',
};

function serialize(record: EscrowRecord) {
  return {
    jobPostId: record.jobPostId,
    escrowId: record.escrowId ?? null,
    escrowAddress: record.escrowAddress ?? null,
    candidateWallet: record.candidateWallet ?? null,
    expectedAmount: record.expectedAmount ?? null,
    escrowStatus: record.escrowStatus,
    transitionCount: record.transitionCount,
  };
}

function createEscrowServiceMock() {
  const records = new Map<string, EscrowRecord>([
    [
      createdJobId,
      {
        jobPostId: createdJobId,
        ownerId,
        escrowStatus: 'CREATED',
        transitionCount: 0,
      },
    ],
    [
      fundedJobId,
      {
        jobPostId: fundedJobId,
        ownerId,
        escrowId: '44',
        escrowAddress,
        expectedAmount: '250000000',
        escrowStatus: 'FUNDED',
        transitionCount: 1,
      },
    ],
    [
      candidateJobId,
      {
        jobPostId: candidateJobId,
        ownerId,
        escrowId: '45',
        escrowAddress,
        candidateWallet,
        expectedAmount: '250000000',
        escrowStatus: 'CANDIDATE_SET',
        transitionCount: 2,
      },
    ],
    [
      releasedJobId,
      {
        jobPostId: releasedJobId,
        ownerId,
        escrowId: '46',
        escrowAddress,
        candidateWallet,
        expectedAmount: '250000000',
        escrowStatus: 'RELEASED',
        transitionCount: 3,
      },
    ],
  ]);

  const getOwned = (companyId: string, jobPostId: string) => {
    const record = records.get(jobPostId);
    if (!record) throw new BadRequestException('Escrow not found');
    if (record.ownerId !== companyId)
      throw new ForbiddenException('User is not job owner');
    return record;
  };

  return {
    records,
    confirmFunded: jest.fn(async (companyId: string, dto: typeof fundedDto) => {
      const record = getOwned(companyId, dto.jobPostId);
      const sameFunding =
        record.escrowId === dto.escrowId &&
        record.escrowAddress === dto.escrowAddress &&
        record.expectedAmount === dto.expectedAmount;

      if (record.escrowStatus !== 'CREATED') {
        if (sameFunding) return serialize(record);
        throw new ConflictException('Escrow already funded');
      }

      if (dto.expectedAmount !== '250000000') {
        throw new BadRequestException('Wrong amount funded');
      }

      Object.assign(record, {
        escrowId: dto.escrowId,
        escrowAddress: dto.escrowAddress,
        expectedAmount: dto.expectedAmount,
        escrowStatus: 'FUNDED',
        transitionCount: record.transitionCount + 1,
      });

      return serialize(record);
    }),
    setCandidate: jest.fn(
      async (
        companyId: string,
        dto: { jobPostId: string; candidateWallet: string },
      ) => {
        const record = getOwned(companyId, dto.jobPostId);
        if (record.escrowStatus === 'CREATED') {
          throw new BadRequestException(
            'Escrow must be FUNDED before setting candidate',
          );
        }
        if (record.candidateWallet) {
          throw new ConflictException('Candidate already set');
        }
        if (record.escrowStatus !== 'FUNDED') {
          throw new ConflictException('Escrow already resolved');
        }

        record.candidateWallet = dto.candidateWallet;
        record.escrowStatus = 'CANDIDATE_SET';
        record.transitionCount += 1;
        return serialize(record);
      },
    ),
    confirmReleased: jest.fn(
      async (companyId: string, dto: { jobPostId: string }) => {
        const record = getOwned(companyId, dto.jobPostId);
        if (record.escrowStatus === 'CREATED') {
          throw new BadRequestException('Escrow must be funded before release');
        }
        if (record.escrowStatus === 'FUNDED') {
          throw new BadRequestException('Candidate must be set before release');
        }
        if (record.escrowStatus === 'RELEASED') return serialize(record);
        if (record.escrowStatus === 'REFUNDED') {
          throw new ConflictException('Escrow already refunded');
        }

        record.escrowStatus = 'RELEASED';
        record.transitionCount += 1;
        return serialize(record);
      },
    ),
    confirmRefunded: jest.fn(
      async (companyId: string, dto: { jobPostId: string }) => {
        const record = getOwned(companyId, dto.jobPostId);
        if (record.escrowStatus === 'CREATED') {
          throw new BadRequestException('Escrow must be funded before refund');
        }
        if (record.escrowStatus === 'RELEASED') {
          throw new ConflictException('Escrow already released');
        }
        if (record.escrowStatus === 'REFUNDED') return serialize(record);

        record.escrowStatus = 'REFUNDED';
        record.transitionCount += 1;
        return serialize(record);
      },
    ),
    status: jest.fn(async (companyId: string, jobPostId: string) => {
      const record = getOwned(companyId, jobPostId);
      return {
        dbState: serialize(record),
        onChainState: record.escrowAddress
          ? {
              employer: '8M7wZrVdD8hJorvekgZ4Uxq4A86hzHGzVJM4idJpJx2k',
              candidate: record.candidateWallet ?? null,
              amount: record.expectedAmount ?? null,
              released: ['RELEASED', 'REFUNDED'].includes(record.escrowStatus),
            }
          : null,
      };
    }),
  };
}

describe('EscrowController (e2e)', () => {
  let app: INestApplication;
  let escrowService: ReturnType<typeof createEscrowServiceMock>;

  const authGuard = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) throw new UnauthorizedException();
      req.user = { id: token === 'wrong-token' ? wrongOwnerId : ownerId };
      return true;
    },
  };

  beforeEach(async () => {
    escrowService = createEscrowServiceMock();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EscrowController],
      providers: [{ provide: EscrowService, useValue: escrowService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('confirm funded', async () => {
    const res = await request(app.getHttpServer())
      .post('/escrow/confirm-funded')
      .set('Authorization', 'Bearer employer-token')
      .send(fundedDto);

    expect(res.status).toBe(201);
    expect(res.body.data.escrowStatus).toBe('FUNDED');
  });

  it('set candidate', async () => {
    const res = await request(app.getHttpServer())
      .post('/escrow/set-candidate')
      .set('Authorization', 'Bearer employer-token')
      .send({ jobPostId: fundedJobId, candidateWallet });

    expect(res.status).toBe(201);
    expect(res.body.data.escrowStatus).toBe('CANDIDATE_SET');
    expect(res.body.data.candidateWallet).toBe(candidateWallet);
  });

  it('release escrow', async () => {
    const res = await request(app.getHttpServer())
      .post('/escrow/confirm-released')
      .set('Authorization', 'Bearer employer-token')
      .send({ jobPostId: candidateJobId });

    expect(res.status).toBe(201);
    expect(res.body.data.escrowStatus).toBe('RELEASED');
  });

  it('refund escrow', async () => {
    const res = await request(app.getHttpServer())
      .post('/escrow/confirm-refunded')
      .set('Authorization', 'Bearer employer-token')
      .send({ jobPostId: fundedJobId });

    expect(res.status).toBe(201);
    expect(res.body.data.escrowStatus).toBe('REFUNDED');
  });

  it('fetch status', async () => {
    const res = await request(app.getHttpServer())
      .get(`/escrow/status/${candidateJobId}`)
      .set('Authorization', 'Bearer employer-token');

    expect(res.status).toBe(200);
    expect(res.body.data.dbState.escrowStatus).toBe('CANDIDATE_SET');
    expect(res.body.data.onChainState.candidate).toBe(candidateWallet);
  });

  it('request without JWT -> 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/escrow/confirm-funded')
      .send(fundedDto);

    expect(res.status).toBe(401);
  });

  it('wrong user -> 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/escrow/confirm-funded')
      .set('Authorization', 'Bearer wrong-token')
      .send(fundedDto);

    expect(res.status).toBe(403);
  });

  it('cannot release before funded', async () => {
    const res = await request(app.getHttpServer())
      .post('/escrow/confirm-released')
      .set('Authorization', 'Bearer employer-token')
      .send({ jobPostId: createdJobId });

    expect(res.status).toBe(400);
  });

  it('cannot refund after release', async () => {
    const res = await request(app.getHttpServer())
      .post('/escrow/confirm-refunded')
      .set('Authorization', 'Bearer employer-token')
      .send({ jobPostId: releasedJobId });

    expect(res.status).toBe(409);
  });

  it('cannot set candidate twice', async () => {
    const res = await request(app.getHttpServer())
      .post('/escrow/set-candidate')
      .set('Authorization', 'Bearer employer-token')
      .send({ jobPostId: candidateJobId, candidateWallet });

    expect(res.status).toBe(409);
  });

  it('cannot fund twice with conflicting details', async () => {
    const res = await request(app.getHttpServer())
      .post('/escrow/confirm-funded')
      .set('Authorization', 'Bearer employer-token')
      .send({
        jobPostId: fundedJobId,
        escrowId: '999',
        escrowAddress,
        expectedAmount: '250000000',
      });

    expect(res.status).toBe(409);
  });

  it('repeated confirm-funded does not duplicate state', async () => {
    const first = await request(app.getHttpServer())
      .post('/escrow/confirm-funded')
      .set('Authorization', 'Bearer employer-token')
      .send(fundedDto);
    const second = await request(app.getHttpServer())
      .post('/escrow/confirm-funded')
      .set('Authorization', 'Bearer employer-token')
      .send(fundedDto);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.escrowStatus).toBe('FUNDED');
    expect(second.body.data.transitionCount).toBe(1);
  });

  it('invalid DTO payloads -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/escrow/confirm-funded')
      .set('Authorization', 'Bearer employer-token')
      .send({
        jobPostId: 'not-a-uuid',
        escrowId: '-1',
        escrowAddress: 'not base58!',
        expectedAmount: 'abc',
      });

    expect(res.status).toBe(400);
    expect(escrowService.confirmFunded).not.toHaveBeenCalled();
  });
});
