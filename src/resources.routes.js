import express from 'express';
import { AIR_REGEX } from './airRegex.js';

export function makeResourcesRouter(Resource) {
  const router = express.Router();

  function validateJson(req, res, next) {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Unsupported Media Type. Expect application/json' });
    }
    next();
  }

  function validateAirString(air) {
    return typeof air === 'string' && AIR_REGEX.test(air);
  }

  // List with pagination
  router.get('/', async (req, res) => {
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

  router.post('/', validateJson, async (req, res) => {
    const doc = req.body;
    const air = doc?.air;
    if (!validateAirString(air)) {
      return res.status(400).json({ error: 'Invalid or missing "air" value' });
    }

    try {
      const created = await Resource.create(doc);
      return res.status(201).json(created);
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({ error: 'Resource with this "air" already exists' });
      }
      return res.status(400).json({ error: err.message || 'Bad Request' });
    }
  });

  router.get('/:air', async (req, res) => {
    const air = req.params.air;
    if (!validateAirString(air)) {
      return res.status(400).json({ error: 'Invalid "air" format' });
    }
    const found = await Resource.findOne({ air }).lean();
    if (!found) return res.status(404).json({ error: 'Not Found' });
    return res.json(found);
  });

  router.put('/:air', validateJson, async (req, res) => {
    const air = req.params.air;
    if (!validateAirString(air)) {
      return res.status(400).json({ error: 'Invalid "air" format' });
    }
    if (req.body?.air !== air) {
      return res.status(400).json({ error: 'Body.air must equal path :air' });
    }

    try {
      const replaced = await Resource.findOneAndReplace({ air }, req.body, { upsert: false, returnDocument: 'after' }).lean();
      if (!replaced) return res.status(404).json({ error: 'Not Found' });
      return res.json(replaced);
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Bad Request' });
    }
  });

  router.patch('/:air', validateJson, async (req, res) => {
    const air = req.params.air;
    if (!validateAirString(air)) {
      return res.status(400).json({ error: 'Invalid "air" format' });
    }
    if ('air' in req.body && req.body.air !== air) {
      return res.status(400).json({ error: 'Cannot change "air" value' });
    }

    try {
      const updated = await Resource.findOneAndUpdate({ air }, { $set: req.body }, { new: true, runValidators: false }).lean();
      if (!updated) return res.status(404).json({ error: 'Not Found' });
      return res.json(updated);
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Bad Request' });
    }
  });

  router.delete('/:air', async (req, res) => {
    const air = req.params.air;
    if (!validateAirString(air)) {
      return res.status(400).json({ error: 'Invalid "air" format' });
    }
    const result = await Resource.deleteOne({ air });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Not Found' });
    }
    return res.status(204).send();
  });

  return router;
}
