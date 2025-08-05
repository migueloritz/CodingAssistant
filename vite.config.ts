import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/services': resolve(__dirname, 'src/services'),
      '@/store': resolve(__dirname, 'src/store'),
      '@/styles': resolve(__dirname, 'src/styles'),
    },
  },
  define: {
    // Define process.env for browser environment
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
      OPENAI_API_KEY: JSON.stringify(process.env.OPENAI_API_KEY || ''),
      VITE_OPENAI_API_KEY: JSON.stringify(process.env.VITE_OPENAI_API_KEY || ''),
    },
    // Define global for browser
    global: 'globalThis',
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})