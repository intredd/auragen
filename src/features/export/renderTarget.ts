import { createGradientRenderer } from '../gradient/engine';
import type { GradientConfig } from '../gradient/types';
import { captureImage, type CaptureImageOptions } from './captureImage';
import { CanvasVideoRecorder, type VideoRecorderOptions } from './captureVideo';

/**
 * Create a detached renderer at an exact pixel size, independent of the
 * on-screen canvas / viewport. Caller is responsible for disposing it.
 */
function createOffscreenRenderer(config: GradientConfig, width: number, height: number) {
  const canvas = document.createElement('canvas');
  const renderer = createGradientRenderer();
  renderer.mount(canvas);
  renderer.resize(width, height, 1);
  renderer.setConfig(config);
  return { canvas, renderer };
}

/** Render a still image of the config at an exact resolution. */
export async function captureImageAt(
  config: GradientConfig,
  width: number,
  height: number,
  options: CaptureImageOptions = {},
): Promise<Blob> {
  const { renderer } = createOffscreenRenderer(config, width, height);
  try {
    renderer.renderFrame();
    return await captureImage(renderer, options);
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
  options: VideoRecorderOptions = {},
): RecordingSession {
  const { canvas, renderer } = createOffscreenRenderer(config, width, height);

  let recorder: CanvasVideoRecorder;
  try {
    recorder = new CanvasVideoRecorder(canvas, options);
  } catch (error) {
    renderer.dispose();
    throw error;
  }

  renderer.play();
  renderer.start();
  recorder.start();

  return {
    stop: async () => {
      try {
        return await recorder.stop();
      } finally {
        renderer.dispose();
      }
    },
  };
}
