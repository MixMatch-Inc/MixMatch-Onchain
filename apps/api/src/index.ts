import express from 'express';
import cors from 'cors';
import connectDB from './config/db';
import { apiEnv } from './config/env';
import authRouter from './modules/auth/auth.routes';
import profilesRouter from './modules/profiles/profiles.routes';

const app = express();
const port = apiEnv.port;

app.use(cors({ origin: apiEnv.corsOrigin }));
app.use(express.json());
app.use('/auth', authRouter);
app.use('/profiles', profilesRouter);

connectDB();

app.get('/', (req, res) => {
  res.json({ message: 'MixMatch API Running', status: 'OK' });
});

app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
});
