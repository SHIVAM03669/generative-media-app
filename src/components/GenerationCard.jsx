import { GENERATION_STATUS } from '../models/generation.js';

function shortModel(model) {
  if (!model) return '—';
  const parts = model.split('/');
  return parts[parts.length - 1];
}

function displayLabel(item, items) {
  if (item.displayIndex > 0) return item.displayIndex;
  const sorted = [...items].sort((a, b) => a.createdAt - b.createdAt);
  const i = sorted.findIndex((g) => g.id === item.id);
  return i >= 0 ? i + 1 : '?';
}

const STATUS_LABEL = {
  [GENERATION_STATUS.QUEUED]: 'Queued',
  [GENERATION_STATUS.GENERATING]: 'Generating',
  [GENERATION_STATUS.DONE]: 'Done',
  [GENERATION_STATUS.FAILED]: 'Failed',
};

export default function GenerationCard({
  item,
  items,
  active,
  onTweak,
  onOpenCanvas,
  onDelete,
  onRetry,
}) {
  const isPending =
    item.status === GENERATION_STATUS.QUEUED ||
    item.status === GENERATION_STATUS.GENERATING;
  const isFailed = item.status === GENERATION_STATUS.FAILED;
  const hasImage = Boolean(item.imageUrl);
  const canUseImage = hasImage && !isPending;
  const label = displayLabel(item, items);
  const hasEdits = Boolean(item.canvasTweak);

  return (
    <li
      className={`gallery__card gallery__card--${item.status}${active ? ' gallery__card--active' : ''}`}
    >
      <div className="gallery__thumb-wrap">
        {isPending && (
          <div className="gallery__skeleton" aria-hidden="true">
            <div className="skeleton-shimmer" />
            <div className="skeleton-lines">
              <span />
              <span />
            </div>
          </div>
        )}

        {isFailed && !hasImage && (
          <div className="gallery__failed">
            <p>Failed</p>
            <p className="gallery__failed-msg">{item.errorMessage || 'Generation failed'}</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onRetry(item)}>
              Retry?
            </button>
          </div>
        )}

        {canUseImage && (
          <>
            <button
              type="button"
              className="gallery__thumb"
              onClick={() => onOpenCanvas(item)}
              aria-label={`Open #${label}: ${item.prompt}`}
            >
              <img src={item.imageUrl} alt={item.prompt} loading="lazy" />
            </button>
            <div className="gallery__thumb-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onTweak(item, items);
                }}
              >
                Tweak
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCanvas(item);
                }}
              >
                {hasEdits ? 'Edit again' : 'Canvas'}
              </button>
            </div>
          </>
        )}

        <span className={`gallery__status gallery__status--${item.status}`}>
          {STATUS_LABEL[item.status] ?? item.status}
        </span>
      </div>

      <div className="gallery__meta">
        <div className="gallery__title-row">
          <span className="gallery__index">#{label}</span>
          {hasEdits && <span className="gallery__edited">Edited</span>}
          {(item.parentId != null || (item.parentDisplayIndex ?? 0) > 0) && (
            <span className="gallery__lineage" title="Started from Tweak on another card">
              ↻ from #{item.parentDisplayIndex > 0 ? item.parentDisplayIndex : '?'}
            </span>
          )}
        </div>

        <p className="gallery__prompt" title={item.prompt}>
          {item.prompt}
        </p>

        {canUseImage && (
          <>
            <dl className="gallery__settings">
              <div>
                <dt>Model</dt>
                <dd title={item.model}>{shortModel(item.model)}</dd>
              </div>
              <div>
                <dt>Steps</dt>
                <dd>{item.settings?.steps ?? '—'}</dd>
              </div>
            </dl>
            <div className="gallery__actions">
              <button
                type="button"
                className="btn btn-primary btn-sm gallery__btn-tweak"
                onClick={() => onTweak(item, items)}
              >
                Tweak prompt
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => onOpenCanvas(item)}>
                {hasEdits ? 'Edit canvas' : 'Canvas'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-danger"
                onClick={() => onDelete(item.id)}
                aria-label="Delete"
              >
                ×
              </button>
            </div>
          </>
        )}

        {isFailed && hasImage && (
          <div className="gallery__actions">
            <button type="button" className="btn btn-ghost" onClick={() => onRetry(item)}>
              Retry
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onTweak(item, items)}>
              Tweak prompt
            </button>
          </div>
        )}

        {isPending && (
          <p className="gallery__pending-hint">Your image is in the queue…</p>
        )}
      </div>
    </li>
  );
}
