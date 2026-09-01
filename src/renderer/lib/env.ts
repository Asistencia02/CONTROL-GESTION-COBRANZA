// Variables de entorno inyectadas por Vite en tiempo de build
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
export const INSTITUCION_ID = import.meta.env.VITE_INSTITUCION_ID as string || '1'

// Validar configuración al cargar
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Variables de Supabase no configuradas. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env')
}
