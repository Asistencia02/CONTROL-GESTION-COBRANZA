import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

// Cargar .env.local desde gestion-cobranzas/ (2 niveles arriba desde src/renderer)
const rootDir = path.resolve(__dirname, '../..')  // src/renderer -> src -> gestion-cobranzas
const envPath = path.join(rootDir, '.env.local')

let envConfig = {
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: ''
}

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envConfig = dotenv.parse(envContent)
  console.log('✅ .env.local cargado desde:', envPath)
  console.log('   VITE_SUPABASE_URL:', envConfig.VITE_SUPABASE_URL ? '✅ OK' : '❌ Vacío')
  console.log('   VITE_SUPABASE_ANON_KEY:', envConfig.VITE_SUPABASE_ANON_KEY ? '✅ OK' : '❌ Vacío')
} else {
  console.error('❌ .env.local NO ENCONTRADO en:', envPath)
  console.error('   Debes crear:', envPath)
}

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [
    react(),
    {
      name: 'fix-absolute-paths',
      apply: 'build',
      transformIndexHtml(html) {
        // Convertir rutas absolutas /assets/ a relativas ./assets/
        return html.replace(/src="\/assets\//g, 'src="./assets/')
                   .replace(/href="\/assets\//g, 'href="./assets/')
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@renderer': path.resolve(__dirname),
    },
  },
  // Inyectar variables de entorno en el código compilado
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(envConfig.VITE_SUPABASE_URL || ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(envConfig.VITE_SUPABASE_ANON_KEY || ''),
    'process.env.VITE_SUPABASE_URL': JSON.stringify(envConfig.VITE_SUPABASE_URL || ''),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(envConfig.VITE_SUPABASE_ANON_KEY || ''),
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    base: './',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  envDir: rootDir,
  envPrefix: 'VITE_',
})
