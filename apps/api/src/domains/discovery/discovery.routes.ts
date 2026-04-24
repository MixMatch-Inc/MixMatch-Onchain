import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { listDjs, getDjProfile } from './discovery.controller';
import { ingestImpressions } from './impressions.controller';

const discoveryRouter = Router();

discoveryRouter.get('/djs', requireAuth, listDjs);
discoveryRouter.get('/djs/:id', requireAuth, getDjProfile);
discoveryRouter.post('/impressions', requireAuth, ingestImpressions);

export default discoveryRouter;
