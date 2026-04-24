import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { getJourney, listOwnerJourneys, listPublicJourneys } from './journey.controller';

const journeyRouter = Router();

journeyRouter.get('/owner/me', requireAuth, listOwnerJourneys);
journeyRouter.get('/public/:userId', requireAuth, listPublicJourneys);
journeyRouter.get('/:id', requireAuth, getJourney);

export default journeyRouter;
