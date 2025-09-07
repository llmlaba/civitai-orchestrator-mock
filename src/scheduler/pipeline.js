
import { appendEvent } from '../services/events.js';
import { loadModelMap, buildComfyWorkflow } from '../services/generator-adapter.js';
import { enqueuePromptJson, waitForResult } from '../services/comfy-client.js';
import { makeTraceId } from '../errors.js';

export async function runPipelineForJob(jobDoc, { simulate=true } = {}) {
  const jobId = jobDoc.jobId;
  let traceId = makeTraceId(); // one trace per pipeline
  const baseContext = {
    job_core: {
      jobId: jobDoc.jobId,
      Type: jobDoc.Type,
      baseModel: jobDoc.baseModel,
      model: jobDoc.model,
      params: jobDoc.params,
      maxRetryAttempt: jobDoc.maxRetryAttempt,
      resources: jobDoc.resources,
      createdAt: jobDoc.createdAt,
      expireAt: jobDoc.expireAt,
      scheduled: jobDoc.scheduled,
    },
    runtime: {
      worker_group: 'mock-single-node',
      provider: 'mock',
      trace_id: traceId,
    },
  };

  // 1) CLAIMED
  let context = { ...baseContext, claimDuration: 0, jobDuration: 0 };
  await appendEvent({ jobId, type: 'CLAIMED', context, traceId });

  // 2) PROMPT_PREPARED
  const modelMap = loadModelMap();
  const workflow = buildComfyWorkflow(jobDoc, modelMap);
  context = { ...context, prompt: jobDoc.params, comfy: { request: workflow } };
  await appendEvent({ jobId, type: 'PROMPT_PREPARED', context, traceId });

  // 3) SENT_TO_COMFY
  const { prompt_id, simulated } = await enqueuePromptJson(workflow, { simulate });
  context = { 
    ...context, 
    comfy: { 
      ...(context.comfy||{}), 
      response_meta: { prompt_id, simulated } 
    } 
  };
  await appendEvent({ jobId, type: 'SENT_TO_COMFY', context, traceId });

  // 4) COMFY_RESULT
  const result = await waitForResult(prompt_id, { simulate });
  context = {
    ...context,
    comfy: {
      ...(context.comfy||{}),
      metrics: result.metrics,
      artifacts: result.artifacts,
      result_status: result.status,
    }
  };
  const finalEvt = await appendEvent({ jobId, type: 'COMFY_RESULT', context, traceId });
  return finalEvt;
}
