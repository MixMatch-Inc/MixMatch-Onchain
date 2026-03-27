import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { createBooking } from './bookings.controller';

const bookingsRouter = Router();

bookingsRouter.post('/', requireAuth, createBooking);

export default bookingsRouter;
