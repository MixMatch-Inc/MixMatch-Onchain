import { Router } from 'express';
import { checkHealth } from './health.controller';

const router = Router();

router.get('/', (req, res, next) => {
  checkHealth(req, res).catch(next);
});

export default router;
