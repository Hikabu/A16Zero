import { execSync } from 'child_process';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import * as crypto from 'crypto';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

export const resetBefore = async()=>{
    execSync('npx prisma migrate reset --force', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://user:password@localhost:5432/a16zero_test'
    }
  });
  const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app: INestApplication<App> = moduleFixture.createNestApplication();
    
    await app.init();

    const prisma: PrismaService = app.get(PrismaService);
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
    await prisma.$disconnect();

  const redis = app.get('REDIS');
  await redis.quit();

  await app.close(); 

}    




// export const getTestUser = (id: String)=>{
//   return {
//       email: `test-${Date.now()}-${id}-@example.com`,
//       username: `user-${Date.now()}=${id}`,
//       password: 'Password123!',
//       role: "CANDIDATE"
//     };
// }

