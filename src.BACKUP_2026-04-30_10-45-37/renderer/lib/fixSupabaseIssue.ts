import { supabase } from '@renderer/lib/supabase'

/**
 * SOLUCIÓN DEFINITIVA: Usar fetch directo en los hooks
 * En lugar de interceptar, usamos la API REST directamente
 * evitando que el cliente Supabase genere ?columns=
 */

export const fixSupabaseInsertIssue = () => {
  console.log('✅ [Supabase] Workaround activado: usando fetch directo en inserts')
  // Ya no necesitamos interceptor - usamos fetch directo en los hooks
}
