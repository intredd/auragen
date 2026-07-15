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
  blendMode: 'layer',
};

/**
 * Default scene ("Aurora") — tall, tilted oval streaks in teal/green/violet
 * over near-black navy, colors blended, with a lively wobble.
 */
export function createDefaultConfig(): GradientConfig {
  const shared = {
    smoothStep: 0.5,
    cornerSmoothing: 0.55,
    deformationRatio: 3.5,
    separation: 0.18,
    deformationSpeed: 0.6,
  };
  return {
    version: CONFIG_VERSION,
    global: { backgroundColor: '#030a18', speed: 0.5, blendMode: 'blend' },
    blobs: [
      createBlob({ ...shared, position: { x: 0.32, y: 0.55 }, size: 0.26, scale: 2.4, angle: 20, color: '#17e6a0' }),
      createBlob({ ...shared, position: { x: 0.55, y: 0.5 }, size: 0.22, scale: 2.2, angle: 160, color: '#4dff7a' }),
      createBlob({ ...shared, position: { x: 0.7, y: 0.6 }, size: 0.24, scale: 2.6, angle: 30, separation: 0.2, color: '#7a5cff' }),
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
  {
    kind: 'segment',
    id: 'blendMode',
    label: 'Blob interaction',
    options: [
      { value: 'layer', label: 'Layer' },
      { value: 'blend', label: 'Blend' },
    ],
    get: (g) => g.blendMode,
    set: (v) => ({ blendMode: v as GlobalSettings['blendMode'] }),
  },
];
