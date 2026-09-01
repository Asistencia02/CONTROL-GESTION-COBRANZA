import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabase'

export interface ReporteConcepto {
  concepto: string
  tipo_concepto: string
  total_estudiantes: number
  estudiantes_no_pagaron: number
  porcentaje_no_pago: number
  monto_total_requerido: number
  monto_total_pagado: number
  monto_adeudado: number
  monto_promedio_adeudado: number
}

interface UseReporteConceptosStore {
  reporteConceptos: ReporteConcepto[]
  loading: boolean
  error: string | null

  cargarReporteConceptos: (institucion_id: number) => Promise<void>
}

export const useReporteConceptos = create<UseReporteConceptosStore>((set) => ({
  reporteConceptos: [],
  loading: false,
  error: null,

  cargarReporteConceptos: async (institucion_id: number) => {
    set({ loading: true, error: null })
    try {
      const today = new Date()
      const mesActual = today.getMonth() + 1
      const anioActual = today.getFullYear()

      // Obtener todos los conceptos activos
      const { data: conceptosData, error: errorConceptos } = await supabase
        .from('conceptos_pago')
        .select('id, nombre, tipo, monto, mes, año')
        .eq('institucion_id', institucion_id)
        .eq('activo', true)

      if (errorConceptos) throw errorConceptos

      // Filtrar conceptos hasta mes en curso (incluir mes actual)
      const conceptosFiltrados = (conceptosData || []).filter(c => {
        if (c.mes && c.año) {
          if (c.año < anioActual) return true
          if (c.año === anioActual) {
            if (c.mes <= mesActual) return true
          }
          return false
        } else {
          return true
        }
      })

      // Obtener TODOS los pagos de tabla PAGOS en bloques (máx 1000 por query)
      let todosPagos: any[] = []
      let pagina = 0
      let tieneRangoMas = true

      while (tieneRangoMas) {
        const desde = pagina * 1000
        const hasta = desde + 999
        
        const { data: pagosBloques, error: errorPagos } = await supabase
          .from('pagos')
          .select('concepto_id, estudiante_id, monto_pagado, estado')
          .eq('institucion_id', institucion_id)
          .range(desde, hasta)

        if (errorPagos) throw errorPagos
        
        if (!pagosBloques || pagosBloques.length === 0) {
          tieneRangoMas = false
        } else {
          // Filtrar pagos NO anulados (solo los que estado !== 'ANULADO')
          const pagosValidos = pagosBloques.filter((p: any) => p.estado !== 'ANULADO')
          todosPagos = [...todosPagos, ...pagosValidos]
          if (pagosBloques.length < 1000) {
            tieneRangoMas = false
          }
          pagina++
        }
      }

      // Obtener TODOS los pagos de tabla PAGOS_MULTIPLES_DETALLE
      const { data: pagosMultiplesData, error: errorPagosMultiples } = await supabase
        .from('pagos_multiples')
        .select(`
          id,
          institucion_id,
          estado,
          pagos_multiples_detalle(
            concepto_id,
            monto_pagado
          )
        `)
        .eq('institucion_id', institucion_id)

      if (errorPagosMultiples) throw errorPagosMultiples

      // Convertir pagos_multiples_detalle al mismo formato que pagos normales (solo NO anulados)
      if (pagosMultiplesData) {
        pagosMultiplesData.forEach((pm: any) => {
          // Filtrar pagos NO anulados del pago múltiple
          if (pm.estado !== 'ANULADO' && pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
            pm.pagos_multiples_detalle.forEach((detalle: any) => {
              todosPagos.push({
                concepto_id: detalle.concepto_id,
                estudiante_id: pm.estudiante_id,
                monto_pagado: detalle.monto_pagado
              })
            })
          }
        })
      }

      console.log(`[REPORTE CONCEPTOS] Conceptos hasta mes actual: ${conceptosFiltrados.length}, Pagos totales: ${todosPagos.length}`)

      // Obtener total de estudiantes activos por institución (NO_VIENE_MAS excluidos)
      const { data: estudiantesData, error: errorEstudiantes } = await supabase
        .from('estudiantes')
        .select('id')
        .eq('institucion_id', institucion_id)
        .neq('estado', 'NO_VIENE_MAS')

      if (errorEstudiantes) throw errorEstudiantes

      const totalEstudiantes = (estudiantesData || []).length

      // Procesar cada concepto
      // Mostrar deuda esperada y lo que se ha pagado
      const reportes: ReporteConcepto[] = conceptosFiltrados.map((concepto) => {
        // Filtrar pagos para este concepto
        const pagosDelConcepto = todosPagos.filter((p: any) => p.concepto_id === concepto.id)
        
        // Encontrar estudiantes que tienen AL MENOS UN pago para este concepto
        const estudiantesQuePagaron = new Set<number>()
        pagosDelConcepto.forEach((pago: any) => {
          if (pago.estudiante_id && pago.monto_pagado > 0) {
            estudiantesQuePagaron.add(pago.estudiante_id)
          }
        })

        // Estudiantes que NO pagaron
        const estudiantesNoPageron = totalEstudiantes - estudiantesQuePagaron.size

        // Calcular montos
        const montoTotalRequerido = concepto.monto * totalEstudiantes
        // PAGOS: TODOS los pagos registrados
        const montoTotalPagado = pagosDelConcepto.reduce((sum: number, p: any) => sum + (p.monto_pagado || 0), 0)
        const montoAdeudado = montoTotalRequerido - montoTotalPagado

        return {
          concepto: concepto.nombre,
          tipo_concepto: concepto.tipo,
          total_estudiantes: totalEstudiantes,
          estudiantes_no_pagaron: estudiantesNoPageron,
          porcentaje_no_pago: totalEstudiantes > 0 ? (estudiantesNoPageron / totalEstudiantes) * 100 : 0,
          monto_total_requerido: montoTotalRequerido,
          monto_total_pagado: montoTotalPagado,
          monto_adeudado: montoAdeudado,
          monto_promedio_adeudado: estudiantesNoPageron > 0 ? montoAdeudado / estudiantesNoPageron : 0,
        }
      })

      // Ordenar: primero inscripción y seguro, luego cuotas por mes
      const tiposOrden = ['inscripcion', 'seguro']
      reportes.sort((a, b) => {
        const indexA = tiposOrden.indexOf(a.tipo_concepto.toLowerCase())
        const indexB = tiposOrden.indexOf(b.tipo_concepto.toLowerCase())

        if (indexA !== -1 && indexB !== -1) return indexA - indexB
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1

        return a.concepto.localeCompare(b.concepto)
      })

      console.log(`[REPORTE CONCEPTOS] ✓ Procesados ${reportes.length} conceptos`)

      set({ reporteConceptos: reportes })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar reporte de conceptos'
      set({ error: message })
      console.error('Error loading reporte conceptos:', err)
    } finally {
      set({ loading: false })
    }
  },
}))