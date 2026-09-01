import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabase'
import { Insumo } from '@renderer/lib/database.types'

interface UseInsumosStore {
  insumos: Insumo[]
  loading: boolean
  error: string | null
  
  cargarInsumos: (institucion_id: number) => Promise<void>
  agregarInsumo: (insumo: any) => Promise<void>
  actualizarInsumo: (id: number, updates: Partial<Insumo>) => Promise<void>
  decrementarStock: (id: number, cantidad: number) => Promise<void>
  incrementarStock: (id: number, cantidad: number) => Promise<void>
  eliminarInsumo: (id: number) => Promise<void>
  obtenerPorCategoria: (categoria: string) => Insumo[]
  obtenerBajoStock: () => Insumo[]
}

export const useInsumos = create<UseInsumosStore>((set, get) => ({
  insumos: [],
  loading: false,
  error: null,

  cargarInsumos: async (institucion_id: number) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('insumos')
        .select('*')
        .eq('institucion_id', institucion_id)
        .eq('activo', true)
        .order('categoria', { ascending: true })

      if (error) throw error
      set({ insumos: data as Insumo[] })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar insumos'
      set({ error: message })
      console.error('Error loading insumos:', err)
    } finally {
      set({ loading: false })
    }
  },

  agregarInsumo: async (insumo) => {
    set({ loading: true, error: null })
    try {
      console.log('📝 Agregando insumo:', insumo)

      // Validar campos requeridos
      if (!insumo.institucion_id) {
        throw new Error('institucion_id es requerido')
      }
      if (!insumo.nombre?.trim()) {
        throw new Error('Nombre es requerido')
      }
      if (!insumo.codigo_sku?.trim()) {
        throw new Error('Código SKU es requerido')
      }
      if (typeof insumo.precio_unitario !== 'number' || insumo.precio_unitario <= 0) {
        throw new Error('Precio unitario debe ser un número mayor a 0')
      }
      if (typeof insumo.cantidad_stock !== 'number' || insumo.cantidad_stock < 0) {
        throw new Error('Cantidad stock debe ser un número no negativo')
      }
      if (typeof insumo.cantidad_minima !== 'number' || insumo.cantidad_minima < 0) {
        throw new Error('Cantidad mínima debe ser un número no negativo')
      }

      // Preparar datos con valores por defecto y validación estricta
      const datosInsumo = {
        institucion_id: Number(insumo.institucion_id),
        nombre: String(insumo.nombre).trim(),
        codigo_sku: String(insumo.codigo_sku).trim(),
        categoria: insumo.categoria ? String(insumo.categoria).trim() : null,
        descripcion: insumo.descripcion ? String(insumo.descripcion).trim() : null,
        precio_unitario: Number(insumo.precio_unitario),
        cantidad_stock: Number(insumo.cantidad_stock),
        cantidad_minima: Number(insumo.cantidad_minima),
        activo: true,
      }

      console.log('✅ Datos validados:', datosInsumo)

      // Usar Supabase client
      const { data, error } = await supabase
        .from('insumos')
        .insert([datosInsumo])
        .select()
        .single()

      if (error) {
        console.error('❌ Error Supabase:', error)
        throw new Error(`Error al insertar: ${error.message}`)
      }

      console.log('✅ Insumo insertado:', data)

      set(state => ({
        insumos: [...state.insumos, data as Insumo]
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al agregar insumo'
      console.error('❌ Error en agregarInsumo:', message, err)
      set({ error: message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  actualizarInsumo: async (id: number, updates) => {
    set({ loading: true, error: null })
    try {
      const { error: updateError } = await supabase
        .from('insumos')
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError

      const { data, error: fetchError } = await supabase
        .from('insumos')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      set(state => ({
        insumos: state.insumos.map(i => 
          i.id === id ? (data as Insumo) : i
        )
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar insumo'
      set({ error: message })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  decrementarStock: async (id: number, cantidad: number) => {
    if (cantidad <= 0) throw new Error('Cantidad debe ser mayor a 0')
    const insumo = get().insumos.find(i => i.id === id)
    if (!insumo) throw new Error('Insumo no encontrado')
    
    const nuevoStock = insumo.cantidad_stock - cantidad
    if (nuevoStock < 0) throw new Error('Stock insuficiente')
    
    await get().actualizarInsumo(id, { cantidad_stock: nuevoStock })
  },

  incrementarStock: async (id: number, cantidad: number) => {
    if (cantidad <= 0) throw new Error('Cantidad debe ser mayor a 0')
    const insumo = get().insumos.find(i => i.id === id)
    if (!insumo) throw new Error('Insumo no encontrado')
    
    const nuevoStock = insumo.cantidad_stock + cantidad
    await get().actualizarInsumo(id, { cantidad_stock: nuevoStock })
  },

  eliminarInsumo: async (id: number) => {
    // Soft delete
    await get().actualizarInsumo(id, { activo: false })
  },

  obtenerPorCategoria: (categoria: string) => {
    return get().insumos.filter(i => i.categoria === categoria)
  },

  obtenerBajoStock: () => {
    return get().insumos.filter(i => i.cantidad_stock < i.cantidad_minima)
  }
}))
