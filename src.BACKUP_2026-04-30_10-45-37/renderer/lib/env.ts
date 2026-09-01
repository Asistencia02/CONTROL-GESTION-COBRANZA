// Leer directamente desde import.meta.env (Vite lo inyecta automáticamente)
// Si no están disponibles, serán undefined
let SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
let SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

console.log('[Env Variables Loaded]')
console.log('SUPABASE_URL (build-time):', SUPABASE_URL ? '✅' : '❌')
console.log('SUPABASE_ANON_KEY (build-time):', SUPABASE_ANON_KEY ? '✅' : '❌')

// Fallback: obtener desde Electron en producción
export async function loadConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    try {
      const config = await (window as any).electron?.config?.get?.()
      if (config?.VITE_SUPABASE_URL) {
        SUPABASE_URL = config.VITE_SUPABASE_URL
      }
      if (config?.VITE_SUPABASE_ANON_KEY) {
        SUPABASE_ANON_KEY = config.VITE_SUPABASE_ANON_KEY
      }
      console.log('[Config Loaded from Electron]')
      console.log('SUPABASE_URL (runtime):', SUPABASE_URL ? '✅' : '❌')
      console.log('SUPABASE_ANON_KEY (runtime):', SUPABASE_ANON_KEY ? '✅' : '❌')
    } catch (err) {
      console.error('[Config Load Error]', err)
    }
  }
}

export { SUPABASE_URL, SUPABASE_ANON_KEY }
