import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Blob } from '../../gradient/types';
import { useGradientStore } from '../../gradient/state/useGradientStore';
import {
  blobToScreen,
  computeGizmoGeometry,
  distanceFromCenter,
  majorHandleToParams,
  resizeFromOutline,
  screenToBlobPosition,
} from '../../gradient/utils/coords';
import { contrastColor } from '../../gradient/utils/color';
import './BlobHandles.css';

type DragMode = 'move' | 'major' | 'outline';

interface DragState {
  id: string;
  mode: DragMode;
  moved: boolean;
  startDist: number;
  startSize: number;
}

/**
 * On-canvas manipulation overlay, split into two layers:
 * - helpers (dashed ellipse + rotate/stretch handle) are drawn in a color
 *   picked to contrast the background, so they stay readable over any scene;
 * - anchors (numbered center dots) render in each blob's own color, with the
 *   number tinted to contrast that color.
 *
 * Dragging is tracked via window listeners so it survives React re-renders
 * (e.g. after editing sliders). A click without dragging selects the blob and
 * opens its menu. Hidden when `showHandles` is off.
 */
export function BlobHandles() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });

  const blobs = useGradientStore((state) => state.blobs);
  const selectedBlobId = useGradientStore((state) => state.selectedBlobId);
  const showHandles = useGradientStore((state) => state.showHandles);
  const backgroundColor = useGradientStore((state) => state.global.backgroundColor);

  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ id: string; patch: Partial<Blob> } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const flush = () => {
      rafRef.current = null;
      const pending = pendingRef.current;
      if (pending) useGradientStore.getState().updateBlob(pending.id, pending.patch);
    };

    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const blob = useGradientStore.getState().blobs.find((b) => b.id === drag.id);
      if (!blob) return;

      drag.moved = true;
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;

      let patch: Partial<Blob>;
      if (drag.mode === 'move') {
        patch = { position: screenToBlobPosition(px, py, rect.width, rect.height) };
      } else if (drag.mode === 'major') {
        patch = majorHandleToParams(blob.position, blob.size, px, py, rect.width, rect.height);
      } else {
        patch = resizeFromOutline(
          blob.position,
          drag.startSize,
          drag.startDist,
          px,
          py,
          rect.width,
          rect.height,
        );
      }

      pendingRef.current = { id: drag.id, patch };
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(flush);
    };

    const onUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      if (!drag.moved) {
        const state = useGradientStore.getState();
        state.selectBlob(drag.id);
        state.setPanelOpen(true);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Backspace' && event.key !== 'Delete') return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const state = useGradientStore.getState();
      if (!state.selectedBlobId || state.blobs.length <= 1) return;
      event.preventDefault();
      state.removeBlob(state.selectedBlobId);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const startDrag = (
    event: ReactPointerEvent<SVGElement>,
    id: string,
    mode: DragMode,
  ) => {
    event.stopPropagation();
    const state = useGradientStore.getState();
    const blob = state.blobs.find((b) => b.id === id);
    const rect = containerRef.current?.getBoundingClientRect();

    let startDist = 0;
    if (mode === 'outline' && blob && rect) {
      startDist = distanceFromCenter(
        blob.position,
        event.clientX - rect.left,
        event.clientY - rect.top,
        rect.width,
        rect.height,
      );
    }

    dragRef.current = { id, mode, moved: false, startDist, startSize: blob?.size ?? 1 };
    state.selectBlob(id);
  };

  const deselect = () => useGradientStore.getState().selectBlob(null);

  const selectedBlob = blobs.find((blob) => blob.id === selectedBlobId) ?? null;
  const gizmo = selectedBlob
    ? computeGizmoGeometry(
        selectedBlob.position,
        selectedBlob.size,
        selectedBlob.scale,
        selectedBlob.angle,
        size.width,
        size.height,
      )
    : null;

  const handleContrast = contrastColor(backgroundColor);

  return (
    <div
      ref={containerRef}
      className="blob-handles"
      aria-hidden={!showHandles}
      style={{ '--handle-contrast': handleContrast } as CSSProperties}
    >
      {showHandles && (
        <>
          {/* Helpers — blended with the scene so they always contrast */}
          <svg
            className="blob-helpers"
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
          >
            {/* Empty-space catcher — clicking off any blob clears the selection. */}
            <rect
              className="gizmo-backdrop"
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              onPointerDown={deselect}
            />

            {selectedBlob && gizmo && (
              <g>
                <ellipse
                  className="gizmo-outline"
                  cx={gizmo.cx}
                  cy={gizmo.cy}
                  rx={gizmo.rx}
                  ry={gizmo.ry}
                  transform={`rotate(${-gizmo.angleDeg} ${gizmo.cx} ${gizmo.cy})`}
                />
                <ellipse
                  className="gizmo-outline-hit"
                  cx={gizmo.cx}
                  cy={gizmo.cy}
                  rx={gizmo.rx}
                  ry={gizmo.ry}
                  transform={`rotate(${-gizmo.angleDeg} ${gizmo.cx} ${gizmo.cy})`}
                  onPointerDown={(event) => startDrag(event, selectedBlob.id, 'outline')}
                >
                  <title>Resize (drag the ring)</title>
                </ellipse>

                <line
                  className="gizmo-line"
                  x1={gizmo.cx}
                  y1={gizmo.cy}
                  x2={gizmo.major.x}
                  y2={gizmo.major.y}
                />
                <rect
                  className="gizmo-handle-major"
                  x={gizmo.major.x - 6}
                  y={gizmo.major.y - 6}
                  width={12}
                  height={12}
                  rx={2}
                  transform={`rotate(${-gizmo.angleDeg} ${gizmo.major.x} ${gizmo.major.y})`}
                  onPointerDown={(event) => startDrag(event, selectedBlob.id, 'major')}
                >
                  <title>Rotate &amp; oval stretch</title>
                </rect>
              </g>
            )}
          </svg>

          {/* Anchors — numbered, in each blob's own color */}
          <svg
            className="blob-anchors"
            width={size.width}
            height={size.height}
            viewBox={`0 0 ${size.width} ${size.height}`}
          >
            {blobs.map((blob, index) => {
              const { x, y } = blobToScreen(blob.position, size.width, size.height);
              const isSelected = blob.id === selectedBlobId;
              return (
                <g key={blob.id}>
                  <circle
                    className={`anchor${isSelected ? ' is-selected' : ''}`}
                    cx={x}
                    cy={y}
                    r={isSelected ? 12 : 11}
                    style={{ fill: blob.color }}
                    onPointerDown={(event) => startDrag(event, blob.id, 'move')}
                  />
                  <text
                    className="anchor-label"
                    x={x}
                    y={y}
                    style={{ fill: contrastColor(blob.color) }}
                  >
                    {index + 1}
                  </text>
                </g>
              );
            })}
          </svg>
        </>
      )}
    </div>
  );
}
