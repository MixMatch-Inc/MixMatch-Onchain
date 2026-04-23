import { Router } from 'express';
import { listDjs, getDjProfile } from './discovery.controller';

const discoveryRouter = Router();

discoveryRouter.get('/djs', listDjs);
discoveryRouter.get('/djs/:id', getDjProfile);

export default discoveryRouter;
