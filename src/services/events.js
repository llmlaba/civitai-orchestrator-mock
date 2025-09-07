
import mongoose from 'mongoose';
import { makeTraceId } from '../errors.js';

const {
  MONGODB_JOBEVENT_COLLECTION_NAME = 'jobEvent',
} = process.env;

const jobEventSchema = new mongoose.Schema({}, { strict: false, collection: MONGODB_JOBEVENT_COLLECTION_NAME, timestamps: true });
export const JobEvent = mongoose.models.JobEvent || mongoose.model('JobEvent', jobEventSchema);

/**
 * Get next seq for this jobId (monotonic per job)
 */
export async function nextSeq(jobId) {
  const last = await JobEvent.findOne({ jobId }).sort({ seq: -1 }).lean();
  return (last?.seq ?? -1) + 1;
}

/**
 * Append an event with full context snapshot (append-only).
 * If traceId not provided, generates one.
 */
export async function appendEvent({ jobId, type, context, retryAttempt = 0, provider = 'mock', workerId = 'scheduler-1', dateTime, traceId }) {
  const seq = await nextSeq(jobId);
  const doc = {
    jobId,
    seq,
    type,
    dateTime: dateTime || new Date().toISOString(),
    provider,
    workerId,
    retryAttempt,
    trace_id: traceId || makeTraceId(),
    ...('claimDuration' in context ? { claimDuration: context.claimDuration } : {}),
    ...('jobDuration' in context ? { jobDuration: context.jobDuration } : {}),
    context,
  };
  await JobEvent.create(doc);
  return doc;
}
