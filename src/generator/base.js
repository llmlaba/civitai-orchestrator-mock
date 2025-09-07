// Shared helpers and minimal graph
export const SAMPLER_MAP = {
  EulerA: 'euler_ancestral',
  Euler: 'euler',
  DPM2: 'dpm_2',
  DPM2A: 'dpm_2_ancestral',
};
export function mapSampler(name) { return SAMPLER_MAP[name] || 'euler_ancestral'; }
export function getModelPath(modelId, modelMap) {
  const path = modelMap?.[modelId];
  if (!path) throw new Error(`Не найден путь к модели для id: ${modelId}`);
  return path;
}
export const ref = (name, idx) => [name, idx];
export class NodeGraph {
  constructor(){ this.nodes = {}; this._idx = 0; }
  add(name, class_type, inputs){
    const unique = `${name}_${++this._idx}`;
    this.nodes[unique] = { class_type, inputs, _meta: {} };
    return unique;
  }
}
