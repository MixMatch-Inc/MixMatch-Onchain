import { AuthenticatedRequestUser } from '../middleware/auth.middleware';
import { RequestContext } from '../middleware/context.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedRequestUser;
      context: RequestContext;
    }
  }
}

export {};
