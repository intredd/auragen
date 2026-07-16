import type { GradientConfig } from '../types';

/**
 * Renderer-agnostic contract for anything that can draw the animated gradient.
 *
 * The rest of the app (React components, export, presets) only talks to this
 * interface, so the WebGL implementation can later be swapped for Canvas2D,
 * WebGPU, etc. without touching the UI.
 */
export interface GradientRenderer {
  /** Attach the renderer to a canvas and initialize GPU resources. */
  mount(canvas: HTMLCanvasElement): void;

  /** Replace the current scene description (cheap, called on every change). */
  setConfig(config: GradientConfig): void;

  /**
   * Configure time mapping used by animated shader effects.
   * - `linear` keeps free-running time (default app behavior)
   * - `seamless` remaps time to a cyclic phase for perfect loop exports
   */
  setTimeMapping(mode: 'linear' | 'seamless', loopDurationSec?: number): void;

  /** Resize the drawing buffer. `dpr` defaults to `devicePixelRatio`. */
  resize(width: number, height: number, dpr?: number): void;

  /** Start the render loop (draws continuously so param edits are visible). */
  start(): void;

  /** Stop the render loop. */
  stop(): void;

  /** Resume time progression (animation). */
  play(): void;

  /** Freeze time at the current elapsed value. */
  pause(): void;

  isPlaying(): boolean;

  /** Draw exactly one frame immediately (used before capturing output). */
  renderFrame(): void;

  /** Jump to an exact animation timestamp (seconds) and redraw. */
  setElapsed(seconds: number): void;

  getCanvas(): HTMLCanvasElement | null;

  /** Release all GPU resources and listeners. */
  dispose(): void;
}
