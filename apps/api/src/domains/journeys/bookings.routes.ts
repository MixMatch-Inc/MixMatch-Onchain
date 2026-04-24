import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { listCurrentUserBookings } from './bookings.controller';

const bookingsRouter = Router();

bookingsRouter.get('/me', requireAuth, listCurrentUserBookings);

export default bookingsRouter;
