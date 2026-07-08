import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const rootDir = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  // Read VITE_* vars from the repo-root .env.
  envDir: path.resolve(rootDir, '../../'),
  resolve: {
    alias: { '@': path.resolve(rootDir, './src') },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  // @eop/shared is a linked CJS workspace package — pre-bundle it so its named
  // exports resolve cleanly in dev and build.
  optimizeDeps: { include: ['@eop/shared'] },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: { include: [/@eop[\\/]shared/, /node_modules/] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
