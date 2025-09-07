// Entry: adapter → skeleton → build
import { pickAdapter } from './adapters/index.js';
import { SKELETONS } from './skeletons/index.js';

export function generateWorkflow(job, modelMap) {
  if (!job || typeof job !== 'object') throw new Error('job must be an object');
  const type = (job.Type || job.type || '').toLowerCase();
  if (type !== 'texttoimagev2') throw new Error(`Нет класса для обработки Type=${job.Type}. Поддерживается только TextToImageV2.`);

  const adapter = pickAdapter(job);
  const builder = SKELETONS[adapter.skeleton];
  if (!builder) throw new Error(`Шаблон (skeleton) "${adapter.skeleton}" не реализован для ${adapter.id}.`);
  return builder(job, modelMap, adapter.options || {});
}
