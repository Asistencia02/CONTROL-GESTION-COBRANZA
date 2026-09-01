import { useEffect, useState } from 'react'
import { supabase } from '@renderer/lib/supabase'

export interface ProductoKiosco {
  id: number
  institucion_id: number
  nombre: string
  descripcion?: string
  precio_unitario: number
  stock_actual: number
  stock_minimo: number
  categoria: string
  activo: boolean
  created_at: string
  updated_at: string
}

export const useProductosKiosco = (institucionId?: number) => {
  const [productos, setProductos] = useState<ProductoKiosco[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarProductos = async (instId?: number) => {
    try {
      setLoading(true)
      setError(null)

      const id = instId || institucionId
      if (!id) throw new Error('ID institución requerido')

      const { data, error: err } = await supabase
        .from('productos_kiosco')
        .select('*')
        .eq('institucion_id', id)
        .eq('activo', true)
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true })

      if (err) throw err
      setProductos(data || [])
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error cargando productos'
      setError(mensaje)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const agregarProducto = async (producto: Omit<ProductoKiosco, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: err } = await supabase
        .from('productos_kiosco')
        .insert([producto])
        .select()
        .single()

      if (err) throw err
      if (data) {
        setProductos([...productos, data])
      }
      return data
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error agregando producto'
      throw new Error(mensaje)
    }
  }

  const actualizarProducto = async (id: number, updates: Partial<ProductoKiosco>) => {
    try {
      const { data, error: err } = await supabase
        .from('productos_kiosco')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (err) throw err
      if (data) {
        setProductos(productos.map(p => p.id === id ? data : p))
      }
      return data
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error actualizando producto'
      throw new Error(mensaje)
    }
  }

  const eliminarProducto = async (id: number) => {
    try {
      const { error: err } = await supabase
        .from('productos_kiosco')
        .update({ activo: false })
        .eq('id', id)

      if (err) throw err
      setProductos(productos.filter(p => p.id !== id))
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error eliminando producto'
      throw new Error(mensaje)
    }
  }

  const actualizarStock = async (id: number, nuevoStock: number) => {
    return actualizarProducto(id, { stock_actual: nuevoStock })
  }

  const totalStockValor = productos.reduce((sum, p) => sum + (p.stock_actual * p.precio_unitario), 0)
  const productosConStockBajo = productos.filter(p => p.stock_actual <= p.stock_minimo)

  useEffect(() => {
    if (institucionId) {
      cargarProductos(institucionId)
    }
  }, [institucionId])

  return {
    productos,
    loading,
    error,
    cargarProductos,
    agregarProducto,
    actualizarProducto,
    eliminarProducto,
    actualizarStock,
    totalStockValor,
    productosConStockBajo,
  }
}
