import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  getCurrentProfile,
  updateCurrentProfile,
} from './profiles.controller';

const profilesRouter = Router();

profilesRouter.get('/me', requireAuth, getCurrentProfile);
profilesRouter.patch('/me', requireAuth, updateCurrentProfile);

export default profilesRouter;
