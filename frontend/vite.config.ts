import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the UI calls /api/... on its own origin and Vite forwards
    // those calls to the Express server. That means no CORS juggling locally
    // and no hardcoded localhost URL in the app code.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
