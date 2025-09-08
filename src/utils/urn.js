import { AIR_REGEX } from '../core/regex.js';

/**
 * Универсальный модуль для работы с URN идентификаторами
 */

// ========== КОМПРЕССИЯ URN ==========

/**
 * Сжимает полный URN в короткий формат
 * Например: urn:air:sdxl:checkpoint:civitai:101055@128078 -> @civitai/128078
 * @param {string} urn - полный URN идентификатор
 * @returns {string|null} сжатый формат или null если URN невалидный
 */
export function compressUrn(urn) {
  if (!urn || typeof urn !== 'string') {
    return null;
  }

  const match = urn.match(AIR_REGEX);
  if (!match || !match.groups) {
    return null;
  }

  const { source, version } = match.groups;
  
  if (!source) {
    return null;
  }

  // Если есть версия, используем формат @source/version
  // Если нет версии, используем просто @source
  return version ? `@${source}/${version}` : `@${source}`;
}

/**
 * Проверяет, является ли строка валидным URN
 * @param {string} urn - URN для проверки
 * @returns {boolean}
 */
export function isValidUrn(urn) {
  return typeof urn === 'string' && AIR_REGEX.test(urn);
}

// ========== РАЗВЕРТЫВАНИЕ URN ==========

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
    console.error(`[URN] Error expanding ${compressedUrn}:`, error.message);
    return null;
  }
}

// ========== ГЕНЕРАЦИЯ MODEL MAP ==========

/**
 * Генерирует полный modelMap для джоба, развертывая все сжатые URN
 * @param {Object} job - объект джоба
 * @param {Object} Resource - Mongoose модель ресурсов
 * @returns {Promise<Object>} объект modelMap в формате { "@source/version": "path/to/model.safetensors" }
 */
export async function generateModelMap(job, Resource) {
  const { generateModelPath } = await import('./path-templates.js');
  const modelMap = {};
  const uniqueUrns = new Set();

  // Собираем все URN из джоба
  if (job.model) uniqueUrns.add(job.model);
  if (job.resources) job.resources.forEach(urn => uniqueUrns.add(urn));
  if (job.additionalNetworks) {
    Object.values(job.additionalNetworks).forEach(network => {
      if (network?.id) uniqueUrns.add(network.id);
    });
  }

  // Для каждого URN генерируем путь
  for (const compressedUrn of uniqueUrns) {
    try {
      const fullUrn = await expandUrn(compressedUrn, Resource);
      if (!fullUrn) {
        console.warn(`[URN] Could not expand: ${compressedUrn}`);
        continue;
      }

      const modelPath = generateModelPath(fullUrn);
      if (modelPath) {
        modelMap[compressedUrn] = modelPath;
        console.log(`[URN] Mapped ${compressedUrn} -> ${modelPath}`);
      }
    } catch (error) {
      console.error(`[URN] Error processing ${compressedUrn}:`, error.message);
    }
  }

  return modelMap;
}