
/**
 * Minimal ComfyUI client (mock-friendly).
 * When COMFY_HTTP_URL/COMFY_WS_URL are not set, simulates submission & result.
 */
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export async function enqueuePromptJson(requestJson, { simulate=true, httpUrl=process.env.COMFY_HTTP_URL } = {}) {
  if (!httpUrl || simulate) {
    // Simulate prompt id
    const prompt_id = 'mock-' + Math.random().toString(36).slice(2, 10);
    return { prompt_id, simulated: true };
  }
  // Real HTTP call (Comfy API varies by build; this is a generic POST placeholder)
  const resp = await fetch(httpUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestJson),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Comfy HTTP ${resp.status}: ${text}`);
  }
  const data = await resp.json().catch(() => ({}));
  // Try to normalize prompt id
  const prompt_id = data?.prompt_id || data?.id || data?.promptId || 'unknown';
  return { prompt_id, raw: data, simulated: false };
}

export async function waitForResult(prompt_id, { simulate=true, wsUrl=process.env.COMFY_WS_URL, timeoutMs=15000 } = {}) {
  if (!wsUrl || simulate) {
    // Simple simulated result
    await sleep(500);
    return {
      status: 'succeeded',
      prompt_id,
      metrics: {
        comfy_mb_loaded: 2048,
        comfy_load_ms: 3200,
        middleware_duration_ComfyUI_ms: 480,
      },
      artifacts: [
        { kind: 'image', path: `memory://${prompt_id}.png`, size: 512*512*4 },
      ],
    };
  }
  // TODO: Real WS flow (not needed for mock right now)
  // For now fallback: timeout with error
  await sleep(1000);
  return { status: 'unknown', prompt_id };
}
