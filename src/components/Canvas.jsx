import { useCallback, useEffect, useRef, useState } from 'react';
import CropOverlay from './CropOverlay.jsx';

const DEFAULT_FILTERS = { brightness: 100, contrast: 100, saturate: 100 };
const DEFAULT_CROP = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
const DEFAULT_TEXT = { text: 'Your text', x: 10, y: 80, fontSize: 28, color: '#ffffff', enabled: false };

const TABS = [
  { id: 'adjust', label: 'Adjust' },
  { id: 'crop', label: 'Crop' },
  { id: 'text', label: 'Text' },
];

export default function Canvas({ item, onSaveTweak, onClose }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [tab, setTab] = useState('adjust');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [crop, setCrop] = useState(DEFAULT_CROP);
  const [textOverlay, setTextOverlay] = useState(DEFAULT_TEXT);
  const [saving, setSaving] = useState(false);

  const sourceUrl = item?.sourceImageUrl || item?.imageUrl;

  useEffect(() => {
    if (!item) return;
    const t = item.canvasTweak ?? {};
    setFilters(t.filters ?? DEFAULT_FILTERS);
    setCrop(t.crop ?? DEFAULT_CROP);
    setTextOverlay(t.textOverlay ?? DEFAULT_TEXT);
    setTab(item.canvasTweak ? 'adjust' : 'adjust');
  }, [item?.id]);

  const drawCanvas = useCallback(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !sourceUrl) return;

    const nw = img.naturalWidth || 512;
    const nh = img.naturalHeight || 512;
    const c = crop ?? DEFAULT_CROP;
    const sx = Math.floor(c.x * nw);
    const sy = Math.floor(c.y * nh);
    const sw = Math.max(1, Math.floor(c.width * nw));
    const sh = Math.max(1, Math.floor(c.height * nh));

    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    const t = textOverlay;
    if (t?.text?.trim() && t?.enabled) {
      const px = (t.x / 100) * sw;
      const py = (t.y / 100) * sh;
      ctx.font = `bold ${t.fontSize}px DM Sans, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = Math.max(2, t.fontSize / 14);
      ctx.lineJoin = 'round';
      ctx.strokeText(t.text, px, py);
      ctx.fillText(t.text, px, py);
    }
  }, [sourceUrl, filters, crop, textOverlay]);

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;
    if (img.complete) drawCanvas();
    else img.onload = drawCanvas;
  }, [drawCanvas]);

  const exportComposite = useCallback((maxWidth = 800) => {
    drawCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    // If the canvas is larger than maxWidth, create a smaller version for preview
    if (canvas.width > maxWidth) {
      const ratio = maxWidth / canvas.width;
      const previewCanvas = document.createElement('canvas');
      previewCanvas.width = maxWidth;
      previewCanvas.height = canvas.height * ratio;
      
      const ctx = previewCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
      return previewCanvas.toDataURL('image/jpeg', 0.8); // Use JPEG with compression
    }
    
    return canvas.toDataURL('image/jpeg', 0.8); // Use JPEG instead of PNG for smaller size
  }, [drawCanvas]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const previewDataUrl = exportComposite();
      await onSaveTweak(item.id, {
        filters,
        crop,
        textOverlay,
        previewDataUrl,
        sourceImageUrl: item.sourceImageUrl || item.imageUrl,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetEdits = () => {
    setFilters(DEFAULT_FILTERS);
    setCrop(DEFAULT_CROP);
    setTextOverlay(DEFAULT_TEXT);
  };

  const handleRestoreOriginal = async () => {
    if (!item.sourceImageUrl) return;
    setSaving(true);
    try {
      await onSaveTweak(item.id, {
        canvasTweak: null,
        sourceImageUrl: item.sourceImageUrl,
      });
      handleResetEdits();
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    // For download, use full quality PNG
    drawCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `gencanvas-${item.id}.png`;
    link.href = canvas.toDataURL('image/png') || item.imageUrl;
    link.click();
  };

  if (!item) {
    return (
      <section className="canvas-panel canvas-panel--empty">
        <h2>Canvas</h2>
        <p>Select a gallery image to adjust, crop, or add text.</p>
      </section>
    );
  }

  const hasSavedEdits = Boolean(item.canvasTweak);
  const canRestore = Boolean(item.sourceImageUrl && item.sourceImageUrl !== item.imageUrl);

  return (
    <section className="canvas-panel">
      <div className="canvas-panel__header">
        <h2>Canvas · #{item.displayIndex || '?'}</h2>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>

      {hasSavedEdits && (
        <p className="canvas-edited-banner">
          This image has saved edits. Adjust below and save again, or restore the original.
        </p>
      )}

      <p className="canvas-panel__prompt">{item.prompt}</p>

      <div className="canvas-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`canvas-tabs__btn${tab === t.id ? ' canvas-tabs__btn--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <img
        ref={imageRef}
        src={sourceUrl}
        alt=""
        className="canvas-panel__source"
        crossOrigin="anonymous"
        hidden
      />

      <div className="canvas-panel__stage">
        <canvas ref={canvasRef} className="canvas-panel__canvas" />
        {tab === 'crop' && (
          <CropOverlay crop={crop} onChange={setCrop} disabled={false} />
        )}
      </div>

      {tab === 'adjust' && (
        <div className="canvas-panel__controls">
          {[
            { key: 'brightness', label: 'Brightness', min: 50, max: 150 },
            { key: 'contrast', label: 'Contrast', min: 50, max: 150 },
            { key: 'saturate', label: 'Saturation', min: 0, max: 200 },
          ].map(({ key, label, min, max }) => (
            <label key={key} className="slider-field">
              <span>
                {label} <em>{filters[key]}%</em>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                value={filters[key]}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, [key]: Number(e.target.value) }))
                }
              />
            </label>
          ))}
        </div>
      )}

      {tab === 'crop' && (
        <p className="canvas-panel__hint">
          Drag the box to move · drag the corner handle to resize
        </p>
      )}

      {tab === 'text' && (
        <>
          <p className="canvas-panel__hint">
            Type below — preview updates on the image. Use sliders to position the label.
          </p>
          
          <div className="canvas-panel__controls">
            <label className="field field--inline">
              <span>Enable text overlay</span>
              <input
                type="checkbox"
                checked={textOverlay.enabled}
                onChange={(e) => setTextOverlay((t) => ({ ...t, enabled: e.target.checked }))}
              />
            </label>
          </div>

          {textOverlay.enabled && (
            <>
              <label className="field">
                <span>Label text</span>
                <textarea
                  rows={2}
                  value={textOverlay.text}
                  onChange={(e) => setTextOverlay((t) => ({ ...t, text: e.target.value }))}
                  placeholder="Enter text…"
                />
              </label>
              <div className="canvas-panel__controls">
                <label className="slider-field">
                  <span>
                    Horizontal <em>{Math.round(textOverlay.x)}%</em>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={95}
                    value={textOverlay.x}
                    onChange={(e) =>
                      setTextOverlay((t) => ({ ...t, x: Number(e.target.value) }))
                    }
                  />
                </label>
                <label className="slider-field">
                  <span>
                    Vertical <em>{Math.round(textOverlay.y)}%</em>
                  </span>
                  <input
                    type="range"
                    min={5}
                    max={95}
                    value={textOverlay.y}
                    onChange={(e) =>
                      setTextOverlay((t) => ({ ...t, y: Number(e.target.value) }))
                    }
                  />
                </label>
                <label className="slider-field">
                  <span>
                    Size <em>{textOverlay.fontSize}px</em>
                  </span>
                  <input
                    type="range"
                    min={14}
                    max={72}
                    value={textOverlay.fontSize}
                    onChange={(e) =>
                      setTextOverlay((t) => ({ ...t, fontSize: Number(e.target.value) }))
                    }
                  />
                </label>
                <label className="field field--inline">
                  <span>Color</span>
                  <input
                    type="color"
                    value={textOverlay.color}
                    onChange={(e) => setTextOverlay((t) => ({ ...t, color: e.target.value }))}
                  />
                </label>
              </div>
              
              <div className="canvas-panel__actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setTextOverlay((t) => ({ ...t, text: '', enabled: false }))}
                >
                  Clear text
                </button>
              </div>
            </>
          )}
        </>
      )}

      <div className="canvas-panel__actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save to gallery'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={handleDownload}>
          Download
        </button>
        <button type="button" className="btn btn-ghost" onClick={handleResetEdits}>
          Reset sliders
        </button>
        {canRestore && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleRestoreOriginal}
            disabled={saving}
          >
            Restore original
          </button>
        )}
      </div>
    </section>
  );
}
