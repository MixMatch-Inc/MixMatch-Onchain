import type { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction,
) => Promise<void>;

/**
 * Wraps an async Express handler so rejected promises are forwarded to
 * the error-handling middleware instead of crashing the process.
 */
export function asyncHandler<Req extends Request = Request>(
  handler: AsyncRouteHandler<Req>,
): (req: Req, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
