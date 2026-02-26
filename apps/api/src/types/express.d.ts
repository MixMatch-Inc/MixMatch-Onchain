import { AuthenticatedRequestUser } from '../middleware/auth.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedRequestUser;
    }
  }
}

export {};
