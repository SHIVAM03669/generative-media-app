export function friendlyApiError(err) {
  if (!err) return 'Something went wrong. Please try again.';

  const status = err.status ?? err.statusCode;
  const message = err.message ?? String(err);

  if (status === 429 || /rate limit/i.test(message)) {
    return 'Rate limit reached. Free tiers cap requests — wait a minute and try again.';
  }
  if (status === 503 || /loading/i.test(message)) {
    return 'The model is warming up (common on Hugging Face free tier). Retry in ~30 seconds.';
  }
  if (status === 403) {
    return 'Access denied (403). Create a Hugging Face token with "Inference Providers" permission, add it as VITE_HF_TOKEN, then restart npm run dev.';
  }
  if (status === 404) {
    return 'Model or API endpoint not found (404). Restart npm run dev after updating — HF now uses router.huggingface.co.';
  }
  if (status === 401) {
    return 'Invalid or missing token. Check VITE_HF_TOKEN in your .env file.';
  }
  if (/network|fetch failed/i.test(message)) {
    return 'Network error. Check your connection and try again.';
  }
  if (/quota|credit/i.test(message)) {
    return 'Provider quota exceeded on the free plan. Try the other provider or mock mode.';
  }

  return message.length > 120 ? `${message.slice(0, 117)}…` : message;
}
