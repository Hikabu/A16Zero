import { execSync } from 'child_process';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import * as crypto from 'crypto';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

export const resetBefore = async()=>{
  //   execSync('npx prisma migrate reset --force', {
  //   stdio: 'inherit',
  //   env: {
  //     ...process.env,
  //     DATABASE_URL: 'postgresql://user:password@localhost:5432/a16zero_test'
  //   }
  // });
  const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app: INestApplication<App> = moduleFixture.createNestApplication();
    
    await app.init();

    const prisma: PrismaService = app.get(PrismaService);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "User" CASCADE;`);
      await prisma.$connect();
    const id = crypto.randomBytes(16).toString('hex');
const shortId = crypto
  .createHash('md5')
  .update(id)
  .digest('hex')
  .slice(0, 8);


    return {
      app, 
      prisma,
      id,
      shortId
    };

}    

export const resetAfter = async(app: INestApplication<App>)=>{
   const prisma = app.get(PrismaService);
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error('Error disconnecting Prisma:', err);
    }

    const redis = app.get('REDIS');
    try {
      if (redis && typeof redis.quit === 'function') {
        await redis.quit();
      }
    } catch (err) {
      console.error('Error quitting Redis:', err);
    }

    try {
      await app.close(); 
    } catch (err) {
      console.error('Error closing app:', err);
    }
}    

@Injectable()
export class MockGithubGuard {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    // simulate JWT user (VERY IMPORTANT)
    req.authUser = {
      id: 'test-user-id',
      isEmailVerified: true,
    };

    // simulate GitHub user
    req.user = {
      githubId: 'mock-id',
      email: 'mock@example.com',
    };

    return true;
  }
}

export const resetBeforeNoThrottle = async () => {
  const moduleFixture = await Test.createTestingModule({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [], // 🚨 disables it completely
    }),
    AppModule,
  ],
}).compile();
  // const moduleFixture = await Test.createTestingModule({
  //   imports: [AppModule],
  // })
  //   .overrideProvider(APP_GUARD)
  //   .useValue({ canActivate: () => true })
  //   .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  return { app };
};