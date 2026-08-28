import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * #915: Attaches a correlation ID to every request and writes a structured
 * log line on completion so each request is traceable end-to-end.
 *
 * - If the client provides `X-Correlation-Id`, that value is used.
 * - Otherwise a new UUID v4 is generated and echoed back in
 *   `X-Correlation-Id` on the response so the caller can reference it.
 *
 * Log format:
 *   METHOD /path statusCode responseTimeMs correlationId
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers['x-correlation-id'] as string | undefined) || randomUUID();

    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);

    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms [${correlationId}]`,
      );
    });

    next();
  }
}
