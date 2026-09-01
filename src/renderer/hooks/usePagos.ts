import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabase'
import { Pago, TipoPago } from '@renderer/lib/database.types'
import { obtenerFechaLocalIso, obtenerFechaLocal } from '@renderer/lib/dateUtils'

interface PagoWithDetails extends Pago {
  estudiantes?: { nombre: string; apellido: string; dni: string }
  conceptos_pago?: { nombre: string; tipo: string; monto: number; mes?: number }
}

interface UsePagosStore {
  pagos: PagoWithDetails[]
  loading: boolean
  error: string | null
  
  cargarPagos: (institucion_id: number, filtro?: { estudiante_id?: number; metodo?: TipoPago }) => Promise<void>
  registrarPago: (pago: Omit<Pago, 'id' | 'created_at' | 'updated_at'>) => Promise<Pago | null>
  obtenerPagoPorEstudiante: (estudiante_id: number, concepto_id: number) => PagoWithDetails | undefined
  resumenPorMetodo: (institucion_id: number, fecha_inicio: Date, fecha_fin: Date) => Promise<Record<TipoPago, number>>
  resumenPorConcepto: (institucion_id: number) => Promise<any>
}

export const usePagos = create<UsePagosStore>((set, get) => ({
  pagos: [],
  loading: false,
  error: null,

  cargarPagos: async (institucion_id: number, filtro) => {
    set({ loading: true, error: null })
    try {
      let allPagos: PagoWithDetails[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      // Cargar en lotes de 1000 (límite de Supabase)
      while (hasMore) {
        let query = supabase
          .from('pagos')
          .select(`
            *,
            estudiantes(nombre, apellido, dni),
            conceptos_pago(nombre, tipo, monto, mes)
          `)
          .eq('institucion_id', institucion_id)

        if (filtro?.estudiante_id) {
          query = query.eq('estudiante_id', filtro.estudiante_id)
        }
        if (filtro?.metodo) {
          query = query.eq('metodo_pago', filtro.metodo)
        }

        const { data, error } = await query
          .order('fecha_pago', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error
        
        if (!data || data.length === 0) {
          hasMore = false
        } else {
          allPagos = [...allPagos, ...(data as PagoWithDetails[])]
          if (data.length < pageSize) {
            hasMore = false
          }
          page++
        }
      }

      // También cargar pagos múltiples convertidos al formato de pagos
      const { data: pagosMultiples, error: errorMultiples } = await supabase
        .from('pagos_multiples')
        .select(`
          id,
          estudiante_id,
          numero_talonario,
          monto_total,
          metodo_pago,
          tipo_tarjeta,
          fecha_cobro,
          estado,
          pagos_multiples_detalle(
            id,
            concepto_id,
            monto_pagado,
            conceptos_pago(nombre, tipo, monto, mes)
          ),
          estudiantes(nombre, apellido, dni)
        `)
        .eq('institucion_id', institucion_id)
        .order('fecha_cobro', { ascending: false })

      if (!errorMultiples && pagosMultiples && Array.isArray(pagosMultiples)) {
        // Convertir pagos_multiples_detalle a formato pagos individual
        const pagosDetalles: PagoWithDetails[] = []
        pagosMultiples.forEach((pm: any) => {
          if (pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle) && pm.pagos_multiples_detalle.length > 0) {
            pm.pagos_multiples_detalle.forEach((detalle: any) => {
              // ✅ ID sintético SOLO para UI, NO para queries a DB
              const idUnico = `pm_${pm.id}_${detalle.id}`
              pagosDetalles.push({
                id: idUnico,
                institucion_id,
                estudiante_id: pm.estudiante_id,
                concepto_id: detalle.concepto_id,
                monto_pagado: detalle.monto_pagado,
                monto_original: detalle.monto_pagado,
                metodo_pago: pm.metodo_pago,
                tipo_tarjeta: pm.tipo_tarjeta,
                numero_talonario: pm.numero_talonario,
                fecha_pago: pm.fecha_cobro,
                estado: pm.estado,
                estudiantes: pm.estudiantes,
                conceptos_pago: detalle.conceptos_pago || undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                // ✅ IMPORTANTE: Guardar referencias reales para cualquier query futura
                pago_multiple_id: pm.id,
                pago_detalle_id: detalle.id,
              } as any)
            })
          }
        })
        allPagos = [...allPagos, ...pagosDetalles]
      }

      // Ordenar todos los pagos por fecha DESC (más recientes primero)
      allPagos.sort((a, b) => {
        const fechaA = new Date(a.fecha_pago).getTime()
        const fechaB = new Date(b.fecha_pago).getTime()
        return fechaB - fechaA
      })

      set({ pagos: allPagos })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar pagos'
      set({ error: message })
      console.error('Error loading pagos:', err)
    } finally {
      set({ loading: false })
    }
  },

  registrarPago: async (pago) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('pagos')
        .insert([pago])
        .select(`
          *,
          estudiantes(nombre, apellido, dni),
          conceptos_pago(nombre, tipo, monto, mes)
        `)

      if (error) throw error
      const nuevoPago = data[0] as PagoWithDetails
      set(state => ({
        pagos: [nuevoPago, ...state.pagos]
      }))
      return nuevoPago
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar pago'
      set({ error: message })
      console.error('Error registering pago:', err)
      return null
    } finally {
      set({ loading: false })
    }
  },

  obtenerPagoPorEstudiante: (estudiante_id: number, concepto_id: number) => {
    return get().pagos.find(
      p => p.estudiante_id === estudiante_id && p.concepto_id === concepto_id
    )
  },

  resumenPorMetodo: async (institucion_id: number, fecha_inicio: Date, fecha_fin: Date) => {
    try {
      const { data, error } = await supabase
        .from('v_ingresos_por_metodo')
        .select('metodo_pago, total_recaudado')
        .eq('id', institucion_id)
        .gte('fecha', obtenerFechaLocalIso())
        .lte('fecha', obtenerFechaLocalIso())

      if (error) throw error

      const resumen: Record<TipoPago, number> = {
        EFECTIVO: 0,
        TRANSFERENCIA: 0,
        TARJETA: 0
      }

      data.forEach(row => {
        resumen[row.metodo_pago as TipoPago] = row.total_recaudado || 0
      })

      return resumen
    } catch (err) {
      console.error('Error calculating resumen por método:', err)
      return { EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0 }
    }
  },

  resumenPorConcepto: async (institucion_id: number) => {
    try {
      const { data, error } = await supabase
        .from('v_resumen_conceptos')
        .select('*')

      if (error) throw error
      return data
    } catch (err) {
      console.error('Error calculating resumen por concepto:', err)
      return []
    }
  }
}))
