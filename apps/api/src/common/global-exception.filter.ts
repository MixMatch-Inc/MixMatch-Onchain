import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from './request-id.middleware';

interface NormalizedErrorBody {
  statusCode: number;
  message: string;
  code: string;
  requestId?: string;
}

/**
 * Catches all unhandled exceptions and normalises them to a single
 * `{ statusCode, message, code, requestId }` JSON shape so every module
 * returns consistent error responses regardless of whether it throws an
 * `HttpException` (NestJS default), a plain `Error`, or a domain error
 * that was never caught. Fixes #916.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = request.headers[REQUEST_ID_HEADER] as string | undefined;

    let statusCode: number;
    let message: string;
    let code: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        code = `HTTP_${statusCode}`;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b['message'] as string) ?? exception.message;
        code = (b['code'] as string) ?? `HTTP_${statusCode}`;
      } else {
        message = exception.message;
        code = `HTTP_${statusCode}`;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      code = 'INTERNAL_SERVER_ERROR';
      // Log full error details for 500s
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
        { requestId },
      );
    }

    const body: NormalizedErrorBody = {
      statusCode,
      message,
      code,
      ...(requestId ? { requestId } : {}),
    };

    response.status(statusCode).json(body);
  }
}
