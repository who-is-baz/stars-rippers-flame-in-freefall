import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' = relative paths: the build works under any sub-path of a static host
// (e.g. user.github.io/repo/). Force one with VITE_BASE=/repo/ at build time.
export default defineConfig(({ mode }) => ({
  base: loadEnv(mode, '.', 'VITE_').VITE_BASE ?? './',
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: false },
}));
