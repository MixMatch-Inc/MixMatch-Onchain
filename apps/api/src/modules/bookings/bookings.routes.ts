import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { getBookingDetail, updateBookingStatus } from './bookings.controller';

const bookingsRouter = Router();

bookingsRouter.get('/:id', requireAuth, getBookingDetail);
bookingsRouter.patch('/:id/status', requireAuth, updateBookingStatus);

export default bookingsRouter;
