import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';


async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useLogger(app.get(Logger));

  setUpSwagger(app);

  await app.listen(3000);
}

function setUpSwagger(app){
  const config = new DocumentBuilder()
  .setTitle('API')
  .setVersion('1.0')
  .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}

bootstrap();