
import dotenv from 'dotenv';
import { connectMongo } from '../core/db.js';
import { startSchedulerLoop } from './loop.js';

dotenv.config();

(async () => {
  const { Job, Resource, JobEvent, mongoose } = await connectMongo();
  
  // Создаем единую структуру для всех коллекций
  const dbCollections = { Job, Resource, JobEvent };
  
  const stop = startSchedulerLoop({ dbCollections, mongoose });

  // graceful shutdown
  const shutdown = () => { stop(); mongoose.disconnect().then(()=>process.exit(0)); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch((e) => {
  console.error('Scheduler failed to start:', e);
  process.exit(1);
});
