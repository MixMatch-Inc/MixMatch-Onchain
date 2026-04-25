// Moderation domain - Content moderation, reporting, audit logging, blocklist

import { Router } from 'express';

export { isRedacted, redactJourney, redactDjProfile } from './redaction';
export { AuditLog, AuditAction } from './audit-log.model';
export { auditLogService, AuditLogService } from './audit-log.service';
export { BlockEntry } from './block-entry.model';

const moderationRouter = Router();

export default moderationRouter;
