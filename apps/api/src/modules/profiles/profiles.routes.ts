import { Router } from 'express';
import { createProfile } from './profiles.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const profilesRouter = Router();

profilesRouter.post('/', requireAuth, createProfile);

export default profilesRouter;
