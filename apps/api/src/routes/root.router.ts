import { Router } from 'express';
import authRouter from '../modules/auth/auth.routes';

const rootRouter = Router();

rootRouter.use('/auth', authRouter);

export default rootRouter;
