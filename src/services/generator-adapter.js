
import { generateWorkflow } from '../generator/generator.js';
import { generateModelMap } from '../utils/urn-expander.js';

/**
 * Генерирует modelMap динамически на основе джоба и ресурсов в базе данных
 * @param {Object} job - объект джоба
 * @param {Object} Resource - Mongoose модель ресурсов
 * @returns {Promise<Object>} объект modelMap в формате { "@source/version": "path/to/model.safetensors" }
 */
export async function loadModelMap(job, Resource) {
  return await generateModelMap(job.job || job, Resource);
}

/**
 * Создает ComfyUI workflow для джоба
 * @param {Object} job - объект джоба
 * @param {Object} modelMap - мапинг моделей (результат loadModelMap)
 * @returns {Object} ComfyUI workflow
 */
export function buildComfyWorkflow(job, modelMap) {
  return generateWorkflow(job.job || job, modelMap);
}
