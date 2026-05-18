import { generateWithHf, hasHfCredentials } from '../hfService.js';

export async function generateImage(prompt, settings = {}) {
  if (!hasHfCredentials()) {
    const err = new Error('VITE_HF_TOKEN is not set');
    err.status = 401;
    throw err;
  }
  return generateWithHf(prompt, settings);
}

export function getApiMode() {
  if (import.meta.env.VITE_USE_MOCK === 'true') return 'mock';
  if (hasHfCredentials()) return 'live (huggingface)';
  return 'mock (no token)';
}
