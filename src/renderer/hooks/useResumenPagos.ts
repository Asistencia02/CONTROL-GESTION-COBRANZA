import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabase'

export interface ResumenPorMetodo {
  metodo_pago: string
  cantidad_pagos: number
  total_recaudado: number
  porcentaje: number
}

export interface ResumenPagosPeriodo {
  fecha: string
  metodo_pago: string
  cantidad_pagos: number
  total_recaudado: number
}

interface UseResumenPagosStore {
  resumenMetodos: ResumenPorMetodo[]
  resumenPeriodo: ResumenPagosPeriodo[]
  loading: boolean
  error: string | null

  cargarResumenPorMetodo: (institucion_id: number) => Promise<void>
  cargarResumenPeriodo: (institucion_id: number, fechaInicio: Date, fechaFin: Date) => Promise<void>
}

export const useResumenPagos = create<UseResumenPagosStore>((set) => ({
  resumenMetodos: [],
  resumenPeriodo: [],
  loading: false,
  error: null,

  cargarResumenPorMetodo: async (institucion_id: number) => {
    set({ loading: true, error: null })
    try {
      // Cargar TODOS los pagos de tabla PAGOS en bloques (máx 1000 por query)
      let todosPagos: any[] = []
      let pagina = 0
      let tieneRangoMas = true

      while (tieneRangoMas) {
        const desde = pagina * 1000
        const hasta = desde + 999
        
        const { data: pagosBloques, error: errorPagos } = await supabase
          .from('pagos')
          .select('metodo_pago, monto_pagado, estado')
          .eq('institucion_id', institucion_id)
          .range(desde, hasta)

        if (errorPagos) throw errorPagos
        
        if (!pagosBloques || pagosBloques.length === 0) {
          tieneRangoMas = false
        } else {
          // Filtrar solo pagos NO anulados
          const pagosValidos = pagosBloques.filter((p: any) => p.estado !== 'ANULADO')
          todosPagos = [...todosPagos, ...pagosValidos]
          if (pagosBloques.length < 1000) {
            tieneRangoMas = false
          }
          pagina++
        }
      }

      // Cargar TODOS los pagos de tabla PAGOS_MULTIPLES
      const { data: pagosMultiplesData, error: errorPagosMultiples } = await supabase
        .from('pagos_multiples')
        .select(`
          estado,
          metodo_pago,
          pagos_multiples_detalle(
            monto_pagado
          )
        `)
        .eq('institucion_id', institucion_id)

      if (errorPagosMultiples) throw errorPagosMultiples

      // Convertir pagos_multiples al mismo formato que pagos normales (solo NO anulados)
      if (pagosMultiplesData) {
        pagosMultiplesData.forEach((pm: any) => {
          // Filtrar solo pagos múltiples NO anulados
          if (pm.estado !== 'ANULADO' && pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
            pm.pagos_multiples_detalle.forEach((detalle: any) => {
              todosPagos.push({
                metodo_pago: pm.metodo_pago,
                monto_pagado: detalle.monto_pagado
              })
            })
          }
        })
      }

      console.log(`[RESUMEN PAGOS] Total pagos cargados: ${todosPagos.length}`)

      const metodoMap = new Map<string, { cantidad: number; total: number }>()

      todosPagos.forEach(pago => {
        const metodo = pago.metodo_pago || 'SIN ESPECIFICAR'
        if (!metodoMap.has(metodo)) {
          metodoMap.set(metodo, { cantidad: 0, total: 0 })
        }
        const stats = metodoMap.get(metodo)!
        stats.cantidad += 1
        stats.total += pago.monto_pagado
      })

      const totalGeneral = Array.from(metodoMap.values()).reduce((sum, m) => sum + m.total, 0)

      const resumen: ResumenPorMetodo[] = Array.from(metodoMap.entries())
        .map(([metodo, stats]) => ({
          metodo_pago: metodo,
          cantidad_pagos: stats.cantidad,
          total_recaudado: stats.total,
          porcentaje: totalGeneral > 0 ? (stats.total / totalGeneral) * 100 : 0,
        }))
        .sort((a, b) => b.total_recaudado - a.total_recaudado)

      console.log(`[RESUMEN PAGOS] Métodos: ${resumen.length}, Total: $${totalGeneral}`)
      resumen.forEach(m => console.log(`  - ${m.metodo_pago}: ${m.cantidad_pagos} pagos, $${m.total_recaudado}`))

      set({ resumenMetodos: resumen })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar resumen por método'
      set({ error: message })
      console.error('Error loading resumen por método:', err)
    } finally {
      set({ loading: false })
    }
  },

  cargarResumenPeriodo: async (institucion_id: number, fechaInicio: Date, fechaFin: Date) => {
    set({ loading: true, error: null })
    try {
      const fechaInicioStr = fechaInicio.toISOString().split('T')[0]
      const fechaFinStr = fechaFin.toISOString().split('T')[0]

      // Cargar TODOS los pagos de tabla PAGOS en bloques
      let todosPagos: any[] = []
      let pagina = 0
      let tieneRangoMas = true

      while (tieneRangoMas) {
        const desde = pagina * 1000
        const hasta = desde + 999
        
        const { data: pagosBloques, error: errorPagos } = await supabase
          .from('pagos')
          .select('fecha_pago, metodo_pago, monto_pagado, estado')
          .eq('institucion_id', institucion_id)
          .gte('fecha_pago', fechaInicioStr)
          .lte('fecha_pago', fechaFinStr)
          .range(desde, hasta)

        if (errorPagos) throw errorPagos
        
        if (!pagosBloques || pagosBloques.length === 0) {
          tieneRangoMas = false
        } else {
          // Filtrar solo pagos NO anulados
          const pagosValidos = pagosBloques.filter((p: any) => p.estado !== 'ANULADO')
          todosPagos = [...todosPagos, ...pagosValidos]
          if (pagosBloques.length < 1000) {
            tieneRangoMas = false
          }
          pagina++
        }
      }

      // Cargar TODOS los pagos de tabla PAGOS_MULTIPLES en el período
      const { data: pagosMultiplesData, error: errorPagosMultiples } = await supabase
        .from('pagos_multiples')
        .select(`
          estado,
          fecha_cobro,
          metodo_pago,
          pagos_multiples_detalle(
            monto_pagado
          )
        `)
        .eq('institucion_id', institucion_id)
        .gte('fecha_cobro', fechaInicioStr)
        .lte('fecha_cobro', fechaFinStr)

      if (errorPagosMultiples) throw errorPagosMultiples

      // Convertir pagos_multiples al mismo formato que pagos normales (solo NO anulados)
      if (pagosMultiplesData) {
        pagosMultiplesData.forEach((pm: any) => {
          // Filtrar solo pagos múltiples NO anulados
          if (pm.estado !== 'ANULADO' && pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
            pm.pagos_multiples_detalle.forEach((detalle: any) => {
              todosPagos.push({
                fecha_pago: pm.fecha_cobro,
                metodo_pago: pm.metodo_pago,
                monto_pagado: detalle.monto_pagado
              })
            })
          }
        })
      }

      const periodMap = new Map<string, Map<string, { cantidad: number; total: number }>>()

      todosPagos.forEach(pago => {
        const fecha = pago.fecha_pago
        const metodo = pago.metodo_pago || 'SIN ESPECIFICAR'

        if (!periodMap.has(fecha)) {
          periodMap.set(fecha, new Map())
        }

        const metodoMap = periodMap.get(fecha)!
        if (!metodoMap.has(metodo)) {
          metodoMap.set(metodo, { cantidad: 0, total: 0 })
        }

        const stats = metodoMap.get(metodo)!
        stats.cantidad += 1
        stats.total += pago.monto_pagado
      })

      const resumen: ResumenPagosPeriodo[] = []
      Array.from(periodMap.entries()).forEach(([fecha, metodoMap]) => {
        Array.from(metodoMap.entries()).forEach(([metodo, stats]) => {
          resumen.push({
            fecha,
            metodo_pago: metodo,
            cantidad_pagos: stats.cantidad,
            total_recaudado: stats.total,
          })
        })
      })

      resumen.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

      console.log(`[RESUMEN PERÍODO] Pagos en período: ${todosPagos.length}`)

      set({ resumenPeriodo: resumen })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar resumen por período'
      set({ error: message })
      console.error('Error loading resumen por período:', err)
    } finally {
      set({ loading: false })
    }
  },
}))
