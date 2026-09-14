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

      // Obtener estudiantes activos por carrera
      const { data: estudiantes, error: errEst } = await supabase
        .from('estudiantes')
        .select('id, carrera_id, estado, carreras(nombre)')
        .eq('institucion_id', institucionId)
        .neq('estado', 'NO_VIENE_MAS')

      if (errEst) throw errEst

      // Obtener conceptos
      const { data: conceptos, error: errConc } = await supabase
        .from('conceptos_pago')
        .select('id, tipo, monto, carrera_id')
        .eq('institucion_id', institucionId)
        .eq('activo', true)

      if (errConc) throw errConc

      // Obtener pagos múltiples detalle con método
      let todosPagos: any[] = []
      let pagina = 0
      let tieneRangoMas = true

      while (tieneRangoMas) {
        const desde = pagina * 1000
        const hasta = desde + 999

        const { data: pagos, error: errPagos } = await supabase
          .from('pagos_multiples_detalle')
          .select(`
            concepto_id,
            monto_pagado,
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

      // Procesar datos
      const estudiantesPorCarrera = new Map<number, number>()
      ;(estudiantes || []).forEach((est: any) => {
        estudiantesPorCarrera.set(est.carrera_id, (estudiantesPorCarrera.get(est.carrera_id) || 0) + 1)
      })

      const resultados: RealVsTeoricoCarrera[] = []

      estudiantesPorCarrera.forEach((cantEst, carreraId) => {
        const carreraData = (estudiantes || []).find((e: any) => e.carrera_id === carreraId)
        const carreraNombre = (carreraData as any)?.carreras?.nombre || `Carrera ${carreraId}`

        // Conceptos de la carrera
        const conceptosCarrera = (conceptos || []).filter((c: any) => c.carrera_id === carreraId)

        // Calcular teórico
        let inscripcionTeorico = 0
        let cuotasTeorico = 0
        let segurosTeorico = 0

        const inscripciones = conceptosCarrera.filter((c: any) => c.tipo?.toUpperCase() === 'INSCRIPCIÓN')
        const cuotas = conceptosCarrera.filter((c: any) => c.tipo?.toUpperCase() === 'CUOTA')
        const seguros = conceptosCarrera.filter((c: any) => c.tipo?.toUpperCase() === 'SEGURO')

        inscripciones.forEach((c: any) => {
          inscripcionTeorico += (c.monto || 0) * cantEst
        })
        cuotas.forEach((c: any) => {
          cuotasTeorico += (c.monto || 0) * cantEst
        })
        seguros.forEach((c: any) => {
          segurosTeorico += (c.monto || 0) * cantEst
        })

        // Calcular real (pagos)
        let inscripcionReal = 0
        let cuotasReal = 0
        let segurosReal = 0

        todosPagos.forEach((pago: any) => {
          const esDeCarrera = (estudiantes || []).find(
            (e: any) => e.id === pago.pagos_multiples?.estudiante_id && e.carrera_id === carreraId
          )
          if (!esDeCarrera) return

          const concepto = (conceptos || []).find((c: any) => c.id === pago.concepto_id)
          if (!concepto) return

          const monto = pago.monto_pagado || 0
          if (concepto.tipo?.toUpperCase() === 'INSCRIPCIÓN') {
            inscripcionReal += monto
          } else if (concepto.tipo?.toUpperCase() === 'CUOTA') {
            cuotasReal += monto
          } else if (concepto.tipo?.toUpperCase() === 'SEGURO') {
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
      console.log('[REAL VS TEORICO CARRERA]', resultados)
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
