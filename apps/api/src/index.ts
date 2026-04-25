import express from 'express';
import cors from 'cors';
import connectDB from './config/db';
import { apiEnv } from './config/env';
import { identityRouter } from './domains/identity';
import { journeysRouter, journeyRouter } from './domains/journeys';
import { discoveryRouter } from './domains/discovery';
import { paymentsRouter } from './domains/payments';
import { resonanceRouter } from './domains/resonance';
import { tracksRouter } from './domains/tracks';
import { notFoundHandler } from './middleware/not-found.middleware';
import { errorHandler } from './middleware/error.middleware';
import { contextMiddleware } from './middleware/context.middleware';
import healthRouter from './routes/health.router';

const app = express();
const port = apiEnv.port;

app.use(cors({ origin: apiEnv.corsOrigin }));
app.use(express.json());
app.use(contextMiddleware);
app.use(healthRouter);
app.use('/auth', identityRouter);
app.use('/bookings', journeysRouter);
app.use('/journeys', journeyRouter);
app.use('/discover', discoveryRouter);
app.use('/payments', paymentsRouter);
app.use('/resonance', resonanceRouter);
app.use('/tracks', tracksRouter);

connectDB();

app.get('/', (req, res) => {
  res.json({ message: 'MixMatch API Running', status: 'OK' });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
});
