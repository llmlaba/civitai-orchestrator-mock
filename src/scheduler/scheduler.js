
import dotenv from 'dotenv';
import { connectMongo } from '../db.js';
import { startSchedulerLoop } from './loop.js';

dotenv.config();

(async () => {
  const { Job, mongoose } = await connectMongo();
  const stop = startSchedulerLoop({ Job, mongoose });

  // graceful shutdown
  const shutdown = () => { stop(); mongoose.disconnect().then(()=>process.exit(0)); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch((e) => {
  console.error('Scheduler failed to start:', e);
  process.exit(1);
});
