import { Response } from 'express';
import { ZodError } from 'zod';

type ErrorDetails = Record<string, unknown> | undefined;

interface SuccessEnvelope<T> {
  success: true;
  data: T;
}

interface ErrorEnvelope {
  success: false;
  error: {
    message: string;
    details?: ErrorDetails;
  };
}

export const sendSuccess = <T>(res: Response, status: number, data: T): void => {
  const body: SuccessEnvelope<T> = {
    success: true,
    data,
  };

  res.status(status).json(body);
};

export const sendError = (
  res: Response,
  status: number,
  message: string,
  details?: ErrorDetails,
): void => {
  const body: ErrorEnvelope = {
    success: false,
    error: {
      message,
      details,
    },
  };

  res.status(status).json(body);
};

export const zodDetails = (error: ZodError): ErrorDetails => ({
  fieldErrors: error.flatten().fieldErrors,
  formErrors: error.flatten().formErrors,
});
