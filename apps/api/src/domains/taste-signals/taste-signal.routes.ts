import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import {
  listTasteSignals,
  createTasteSignal,
  updateTasteSignal,
  deleteTasteSignal,
  reorderTasteSignals,
} from './taste-signal.controller';

const tasteSignalsRouter = Router();

tasteSignalsRouter.get('/', requireAuth, listTasteSignals);
tasteSignalsRouter.post('/', requireAuth, createTasteSignal);
tasteSignalsRouter.patch('/reorder', requireAuth, reorderTasteSignals);
tasteSignalsRouter.patch('/:id', requireAuth, updateTasteSignal);
tasteSignalsRouter.delete('/:id', requireAuth, deleteTasteSignal);

export default tasteSignalsRouter;
