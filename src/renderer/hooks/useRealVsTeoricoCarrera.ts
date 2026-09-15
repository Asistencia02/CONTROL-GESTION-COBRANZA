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

      // Obtener pagos múltiples detalle
      let todosPagos: any[] = []
      let pagina = 0
      let tieneRangoMas = true

      while (tieneRangoMas) {
        const desde = pagina * 1000
        const hasta = desde + 999

        const { data: pagos, error: errPagos } = await supabase
          .from('pagos_multiples_detalle')
          .select(`
            tipo_concepto,
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
        if (est.carrera_id) {
          estudiantesPorCarrera.set(est.carrera_id, (estudiantesPorCarrera.get(est.carrera_id) || 0) + 1)
        }
      })

      const resultados: RealVsTeoricoCarrera[] = []

      estudiantesPorCarrera.forEach((cantEst, carreraId) => {
        const carreraData = (estudiantes || []).find((e: any) => e.carrera_id === carreraId)
        const carreraNombre = (carreraData as any)?.carreras?.nombre || `Carrera ${carreraId}`

        // Obtener configuración de la carrera
        const config = (configuraciones || []).find((c: any) => c.carrera_id === carreraId)

        // Teórico: cantidad de estudiantes × monto por concepto
        // Asumiendo: 1 inscripción + 10 cuotas + 10 seguros (período académico)
        const inscripcionTeorico = (config?.monto_inscripcion || 0) * cantEst
        const cuotasTeorico = (config?.monto_cuota || 0) * cantEst * 10 // 10 meses
        const segurosTeorico = (config?.monto_seguro || 0) * cantEst * 10 // 10 meses

        // Calcular real (pagos)
        let inscripcionReal = 0
        let cuotasReal = 0
        let segurosReal = 0

        todosPagos.forEach((pago: any) => {
          const esDeCarrera = (estudiantes || []).find(
            (e: any) => e.id === pago.pagos_multiples?.estudiante_id && e.carrera_id === carreraId
          )
          if (!esDeCarrera) return

          const monto = pago.monto_pagado || 0
          const tipo = pago.tipo_concepto?.toUpperCase()

          if (tipo === 'INSCRIPCIÓN' || tipo === 'INSCRIPCION') {
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
