import express from 'express';
import cors from 'cors';
import connectDB from './config/db';
import { apiEnv } from './config/env';
import { identityRouter } from './domains/identity';
import { journeysRouter, vibeJourneyRouter } from './domains/journeys';
import { discoveryRouter } from './domains/discovery';
import { paymentsRouter } from './domains/payments';
import { notFoundHandler } from './middleware/not-found.middleware';
import { errorHandler } from './middleware/error.middleware';
import { contextMiddleware } from './middleware/context.middleware';

const app = express();
const port = apiEnv.port;

app.use(cors({ origin: apiEnv.corsOrigin }));
app.use(express.json());
app.use(contextMiddleware);
app.use('/auth', identityRouter);
app.use('/bookings', journeysRouter);
app.use('/journeys', vibeJourneyRouter);
app.use('/discover', discoveryRouter);
app.use('/payments', paymentsRouter);

connectDB();

app.get('/', (req, res) => {
  res.json({ message: 'MixMatch API Running', status: 'OK' });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
});
