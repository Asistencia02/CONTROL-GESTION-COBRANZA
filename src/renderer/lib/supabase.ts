import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Supabase credentials missing! Check .env file.')
}

export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key'
)
