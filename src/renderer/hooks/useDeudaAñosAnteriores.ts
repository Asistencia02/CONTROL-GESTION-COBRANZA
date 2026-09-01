import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabase'

export interface DeudaHistorica {
  id: number
  institucion_id: string
  estudiante_id: number
  año_deuda: number
  total_adeudado: number
  estado: string
  fecha_creacion: string
}

export interface DeudaFinanciada {
  id: number
  institucion_id: string
  estudiante_id: number
  año_deuda: number
  año_financiamiento: number
  deuda_original: number
  pago_inicial: number
  saldo_financiar: number
  cuotas_mensuales: number
  monto_extra_cuota: number
  monto_cuota_final: number
  mes_inicio: number
  mes_fin: number
  estado: string
  fecha_creacion: string
}

export interface PagoDeudaDetalle {
  id: number
  estudiante_id: number
  deuda_financiada_id: number
  mes: number
  monto_cuota_regular: number
  monto_deuda_mes: number
  monto_total: number
  pagado: boolean
  fecha_pago?: string
  numero_talonario?: string
}

interface UseDeudaAñosAnterioresStore {
  deudasHistoricas: DeudaHistorica[]
  deudasFinanciadas: DeudaFinanciada[]
  pagosDeudaDetalle: PagoDeudaDetalle[]
  loading: boolean
  error: string | null

  cargarDeudaEstudiante: (estudiante_id: number, institucion_id: string) => Promise<DeudaHistorica | null>
  cargarDeudaFinanciada: (estudiante_id: number, institucion_id: string, año: number) => Promise<DeudaFinanciada | null>
  cargarPagosDeudaDetalle: (deuda_financiada_id: number) => Promise<PagoDeudaDetalle[]>
  crearDeudaHistorica: (estudiante_id: number, institucion_id: string, año_deuda: number, monto: number) => Promise<DeudaHistorica | null>
  crearFinanciamientoDeuda: (
    estudiante_id: number,
    institucion_id: string,
    deuda_original: number,
    pago_inicial: number,
    cuotas: number,
    año_deuda: number,
    año_financiamiento: number
  ) => Promise<DeudaFinanciada | null>
  actualizarEstadoFinanciamiento: (deuda_financiada_id: number, estado: string) => Promise<boolean>
  marcarPagoDeujaDetalle: (pago_deuda_detalle_id: number, pago_id: number, numero_talonario?: string) => Promise<boolean>
  obtenerTotalDeudaPorEstudiante: (estudiante_id: number, institucion_id: string) => Promise<number>
}

