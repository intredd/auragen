import type { GradientRenderer } from '../gradient/engine';

export interface CaptureImageOptions {
  /** MIME type of the exported image. Defaults to `image/png`. */
  type?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Quality 0..1 for lossy formats. */
  quality?: number;
}

/**
 * Render one fresh frame and read it back as an image Blob.
 *
 * A frame is drawn synchronously right before the read so the capture reflects
 * the exact current parameters (the renderer keeps `preserveDrawingBuffer` on).
 */
export function captureImage(
  renderer: GradientRenderer,
  options: CaptureImageOptions = {},
): Promise<Blob> {
  const { type = 'image/png', quality } = options;

  const canvas = renderer.getCanvas();
  if (!canvas) {
    return Promise.reject(new Error('Renderer is not mounted'));
  }

  renderer.renderFrame();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode image'));
      },
      type,
      quality,
    );
  });
}
