import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import cookieParser from 'cookie-parser';


async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: true,
    credentials: true,
  });

  setUpSwagger(app);

  const port = 3000;
  await app.listen(port);
  console.log(`Starting server on port ${port}...`);
}

function setUpSwagger(app){
  const config = new DocumentBuilder()
  .setTitle('Colosseum API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

  const document = SwaggerModule.createDocument(app, config);
  const cleanedDocument = cleanupOpenApiDoc(document);
  SwaggerModule.setup('docs', app, cleanedDocument);
}

bootstrap();