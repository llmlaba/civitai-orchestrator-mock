// Registry of adapters + selector
import { sd15Adapter } from './sd15.adapter.js';
import { sdxlAdapter } from './sdxl.adapter.js';
import { fluxAdapter } from './flux.adapter.js';

export const ADAPTERS = {
  sd15: sd15Adapter,
  'sd1_5': sd15Adapter,
  sdxl: sdxlAdapter,
  flux: fluxAdapter,
};

export function pickAdapter(job) {
  const base = (job.baseModel || '').toLowerCase();
  if (base in ADAPTERS) return ADAPTERS[base];
  if (base === 'sd1.5') return ADAPTERS['sd1_5'];
  throw new Error(`Нет адаптера для baseModel=${job.baseModel}`);
}
