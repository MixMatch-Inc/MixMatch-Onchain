import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { listResonances } from './resonance.controller';

const resonanceRouter = Router();

resonanceRouter.get('/', requireAuth, listResonances);

export default resonanceRouter;
