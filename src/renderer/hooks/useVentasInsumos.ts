import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabase'

export interface VentaInsumo {
  id?: number
  institucion_id: number
  insumo_id: number
  cantidad: number
  precio_unitario: number
  subtotal: number
  metodo_pago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'CHEQUE'
  numero_talonario?: string
  fecha_venta: string
  estado?: 'VENDIDO' | 'ANULADO'
  fecha_anulacion?: string
  motivo_anulacion?: string
  anulado_por?: string
}

interface UseVentasInsumosStore {
  ventas: VentaInsumo[]
  loading: boolean
  error: string | null

  cargarVentasInsumos: (institucion_id: number, fecha?: string) => Promise<void>
  agregarVentaInsumo: (venta: VentaInsumo) => Promise<VentaInsumo | null>
  anularVentaInsumo: (venta_id: number, motivo: string, usuario?: string) => Promise<boolean>
  reactivarVentaInsumo: (venta_id: number) => Promise<boolean>
  obtenerTotalVentasPorFecha: (institucion_id: number, fecha: string) => Promise<number>
  obtenerTotalVentasPeriodo: (institucion_id: number, fecha_inicio: string, fecha_fin: string) => Promise<number>
}

export const useVentasInsumos = create<UseVentasInsumosStore>((set, get) => ({
  ventas: [],
  loading: false,
  error: null,

  cargarVentasInsumos: async (institucion_id: number, fecha?: string) => {
    set({ loading: true, error: null })
    try {
      let query = supabase
        .from('ventas_insumos')
        .select('*')
        .eq('institucion_id', institucion_id)
        .eq('estado', 'VENDIDO')
        .order('fecha_venta', { ascending: false })

      if (fecha) {
        query = query.eq('fecha_venta', fecha)
      }

      const { data, error } = await query

      if (error) throw error

      set({ ventas: (data || []) as VentaInsumo[] })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar ventas de insumos'
      set({ error: message })
      console.error('Error:', err)
    } finally {
      set({ loading: false })
    }
  },

  agregarVentaInsumo: async (venta: VentaInsumo) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('ventas_insumos')
        .insert([venta])
        .select()
        .single()

      if (error) throw error

      // Recargar ventas
      await get().cargarVentasInsumos(venta.institucion_id)

      return data as VentaInsumo
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al agregar venta'
      set({ error: message })
      console.error('Error:', err)
      return null
    } finally {
      set({ loading: false })
    }
  },

  anularVentaInsumo: async (venta_id: number, motivo: string, usuario: string = 'Sistema') => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('ventas_insumos')
        .update({
          estado: 'ANULADO',
          fecha_anulacion: new Date().toISOString(),
          motivo_anulacion: motivo,
          anulado_por: usuario
        })
        .eq('id', venta_id)
        .eq('estado', 'VENDIDO')

      if (error) throw error

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al anular venta'
      set({ error: message })
      console.error('Error:', err)
      return false
    } finally {
      set({ loading: false })
    }
  },

  reactivarVentaInsumo: async (venta_id: number) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('ventas_insumos')
        .update({
          estado: 'VENDIDO',
          fecha_anulacion: null,
          motivo_anulacion: null,
          anulado_por: null
        })
        .eq('id', venta_id)
        .eq('estado', 'ANULADO')

      if (error) throw error

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al reactivar venta'
      set({ error: message })
      console.error('Error:', err)
      return false
    } finally {
      set({ loading: false })
    }
  },

  obtenerTotalVentasPorFecha: async (institucion_id: number, fecha: string) => {
    try {
      const { data, error } = await supabase
        .from('ventas_insumos')
        .select('subtotal')
        .eq('institucion_id', institucion_id)
        .eq('fecha_venta', fecha)
        .eq('estado', 'VENDIDO')

      if (error) throw error

      return (data || []).reduce((sum, v) => sum + (v.subtotal || 0), 0)
    } catch (err) {
      console.error('Error:', err)
      return 0
    }
  },

  obtenerTotalVentasPeriodo: async (institucion_id: number, fecha_inicio: string, fecha_fin: string) => {
    try {
      const { data, error } = await supabase
        .from('ventas_insumos')
        .select('subtotal')
        .eq('institucion_id', institucion_id)
        .gte('fecha_venta', fecha_inicio)
        .lte('fecha_venta', fecha_fin)
        .eq('estado', 'VENDIDO')

      if (error) throw error

      return (data || []).reduce((sum, v) => sum + (v.subtotal || 0), 0)
    } catch (err) {
      console.error('Error:', err)
      return 0
    }
  }
}))
