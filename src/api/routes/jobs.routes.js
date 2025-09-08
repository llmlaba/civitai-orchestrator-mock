import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Errors } from '../../core/errors.js';
import { compressUrn, isValidUrn } from '../../utils/urn.js';
import { AIR_REGEX } from '../../core/regex.js';

export function makeJobsRouter(Job, Resource, JobEvent) {
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

  /**
   * Обрабатывает объект additionalNetworks:
   * 1. Сжимает URN ключи
   * 2. Добавляет поле type на основе URN
   * 3. Валидирует URN
   */
  function processAdditionalNetworks(additionalNetworks) {
    if (!additionalNetworks || typeof additionalNetworks !== 'object') {
      return {};
    }

    const processed = {};
    
    for (const [fullUrn, config] of Object.entries(additionalNetworks)) {
      // Валидация URN
      if (!isValidUrn(fullUrn)) {
        throw new Error(`Invalid URN in additionalNetworks: ${fullUrn}`);
      }

      // Сжатие URN
      const compressedUrn = compressUrn(fullUrn);
      if (!compressedUrn) {
        throw new Error(`Failed to compress URN: ${fullUrn}`);
      }

      // Извлечение типа из URN
      const match = fullUrn.match(AIR_REGEX);
      const urnType = match?.groups?.type || 'lora'; // по умолчанию 'lora' если тип не найден

      // Создание обработанной конфигурации
      processed[compressedUrn] = {
        ...config,
        type: urnType
      };
    }

    return processed;
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

      // Обработка additionalNetworks с сжатием URN и добавлением типов
      const processedAdditionalNetworks = processAdditionalNetworks(body.additionalNetworks);

      const job = {
        Type: type,
        baseModel: body.baseModel || 'SDXL',
        model: compressedModel, // Используем сжатый URN вместо полного
        params,
        additionalNetworks: processedAdditionalNetworks,
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
