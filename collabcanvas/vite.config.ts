import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize for production
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Optimize chunk splitting for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database'],
          konva: ['konva', 'react-konva'],
          zustand: ['zustand']
        }
      }
    },
    // Increase chunk size warning limit for production builds
    chunkSizeWarningLimit: 1000
  },
  // @ts-expect-error - Vitest config is added via plugin
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts', './src/test/setup.ts'],
  },
})
