import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendError, zodDetails } from './api-response';

export const validateRequest = (schemas: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendError(res, 400, 'Validation failed', zodDetails(error));
      } else {
        sendError(res, 400, 'Invalid request');
      }
    }
  };
};