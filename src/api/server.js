import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectMongo } from '../core/db.js';
import { makeResourcesRouter } from './routes/resources.routes.js';
import { makeJobsRouter } from './routes/jobs.routes.js';
import { attachTraceId, errorHandler } from '../core/errors.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(attachTraceId);

const port = process.env.PORT || 3000;

async function main() {
  const { Resource, Job, JobEvent } = await connectMongo();
  app.use('/v2/resources', makeResourcesRouter(Resource));
  app.use('/v1/consumer/jobs', makeJobsRouter(Job, Resource, JobEvent));

  app.get('/health', (req, res) => res.json({ ok: true }));

  app.use(errorHandler);

  app.listen(port, () => {
    console.log(`CIVITAI Orchestrator Mock listening on http://localhost:${port}`);
  });
}

main().catch((e) => {
  console.error('Failed to start server:', e);
  process.exit(1);
});
