import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, './src/renderer'),
    },
  },

  root: path.resolve(__dirname, 'src/renderer'),

  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui': ['lucide-react'],
        }
      }
    }
  },

  server: {
    port: 5173,
    open: true,
  },

  preview: {
    port: 4173,
  }
})
