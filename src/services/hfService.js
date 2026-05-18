import { hfModelPath } from '../utils/proxyUrl.js';

const HF_MODEL =
  import.meta.env.VITE_HF_MODEL || 'black-forest-labs/FLUX.1-schnell';

const PROMPT_MAX_CHARS = 400;

export function hasHfCredentials() {
  return Boolean(import.meta.env.VITE_HF_TOKEN?.trim());
}

/**
 * Hugging Face via Vite dev proxy (/api/hf) — token injected server-side.
 */
export async function generateWithHf(prompt, settings = {}) {
  if (!hasHfCredentials()) {
    const err = new Error('VITE_HF_TOKEN is not set');
    err.status = 401;
    throw err;
  }

  const trimmed = prompt.slice(0, PROMPT_MAX_CHARS);
  const endpoint = hfModelPath(HF_MODEL);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: trimmed,
      parameters: {
        negative_prompt: settings.negativePrompt || 'blurry, low quality',
        num_inference_steps: Math.min(settings.steps ?? 25, 30),
        guidance_scale: settings.guidance ?? 7.5,
      },
    }),
  });

  if (res.status === 503) {
    const err = new Error('Model is loading');
    err.status = 503;
    throw err;
  }

  if (res.status === 429) {
    const err = new Error('Hugging Face rate limit (30k tokens/hour on free tier)');
    err.status = 429;
    throw err;
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const j = await res.json();
      message = j.error || j.message || message;
    } catch {
      /* blob error body */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  const blob = await res.blob();
  const imageUrl = await blobToDataUrl(blob);
  return { imageUrl, provider: 'huggingface', model: HF_MODEL };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
