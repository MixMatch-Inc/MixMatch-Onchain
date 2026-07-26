import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface AuthErrorResponse {
  statusCode: number;
  errorCode: string;
  message: string;
  path: string;
  timestamp: string;
}

/**
 * Catches HTTP exceptions across auth contexts and normalizes 
 * error payloads into a predictable, client-friendly structure.
 */
@Catch(HttpException)
export class AuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Standardized Auth Error Codes
    let errorCode = 'AUTH_ERROR';
    if (status === HttpStatus.UNAUTHORIZED) {
      errorCode = 'UNAUTHORIZED_ACCESS';
    } else if (status === HttpStatus.FORBIDDEN) {
      errorCode = 'INSUFFICIENT_PERMISSIONS';
    } else if (status === HttpStatus.SERVICE_UNAVAILABLE) {
      errorCode = 'AUTH_SERVICE_UNAVAILABLE';
    }

    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'object' && 'message' in exceptionResponse
        ? (exceptionResponse as any).message
        : exception.message;

    const errorPayload: AuthErrorResponse = {
      statusCode: status,
      errorCode,
      message: Array.isArray(message) ? message[0] : message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    // Log security/auth warning without exposing internal stacks
    this.logger.warn(
      `Auth Exception [${errorCode}] ${request.method} ${request.url} - Status: ${status}`,
    );

    response.status(status).json(errorPayload);
  }
}