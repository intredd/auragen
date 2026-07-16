import type { BlendMode, GradientConfig } from '../types';
import { hexToNormalizedRgb } from '../utils/color';
import { vertexShaderSource } from './shaders/gradient.vert';
import { fragmentShaderSource, MAX_BLOBS } from './shaders/gradient.frag';
import type { GradientRenderer } from './types';

const QUAD_VERTICES = new Float32Array([
  -1, -1, 1, -1, -1, 1,
  -1, 1, 1, -1, 1, 1,
]);

const DEG_TO_RAD = Math.PI / 180;

const BLEND_MODE_INDEX: Record<BlendMode, number> = {
  layer: 0,
  blend: 1,
};

/**
 * WebGL2 implementation of {@link GradientRenderer}.
 *
 * Blobs are uploaded as fixed-size uniform arrays (capped at MAX_BLOBS) and the
 * fragment shader loops up to `u_blob_count`. Per-blob values are packed into
 * pre-allocated typed arrays on every `setConfig`, so the animation loop only
 * updates `u_time`.
 */
export class WebGLGradientRenderer implements GradientRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private quadBuffer: WebGLBuffer | null = null;

  private readonly uniformLocations = new Map<string, WebGLUniformLocation | null>();

  // Pre-allocated per-blob uniform buffers.
  private readonly posArray = new Float32Array(MAX_BLOBS * 2);
  private readonly sizeArray = new Float32Array(MAX_BLOBS);
  private readonly scaleArray = new Float32Array(MAX_BLOBS);
  private readonly angleArray = new Float32Array(MAX_BLOBS);
  private readonly smoothArray = new Float32Array(MAX_BLOBS);
  private readonly cornerArray = new Float32Array(MAX_BLOBS);
  private readonly deformRatioArray = new Float32Array(MAX_BLOBS);
  private readonly deformSpeedArray = new Float32Array(MAX_BLOBS);
  private readonly separationArray = new Float32Array(MAX_BLOBS);
  private readonly colorArray = new Float32Array(MAX_BLOBS * 3);
  private readonly bgColor = new Float32Array(3);
  private blobCount = 0;
  private speed = 1;
  private blendMode = 0;
  private timeMode = 0; // 0 = linear, 1 = seamless loop
  private loopDurationSec = 6;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  /** Accumulated animation time in seconds; only advances while playing. */
  private elapsed = 0;
  private playing = false;

  mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    // `preserveDrawingBuffer` keeps the last frame readable for PNG/video
    // capture; the cost is negligible for a background gradient.
    const gl = canvas.getContext('webgl2', {
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    });

    if (!gl) {
      throw new Error('WebGL2 is not supported in this browser');
    }
    this.gl = gl;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    if (!program) {
      throw new Error('Failed to create WebGL program');
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      throw new Error(`Failed to link WebGL program: ${log ?? 'unknown error'}`);
    }
    this.program = program;
    gl.useProgram(program);

    // Full-screen quad.
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    this.resize(canvas.clientWidth, canvas.clientHeight);
  }

  setConfig(config: GradientConfig): void {
    const count = Math.min(config.blobs.length, MAX_BLOBS);
    this.blobCount = count;
    this.speed = config.global.speed;
    this.blendMode = BLEND_MODE_INDEX[config.global.blendMode] ?? 0;

    const [bgR, bgG, bgB] = hexToNormalizedRgb(config.global.backgroundColor);
    this.bgColor[0] = bgR;
    this.bgColor[1] = bgG;
    this.bgColor[2] = bgB;

    for (let i = 0; i < count; i += 1) {
      const blob = config.blobs[i];
      this.posArray[i * 2] = blob.position.x;
      this.posArray[i * 2 + 1] = blob.position.y;
      this.sizeArray[i] = blob.size;
      this.scaleArray[i] = blob.scale;
      this.angleArray[i] = blob.angle * DEG_TO_RAD;
      this.smoothArray[i] = blob.smoothStep;
      this.cornerArray[i] = blob.cornerSmoothing;
      this.deformRatioArray[i] = blob.deformationRatio;
      this.deformSpeedArray[i] = blob.deformationSpeed;
      this.separationArray[i] = blob.separation;

      const [r, g, b] = hexToNormalizedRgb(blob.color);
      this.colorArray[i * 3] = r;
      this.colorArray[i * 3 + 1] = g;
      this.colorArray[i * 3 + 2] = b;
    }

    this.uploadConfigUniforms();
  }

  setTimeMapping(mode: 'linear' | 'seamless', loopDurationSec: number = 6): void {
    this.timeMode = mode === 'seamless' ? 1 : 0;
    this.loopDurationSec = Math.max(0.1, Number.isFinite(loopDurationSec) ? loopDurationSec : 6);
    this.uploadConfigUniforms();
  }

  resize(width: number, height: number, dpr: number = window.devicePixelRatio || 1): void {
    const { gl, canvas, program } = this;
    if (!gl || !canvas) return;

    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;

    gl.viewport(0, 0, pixelWidth, pixelHeight);

    if (program) {
      gl.useProgram(program);
      const resolutionLocation = this.getUniformLocation('u_resolution');
      if (resolutionLocation) {
        gl.uniform2f(resolutionLocation, pixelWidth, pixelHeight);
      }
    }
  }

  start(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = 0;
    const loop = (timestamp: number) => {
      this.tick(timestamp);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  renderFrame(): void {
    this.draw();
  }

  setElapsed(seconds: number): void {
    this.elapsed = Math.max(0, seconds);
    this.draw();
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  dispose(): void {
    this.stop();
    const { gl, program, quadBuffer } = this;
    if (gl) {
      if (program) gl.deleteProgram(program);
      if (quadBuffer) gl.deleteBuffer(quadBuffer);
    }
    this.uniformLocations.clear();
    this.program = null;
    this.quadBuffer = null;
    this.gl = null;
    this.canvas = null;
  }

  private tick(timestamp: number): void {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }
    const deltaSeconds = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (this.playing) {
      this.elapsed += deltaSeconds;
    }

    this.draw();
  }

  private draw(): void {
    const { gl, program } = this;
    if (!gl || !program) return;

    gl.useProgram(program);

    const timeLocation = this.getUniformLocation('u_time');
    if (timeLocation) {
      gl.uniform1f(timeLocation, this.elapsed);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private uploadConfigUniforms(): void {
    const { gl, program } = this;
    if (!gl || !program) return;

    gl.useProgram(program);

    this.setUniform1i('u_blob_count', this.blobCount);
    this.setUniform1f('u_time_multiplier', this.speed);
    this.setUniform1i('u_time_mode', this.timeMode);
    this.setUniform1f('u_loop_duration_sec', this.loopDurationSec);
    this.setUniform1i('u_blend_mode', this.blendMode);
    this.setUniform3fv('u_bg_color', this.bgColor);

    this.setUniform2fv('u_blob_pos', this.posArray);
    this.setUniform1fv('u_blob_size', this.sizeArray);
    this.setUniform1fv('u_blob_scale', this.scaleArray);
    this.setUniform1fv('u_blob_angle', this.angleArray);
    this.setUniform1fv('u_blob_smooth', this.smoothArray);
    this.setUniform1fv('u_blob_corner', this.cornerArray);
    this.setUniform1fv('u_blob_deform_ratio', this.deformRatioArray);
    this.setUniform1fv('u_blob_deform_speed', this.deformSpeedArray);
    this.setUniform1fv('u_blob_separation', this.separationArray);
    this.setUniform3fv('u_blob_color', this.colorArray);
  }

  private setUniform1i(name: string, value: number): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl?.uniform1i(location, value);
  }

  private setUniform1f(name: string, value: number): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl?.uniform1f(location, value);
  }

  private setUniform1fv(name: string, values: Float32Array): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl?.uniform1fv(location, values);
  }

  private setUniform2fv(name: string, values: Float32Array): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl?.uniform2fv(location, values);
  }

  private setUniform3fv(name: string, values: Float32Array): void {
    const location = this.getUniformLocation(name);
    if (location) this.gl?.uniform3fv(location, values);
  }

  private getUniformLocation(name: string): WebGLUniformLocation | null {
    const { gl, program } = this;
    if (!gl || !program) return null;

    if (this.uniformLocations.has(name)) {
      return this.uniformLocations.get(name) ?? null;
    }
    const location = gl.getUniformLocation(program, name);
    this.uniformLocations.set(name, location);
    return location;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const { gl } = this;
    if (!gl) {
      throw new Error('WebGL context is not initialized');
    }

    const shader = gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Failed to compile shader: ${log ?? 'unknown error'}`);
    }

    return shader;
  }
}
