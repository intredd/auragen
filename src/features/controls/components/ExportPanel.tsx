import { useCallback, useEffect, useRef, useState } from 'react';
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
import { SegmentControl } from './SegmentControl';
import './ExportPanel.css';

const MIN_DIMENSION = 16;
const MAX_DIMENSION = 8192;
const MIN_LOOP_DURATION = 0.5;
const MAX_LOOP_DURATION = 120;

/** Selectable capture frame rates for video export. */
const FPS_OPTIONS = [24, 30, 60, 90, 120] as const;
type LoopMode = 'off' | 'seamless';

/** Video quality → bits-per-pixel-per-frame factor for the target bitrate. */
const QUALITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];
const QUALITY_BPP: Record<string, number> = { low: 0.05, medium: 0.1, high: 0.2 };
const LOOP_MODE_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'seamless', label: 'Seamless' },
];

/**
 * Target video bitrate, scaled by resolution and frame rate so a 4K clip isn't
 * starved by the browser's fixed ~2.5 Mbps default.
 */
function videoBitrate(quality: string, width: number, height: number, fps: number): number {
  const bpp = QUALITY_BPP[quality] ?? QUALITY_BPP.medium;
  return Math.round(bpp * width * height * fps);
}

/** Parse a dimension input into a safe, integer pixel size. */
function clampDimension(value: string): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return MIN_DIMENSION;
  return Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, parsed));
}

function clampLoopDuration(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 6;
  return Math.min(MAX_LOOP_DURATION, Math.max(MIN_LOOP_DURATION, parsed));
}

function formatRecordingTime(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

/** Standalone export menu (still image, clip, and embed snippet). */
export function ExportPanel() {
  const isOpen = useGradientStore((state) => state.isExportOpen);
  const setExportOpen = useGradientStore((state) => state.setExportOpen);

  const [resolutionId, setResolutionId] = useState(defaultResolutionId);
  const [customWidth, setCustomWidth] = useState('1600');
  const [customHeight, setCustomHeight] = useState('900');
  const [fps, setFps] = useState(60);
  const [quality, setQuality] = useState('medium');
  const [loopMode, setLoopMode] = useState<LoopMode>('off');
  const [loopDurationSec, setLoopDurationSec] = useState('6');
  const [savingPng, setSavingPng] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingElapsedSec, setRecordingElapsedSec] = useState(0);
  const [embedCopied, setEmbedCopied] = useState(false);
  const sessionRef = useRef<RecordingSession | null>(null);
  const recordingOptsRef = useRef({ seamless: false, loopDuration: 6 });

  const stopAndSaveRecording = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    setRecording(false);
    setRecordingElapsedSec(0);
    if (!session) return;
    const blob = await session.stop();
    downloadBlob(blob, timestampedName('webm'));
  }, []);

  useEffect(
    () => () => {
      sessionRef.current?.stop().catch(() => undefined);
      sessionRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!recording) {
      setRecordingElapsedSec(0);
      return;
    }

    const startedAt = performance.now();
    const { seamless, loopDuration } = recordingOptsRef.current;

    const tick = () => {
      setRecordingElapsedSec((performance.now() - startedAt) / 1000);
    };
    tick();
    const intervalId = window.setInterval(tick, 100);

    const autoStopId = seamless
      ? window.setTimeout(() => {
          void stopAndSaveRecording();
        }, loopDuration * 1000)
      : undefined;

    return () => {
      window.clearInterval(intervalId);
      if (autoStopId !== undefined) window.clearTimeout(autoStopId);
    };
  }, [recording, stopAndSaveRecording]);

  const isCustom = resolutionId === 'custom';
  const preset =
    resolutionPresets.find((item) => item.id === resolutionId) ?? resolutionPresets[0];
  const resolution = isCustom
    ? { width: clampDimension(customWidth), height: clampDimension(customHeight) }
    : preset;

  const estBitrate = videoBitrate(quality, resolution.width, resolution.height, fps);
  const estMbps = estBitrate / 1_000_000;
  const estMbPerSec = estBitrate / 8_000_000;
  const loopDuration = clampLoopDuration(loopDurationSec);
  const seamless = loopMode === 'seamless';

  const handleSavePng = async () => {
    setSavingPng(true);
    try {
      const config = selectConfig(useGradientStore.getState());
      const blob = await captureImageAt(config, resolution.width, resolution.height, {
        type: 'image/png',
        loopMode,
        loopDurationSec: loopDuration,
      });
      downloadBlob(blob, timestampedName('png'));
    } finally {
      setSavingPng(false);
    }
  };

  const handleToggleVideo = async () => {
    if (recording) {
      await stopAndSaveRecording();
      return;
    }

    try {
      const config = selectConfig(useGradientStore.getState());
      recordingOptsRef.current = { seamless, loopDuration };
      sessionRef.current = createRecordingSession(
        config,
        resolution.width,
        resolution.height,
        {
          fps,
          videoBitsPerSecond: videoBitrate(quality, resolution.width, resolution.height, fps),
          loopMode,
          loopDurationSec: loopDuration,
        },
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
          <p className="export-group-title">Image</p>
          <button
            type="button"
            className="panel-btn"
            onClick={handleSavePng}
            disabled={savingPng || recording}
          >
            {savingPng ? 'Saving…' : 'Save PNG'}
          </button>
        </div>

        <div className="export-group">
          <p className="export-group-title">Video settings</p>
          <SegmentControl
            label="Loop mode"
            hint="Seamless remaps animation time to a cyclic phase (a = 2πu) so the start and end frame match for a true loop."
            value={loopMode}
            options={LOOP_MODE_OPTIONS}
            onChange={(value) => setLoopMode(value as LoopMode)}
            disabled={recording}
          />
          {seamless && (
            <label className="export-field">
              <span className="export-field-label">loopDurationSec</span>
              <input
                type="number"
                className="setting-input export-field-input"
                value={loopDurationSec}
                min={MIN_LOOP_DURATION}
                max={MAX_LOOP_DURATION}
                step={0.1}
                onChange={(event) => setLoopDurationSec(event.target.value)}
                disabled={recording}
                aria-label="Loop duration in seconds"
              />
            </label>
          )}
          <label className="export-field">
            <span className="export-field-label">Frame rate</span>
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
          <SegmentControl
            label="Quality"
            hint="Higher quality raises the video bitrate — a sharper result but a larger file. Scales with the chosen resolution and frame rate."
            value={quality}
            options={QUALITY_OPTIONS}
            onChange={setQuality}
            disabled={recording}
          />
          <p className="export-hint">
            Target ≈ {estMbps >= 10 ? estMbps.toFixed(0) : estMbps.toFixed(1)} Mbps · ~
            {estMbPerSec.toFixed(1)} MB/s
          </p>
        </div>

        <div className="export-group">
          <p className="export-group-title">Video export</p>
          <button
            type="button"
            className={`panel-btn${recording ? ' panel-btn--recording' : ''}`}
            onClick={handleToggleVideo}
          >
            {recording
              ? seamless
                ? `■ Auto-stops at ${loopDuration >= 10 ? loopDuration.toFixed(0) : loopDuration.toFixed(1)}s (click to stop)`
                : '■ Stop & save video'
              : seamless
                ? '● Record loop'
                : '● Record video'}
          </button>
          {recording && <p className="export-hint">Recording: {formatRecordingTime(recordingElapsedSec)}</p>}
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
