import { Router } from 'express';
import { register } from './auth.controller';

const authRouter = Router();

authRouter.post('/register', register);

export default authRouter;
