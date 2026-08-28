import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('HTTP');

  app.use((req: Request & { requestId?: string }, res: Response, next: NextFunction) => {
    const requestId = req.header('x-request-id')?.trim() || randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const startedAt = Date.now();
    res.on('finish', () => {
      logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms requestId=${requestId}`,
      );
    });

    next();
  });

  app.useGlobalFilters(new ApiExceptionFilter());

  const configService = app.get(ConfigService);
  await app.listen(configService.getOrThrow<number>('port'));
}
bootstrap().catch((err) => console.error(err));
