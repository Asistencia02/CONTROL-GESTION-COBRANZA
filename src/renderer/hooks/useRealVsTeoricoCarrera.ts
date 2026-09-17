import { useEffect, useState } from 'react'
import { supabase } from '@renderer/lib/supabase'

export interface RealVsTeoricoCarrera {
  carrera_id: number
  carrera: string
  inscripcion_real: number
  inscripcion_teorico: number
  cuotas_real: number
  cuotas_teorico: number
  seguros_real: number
  seguros_teorico: number
  total_real: number
  total_teorico: number
  diferencia: number
  porcentaje_cumplimiento: number
}

export const useRealVsTeoricoCarrera = (institucionId: number) => {
  const [datos, setDatos] = useState<RealVsTeoricoCarrera[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener estudiantes activos por carrera CON ESTADO
      const { data: estudiantes, error: errEst } = await supabase
        .from('estudiantes')
        .select('id, carrera_id, estado, carreras(id, nombre)')
        .eq('institucion_id', institucionId)
        .neq('estado', 'NO_VIENE_MAS')

      if (errEst) throw errEst

      // Obtener configuraciones de carrera (montos)
      const { data: configuraciones, error: errConf } = await supabase
        .from('configuracion_carreras')
        .select('id, carrera_id, monto_inscripcion, monto_cuota, monto_seguro')
        .eq('institucion_id', institucionId)

      if (errConf) throw errConf

      // Obtener pagos con JOIN a conceptos_pago para saber el tipo
      let todosPagos: any[] = []
      let pagina = 0
      let tieneRangoMas = true

      while (tieneRangoMas) {
        const desde = pagina * 1000
        const hasta = desde + 999

        const { data: pagos, error: errPagos } = await supabase
          .from('pagos_multiples_detalle')
          .select(`
            monto_pagado,
            conceptos_pago!inner(
              tipo
            ),
            pagos_multiples!inner(
              estudiante_id,
              institucion_id,
              estado
            )
          `)
          .eq('pagos_multiples.institucion_id', institucionId)
          .neq('pagos_multiples.estado', 'ANULADO')
          .range(desde, hasta)

        if (errPagos) throw errPagos

        if (!pagos || pagos.length === 0) {
          tieneRangoMas = false
        } else {
          todosPagos = [...todosPagos, ...pagos]
          pagina++
        }
      }

      // Procesar datos: agrupar estudiantes por carrera Y estado
      const estudiantesPorCarreraEstado = new Map<string, { total: number; becado100: number; becado50: number; activo: number }>()
      
      ;(estudiantes || []).forEach((est: any) => {
        if (!est.carrera_id) return
        
        const key = est.carrera_id.toString()
        if (!estudiantesPorCarreraEstado.has(key)) {
          estudiantesPorCarreraEstado.set(key, { total: 0, becado100: 0, becado50: 0, activo: 0 })
        }
        
        const stats = estudiantesPorCarreraEstado.get(key)!
        stats.total++
        
        if (est.estado === 'BECADO_100') {
          stats.becado100++
        } else if (est.estado === 'BECADO_50') {
          stats.becado50++
        } else if (est.estado === 'ACTIVO') {
          stats.activo++
        }
      })

      const resultados: RealVsTeoricoCarrera[] = []

      Array.from(estudiantesPorCarreraEstado.entries()).forEach(([carreraIdStr, stats]) => {
        const carreraId = parseInt(carreraIdStr)
        const carreraData = (estudiantes || []).find((e: any) => e.carrera_id === carreraId)
        const carreraNombre = (carreraData as any)?.carreras?.nombre || `Carrera ${carreraId}`

        // Obtener configuración de la carrera
        const config = (configuraciones || []).find((c: any) => c.carrera_id === carreraId)

        // ============ TEÓRICO CON AJUSTE POR BECAS ============
        // INSCRIPCION: todos la pagan (ACTIVO + BECADO_100 + BECADO_50)
        const inscripcionTeorico = (config?.monto_inscripcion || 0) * stats.total

        // CUOTAS: 
        //   - ACTIVO: paga 100% × 10 meses
        //   - BECADO_100: NO paga (0)
        //   - BECADO_50: paga 50% × 10 meses
        const montoCuota = config?.monto_cuota || 0
        const cuotasActivoTeorico = montoCuota * stats.activo * 10
        const cuotasBecado50Teorico = (montoCuota * 0.5) * stats.becado50 * 10
        const cuotasTeorico = cuotasActivoTeorico + cuotasBecado50Teorico

        // SEGUROS: todos pagan (ACTIVO + BECADO_100 + BECADO_50)
        const segurosTeorico = (config?.monto_seguro || 0) * stats.total * 10

        // ============ REAL: contar pagos por tipo ============
        let inscripcionReal = 0
        let cuotasReal = 0
        let segurosReal = 0

        todosPagos.forEach((pago: any) => {
          const estudiante = (estudiantes || []).find(
            (e: any) => e.id === pago.pagos_multiples?.estudiante_id
          )
          
          if (!estudiante || estudiante.carrera_id !== carreraId) return

          const monto = pago.monto_pagado || 0
          const tipo = pago.conceptos_pago?.tipo?.toUpperCase()

          if (tipo === 'INSCRIPCION' || tipo === 'INSCRIPCIÓN') {
            inscripcionReal += monto
          } else if (tipo === 'CUOTA') {
            cuotasReal += monto
          } else if (tipo === 'SEGURO') {
            segurosReal += monto
          }
        })

        const totalReal = inscripcionReal + cuotasReal + segurosReal
        const totalTeorico = inscripcionTeorico + cuotasTeorico + segurosTeorico
        const diferencia = totalReal - totalTeorico
        const porcentajeCumplimiento = totalTeorico > 0 ? (totalReal / totalTeorico) * 100 : 0

        resultados.push({
          carrera_id: carreraId,
          carrera: carreraNombre,
          inscripcion_real: inscripcionReal,
          inscripcion_teorico: inscripcionTeorico,
          cuotas_real: cuotasReal,
          cuotas_teorico: cuotasTeorico,
          seguros_real: segurosReal,
          seguros_teorico: segurosTeorico,
          total_real: totalReal,
          total_teorico: totalTeorico,
          diferencia,
          porcentaje_cumplimiento: porcentajeCumplimiento
        })
      })

      setDatos(resultados)
      console.log('[REAL VS TEORICO CARRERA - CON BECAS]', resultados)
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido'
      setError(mensaje)
      console.error('[ERROR REAL VS TEORICO]', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (institucionId) {
      cargar()
    }
  }, [institucionId])

  return { datos, loading, error, refrescar: cargar }
}
