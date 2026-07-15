export interface VideoRecorderOptions {
  /** Target frame rate for the captured stream. Defaults to 60. */
  fps?: number;
  /** Preferred MIME types, tried in order. First supported one wins. */
  mimeTypes?: string[];
  /** Bits per second for the video track. */
  videoBitsPerSecond?: number;
}

const DEFAULT_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

function pickMimeType(candidates: string[]): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Records a canvas to a WebM video via `MediaRecorder`.
 *
 * Usage:
 * ```ts
 * const recorder = new CanvasVideoRecorder(canvas);
 * recorder.start();
 * // ...later
 * const blob = await recorder.stop();
 * ```
 */
export class CanvasVideoRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private readonly mimeType: string;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly options: VideoRecorderOptions = {},
  ) {
    const mimeType = pickMimeType(options.mimeTypes ?? DEFAULT_MIME_TYPES);
    if (!mimeType) {
      throw new Error('Video recording is not supported in this browser');
    }
    this.mimeType = mimeType;
  }

  get isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }

  start(): void {
    if (this.isRecording) return;

    const fps = this.options.fps ?? 60;
    const stream = this.canvas.captureStream(fps);

    this.chunks = [];
    this.recorder = new MediaRecorder(stream, {
      mimeType: this.mimeType,
      videoBitsPerSecond: this.options.videoBitsPerSecond,
    });

    this.recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.recorder.start();
  }

  stop(): Promise<Blob> {
    const recorder = this.recorder;
    if (!recorder) {
      return Promise.reject(new Error('Recording has not been started'));
    }

    return new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: this.mimeType }));
        this.recorder = null;
      };
      recorder.stop();
    });
  }
}
