import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/backend': {
          target: env.VITE_LAVALUST_BACKEND_URL || 'http://127.0.0.1:8001/index.php',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/backend/, ''),
        },
      },
    },
  };
});