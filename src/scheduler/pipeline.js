
import { appendEvent } from '../services/events.js';
import { loadModelMap, buildComfyWorkflow } from '../services/generator-adapter.js';
import { enqueuePromptJson, waitForResult } from '../services/comfy-client.js';
import { makeTraceId } from '../errors.js';

export async function runPipelineForJob(jobDoc, { simulate=true } = {}) {
  const jobId = jobDoc.jobId;
  let traceId = makeTraceId(); // one trace per pipeline
  const startTime = Date.now();
  
  console.log(`[PIPELINE] 🚀 Starting pipeline for job ${jobId} | trace_id: ${traceId} | simulate: ${simulate}`);
  console.log(`[PIPELINE] Job details: baseModel=${jobDoc.baseModel}, model=${jobDoc.model}, Type=${jobDoc.Type}`);
  
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

  try {
    // 1) CLAIMED
    console.log(`[PIPELINE] 📋 Step 1/4: CLAIMED | job: ${jobId} | trace_id: ${traceId}`);
    let context = { ...baseContext, claimDuration: 0, jobDuration: 0 };
    await appendEvent({ jobId, type: 'CLAIMED', context, traceId });
    console.log(`[PIPELINE] ✅ Step 1/4: CLAIMED completed | job: ${jobId} | trace_id: ${traceId}`);

    // 2) PROMPT_PREPARED
    console.log(`[PIPELINE] 🎯 Step 2/4: PROMPT_PREPARED | job: ${jobId} | trace_id: ${traceId}`);
    const modelMap = loadModelMap();
    const workflow = buildComfyWorkflow(jobDoc, modelMap);
    context = { ...context, prompt: jobDoc.params, comfy: { request: workflow } };
    await appendEvent({ jobId, type: 'PROMPT_PREPARED', context, traceId });
    console.log(`[PIPELINE] ✅ Step 2/4: PROMPT_PREPARED completed | job: ${jobId} | trace_id: ${traceId} | workflow nodes: ${Object.keys(workflow).length}`);

    // 3) SENT_TO_COMFY
    console.log(`[PIPELINE] 📤 Step 3/4: SENT_TO_COMFY | job: ${jobId} | trace_id: ${traceId} | simulate: ${simulate}`);
    const { prompt_id, simulated } = await enqueuePromptJson(workflow, { simulate });
    context = { 
      ...context, 
      comfy: { 
        ...(context.comfy||{}), 
        response_meta: { prompt_id, simulated } 
      } 
    };
    await appendEvent({ jobId, type: 'SENT_TO_COMFY', context, traceId });
    console.log(`[PIPELINE] ✅ Step 3/4: SENT_TO_COMFY completed | job: ${jobId} | trace_id: ${traceId} | prompt_id: ${prompt_id} | simulated: ${simulated}`);

    // 4) COMFY_RESULT
    console.log(`[PIPELINE] 📥 Step 4/4: COMFY_RESULT | job: ${jobId} | trace_id: ${traceId} | waiting for prompt_id: ${prompt_id}`);
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
    
    const totalTime = Date.now() - startTime;
    console.log(`[PIPELINE] ✅ Step 4/4: COMFY_RESULT completed | job: ${jobId} | trace_id: ${traceId}`);
    console.log(`[PIPELINE] Result status: ${result.status} | artifacts: ${result.artifacts?.length || 0} | metrics:`, result.metrics);
    console.log(`[PIPELINE] 🎉 Pipeline completed successfully | job: ${jobId} | trace_id: ${traceId} | total_time: ${totalTime}ms`);
    
    return finalEvt;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[PIPELINE] ❌ Pipeline failed | job: ${jobId} | trace_id: ${traceId} | error: ${error.message} | total_time: ${totalTime}ms`);
    console.error(`[PIPELINE] Error stack:`, error.stack);
    throw error;
  }
}
