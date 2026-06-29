import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../../utils/logger';

type HealthStatus = 'ok' | 'degraded' | 'down';
type ServiceStatus = 'up' | 'down';

export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  services: {
    database: ServiceStatus;
  };
}

/**
 * Promise wrapper to race against a timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallbackErrorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(fallbackErrorMsg)), ms)),
  ]);
}

export async function checkHealth(_req: Request, res: Response): Promise<void> {
  const response: HealthCheckResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'up',
    },
  };

  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Mongoose not connected');
    }
    
    // Ping DB with a 2-second timeout to prevent hanging the HTTP thread
    await withTimeout(
      mongoose.connection.db.admin().ping(),
      2000,
      'Database ping timed out after 2000ms'
    );
  } catch (error) {
    logger.error('Health check failed', { error });
    response.services.database = 'down';
    response.status = 'down';
  }

  const statusCode = response.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(response);
}
