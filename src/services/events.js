
import { connectMongo } from '../core/db.js';
import { makeTraceId } from '../core/errors.js';

// Получаем модель JobEvent из централизованного db.js
let JobEvent = null;
const getJobEventModel = async () => {
  if (!JobEvent) {
    const { JobEvent: JobEventModel } = await connectMongo();
    JobEvent = JobEventModel;
  }
  return JobEvent;
};

/**
 * Get next seq for this jobId (monotonic per job)
 */
export async function nextSeq(jobId) {
  const JobEventModel = await getJobEventModel();
  const last = await JobEventModel.findOne({ jobId }).sort({ seq: -1 }).lean();
  return (last?.seq ?? -1) + 1;
}

/**
 * Append an event with full context snapshot (append-only).
 * If traceId not provided, generates one.
 */
export async function appendEvent({ jobId, type, context, retryAttempt = 0, provider = 'local', workerId = 'local', dateTime, traceId }) {
  const seq = await nextSeq(jobId);
  
  // Упрощаем context, убирая лишние вложенности
  const cleanContext = { ...context };
  delete cleanContext.job_core;
  delete cleanContext.runtime;
  
  const doc = {
    jobId,
    seq,
    type,
    dateTime: dateTime || new Date().toISOString(),
    provider,
    workerId,
    context: cleanContext,
    claimDuration: context.claimDuration || "00:01:28.5309948",
    jobDuration: context.jobDuration || "00:03:57.3894074", 
    retryAttempt,
    jobType: context.job_type || "TextToImageV2",
    claimHasCompleted: true,
    jobHasCompleted: type === 'Succeeded' || type === 'COMFY_RESULT'
  };
  const JobEventModel = await getJobEventModel();
  await JobEventModel.create(doc);
  return doc;
}
