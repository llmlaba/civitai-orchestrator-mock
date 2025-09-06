import express from 'express';
import { v4 as uuidv4 } from 'uuid';

export function makeJobsRouter(Job) {
  const router = express.Router();

  function validateJson(req, res, next) {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Unsupported Media Type. Expect application/json' });
    }
    next();
  }

  function mapType(input) {
    const s = String(input || '').toLowerCase();
    if (s === 'texttoimage' || s === 'texttoimagev2' || s === 'text_to_image' || s === 'text2image' || s === 'texttoimagev1') {
      return 'TextToImageV2';
    }
    return 'TextToImageV2';
  }

  function randomSeed(seed) {
    if (typeof seed === 'number' && seed >= 0) return seed;
    return Math.floor(Math.random() * 0xFFFFFFFF);
  }

  // Create
  router.post('/', validateJson, async (req, res) => {
    try {
      const body = req.body || {};
      const jobId = uuidv4();
      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h
      const type = mapType(body.$type || body.type || 'textToImage');

      const params = Object.assign({}, body.params || {});
      params.seed = randomSeed(params.seed);

      const job = {
        Type: type,
        baseModel: body.baseModel || 'SDXL',
        model: body.model,
        params,
        additionalNetworks: body.additionalNetworks || {},
        type,
        id: jobId,
        createdAt: now.toISOString(),
        expireAt: expires.toISOString(),
        properties: body.properties || {},
        maxRetryAttempt: 5,
        version: 0,
        jobDependencies: [],
        resources: body.model ? [body.model] : []
      };

      const doc = {
        job,
        jobId,
        properties: {},
        result: [],
        serviceProviders: { local: { support: 'Available' } },
        scheduled: true
      };

      const created = await Job.create(doc);
      return res.status(201).json(created);
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Bad Request' });
    }
  });

  // Read
  router.get('/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const detailed = String(req.query.detailed || '').toLowerCase() === 'true';

    const found = await Job.findOne({ jobId }).lean();
    if (!found) return res.status(404).json({ error: 'Not Found' });

    if (!detailed) {
      return res.json({
        jobId: found.jobId,
        scheduled: !!found.scheduled,
        result: found.result || [],
        serviceProviders: found.serviceProviders || { local: { support: 'Available' } }
      });
    }
    return res.json(found);
  });

  return router;
}
