import type { NextFunction, Request, Response } from 'express';
import type { AuditAction } from './audit.types.js';
import type { AuditService } from './audit.service.js';
import type { AuthenticatedRequest } from '../../shared/middleware/auth.middleware.js';

export function auditMiddleware(auditService: AuditService, action: AuditAction) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      const authReq = req as AuthenticatedRequest;
      auditService.record(action, {
        actorId: authReq.userId,
        resourceId: (req.params as Record<string, string>).id,
        ip: req.ip ?? req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      }).catch(() => {});
      return originalJson(body);
    };
    next();
  };
}
