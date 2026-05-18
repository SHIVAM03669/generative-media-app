import * as mock from './mockApi.js';
import * as real from './realApi.js';
import { hasHfCredentials } from '../hfService.js';

/**
 * Uses live Hugging Face when VITE_HF_TOKEN is set and VITE_USE_MOCK is not "true".
 */
export function useMockLayer() {
  if (import.meta.env.VITE_USE_MOCK === 'true') return true;
  if (import.meta.env.VITE_USE_MOCK === 'false') return false;
  return !hasHfCredentials();
}

const impl = useMockLayer() ? mock : real;

export const generateImage = impl.generateImage;

export function getApiMode() {
  if (useMockLayer()) return 'mock (placeholder photos only)';
  return real.getApiMode();
}
