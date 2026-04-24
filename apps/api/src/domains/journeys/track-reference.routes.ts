import { Router } from 'express';
import {
  getTrackReference,
  createTrackReference,
  searchTrackReferences,
  getRecentTrackReferences,
  getTrackReferenceByProvider,
} from './track-reference.controller';
import {
  createTrackReferenceSchema,
  searchTrackReferencesQuerySchema,
  getRecentTrackReferencesQuerySchema,
} from './track-reference.validation';
import { validateRequest } from '../../utils/validation';

const trackReferenceRouter = Router();

trackReferenceRouter.get('/search', validateRequest({ query: searchTrackReferencesQuerySchema }), searchTrackReferences);
trackReferenceRouter.get('/recent', validateRequest({ query: getRecentTrackReferencesQuerySchema }), getRecentTrackReferences);
trackReferenceRouter.get('/:id', getTrackReference);
trackReferenceRouter.post('/', validateRequest({ body: createTrackReferenceSchema }), createTrackReference);
trackReferenceRouter.get('/provider/:provider/:providerTrackId', getTrackReferenceByProvider);

export default trackReferenceRouter;