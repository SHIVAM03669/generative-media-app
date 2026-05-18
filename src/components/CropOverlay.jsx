import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_SIZE = 0.1;

/** Crop UI clipped to stage — no huge box-shadow (that was turning the page black). */
export default function CropOverlay({ crop, onChange, disabled }) {
  const boxRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const rect = crop ?? { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };

  const clampRect = useCallback((r) => {
    let { x, y, width, height } = r;
    width = Math.max(MIN_SIZE, Math.min(1, width));
    height = Math.max(MIN_SIZE, Math.min(1, height));
    x = Math.max(0, Math.min(1 - width, x));
    y = Math.max(0, Math.min(1 - height, y));
    return { x, y, width, height };
  }, []);

  useEffect(() => {
    if (!drag || disabled) return;

    const onMove = (e) => {
      const box = boxRef.current?.getBoundingClientRect();
      if (!box) return;
      const px = (e.clientX - box.left) / box.width;
      const py = (e.clientY - box.top) / box.height;

      if (drag.type === 'move') {
        onChange(
          clampRect({
            x: px - drag.offsetX,
            y: py - drag.offsetY,
            width: rect.width,
            height: rect.height,
          })
        );
      } else {
        const x1 = Math.min(drag.startX, px);
        const y1 = Math.min(drag.startY, py);
        const x2 = Math.max(drag.startX, px);
        const y2 = Math.max(drag.startY, py);
        onChange(clampRect({ x: x1, y: y1, width: x2 - x1, height: y2 - y1 }));
      }
    };

    const onUp = () => setDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag, disabled, onChange, clampRect, rect.width, rect.height]);

  const pointerPos = (e) => {
    const box = boxRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - box.left) / box.width,
      y: (e.clientY - box.top) / box.height,
    };
  };

  const startMove = (e) => {
    if (disabled) return;
    e.preventDefault();
    const p = pointerPos(e);
    setDrag({ type: 'move', offsetX: p.x - rect.x, offsetY: p.y - rect.y });
  };

  const startResize = (e) => {
    if (disabled) return;
    e.stopPropagation();
    e.preventDefault();
    const p = pointerPos(e);
    setDrag({ type: 'resize', startX: p.x, startY: p.y });
  };

  const top = rect.y * 100;
  const left = rect.x * 100;
  const width = rect.width * 100;
  const height = rect.height * 100;

  return (
    <div className="crop-overlay" ref={boxRef}>
      <div className="crop-overlay__shade crop-overlay__shade--top" style={{ height: `${top}%` }} />
      <div className="crop-overlay__row" style={{ top: `${top}%`, height: `${height}%` }}>
        <div className="crop-overlay__shade crop-overlay__shade--side" style={{ width: `${left}%` }} />
        <div
          className="crop-overlay__window"
          style={{ width: `${width}%`, height: '100%' }}
          onPointerDown={startMove}
        >
          <span className="crop-overlay__handle" onPointerDown={startResize} role="presentation" />
        </div>
        <div
          className="crop-overlay__shade crop-overlay__shade--side"
          style={{ width: `${100 - left - width}%` }}
        />
      </div>
      <div
        className="crop-overlay__shade crop-overlay__shade--bottom"
        style={{ height: `${100 - top - height}%` }}
      />
    </div>
  );
}
