/** @typedef {'queued' | 'generating' | 'done' | 'failed'} GenerationStatus */

/**
 * GenCanvas generation record (persisted in localStorage).
 *
 * @typedef {Object} Generation
 * @property {string} id - UUID
 * @property {number} displayIndex - Human-facing #1, #2… for lineage UI
 * @property {GenerationStatus} status
 * @property {string} prompt
 * @property {{ steps: number }} settings
 * @property {string} [imageUrl] - Set when status === 'done'
 * @property {string} [errorMessage] - Set when status === 'failed'
 * @property {string} [parentId] - Source generation id when created via Tweak
 * @property {number} [parentDisplayIndex] - Denormalized for "↻ tweaked from #3"
 * @property {string} provider - e.g. 'huggingface'
 * @property {string} [model]
 * @property {boolean} [mocked]
 * @property {number} createdAt - epoch ms
 * @property {number} updatedAt - epoch ms
 * @property {CanvasTweak} [canvasTweak]
 */

/**
 * @typedef {Object} CanvasTweak
 * @property {{ brightness: number, contrast: number, saturate: number }} [filters]
 * @property {{ x: number, y: number, width: number, height: number }} [crop] - 0–1 normalized rect
 * @property {{ text: string, x: number, y: number, fontSize: number, color: string }} [textOverlay] - x,y % of stage
 * @property {string} [previewDataUrl]
 */

export const GENERATION_STATUS = {
  QUEUED: 'queued',
  GENERATING: 'generating',
  DONE: 'done',
  FAILED: 'failed',
};

export function nextDisplayIndex(items) {
  if (!items?.length) return 1;
  return Math.max(...items.map((g) => g.displayIndex || 0), 0) + 1;
}

export function createGeneration({
  id,
  displayIndex,
  prompt,
  settings,
  parentId = null,
  parentDisplayIndex = null,
  status = GENERATION_STATUS.QUEUED,
}) {
  const now = Date.now();
  return {
    id,
    displayIndex,
    status,
    prompt,
    settings,
    parentId,
    parentDisplayIndex,
    provider: 'huggingface',
    createdAt: now,
    updatedAt: now,
  };
}

export function isActiveStatus(status) {
  return status === GENERATION_STATUS.QUEUED || status === GENERATION_STATUS.GENERATING;
}

export function normalizeGeneration(raw) {
  if (!raw?.id) return null;
  let status =
    raw.status ??
    (raw.imageUrl ? GENERATION_STATUS.DONE : GENERATION_STATUS.FAILED);
  if (
    raw.imageUrl &&
    (status === GENERATION_STATUS.QUEUED || status === GENERATION_STATUS.GENERATING)
  ) {
    status = GENERATION_STATUS.DONE;
  }
  return {
    ...raw,
    displayIndex: raw.displayIndex ?? 0,
    status,
    sourceImageUrl: raw.sourceImageUrl || raw.imageUrl || undefined,
    settings: raw.settings ?? { steps: 25 },
    provider: raw.provider ?? 'huggingface',
  };
}
