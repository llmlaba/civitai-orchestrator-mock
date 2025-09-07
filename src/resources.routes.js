import express from 'express';
import { AIR_REGEX } from './airRegex.js';
import { Errors } from './errors.js';

export function makeResourcesRouter(Resource) {
  const router = express.Router();

  function validateJson(req, res, next) {
    if (!req.is('application/json')) {
      return next(Errors.UnsupportedMediaType('Expect application/json'));
    }
    next();
  }

  function validateAirString(air) {
    return typeof air === 'string' && AIR_REGEX.test(air);
  }

  // List with pagination
  router.get('/', async (req, res, next) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const q = req.query.q;
    const filter = q ? { air: { $regex: '^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') } } : {};

    const [items, total] = await Promise.all([
      Resource.find(filter).sort({ _id: 1 }).skip(skip).limit(limit).lean(),
      Resource.countDocuments(filter),
    ]);

    res.json({ page, limit, total, items });
  });

  router.post('/', validateJson, async (req, res, next) => {
    const doc = req.body;
    const air = doc?.air;
    if (!validateAirString(air)) {
      return next(Errors.BadRequest('Invalid or missing "air" value'));
    }

    try {
      const created = await Resource.create(doc);
      return res.status(201).json(created);
    } catch (err) {
      if (err?.code === 11000) {
        return next(Errors.Conflict('Resource with this "air" already exists'));
      }
      return next(Errors.BadRequest(err.message || 'Bad Request'));
    }
  });

  router.get('/:air', async (req, res, next) => {
    const air = req.params.air;
    if (!validateAirString(air)) {
      return next(Errors.BadRequest('Invalid "air" format'));
    }
    const found = await Resource.findOne({ air }).lean();
    if (!found) return next(Errors.NotFound('Resource not found'));
    return res.json(found);
  });

  router.put('/:air', validateJson, async (req, res, next) => {
    const air = req.params.air;
    if (!validateAirString(air)) {
      return next(Errors.BadRequest('Invalid "air" format'));
    }
    if (req.body?.air !== air) {
      return next(Errors.BadRequest( 'Body.air must equal path :air' ));
    }

    try {
      const replaced = await Resource.findOneAndReplace({ air }, req.body, { upsert: false, returnDocument: 'after' }).lean();
      if (!replaced) return next(Errors.NotFound('Resource not found'));
      return res.json(replaced);
    } catch (err) {
      return next(Errors.BadRequest(err.message || 'Bad Request'));
    }
  });

  router.patch('/:air', validateJson, async (req, res, next) => {
    const air = req.params.air;
    if (!validateAirString(air)) {
      return next(Errors.BadRequest('Invalid "air" format'));
    }
    if ('air' in req.body && req.body.air !== air) {
      return next(Errors.BadRequest('Cannot change "air" value'));
    }

    try {
      const updated = await Resource.findOneAndUpdate({ air }, { $set: req.body }, { new: true, runValidators: false }).lean();
      if (!updated) return next(Errors.NotFound('Resource not found'));
      return res.json(updated);
    } catch (err) {
      return next(Errors.BadRequest(err.message || 'Bad Request'));
    }
  });

  router.delete('/:air', async (req, res, next) => {
    const air = req.params.air;
    if (!validateAirString(air)) {
      return next(Errors.BadRequest('Invalid "air" format'));
    }
    const result = await Resource.deleteOne({ air });
    if (result.deletedCount === 0) {
      return next(Errors.NotFound('Resource not found'));
    }
    return res.status(204).send();
  });

  return router;
}
