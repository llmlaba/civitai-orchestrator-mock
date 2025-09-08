import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Errors } from './errors.js';
import { compressUrn, isValidUrn } from './utils/urn-compressor.js';
import { JobEvent } from './services/events.js';

export function makeJobsRouter(Job, Resource) {
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
  router.post('/', validateJson, async (req, res,next) => {
    try {
      const body = req.body || {};
      const modelUrn = body.model;

      // Валидация URN модели
      if (!modelUrn || !isValidUrn(modelUrn)) {
        return next(Errors.BadRequest('Invalid or missing "model" URN'));
      }

      // Проверка существования модели в коллекции resources
      if (Resource) {
        const modelExists = await Resource.findOne({ air: modelUrn }).lean();
        if (!modelExists) {
          return next(Errors.BadRequest(`Model "${modelUrn}" not found in resources collection`));
        }
      }

      // Сжатие URN модели
      const compressedModel = compressUrn(modelUrn);
      if (!compressedModel) {
        return next(Errors.BadRequest(`Failed to compress model URN: ${modelUrn}`));
      }

      const jobId = uuidv4();
      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h
      const type = mapType(body.$type || body.type || 'textToImage');

      const params = Object.assign({}, body.params || {});
      params.seed = randomSeed(params.seed);

      const job = {
        Type: type,
        baseModel: body.baseModel || 'SDXL',
        model: compressedModel, // Используем сжатый URN вместо полного
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
        resources: [compressedModel] // Также используем сжатый URN в resources
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
      return next(Errors.BadRequest(err.message || 'Bad Request'));
    }
  });

  // Helper function to get last event for a job
  async function getLastEvent(jobId) {
    return await JobEvent.findOne({ jobId }).sort({ seq: -1 }).lean();
  }

  // Read
  router.get('/:jobId', async (req, res, next) => {
    const { jobId } = req.params;
    const detailed = String(req.query.detailed || 'false').toLowerCase() === 'true';

    const found = await Job.findOne({ jobId }).lean();
    if (!found) return next(Errors.NotFound('Not found'));

    // Get the last event for this job
    const lastEvent = await getLastEvent(jobId);

    if (detailed) {
      // Return full job structure + lastEvent
      const response = {
        ...found,
        lastEvent
      };
      return res.json(response);
    } else {
      // Return simplified format: only jobId, result, lastEvent, serviceProviders, scheduled
      const response = {
        jobId: found.jobId,
        result: found.result || [],
        lastEvent,
        serviceProviders: found.serviceProviders,
        scheduled: found.scheduled
      };
      return res.json(response);
    }
  });

  return router;
}
