/** Proxied to https://router.huggingface.co/hf-inference/models/{model} */
export function hfModelPath(model) {
  return `/api/hf/models/${model}`;
}
