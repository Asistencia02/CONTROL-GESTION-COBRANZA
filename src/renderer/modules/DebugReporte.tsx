import React, { useState } from 'react'
import { supabase } from '@renderer/lib/supabase'

export const DebugReporte: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [debug, setDebug] = useState<any>(null)

  const verificarDatos = async () => {
    try {
      setLoading(true)
      console.log('[DEBUG] Iniciando verificación...')

      // 1. Conceptos por carrera
      const { data: conceptosPorCarrera } = await supabase
        .from('conceptos_pago')
        .select('id, carrera_id, tipo, mes')
        .eq('institucion_id', 2)

      console.log('[DEBUG] Conceptos por carrera:', conceptosPorCarrera)

      // 2. Contar pagos por carrera
      const { data: pagosDetalle } = await supabase
        .from('pagos_multiples_detalle')
        .select('concepto_id')

      const pagosMap = new Map<number, number>()
      pagosDetalle?.forEach((pago: any) => {
        pagosMap.set(pago.concepto_id, (pagosMap.get(pago.concepto_id) || 0) + 1)
      })

      console.log('[DEBUG] Pagos Map:', Object.fromEntries(pagosMap))

      // 3. Contar pagos por carrera
      const pagosPorCarrera = new Map<number, number>()
      conceptosPorCarrera?.forEach((concepto: any) => {
        const count = pagosMap.get(concepto.id) || 0
        const total = (pagosPorCarrera.get(concepto.carrera_id) || 0) + count
        pagosPorCarrera.set(concepto.carrera_id, total)
      })

      console.log('[DEBUG] Pagos por carrera:', Object.fromEntries(pagosPorCarrera))

      setDebug({
        conceptosPorCarrera,
        pagosPorCarrera: Object.fromEntries(pagosPorCarrera),
        totalConceptos: conceptosPorCarrera?.length,
        totalPagosDetalle: pagosDetalle?.length,
      })
    } catch (err) {
      console.error('[DEBUG] Error:', err)
      setDebug({ error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-slate-900 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">🔍 Debug Reporte</h2>
      <button
        onClick={verificarDatos}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded"
      >
        {loading ? 'Cargando...' : 'Verificar Datos'}
      </button>

      {debug && (
        <pre className="mt-4 bg-slate-800 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(debug, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default DebugReporte
