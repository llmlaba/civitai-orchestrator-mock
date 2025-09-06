// Регулярное выражение для `air`
export const AIR_REGEX = new RegExp(
  '^(?:urn:)?(?:air:)?(?:(?<ecosystem>[a-zA-Z0-9_\\-\\/]+):)?(?:(?<type>[a-zA-Z0-9_\\-\\/]+):)?(?<source>[a-zA-Z0-9_\\-\\/]+):(?<id>[a-zA-Z0-9_\\-\\/\\.]+)(?:@(?<version>[a-zA-Z0-9_\\-\\/.=,]+))?(?:\\.(?<format>[a-zA-Z0-9_\\-]+))?$'
);
