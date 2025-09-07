
import { runPipelineForJob } from './pipeline.js';

const POLL_INTERVAL_MS = Number(process.env.SCHEDULER_POLL_MS || 2000);

export function startSchedulerLoop({ Job, mongoose }) {
  const processing = new Set();

  async function tick() {
    try {
      const job = await Job.findOne({ scheduled: true }).sort({ createdAt: 1 }).lean();
      if (!job) return;

      if (processing.has(job.jobId)) return; // skip if in progress (single-node guard)
      processing.add(job.jobId);

      try {
        await runPipelineForJob(job, { simulate: true });
        // Mark job as completed for scheduler
        await Job.updateOne({ jobId: job.jobId }, { $set: { scheduled: false } });
      } catch (err) {
        console.error('[scheduler] job failed', job.jobId, err.message);
        // leave scheduled=true to allow retry by external policy
      } finally {
        processing.delete(job.jobId);
      }
    } catch (e) {
      console.error('[scheduler] tick error', e);
    }
  }

  const timer = setInterval(tick, POLL_INTERVAL_MS);
  console.log(`[scheduler] started, polling every ${POLL_INTERVAL_MS}ms`);

  return () => {
    clearInterval(timer);
    console.log('[scheduler] stopped');
  };
}
