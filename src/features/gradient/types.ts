export interface Vec2 {
  x: number;
  y: number;
}

/**
 * A single metaball ("blob"). Every visual/motion parameter lives here, so a
 * blob is fully self-contained and the scene is just a list of blobs.
 */
export interface Blob {
  id: string;
  /** Center in uv space (0..1 across the screen); range is clamped to [-2, 2]. */
  position: Vec2;
  size: number;
  scale: number;
  /** Rotation in degrees (converted to radians in the shader). */
  angle: number;
  /** Edge sharpness of the smoothstep falloff. */
  smoothStep: number;
  /** Gaussian corner softness. */
  cornerSmoothing: number;
  /** Noise frequency of the edge deformation (detail). */
  deformationRatio: number;
  /** How fast the edge wobble drifts over time (0 = frozen shape). */
  deformationSpeed: number;
  /** Amplitude of the edge deformation. */
  separation: number;
  /** Blob color as a hex string. */
  color: string;
}

export interface GlobalSettings {
  /** Background color as a hex string. */
  backgroundColor: string;
  /** Global animation speed multiplier. */
  speed: number;
  /**
   * When true, overlapping blobs mix their colors (weighted average) instead of
   * being painted one over another.
   */
  colorBlend: boolean;
}

/** Current preset schema version. */
export const CONFIG_VERSION = 3;

/** Serializable description of an entire gradient scene. */
export interface GradientConfig {
  version: number;
  blobs: Blob[];
  global: GlobalSettings;
}

/* ---------------------------------------------------------------------------
 * Config-driven UI field descriptors.
 *
 * Fields are decoupled from the concrete store shape via get/set functions, so
 * the same control components work for blobs and for global settings, including
 * nested values like `position`.
 * ------------------------------------------------------------------------- */

export interface RangeFieldConfig<T> {
  kind: 'range';
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  get: (target: T) => number;
  set: (value: number, current: T) => Partial<T>;
}

export interface ColorFieldConfig<T> {
  kind: 'color';
  id: string;
  label: string;
  get: (target: T) => string;
  set: (value: string, current: T) => Partial<T>;
}

export interface ToggleFieldConfig<T> {
  kind: 'toggle';
  id: string;
  label: string;
  get: (target: T) => boolean;
  set: (value: boolean, current: T) => Partial<T>;
}

export type FieldConfig<T> =
  | RangeFieldConfig<T>
  | ColorFieldConfig<T>
  | ToggleFieldConfig<T>;
