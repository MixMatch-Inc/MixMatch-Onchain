import connectDB from './config/db';
import { createApp } from './app';

const app = createApp();
const port = process.env.PORT || 3001;

connectDB();

app.listen(port, () => {
  console.log(`🚀 API listening on port ${port}`);
});
