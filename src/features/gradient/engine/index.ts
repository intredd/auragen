export type { GradientRenderer } from './types';
export { WebGLGradientRenderer } from './WebGLGradientRenderer';

import { WebGLGradientRenderer } from './WebGLGradientRenderer';
import type { GradientRenderer } from './types';

/** Factory for the default renderer implementation. */
export function createGradientRenderer(): GradientRenderer {
  return new WebGLGradientRenderer();
}
