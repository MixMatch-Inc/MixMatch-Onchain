import { Router } from 'express';
import authRouter from '../domains/identity/auth.routes';

const rootRouter = Router();

rootRouter.use('/auth', authRouter);

export default rootRouter;
