import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // three.js alone is ~700 kB minified and lives in the lazily loaded roulette chunk.
    chunkSizeWarningLimit: 1200,
  },
  test: {
    // Playwright owns e2e/; Vitest runs the unit and interaction tests.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
