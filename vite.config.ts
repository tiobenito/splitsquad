import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  server: {
    // Vite 7 defaults to appType: 'spa', which provides history API fallback
    // Hard-refreshing on /groups/test returns index.html (not a 404)
  },
});
