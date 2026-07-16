import { createGradientRenderer } from '../gradient/engine';
import type { GradientConfig } from '../gradient/types';
import { captureImage, type CaptureImageOptions } from './captureImage';
import { CanvasVideoRecorder, type VideoRecorderOptions } from './captureVideo';

export interface ExportLoopOptions {
  loopMode?: 'off' | 'seamless';
  loopDurationSec?: number;
}

/**
 * Create a detached renderer at an exact pixel size, independent of the
 * on-screen canvas / viewport. Caller is responsible for disposing it.
 */
function createOffscreenRenderer(
  config: GradientConfig,
  width: number,
  height: number,
  loopOptions: ExportLoopOptions = {},
) {
  const canvas = document.createElement('canvas');
  const renderer = createGradientRenderer();
  renderer.mount(canvas);
  renderer.resize(width, height, 1);
  renderer.setTimeMapping(
    loopOptions.loopMode === 'seamless' ? 'seamless' : 'linear',
    loopOptions.loopDurationSec ?? 6,
  );
  renderer.setConfig(config);
  return { canvas, renderer };
}

/** Render a still image of the config at an exact resolution. */
export async function captureImageAt(
  config: GradientConfig,
  width: number,
  height: number,
  options: CaptureImageOptions & ExportLoopOptions = {},
): Promise<Blob> {
  const { type, quality, ...loopOptions } = options;
  const { renderer } = createOffscreenRenderer(config, width, height, loopOptions);
  try {
    renderer.renderFrame();
    return await captureImage(renderer, { type, quality });
  } finally {
    renderer.dispose();
  }
}

export interface RecordingSession {
  /** Stop recording, return the encoded clip, and release GPU resources. */
  stop: () => Promise<Blob>;
}

/**
 * Start recording an animated clip of the config at an exact resolution. The
 * caller controls the length by calling `stop()` (play/stop UX).
 */
export function createRecordingSession(
  config: GradientConfig,
  width: number,
  height: number,
  options: VideoRecorderOptions & ExportLoopOptions = {},
): RecordingSession {
  const { loopMode, loopDurationSec, ...videoOptions } = options;
  const { canvas, renderer } = createOffscreenRenderer(config, width, height, {
    loopMode,
    loopDurationSec,
  });

  let recorder: CanvasVideoRecorder;
  try {
    recorder = new CanvasVideoRecorder(canvas, videoOptions);
  } catch (error) {
    renderer.dispose();
    throw error;
  }

  renderer.setElapsed(0);
  renderer.play();
  renderer.start();
  recorder.start();

  const seamless = loopMode === 'seamless';

  return {
    stop: async () => {
      try {
        if (seamless) {
          // Snap to the loop seam (u = 0) so the last frame matches the first.
          renderer.pause();
          renderer.setElapsed(0);
          renderer.renderFrame();
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
          renderer.renderFrame();
        }
        return await recorder.stop();
      } finally {
        renderer.dispose();
      }
    },
  };
}
