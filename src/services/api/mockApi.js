const MOCK_DELAY_MIN = 1800;
const MOCK_DELAY_MAX = 4200;

function randomDelay() {
  return (
    MOCK_DELAY_MIN +
    Math.random() * (MOCK_DELAY_MAX - MOCK_DELAY_MIN)
  );
}

function seededPlaceholder(prompt, settings) {
  const seed = hashString(`${prompt}-${settings.steps}`);
  return `https://picsum.photos/seed/${seed}/512/512`;
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export async function generateImage(prompt, settings = {}) {
  await sleep(randomDelay());

  if (settings.simulateError === 'rate_limit') {
    const err = new Error('Simulated rate limit');
    err.status = 429;
    throw err;
  }

  return {
    imageUrl: seededPlaceholder(prompt, settings),
    provider: 'huggingface',
    model: import.meta.env.VITE_HF_MODEL || 'black-forest-labs/FLUX.1-schnell',
    mocked: true,
  };
}

export function getApiMode() {
  return 'mock';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
