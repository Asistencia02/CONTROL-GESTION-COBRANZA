import React, { useState } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda } from '@renderer/lib/helpers'

export const DebugDeuda: React.FC = () => {
  const [output, setOutput] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const debugear = async () => {
    setLoading(true)
    setOutput('Cargando...\n')

    try {
      const today = new Date()
      const mesActual = today.getMonth() + 1
      const anoActual = today.getFullYear()
      console.log(`HOY: ${mesActual}/${anoActual}`)

      // Cargar conceptos
      const { data: conceptos } = await supabase
        .from('conceptos_pago')
        .select('*')
        .eq('institucion_id', 1)
        .eq('activo', true)

      let log = `=== CONCEPTOS (institucion_id=1) ===\n`
      log += `Hoy: ${mesActual}/${anoActual}\n\n`

      conceptos?.forEach(c => {
        const esVencido = c.año < anoActual || (c.año === anoActual && c.mes && c.mes <= mesActual)
        log += `ID: ${c.id} | Nombre: ${c.nombre} | Mes: ${c.mes} | Año: ${c.año} | Monto: ${formatoMoneda(c.monto)} | VENCIDO: ${esVencido}\n`
      })

      // Cargar estudiantes
      const { data: estudiantes } = await supabase
        .from('estudiantes')
        .select('id, estado, nombre, apellido')
        .eq('institucion_id', 1)

      log += `\n=== ESTUDIANTES ===\n`
      log += `Total: ${estudiantes?.length}\n`

      const validos = estudiantes?.filter(e => e.estado === 'ACTIVO' || e.estado === 'BECADO_50')
      log += `ACTIVO + BECADO_50: ${validos?.length}\n`

      // Cargar pagos
      const { data: pagosIndiv } = await supabase
        .from('pagos')
        .select('*')
        .eq('institucion_id', 1)
        .neq('estado', 'ANULADO')

      const { data: pagosMultiples } = await supabase
        .from('pagos_multiples')
        .select('*,pagos_multiples_detalle(*)')
        .eq('institucion_id', 1)
        .neq('estado', 'ANULADO')

      log += `\n=== PAGOS ===\n`
      log += `Pagos individuales: ${pagosIndiv?.length}\n`
      log += `Pagos múltiples: ${pagosMultiples?.length}\n`

      // Crear mapa de pagos
      const pagosMap = new Map<string, number>()
      pagosIndiv?.forEach(p => {
        const key = `${p.estudiante_id}-${p.concepto_id}`
        pagosMap.set(key, (pagosMap.get(key) || 0) + p.monto_pagado)
      })

      pagosMultiples?.forEach(pm => {
        pm.pagos_multiples_detalle?.forEach((det: any) => {
          const key = `${pm.estudiante_id}-${det.concepto_id}`
          pagosMap.set(key, (pagosMap.get(key) || 0) + det.monto_pagado)
        })
      })

      log += `\n=== DEUDA POR CONCEPTO ===\n`

      let totalDeuda = 0
      conceptos?.forEach(concepto => {
        const esVencido = concepto.año < anoActual || (concepto.año === anoActual && concepto.mes && concepto.mes <= mesActual)

        if (esVencido) {
          let deudaConcepto = 0
          let noPagaron = 0

          validos?.forEach(est => {
            const pagado = pagosMap.get(`${est.id}-${concepto.id}`) || 0
            if (pagado === 0) {
              deudaConcepto += concepto.monto
              noPagaron += 1
            }
          })

          totalDeuda += deudaConcepto
          log += `Concepto: ${concepto.nombre}\n`
          log += `  Monto unit: ${formatoMoneda(concepto.monto)}\n`
          log += `  Estudiantes sin pagar: ${noPagaron}\n`
          log += `  Deuda total: ${formatoMoneda(deudaConcepto)}\n\n`
        }
      })

      log += `\n=== TOTAL DEUDA ===\n${formatoMoneda(totalDeuda)}\n`

      setOutput(log)
    } catch (err) {
      setOutput(`ERROR: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <h1 className="text-2xl font-bold text-white mb-4">Debug Deuda</h1>
      <button
        onClick={debugear}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded mb-4"
      >
        {loading ? 'Cargando...' : 'Debuggear'}
      </button>
      <pre className="bg-slate-800 text-green-400 p-4 rounded overflow-auto max-h-96 font-mono text-xs">
        {output}
      </pre>
    </div>
  )
}

export default DebugDeuda
