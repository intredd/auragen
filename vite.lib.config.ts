import { defineConfig } from 'vite';
import path from 'node:path';

/**
 * Separate build for the framework-free `<gradient-gen>` web component.
 * Outputs a single self-contained `gradient-gen.js` (no React) that can be
 * hosted anywhere and dropped into any page via a `<script>` tag.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist-embed',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/embed/gradient-gen.ts'),
      name: 'GradientGen',
      formats: ['iife'],
      fileName: () => 'gradient-gen.js',
    },
  },
});
