import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { updateBookingStatus } from './bookings.controller';

const bookingsRouter = Router();

bookingsRouter.patch('/:id/status', requireAuth, updateBookingStatus);

export default bookingsRouter;
