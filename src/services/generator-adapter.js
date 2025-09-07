
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateWorkflow } from '../generator/generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  MODEL_MAP_PATH = path.join(__dirname, '..', 'config', 'model-map.json'),
} = process.env;

export function loadModelMap(customPath) {
  const p = customPath || MODEL_MAP_PATH;
  const txt = fs.readFileSync(p, 'utf8');
  return JSON.parse(txt);
}

export function buildComfyWorkflow(job, modelMap) {
  return generateWorkflow(job.job, modelMap);
}
