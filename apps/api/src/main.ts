import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix(config.globalPrefix);
  app.use(helmet());
  app.use(cookieParser(config.cookie.secret));
  app.enableCors({
    origin: config.webOrigin,
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });
  app.enableShutdownHooks();

  await app.listen(config.port);
  logger.log(`API listening on http://localhost:${config.port}/${config.globalPrefix}`);
}

void bootstrap();
