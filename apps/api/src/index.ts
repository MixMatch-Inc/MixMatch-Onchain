import express from 'express';
import cors from 'cors';
import connectDB from './config/db';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

connectDB();

app.get('/', (req, res) => {
  res.json({ message: 'MixMatch API Running', status: 'OK' });
});

app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
});
