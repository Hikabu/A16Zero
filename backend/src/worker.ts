import 'dotenv/config';
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./queues/worker.module";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  console.log('Worker is running...');
  
}

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

bootstrap();