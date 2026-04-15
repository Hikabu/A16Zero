import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { resetBefore, resetAfter } from './shared';

describe('Auth Lifecycle (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
     ({ app } = await resetBefore());
    
  });

  afterEach(async () => {
     await resetAfter(app);
  });

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    username: `user-${Date.now()}`,
    password: 'Password123!',
    role: "CANDIDATE"
  };

  it('/auth/register (POST) -> Blocked Access', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    expect(registerResponse.body.needsVerification).toBe(true);
    expect(registerResponse.body.accessToken).toBeUndefined();

    // Verify protected route is blocked
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .expect(401);
  });

  it('/auth/verify-email (POST) -> Successful Access', async () => {
    // In this E2E test, we'll use a direct Prisma update to simulate verification
    // because the code for verification stub logs the code to console.
    // However, the AuthService allows verification via a code in Redis.
     await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    // For the sake of the E2E test lifecycle, we'll manually verify the user 
    // to test that the login flow then works.
    const prisma = app.get(PrismaService);
    await prisma.user.update({
      where: { email: testUser.email },
      data: { isEmailVerified: true },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: testUser.email,
        password: testUser.password,
      })
      .expect(201);

    expect(loginResponse.body.accessToken).toBeDefined();
    expect(loginResponse.body.refreshToken).toBeDefined();

    // Verify protected route is now accessible
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(201);
  });
});
