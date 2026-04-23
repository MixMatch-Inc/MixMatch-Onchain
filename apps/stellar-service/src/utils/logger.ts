import { Request } from 'express';

export const createLogger = (req: Request) => ({
  info: (message: string, extra?: any) => {
    console.log(`[${req.stellarContext.correlationId}] ${message}`, extra ? JSON.stringify(extra) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[${req.stellarContext.correlationId}] ERROR: ${message}`, error ? JSON.stringify(error) : '');
  },
  warn: (message: string, extra?: any) => {
    console.warn(`[${req.stellarContext.correlationId}] WARN: ${message}`, extra ? JSON.stringify(extra) : '');
  },
});