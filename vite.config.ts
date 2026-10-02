import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // three.js alone is ~700 kB minified; a single ~1 MB bundle is expected for this app.
    chunkSizeWarningLimit: 1200,
  },
});
