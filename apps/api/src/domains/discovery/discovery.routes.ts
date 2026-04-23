import { Router } from 'express';
import { getDjProfile } from './discovery.controller';

const discoveryRouter = Router();

discoveryRouter.get('/djs/:id', getDjProfile);

export default discoveryRouter;
