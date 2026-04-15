import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { resetBefore, resetAfter } from './shared';
import { PrismaService } from '../src/prisma/prisma.service';


describe('Auth Hijacking Prevention (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let id: String;

  beforeEach(async () => {
     ({ app, prisma, id } = await resetBefore());
  });

  afterEach(async () => {
     await resetAfter(app);
});

  it('Prevent Account Linking Hijack via predictable state', async () => {
    // 1. Create a "target" user and login
    const targetUser = { 
      email: `target-${Date.now()}@example.com`, 
      username: `target-${Date.now()}`, 
      password: 'Password123!',
      role: 'CANDIDATE'
    };
    await request(app.getHttpServer()).post('/auth/register').send(targetUser).expect(201);

    //verify
    await prisma.user.update({
      where: { email: targetUser.email },
      data: { isEmailVerified: true },
    });
        
    // Assume verification is bypassed or handled for the sake of the test environment setup
    // For this test, we just need a JWT for the target user ID.

    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
        identifier: targetUser.email,
        password: targetUser.password
    }).expect(201);
    
    // The account is verified by default in some test setups or we manually update it
    // Let's assume the user is logged in.
    const jwt = loginResponse.body.accessToken;

    // 2. Attacker attempts to link THEIR social account to TARGET'S user ID 
    // using a predictable state if the system allowed it.
    // Our fix uses random state in Redis.
    
    const maliciousCallbackUrl = `/auth/github/link/callback?state=${loginResponse.body.id || 'target_user_id'}`;

    await request(app.getHttpServer())
      .get(maliciousCallbackUrl)
      .set('Authorization', `Bearer ${jwt}`)
      .expect(401); 
  });
});
