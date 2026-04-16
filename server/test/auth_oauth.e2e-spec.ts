import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { resetBefore, resetAfter } from './shared';
import { AuthService } from '../src/modules/auth/auth.service';

describe('Auth OAuth (e2e)', () => {
  let app: INestApplication;
  let testId: string;
  let testShortId: string;

  beforeEach(async () => {
    const setup = await resetBefore();
    app = setup.app;
    testId = setup.id;
    testShortId = setup.shortId;
  });

  afterEach(async () => {
    await resetAfter(app);
  });

  describe('Claim-based Onboarding', () => {
    it('should issue an onboarding token for new social users', async () => {
      // Mocking the behavior of callback which calls oauthLogin
      const authService : AuthService = app.get(AuthService);
      const profile = { 
        id: 'external-id', 
        email: `social-${testShortId}@example.com`, 
        firstName: 'Social', 
        lastName: 'User' 
      };
      
      const res = await authService.oauthLogin(profile, 'GITHUB');

      console.log("res: ", res);
      expect(res.needsOnboarding).toBe(true);
      expect(res.tempToken).toBeDefined();
      console.log("end!!!!");

      // Complete onboarding via API

      const onboardingRes = await request(app.getHttpServer())
        .post('/auth/onboarding')
        .set('Authorization', `Bearer ${res.tempToken}`)
        .send({ username: `socialuser-${testShortId}` })
        .expect(201);
      
        // console.log("onboarding:", onboardingRes);
      console.log(onboardingRes.status);
      console.log(onboardingRes.body);
      expect(onboardingRes.status).toBe(201);
      expect(onboardingRes.body.accessToken).toBeDefined();
    });
  });

  describe('Security: Hijacking & Linking', () => {
    it('should reject linking if state is tampered', async () => {
      // 1. Create a logged in user
      const email = `link-${testId}@example.com`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'StrongPassword123!', role: 'CANDIDATE' })
        .expect(201);
      
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: email, password: 'StrongPassword123!' })
        .expect(201);
      
      // Verification stub
      const prisma = (app.get(AuthService) as any).prisma;
      await prisma.user.update({ where: { email }, data: { isEmailVerified: true } as any });
      
      const verifiedLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: email, password: 'StrongPassword123!' })
        .expect(201);
      
      const accessToken = verifiedLogin.body.accessToken;

      // 2. Try to link with invalid state
      const linkRes = await request(app.getHttpServer())
        .get('/auth/github/callback')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ state: 'invalid-state', code: 'some-code' });
      
      // Passport or our controller should reject it. 
      // Our controller uses generateLinkState and verifies it.
      expect(linkRes.status).toBe(401);
    });

    it('should prevent auto-linking to unverified local accounts', async () => {
      // 1. Register but DON'T verify
      const email = `hijack-${testId}@example.com`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'StrongPassword123!', role: 'CANDIDATE' })
        .expect(201);

      // 2. External provider returns same email
      const authService = app.get(AuthService);
      const profile = { id: 'ext-123', email, email_verified: true };
      
      
      await expect(authService.oauthLogin(profile, 'GITHUB'))
        .rejects.toThrow('Email is already registered but not verified');
    });
  });
});
