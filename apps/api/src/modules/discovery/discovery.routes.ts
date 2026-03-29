import { Router } from 'express';
import { listDjs } from './discovery.controller';

const discoveryRouter = Router();

discoveryRouter.get('/djs', listDjs);
import { getDjProfile } from './discovery.controller';

const discoveryRouter = Router();

discoveryRouter.get('/djs/:id', getDjProfile);

export default discoveryRouter;
