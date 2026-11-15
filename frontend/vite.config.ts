import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' = rutas relativas: el build funciona en cualquier subpath de un hosting estático
// (p. ej. usuario.github.io/repo/). Se puede forzar con VITE_BASE=/repo/ al construir.
export default defineConfig(({ mode }) => ({
  base: loadEnv(mode, '.', 'VITE_').VITE_BASE ?? './',
  plugins: [react()],
  test: { environment: 'node' },
}));