export const useDeudaAñosAnteriores = create<UseDeudaAñosAnterioresStore>((set, get) => ({
  deudasHistoricas: [],
  deudasFinanciadas: [],
  pagosDeudaDetalle: [],
  loading: false,
  error: null,

  cargarDeudaEstudiante: async (estudiante_id: number, institucion_id: string) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('deudas_historicas')
        .select('*')
        .eq('estudiante_id', estudiante_id)
        .eq('institucion_id', institucion_id)
        .eq('estado', 'PENDIENTE')
        .maybeSingle()

      if (error) throw error

      if (data) {
        set(state => ({
          deudasHistoricas: [data as DeudaHistorica]
        }))
        return data as DeudaHistorica
      }
      return null
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar deuda'
      set({ error: message })
      console.error('Error cargarDeudaEstudiante:', err)
      return null
    } finally {
      set({ loading: false })
    }
  },

  cargarDeudaFinanciada: async (estudiante_id: number, institucion_id: string, año: number) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('deuda_financiada')
        .select('*')
        .eq('estudiante_id', estudiante_id)
        .eq('institucion_id', institucion_id)
        .eq('año_financiamiento', año)
        .eq('estado', 'ACTIVO')
        .maybeSingle()

      if (error) throw error

      if (data) {
        set(state => ({
          deudasFinanciadas: [data as DeudaFinanciada]
        }))
        return data as DeudaFinanciada
      }
      return null
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar financiamiento'
      set({ error: message })
      console.error('Error cargarDeudaFinanciada:', err)
      return null
    } finally {
      set({ loading: false })
    }
  },

  cargarPagosDeudaDetalle: async (deuda_financiada_id: number) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('pagos_deuda_detalle')
        .select('*')
        .eq('deuda_financiada_id', deuda_financiada_id)
        .order('mes', { ascending: true })

      if (error) throw error

      if (data) {
        set({ pagosDeudaDetalle: data as PagoDeudaDetalle[] })
        return data as PagoDeudaDetalle[]
      }
      return []
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar detalles'
      set({ error: message })
      console.error('Error cargarPagosDeudaDetalle:', err)
      return []
    } finally {
      set({ loading: false })
    }
  },

  crearDeudaHistorica: async (estudiante_id: number, institucion_id: string, año_deuda: number, monto: number) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('deudas_historicas')
        .insert([{
          institucion_id,
          estudiante_id,
          año_deuda,
          total_adeudado: monto,
          estado: 'PENDIENTE'
        }])
        .select()
        .single()

      if (error) throw error

      set(state => ({
        deudasHistoricas: [...state.deudasHistoricas, data as DeudaHistorica]
      }))
      return data as DeudaHistorica
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear deuda histórica'
      set({ error: message })
      console.error('Error crearDeudaHistorica:', err)
      return null
    } finally {
      set({ loading: false })
    }
  },

  crearFinanciamientoDeuda: async (
    estudiante_id: number,
    institucion_id: string,
    deuda_original: number,
    pago_inicial: number,
    cuotas: number,
    año_deuda: number,
    año_financiamiento: number
  ) => {
    set({ loading: true, error: null })
    try {
      const saldo_financiar = deuda_original - pago_inicial
      const monto_extra_cuota = Math.round((saldo_financiar / cuotas) * 100) / 100
      const monto_cuota_final = 20000 + monto_extra_cuota // Asumiendo cuota base de 20000

      const { data, error } = await supabase
        .from('deuda_financiada')
        .insert([{
          institucion_id,
          estudiante_id,
          año_deuda,
          año_financiamiento,
          deuda_original,
          pago_inicial,
          saldo_financiar,
          cuotas_mensuales: cuotas,
          monto_extra_cuota,
          monto_cuota_final,
          mes_inicio: 3, // Marzo
          mes_fin: 12, // Diciembre
          estado: 'ACTIVO'
        }])
        .select()
        .single()

      if (error) throw error

      // Crear detalles para cada mes
      const detalles = []
      for (let mes = 3; mes <= 12; mes++) {
        detalles.push({
          institucion_id,
          estudiante_id,
          deuda_financiada_id: data.id,
          mes,
          monto_cuota_regular: 20000,
          monto_deuda_mes: monto_extra_cuota,
          monto_total: monto_cuota_final,
          pagado: false
        })
      }

      const { error: errorDetalles } = await supabase
        .from('pagos_deuda_detalle')
        .insert(detalles)

      if (errorDetalles) throw errorDetalles

      set(state => ({
        deudasFinanciadas: [...state.deudasFinanciadas, data as DeudaFinanciada]
      }))
      return data as DeudaFinanciada
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear financiamiento'
      set({ error: message })
      console.error('Error crearFinanciamientoDeuda:', err)
      return null
    } finally {
      set({ loading: false })
    }
  },

  actualizarEstadoFinanciamiento: async (deuda_financiada_id: number, estado: string) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('deuda_financiada')
        .update({ estado, fecha_actualizacion: new Date().toISOString() })
        .eq('id', deuda_financiada_id)

      if (error) throw error

      set(state => ({
        deudasFinanciadas: state.deudasFinanciadas.map(d =>
          d.id === deuda_financiada_id ? { ...d, estado } : d
        )
      }))
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar financiamiento'
      set({ error: message })
      console.error('Error actualizarEstadoFinanciamiento:', err)
      return false
    } finally {
      set({ loading: false })
    }
  },

  marcarPagoDeujaDetalle: async (pago_deuda_detalle_id: number, pago_id: number, numero_talonario?: string) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('pagos_deuda_detalle')
        .update({
          pagado: true,
          fecha_pago: new Date().toISOString(),
          pago_id,
          numero_talonario: numero_talonario || null
        })
        .eq('id', pago_deuda_detalle_id)

      if (error) throw error

      set(state => ({
        pagosDeudaDetalle: state.pagosDeudaDetalle.map(p =>
          p.id === pago_deuda_detalle_id
            ? { ...p, pagado: true, fecha_pago: new Date().toISOString(), pago_id, numero_talonario }
            : p
        )
      }))
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al marcar pago'
      set({ error: message })
      console.error('Error marcarPagoDeujaDetalle:', err)
      return false
    } finally {
      set({ loading: false })
    }
  },

  obtenerTotalDeudaPorEstudiante: async (estudiante_id: number, institucion_id: string) => {
    try {
      const { data, error } = await supabase
        .from('deudas_historicas')
        .select('total_adeudado')
        .eq('estudiante_id', estudiante_id)
        .eq('institucion_id', institucion_id)
        .eq('estado', 'PENDIENTE')

      if (error) throw error

      const total = (data || []).reduce((sum, d) => sum + d.total_adeudado, 0)
      return total
    } catch (err) {
      console.error('Error obtenerTotalDeudaPorEstudiante:', err)
      return 0
    }
  }
}))
