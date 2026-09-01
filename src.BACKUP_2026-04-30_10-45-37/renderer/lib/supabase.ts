import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env'

console.log('[Supabase Init]')
console.log('URL:', SUPABASE_URL ? SUPABASE_URL.substring(0, 40) + '...' : '❌ MISSING')
console.log('KEY:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 30) + '...' : '❌ MISSING')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ ERROR: Supabase credentials missing!')
  console.error('Verifica que .env.local existe en la raíz de gestion-cobranzas/')
  console.error('Con este contenido:')
  console.error('VITE_SUPABASE_URL=https://xxxxx.supabase.co')
  console.error('VITE_SUPABASE_ANON_KEY=eyJhbGc...')
}

export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key'
)

/**
 * Verificar conexión a Supabase
 */
export const checkConnection = async (): Promise<boolean> => {
  try {
    console.log('[checkConnection] Conectando a Supabase...')

    const { data, error } = await supabase
      .from('instituciones')
      .select('id')
      .limit(1)

    if (error) {
      console.error('❌ Connection error:', error.message)
      return false
    }

    console.log('✅ Supabase connected successfully')
    return true
  } catch (err) {
    console.error('❌ Connection failed:', err)
    return false
  }
}

export const useSupabase = () => {
  return { supabase, checkConnection }
}
