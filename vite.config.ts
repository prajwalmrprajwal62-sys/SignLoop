import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:3001';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@client': path.resolve(__dirname, './src/client'),
        '@server': path.resolve(__dirname, './src/server'),
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },
    // Dev: proxy /api to local backend. Production: client uses VITE_API_URL directly.
    server: {
      port: 5173,
      strictPort: false,
      host: true,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
        '/stream': {
          target: apiUrl.replace('http', 'ws'),
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,   // disable in prod — no need to expose source
      target: 'es2022',
    },
    define: {
      // Make the backend URL available in the built bundle
      __API_URL__: JSON.stringify(mode === 'production' ? (env.VITE_API_URL ?? '') : ''),
    },
  };
});
