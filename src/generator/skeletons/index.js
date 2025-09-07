import { buildStandardT2I } from './standard_t2i.js';

export const SKELETONS = {
  'standard_t2i': buildStandardT2I,
  // 'flux_t2i': buildFluxT2I, // заглушка — реализация появится при наличии эталонного FLUX графа
};
