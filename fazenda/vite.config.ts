import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@':             resolve(__dirname, './src'),
      '@config':       resolve(__dirname, './src/config'),
      '@db':           resolve(__dirname, './src/db'),
      '@types':        resolve(__dirname, './src/types'),
      '@repositories': resolve(__dirname, './src/repositories'),
      '@services':     resolve(__dirname, './src/services'),
      '@utils':        resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
    sourcemap: true,
  },
})
