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
    global: { ...DEFAULT_GLOBAL, blendMode: 'layer' },
    blobs: [
      createBlob({ ...shared, size: 0.14, color: '#77bb41' }),
      createBlob({ ...shared, size: 0.093, color: '#e32400' }),
      createBlob({ ...shared, size: 0.047, color: '#ffffff' }),
    ],
  };
}

/**
 * Morph — a single small ember with near-max wobble amount relative to its size,
 * fast global speed and gentle wobble. Shows how heavy deformation makes one blob
 * writhe and throw out tendrils.
 */
function morphScene(): GradientConfig {
  return {
    version: CONFIG_VERSION,
    global: { backgroundColor: '#1a0500', speed: 1.58, blendMode: 'layer' },
    blobs: [
      createBlob({
        position: { x: 0.448, y: 0.39 },
        size: 0.088,
        scale: 1,
        angle: 0,
        smoothStep: 0.4,
        cornerSmoothing: 0.6,
        deformationRatio: 2.45,
        separation: 0.495,
        deformationSpeed: 0.24,
        color: '#ff3d00',
      }),
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
    id: 'morph',
    label: 'Morph',
    swatches: ['#ff3d00'],
    create: morphScene,
  },
  {
    id: 'concentric',
    label: 'Layered rings',
    swatches: ['#77bb41', '#e32400', '#ffffff'],
    create: concentricScene,
  },
];

export const defaultDemoId = demos[0].id;
