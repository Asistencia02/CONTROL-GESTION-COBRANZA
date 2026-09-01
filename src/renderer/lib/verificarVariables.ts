import { SUPABASE_URL, SUPABASE_ANON_KEY, INSTITUCION_ID } from './env'

/**
 * VERIFICAR VARIABLES DE ENTORNO EN VERCEL
 * Abre F12 → Console y pega esto
 */

console.group('🔍 VERIFICACIÓN DE VARIABLES DE ENTORNO')

console.log('📍 Ambiente:', import.meta.env.MODE)
console.log('🌍 URL de app:', window.location.href)

console.group('Supabase')
console.log('VITE_SUPABASE_URL:', SUPABASE_URL ? '✅ SETEADA' : '❌ FALTA')
if (SUPABASE_URL) console.log('  Valor:', SUPABASE_URL)

console.log('VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ SETEADA' : '❌ FALTA')
if (SUPABASE_ANON_KEY) console.log('  Primeros 30 chars:', SUPABASE_ANON_KEY.substring(0, 30) + '...')
console.groupEnd()

console.group('Configuración')
console.log('VITE_INSTITUCION_ID:', INSTITUCION_ID ? INSTITUCION_ID : '⚠️ Default (1)')
console.groupEnd()

console.group('Google Apps Script')
const googleUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
console.log('VITE_GOOGLE_APPS_SCRIPT_URL:', googleUrl ? '✅ SETEADA' : '❌ FALTA')
if (googleUrl) console.log('  Valor:', googleUrl)
console.groupEnd()

console.group('RESUMEN')
const variables = [
  { nombre: 'VITE_SUPABASE_URL', valor: SUPABASE_URL },
  { nombre: 'VITE_SUPABASE_ANON_KEY', valor: SUPABASE_ANON_KEY },
  { nombre: 'VITE_GOOGLE_APPS_SCRIPT_URL', valor: googleUrl },
]

const faltantes = variables.filter(v => !v.valor)
const seteadas = variables.filter(v => v.valor)

console.log(`✅ ${seteadas.length} / ${variables.length} variables seteadas`)
if (faltantes.length > 0) {
  console.error(`❌ Faltan estas variables:`)
  faltantes.forEach(v => console.error(`  - ${v.nombre}`))
  console.error('Agréegalas en Vercel → Settings → Environment Variables')
}
console.groupEnd()

console.groupEnd()

export {}
