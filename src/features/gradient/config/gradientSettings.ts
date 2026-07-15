import {
  CONFIG_VERSION,
  type Blob,
  type FieldConfig,
  type GlobalSettings,
  type GradientConfig,
} from '../types';

/** Maximum number of blobs (matches the shader's uniform array size). */
export const MAX_BLOBS = 16;

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `blob-${Math.random().toString(36).slice(2, 10)}`;
}

const BLOB_DEFAULTS: Omit<Blob, 'id'> = {
  position: { x: 0.5, y: 0.5 },
  size: 0.35,
  scale: 1,
  angle: 0,
  smoothStep: 0.5,
  cornerSmoothing: 0.5,
  deformationRatio: 3,
  deformationSpeed: 0.4,
  separation: 0.1,
  color: '#6a5cff',
};

/**
 * Create a blob from partial overrides, filling in sensible defaults.
 * A fresh id is always assigned last, so spreading an existing blob into the
 * overrides (e.g. when duplicating) can never reuse its id.
 */
export function createBlob(overrides: Partial<Omit<Blob, 'id'>> = {}): Blob {
  return {
    ...BLOB_DEFAULTS,
    ...overrides,
    position: { ...BLOB_DEFAULTS.position, ...overrides.position },
    id: createId(),
  };
}

export const DEFAULT_GLOBAL: GlobalSettings = {
  backgroundColor: '#1b0b2e',
  speed: 0.5,
  colorBlend: false,
};

/**
 * Default scene — two well-separated blobs with a pink↔violet palette over a
 * deep-purple background. Their deformation is intentionally slightly different
 * so the motion doesn't look mirrored.
 */
export function createDefaultConfig(): GradientConfig {
  return {
    version: CONFIG_VERSION,
    global: { ...DEFAULT_GLOBAL },
    blobs: [
      createBlob({
        position: { x: 0.24, y: 0.28 },
        size: 0.13,
        color: '#ff5fa2',
        smoothStep: 0.21,
        deformationRatio: 2.95,
        separation: 0.285,
        deformationSpeed: 0.51,
      }),
      createBlob({
        position: { x: 0.78, y: 0.74 },
        size: 0.3,
        color: '#6a5cff',
        smoothStep: 0.38,
        deformationRatio: 3.45,
        separation: 0.295,
        deformationSpeed: 0.49,
      }),
    ],
  };
}

/* ---------------------------------------------------------------------------
 * Field schemas that drive the controls UI.
 * ------------------------------------------------------------------------- */

/** Blob fields that are adjustable directly on the canvas via the gizmo. */
export const visualBlobFieldIds = ['size', 'scale', 'angle', 'positionX', 'positionY'];

export const blobFields: FieldConfig<Blob>[] = [
  { kind: 'color', id: 'color', label: 'Color', get: (b) => b.color, set: (v) => ({ color: v }) },
  { kind: 'range', id: 'size', label: 'Size', min: 0.02, max: 2, step: 0.01, get: (b) => b.size, set: (v) => ({ size: v }) },
  { kind: 'range', id: 'scale', label: 'Oval stretch', min: 0.2, max: 3, step: 0.05, get: (b) => b.scale, set: (v) => ({ scale: v }) },
  { kind: 'range', id: 'angle', label: 'Rotation', min: 0, max: 180, step: 1, get: (b) => b.angle, set: (v) => ({ angle: v }) },
  {
    kind: 'range',
    id: 'positionX',
    label: 'Position X',
    min: -2,
    max: 2,
    step: 0.05,
    get: (b) => b.position.x,
    set: (v, b) => ({ position: { ...b.position, x: v } }),
  },
  {
    kind: 'range',
    id: 'positionY',
    label: 'Position Y',
    min: -2,
    max: 2,
    step: 0.05,
    get: (b) => b.position.y,
    set: (v, b) => ({ position: { ...b.position, y: v } }),
  },
  { kind: 'range', id: 'smoothStep', label: 'Edge softness', min: 0.01, max: 2, step: 0.01, get: (b) => b.smoothStep, set: (v) => ({ smoothStep: v }) },
  { kind: 'range', id: 'cornerSmoothing', label: 'Edge feather', min: 0.05, max: 8, step: 0.05, get: (b) => b.cornerSmoothing, set: (v) => ({ cornerSmoothing: v }) },
  { kind: 'range', id: 'deformationRatio', label: 'Wobble detail', min: 0, max: 5, step: 0.05, get: (b) => b.deformationRatio, set: (v) => ({ deformationRatio: v }) },
  { kind: 'range', id: 'separation', label: 'Wobble amount', min: 0, max: 0.5, step: 0.005, get: (b) => b.separation, set: (v) => ({ separation: v }) },
  { kind: 'range', id: 'deformationSpeed', label: 'Wobble speed', min: 0, max: 2, step: 0.01, get: (b) => b.deformationSpeed, set: (v) => ({ deformationSpeed: v }) },
];

export const globalFields: FieldConfig<GlobalSettings>[] = [
  { kind: 'color', id: 'backgroundColor', label: 'Background', get: (g) => g.backgroundColor, set: (v) => ({ backgroundColor: v }) },
  { kind: 'range', id: 'speed', label: 'Animation speed', min: 0, max: 2, step: 0.01, get: (g) => g.speed, set: (v) => ({ speed: v }) },
  { kind: 'toggle', id: 'colorBlend', label: 'Blend blob colors', get: (g) => g.colorBlend, set: (v) => ({ colorBlend: v }) },
];
