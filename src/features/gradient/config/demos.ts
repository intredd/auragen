import { CONFIG_VERSION, type GradientConfig } from '../types';
import { createBlob, createDefaultConfig, DEFAULT_GLOBAL } from './gradientSettings';

/** A named, ready-made scene the user can load to see what's possible. */
export interface Demo {
  id: string;
  label: string;
  create: () => GradientConfig;
}

/**
 * Three concentric, same-center blobs (green → red → white) layered largest to
 * smallest. With soft feathered edges this reads as a glowing radial target,
 * showing how plain layering (color blend off) builds multi-color rings.
 */
function concentricDemo(): GradientConfig {
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

export const demos: Demo[] = [
  { id: 'default', label: 'Default scene', create: createDefaultConfig },
  { id: 'concentric', label: 'Layered rings', create: concentricDemo },
];

export const defaultDemoId = demos[0].id;
