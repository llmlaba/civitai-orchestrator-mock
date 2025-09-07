import { AIR_REGEX } from '../airRegex.js';

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