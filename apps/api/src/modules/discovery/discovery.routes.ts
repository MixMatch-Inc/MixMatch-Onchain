import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { listDjs, getDjProfile } from './discovery.controller';

const discoveryRouter = Router();

discoveryRouter.get('/djs', requireAuth, listDjs);
discoveryRouter.get('/djs/:id', requireAuth, getDjProfile);

export default discoveryRouter;
