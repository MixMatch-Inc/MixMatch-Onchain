import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';
import type { LogContext } from '../common/logger/logger.interface';

// Extend Express Request to include our correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  // Generate unique correlation ID for request tracing
  req.correlationId = randomUUID();
  res.setHeader('X-Correlation-ID', req.correlationId);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Extract auth context from request if available (set by auth middleware)
    const userId = (req as any).user?.id;
    
    const logContext: LogContext = {
      module: 'http',
      correlationId: req.correlationId,
      ...(userId && { userId }),
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (res.statusCode >= 500) {
      logger.error('Request failed', `HTTP ${res.statusCode}`, logContext);
    } else if (res.statusCode >= 400) {
      logger.warn('Request resulted in client error', logContext);
    } else {
      logger.info('Request successful', logContext);
    }
  });

  next();
}