import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  // Security
  app.use(helmet());
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(new ZodValidationPipe());

//   app.useGlobalPipes(
//   new ValidationPipe({
//     whitelist: true,
//     transform: true,
//   }),
// );

  app.useStaticAssets(join(__dirname, 'static'), {
    prefix: '/',
  });

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('a16zero Employer API')
    .setDescription(
      'Backend MVP for Employer platform features and Account Abstraction auth verification.',
    )
    .setVersion('1.0')
  .addBearerAuth()	  
  .addApiKey(
    {
      type: 'apiKey',
      name: 'x-internal-api-key', // must match your guard
      in: 'header',
      description: 'Internal API key',
    },
    'internal-api-key',
  )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const cleanedDocument = cleanupOpenApiDoc(document);
  SwaggerModule.setup('api/docs', app, cleanedDocument, {
    swaggerOptions: {
      requestSnippetsEnabled: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);


  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

console.log('🚨 MAIN APP STARTED');
bootstrap();