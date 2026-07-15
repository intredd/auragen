import { CONFIG_VERSION, type GradientConfig } from '../types';
import { createBlob, createDefaultConfig, DEFAULT_GLOBAL } from './gradientSettings';

/** A named, ready-made scene the user can load to see what's possible. */
export interface Demo {
  id: string;
  label: string;
  /** Preview colors shown as little swatches in the demo menu. */
  swatches: string[];
  create: () => GradientConfig;
}

/**
 * Three concentric, same-center blobs (green → red → white) layered largest to
 * smallest. With soft feathered edges this reads as a glowing radial target,
 * showing how plain layering (color blend off) builds multi-color rings.
 */
function concentricScene(): GradientConfig {
  const shared = {
    position: { x: 0.5, y: 0.5 },
    smoothStep: 0.08,
    cornerSmoothing: 0.5,
    deformationRatio: 2.95,
    separation: 0.32,
    deformationSpeed: 0.51,
  };
  return {
    version: CONFIG_VERSION,
    global: { ...DEFAULT_GLOBAL, colorBlend: false },
    blobs: [
      createBlob({ ...shared, size: 0.14, color: '#77bb41' }),
      createBlob({ ...shared, size: 0.093, color: '#e32400' }),
      createBlob({ ...shared, size: 0.047, color: '#ffffff' }),
    ],
  };
}

/** Lava lamp — a few warm blobs with heavy, slow morphing. */
function lavaScene(): GradientConfig {
  const shared = {
    smoothStep: 0.4,
    cornerSmoothing: 0.5,
    deformationRatio: 2.1,
    deformationSpeed: 0.24,
  };
  return {
    version: CONFIG_VERSION,
    global: { backgroundColor: '#1a0500', speed: 0.25, colorBlend: true },
    blobs: [
      createBlob({ ...shared, position: { x: 0.4, y: 0.62 }, size: 0.36, separation: 0.38, color: '#ff3d00' }),
      createBlob({ ...shared, position: { x: 0.6, y: 0.42 }, size: 0.3, separation: 0.34, color: '#ffb300' }),
      createBlob({ ...shared, position: { x: 0.5, y: 0.82 }, size: 0.3, separation: 0.32, color: '#c81e00' }),
    ],
  };
}

export const demos: Demo[] = [
  {
    id: 'aurora',
    label: 'Aurora',
    swatches: ['#17e6a0', '#4dff7a', '#7a5cff'],
    create: createDefaultConfig,
  },
  {
    id: 'lava',
    label: 'Lava Lamp',
    swatches: ['#ff3d00', '#ffb300', '#c81e00'],
    create: lavaScene,
  },
  {
    id: 'concentric',
    label: 'Layered rings',
    swatches: ['#77bb41', '#e32400', '#ffffff'],
    create: concentricScene,
  },
];

export const defaultDemoId = demos[0].id;
