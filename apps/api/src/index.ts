import connectDB from './config/db';
import { apiEnv } from './config/env';
import authRouter from './modules/auth/auth.routes';
import apiV1Router from './routes/api-v1.router';
import { notFoundHandler } from './middleware/not-found.middleware';
import { errorHandler } from './middleware/error.middleware';
import discoveryRouter from './modules/discovery/discovery.routes';
import profilesRouter from './modules/profiles/profiles.routes';

const app = express();
const port = apiEnv.port;

app.use(cors({ origin: apiEnv.corsOrigin }));
app.use(express.json());
app.use('/auth', authRouter);
app.use('/discover', discoveryRouter);
app.use('/profiles', profilesRouter);

connectDB();

app.get('/', (req, res) => {
  res.json({ message: 'MixMatch API Running', status: 'OK' });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
});
