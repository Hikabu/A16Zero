import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );


  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('a16zero Employer API')
    .setDescription('Backend MVP for Employer platform features and Account Abstraction auth verification.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  const cleanedDocument = cleanupOpenApiDoc(document);
  SwaggerModule.setup('api/docs', app, cleanedDocument,{
    swaggerOptions: {
    requestSnippetsEnabled: true,
  }});

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();