import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

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

  // Real-time: scale Socket.IO across nodes via Redis when explicitly enabled.
  if (config.realtime.redisEnabled && config.redisUrl) {
    try {
      const redisAdapter = new RedisIoAdapter(app);
      await redisAdapter.connect(config.redisUrl);
      app.useWebSocketAdapter(redisAdapter);
      logger.log('Socket.IO Redis adapter enabled');
    } catch {
      logger.warn('Redis adapter unavailable — falling back to in-memory Socket.IO');
    }
  }

  await app.listen(config.port);
  logger.log(`API listening on http://localhost:${config.port}/${config.globalPrefix}`);
}

void bootstrap();
