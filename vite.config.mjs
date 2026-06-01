import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import autoprefixer from 'autoprefixer'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:8001';
  const isHttps = backendUrl.startsWith('https');

  console.log(`[vite] mode: ${mode} | backend: ${backendUrl}`);

  return {
    base: './',
    build: {
      outDir: 'build',
    },
    css: {
      postcss: {
        plugins: [autoprefixer({})],
      },
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        loader: { '.js': 'jsx' },
      },
    },
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 3002,
      proxy: {
        '/admin/v2': {
          target: backendUrl,
          changeOrigin: true,
          secure: isHttps,
        },
        '/api/v2': {
          target: backendUrl,
          changeOrigin: true,
          secure: isHttps,
        },
      },
    },
  }
})
