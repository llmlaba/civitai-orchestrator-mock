import { AIR_REGEX } from '../airRegex.js';

/**
 * Развертывает сжатый URN обратно в полный формат путем поиска в базе данных
 * Например: @civitai/128078 -> urn:air:sdxl:checkpoint:civitai:101055@128078
 * @param {string} compressedUrn - сжатый URN (@source/version)
 * @param {Object} Resource - Mongoose модель ресурсов
 * @returns {Promise<string|null>} полный URN или null если не найден
 */
export async function expandUrn(compressedUrn, Resource) {
  if (!compressedUrn || typeof compressedUrn !== 'string' || !compressedUrn.startsWith('@')) {
    return null;
  }

  try {
    // Извлекаем версию из сжатого URN
    // @civitai/128078 -> 128078
    const versionMatch = compressedUrn.match(/@[^\/]+\/(.+)$/);
    if (!versionMatch) {
      return null;
    }
    
    const version = versionMatch[1];
    
    // Ищем ресурс с такой версией в базе данных
    // Поскольку версия уникальна в рамках системы, будет только один результат
    const resource = await Resource.findOne({ 
      air: { $regex: `@${version}$` } 
    }).lean();
    
    if (!resource) {
      return null;
    }

    return resource.air;
  } catch (error) {
    console.error(`[URN_EXPANDER] Error expanding URN ${compressedUrn}:`, error.message);
    return null;
  }
}

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

  // Определяем семейство модели (sd1, sdxl, flux1)
  let modelFamily;
  switch (ecosystem.toLowerCase()) {
    case 'sd1':
    case 'sd1.5':
      modelFamily = 'sd1';
      break;
    case 'sdxl':
      modelFamily = 'sdxl';
      break;
    case 'flux1':
    case 'flux':
      modelFamily = 'flux1';
      break;
    default:
      modelFamily = ecosystem.toLowerCase();
  }

  // Генерируем путь в зависимости от типа
  const typeStr = type.toLowerCase();
  
  if (typeStr === 'checkpoint') {
    // Checkpoint: {model family}/{model source}/{modelid}/{unic model version}.safetensors
    // Пример: sd1/civitai/4384/128713.safetensors
    return `${modelFamily}/${source}/${id}/${version}.safetensors`;
  } else if (typeStr === 'lora') {
    // LoRA: lora/{model family}/{model source}/{modelid}/{unic model version}.safetensors
    // Пример: lora/sd1/civitai/82098/87153.safetensors
    return `lora/${modelFamily}/${source}/${id}/${version}.safetensors`;
  }

  // Для других типов пока используем базовый формат
  return `${typeStr}/${modelFamily}/${source}/${id}/${version}.safetensors`;
}

/**
 * Генерирует полный modelMap для джоба, развертывая все сжатые URN
 * @param {Object} job - объект джоба
 * @param {Object} Resource - Mongoose модель ресурсов
 * @returns {Promise<Object>} объект modelMap в формате { "@source/version": "path/to/model.safetensors" }
 */
export async function generateModelMap(job, Resource) {
  const modelMap = {};
  const uniqueUrns = new Set();

  // Собираем все уникальные сжатые URN из джоба
  if (job.model) {
    uniqueUrns.add(job.model);
  }
  
  if (job.resources && Array.isArray(job.resources)) {
    job.resources.forEach(urn => uniqueUrns.add(urn));
  }

  // Обрабатываем additionalNetworks (LoRA и другие)
  if (job.additionalNetworks && typeof job.additionalNetworks === 'object') {
    Object.values(job.additionalNetworks).forEach(network => {
      if (network && network.id) {
        uniqueUrns.add(network.id);
      }
    });
  }

  // Для каждого сжатого URN генерируем полный путь
  for (const compressedUrn of uniqueUrns) {
    try {
      // Развертываем в полный URN
      const fullUrn = await expandUrn(compressedUrn, Resource);
      if (!fullUrn) {
        console.warn(`[MODEL_MAP_GENERATOR] Could not expand URN: ${compressedUrn}`);
        continue;
      }

      // Генерируем путь к модели
      const modelPath = generateModelPath(fullUrn);
      if (!modelPath) {
        console.warn(`[MODEL_MAP_GENERATOR] Could not generate path for URN: ${fullUrn}`);
        continue;
      }

      modelMap[compressedUrn] = modelPath;
      
      console.log(`[MODEL_MAP_GENERATOR] Mapped ${compressedUrn} -> ${modelPath}`);
    } catch (error) {
      console.error(`[MODEL_MAP_GENERATOR] Error processing URN ${compressedUrn}:`, error.message);
    }
  }

  return modelMap;
}