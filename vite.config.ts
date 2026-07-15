import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// GitHub repo name — used as the base path for GitHub Pages project sites
// (served from https://<user>.github.io/<REPO>/). Change this if you rename
// the repository. For a user/org site (<user>.github.io) or a custom domain,
// set REPO to '' so the base becomes '/'.
const REPO = 'auragen';

export default defineConfig(({ command }) => ({
  // Dev server stays at '/', production build is prefixed for Pages.
  base: command === 'build' && REPO ? `/${REPO}/` : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
}));
