import type { Response } from "express";
import type { ApiSuccess, ApiError } from "@themixmatch/types";

export function sendSuccess<T>(res: Response, statusCode: number, data: T): void {
  const payload: ApiSuccess<T> = {
    success: true,
    data,
  };
  res.status(statusCode).json(payload);
}

export function sendError(res: Response, error: { code: string; message: string; statusCode?: number }): void {
  const payload: ApiError = {
    success: false,
    code: error.code,
    message: error.message,
  };
  res.status(error.statusCode || 500).json(payload);
}
