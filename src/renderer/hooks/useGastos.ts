import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabase'
import { Gasto } from '@renderer/lib/database.types'

interface UseGastosStore {
  gastos: Gasto[]
  loading: boolean
  error: string | null
  
  cargarGastos: (institucion_id: number, filtro?: { categoria?: string; mes?: number; año?: number }) => Promise<void>
  agregarGasto: (gasto: Omit<Gasto, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  actualizarGasto: (id: number, updates: Partial<Gasto>) => Promise<void>
  eliminarGasto: (id: number) => Promise<void>
  totalPorCategoria: () => Record<string, number>
  totalMes: (mes: number, año: number) => number
  resumenMensual: (institucion_id: number, año: number) => Promise<any>
}

/**
 * WORKAROUND: Insert directo sin que Supabase genere ?columns=
 */
const insertGastoDirecto = async (data: any) => {
  try {
    const response = await fetch(
      `${supabase.supabaseUrl}/rest/v1/gastos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabase.supabaseKey,
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify([data]),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Error al insertar')
    }

    const resultado = await response.json()
    return { data: resultado, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

export const useGastos = create<UseGastosStore>((set, get) => ({
  gastos: [],
  loading: false,
  error: null,

  cargarGastos: async (institucion_id: number, filtro) => {
    set({ loading: true, error: null })
    try {
      let query = supabase
        .from('gastos')
        .select('*')
        .eq('institucion_id', institucion_id)

      if (filtro?.categoria) {
        query = query.eq('categoria', filtro.categoria)
      }

      const { data, error } = await query.order('fecha_gasto', { ascending: false })

      if (error) throw error
      
      let gastosFiltrados = data as Gasto[]
      
      if (filtro?.mes && filtro?.año) {
        gastosFiltrados = gastosFiltrados.filter(g => {
          const fecha = new Date(g.fecha_gasto)
          return fecha.getMonth() + 1 === filtro.mes && fecha.getFullYear() === filtro.año
        })
      }

      set({ gastos: gastosFiltrados })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar gastos'
      set({ error: message })
      console.error('Error loading gastos:', err)
    } finally {
      set({ loading: false })
    }
  },

  agregarGasto: async (gasto) => {
    set({ loading: true, error: null })
    try {
      // ✅ Usar fetch directo
      const { data: insertedData, error: insertError } = await insertGastoDirecto(gasto)

      if (insertError) throw insertError

      set(state => ({
        gastos: [...state.gastos, insertedData[0] as Gasto]
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al agregar gasto'
      set({ error: message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  actualizarGasto: async (id: number, updates) => {
    set({ loading: true, error: null })
    try {
      const { error: updateError } = await supabase
        .from('gastos')
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError

      const { data, error: fetchError } = await supabase
        .from('gastos')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      set(state => ({
        gastos: state.gastos.map(g => 
          g.id === id ? (data as Gasto) : g
        )
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar gasto'
      set({ error: message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  eliminarGasto: async (id: number) => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase
        .from('gastos')
        .delete()
        .eq('id', id)

      if (error) throw error
      set(state => ({
        gastos: state.gastos.filter(g => g.id !== id)
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar gasto'
      set({ error: message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  totalPorCategoria: () => {
    const totales: Record<string, number> = {}
    get().gastos.forEach(g => {
      totales[g.categoria] = (totales[g.categoria] || 0) + g.monto
    })
    return totales
  },

  totalMes: (mes: number, año: number) => {
    return get().gastos
      .filter(g => {
        const fecha = new Date(g.fecha_gasto)
        return fecha.getMonth() + 1 === mes && fecha.getFullYear() === año
      })
      .reduce((sum, g) => sum + g.monto, 0)
  },

  resumenMensual: async (institucion_id: number, año: number) => {
    try {
      const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .eq('institucion_id', institucion_id)
        .gte('fecha_gasto', `${año}-01-01`)
        .lte('fecha_gasto', `${año}-12-31`)

      if (error) throw error

      const resumen: Record<number, Record<string, number>> = {}

      ;(data as Gasto[]).forEach(g => {
        const fecha = new Date(g.fecha_gasto)
        const mes = fecha.getMonth() + 1

        if (!resumen[mes]) {
          resumen[mes] = {}
        }

        resumen[mes][g.categoria] = (resumen[mes][g.categoria] || 0) + g.monto
      })

      return resumen
    } catch (err) {
      console.error('Error calculating resumen mensual:', err)
      return {}
    }
  }
}))
