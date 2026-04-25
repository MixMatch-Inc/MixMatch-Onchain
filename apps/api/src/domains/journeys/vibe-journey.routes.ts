import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  listJourneys,
  getJourney,
  createJourney,
  updateJourney,
  publishJourney,
  deleteJourney,
  listPublishedJourneys,
} from './vibe-journey.controller';
import {
  createJourneySchema,
  updateJourneySchema,
  listJourneysQuerySchema,
  listPublishedJourneysQuerySchema,
} from './vibe-journey.validation';
import { validateRequest } from '../../utils/validation';

const vibeJourneyRouter = Router();

vibeJourneyRouter.get('/published', validateRequest({ query: listPublishedJourneysQuerySchema }), listPublishedJourneys);
vibeJourneyRouter.get('/me', requireAuth, validateRequest({ query: listJourneysQuerySchema }), listJourneys);
vibeJourneyRouter.get('/:id', requireAuth, getJourney);
vibeJourneyRouter.post('/', requireAuth, validateRequest({ body: createJourneySchema }), createJourney);
vibeJourneyRouter.put('/:id', requireAuth, validateRequest({ body: updateJourneySchema }), updateJourney);
vibeJourneyRouter.post('/:id/publish', requireAuth, publishJourney);
vibeJourneyRouter.delete('/:id', requireAuth, deleteJourney);

export default vibeJourneyRouter;