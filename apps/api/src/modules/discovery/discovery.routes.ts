import { Router } from 'express';
import { listDjs } from './discovery.controller';

const discoveryRouter = Router();

discoveryRouter.get('/djs', listDjs);

export default discoveryRouter;
