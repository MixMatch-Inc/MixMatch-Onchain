import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  createDraftJourney,
  updateJourneySlots,
  publishJourney,
  getJourney,
  archiveJourney,
} from './journey.controller';

const journeyRouter = Router();

journeyRouter.post('/', requireAuth, createDraftJourney);
journeyRouter.get('/:journeyId', requireAuth, getJourney);
journeyRouter.patch('/:journeyId/slots', requireAuth, updateJourneySlots);
journeyRouter.post('/:journeyId/publish', requireAuth, publishJourney);
journeyRouter.post('/:journeyId/archive', requireAuth, archiveJourney);

export default journeyRouter;
