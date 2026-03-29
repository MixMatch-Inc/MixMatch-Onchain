import { Router } from 'express';
import rootRouter from './root.router';

const apiV1Router = Router();

apiV1Router.use(rootRouter);

export default apiV1Router;
