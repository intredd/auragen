import { useEffect, useRef, useState } from 'react';
import { selectConfig, useGradientStore } from '../../gradient/state/useGradientStore';
import {
  buildEmbedSnippet,
  captureImageAt,
  createRecordingSession,
  downloadBlob,
  resolutionPresets,
  defaultResolutionId,
  timestampedName,
  type RecordingSession,
} from '../../export';
import './ExportPanel.css';

const MIN_DIMENSION = 16;
const MAX_DIMENSION = 8192;

/** Selectable capture frame rates for video export. */
const FPS_OPTIONS = [24, 30, 60, 90, 120] as const;

/** Parse a dimension input into a safe, integer pixel size. */
function clampDimension(value: string): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return MIN_DIMENSION;
  return Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, parsed));
}

/** Standalone export menu (still image, clip, and embed snippet). */
export function ExportPanel() {
  const isOpen = useGradientStore((state) => state.isExportOpen);
  const setExportOpen = useGradientStore((state) => state.setExportOpen);

  const [resolutionId, setResolutionId] = useState(defaultResolutionId);
  const [customWidth, setCustomWidth] = useState('1600');
  const [customHeight, setCustomHeight] = useState('900');
  const [fps, setFps] = useState(60);
  const [savingPng, setSavingPng] = useState(false);
  const [recording, setRecording] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const sessionRef = useRef<RecordingSession | null>(null);

  useEffect(
    () => () => {
      sessionRef.current?.stop().catch(() => undefined);
      sessionRef.current = null;
    },
    [],
  );

  const isCustom = resolutionId === 'custom';
  const preset =
    resolutionPresets.find((item) => item.id === resolutionId) ?? resolutionPresets[0];
  const resolution = isCustom
    ? { width: clampDimension(customWidth), height: clampDimension(customHeight) }
    : preset;

  const handleSavePng = async () => {
    setSavingPng(true);
    try {
      const config = selectConfig(useGradientStore.getState());
      const blob = await captureImageAt(config, resolution.width, resolution.height, {
        type: 'image/png',
      });
      downloadBlob(blob, timestampedName('png'));
    } finally {
      setSavingPng(false);
    }
  };

  const handleToggleVideo = async () => {
    if (recording) {
      const session = sessionRef.current;
      sessionRef.current = null;
      setRecording(false);
      if (!session) return;
      const blob = await session.stop();
      downloadBlob(blob, timestampedName('webm'));
      return;
    }

    try {
      const config = selectConfig(useGradientStore.getState());
      sessionRef.current = createRecordingSession(
        config,
        resolution.width,
        resolution.height,
        { fps },
      );
      setRecording(true);
    } catch {
      sessionRef.current = null;
      window.alert('Video recording is not supported in this browser.');
    }
  };

  const handleCopyEmbed = async () => {
    const config = selectConfig(useGradientStore.getState());
    const snippet = buildEmbedSnippet(config);
    try {
      await navigator.clipboard.writeText(snippet);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 1500);
    } catch {
      window.prompt('Copy this embed snippet:', snippet);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="export-card" role="dialog" aria-label="Export">
      <div className="export-card-header">
        <span className="export-card-title">Export</span>
        <button
          type="button"
          className="export-close"
          onClick={() => setExportOpen(false)}
          aria-label="Close export"
        >
          ×
        </button>
      </div>

      <div className="export-card-body">
        <div className="export-group">
          <p className="export-group-title">Resolution</p>
          <select
            className="setting-select"
            value={resolutionId}
            onChange={(event) => setResolutionId(event.target.value)}
            disabled={recording}
          >
            {resolutionPresets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>

          {isCustom && (
            <div className="export-dims">
              <input
                type="number"
                className="setting-input"
                value={customWidth}
                min={MIN_DIMENSION}
                max={MAX_DIMENSION}
                step={1}
                onChange={(event) => setCustomWidth(event.target.value)}
                disabled={recording}
                aria-label="Width in pixels"
              />
              <span className="export-dims-x">×</span>
              <input
                type="number"
                className="setting-input"
                value={customHeight}
                min={MIN_DIMENSION}
                max={MAX_DIMENSION}
                step={1}
                onChange={(event) => setCustomHeight(event.target.value)}
                disabled={recording}
                aria-label="Height in pixels"
              />
              <span className="export-dims-unit">px</span>
            </div>
          )}
        </div>

        <div className="export-group">
          <p className="export-group-title">Media</p>
          <label className="export-field">
            <span className="export-field-label">Video frame rate</span>
            <select
              className="setting-select export-field-select"
              value={fps}
              onChange={(event) => setFps(Number(event.target.value))}
              disabled={recording}
            >
              {FPS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value > 60 ? `${value} fps (120Hz display)` : `${value} fps`}
                </option>
              ))}
            </select>
          </label>
          <div className="export-actions">
            <button
              type="button"
              className="panel-btn"
              onClick={handleSavePng}
              disabled={savingPng || recording}
            >
              {savingPng ? 'Saving…' : 'Save PNG'}
            </button>
            <button
              type="button"
              className={`panel-btn${recording ? ' panel-btn--recording' : ''}`}
              onClick={handleToggleVideo}
            >
              {recording ? '■ Stop & save video' : '● Record video'}
            </button>
          </div>
          {recording && <p className="export-hint">Recording… click stop when you’re done.</p>}
        </div>

        <div className="export-group">
          <p className="export-group-title">Embed</p>
          <button type="button" className="panel-btn" onClick={handleCopyEmbed}>
            {embedCopied ? 'Copied!' : 'Copy embed code'}
          </button>
          <p className="export-hint">
            Drops a framework-free <code>&lt;gradient-gen&gt;</code> web component with the
            current scene baked in.
          </p>
        </div>
      </div>
    </div>
  );
}
