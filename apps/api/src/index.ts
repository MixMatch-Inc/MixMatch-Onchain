import express from 'express';
import cors from 'cors';
import connectDB from './config/db';
import authRouter from './modules/auth/auth.routes';
import apiV1Router from './routes/api-v1.router';
import { notFoundHandler } from './middleware/not-found.middleware';
import { errorHandler } from './middleware/error.middleware';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);
app.use('/api/v1', apiV1Router);

connectDB();

app.get('/', (req, res) => {
  res.json({ message: 'MixMatch API Running', status: 'OK' });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
});
