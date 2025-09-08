import { AIR_REGEX } from '../core/regex.js';

/**
 * Генерация путей к файлам моделей по темплейтам
 */

const MODEL_FAMILIES = {
  'sd1': 'sd1',
  'sd1.5': 'sd1', 
  'sdxl': 'sdxl',
  'flux1': 'flux1',
  'flux': 'flux1'
};

const PATH_TEMPLATES = {
  checkpoint: '{family}/{source}/{id}/{version}.safetensors',
  lora: 'lora/{family}/{source}/{id}/{version}.safetensors'
};

/**
 * Генерирует путь к модели по темплейту на основе полного URN
 * @param {string} fullUrn - полный URN (urn:air:sdxl:checkpoint:civitai:101055@128078)
 * @returns {string|null} путь к модели или null если URN невалидный
 */
export function generateModelPath(fullUrn) {
  if (!fullUrn || typeof fullUrn !== 'string') {
    return null;
  }

  const match = fullUrn.match(AIR_REGEX);
  if (!match || !match.groups) {
    return null;
  }

  const { ecosystem, type, source, id, version } = match.groups;
  
  if (!ecosystem || !type || !source || !id || !version) {
    return null;
  }

  // Определяем семейство модели
  const family = MODEL_FAMILIES[ecosystem.toLowerCase()] || ecosystem.toLowerCase();
  const template = PATH_TEMPLATES[type.toLowerCase()];
  
  if (!template) {
    // Fallback для неизвестных типов
    return `${type.toLowerCase()}/${family}/${source}/${id}/${version}.safetensors`;
  }
  
  return template
    .replace('{family}', family)
    .replace('{source}', source) 
    .replace('{id}', id)
    .replace('{version}', version);
}

/**
 * Добавляет новый темплейт пути для типа модели
 * @param {string} type - тип модели (checkpoint, lora, etc.)
 * @param {string} template - темплейт пути с плейсхолдерами
 */
export function addPathTemplate(type, template) {
  PATH_TEMPLATES[type.toLowerCase()] = template;
}

/**
 * Добавляет новое семейство моделей
 * @param {string} ecosystem - название экосистемы
 * @param {string} family - семейство модели
 */
export function addModelFamily(ecosystem, family) {
  MODEL_FAMILIES[ecosystem.toLowerCase()] = family;
}

/**
 * Возвращает все доступные темплейты путей
 * @returns {Object} объект с темплейтами
 */
export function getPathTemplates() {
  return { ...PATH_TEMPLATES };
}

/**
 * Возвращает все доступные семейства моделей
 * @returns {Object} объект с семействами моделей
 */
export function getModelFamilies() {
  return { ...MODEL_FAMILIES };
}