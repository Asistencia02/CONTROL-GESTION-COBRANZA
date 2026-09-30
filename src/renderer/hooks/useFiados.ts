import { useState, useCallback } from 'react'
import { supabase } from '@renderer/lib/supabase'

export interface Fiado {
  id: number
  institucion_id: number
  nombre: string
  apellido: string
  monto_total_fiado: number
  fecha_inicio: string
  ultima_compra: string
  estado: 'activo' | 'pagado'
  created_at: string
}

export interface DetalleTransaccion {
  id: number
  fiado_id: number
  monto: number
  tipo: 'compra' | 'pago'
  fecha: string
  descripcion: string
}

export const useFiados = (institucionId: number) => {
  const [fiados, setFiados] = useState<Fiado[]>([])
  const [detalles, setDetalles] = useState<DetalleTransaccion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cargarFiados = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('fiados_kiosco')
        .select('*')
        .eq('institucion_id', institucionId)
        .order('ultima_compra', { ascending: false })

      if (err) throw err
      setFiados(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando fiados'
      setError(msg)
      console.error('Error cargarFiados:', err)
    } finally {
      setLoading(false)
    }
  }, [institucionId])

  const cargarDetalles = useCallback(async (fiado_id: number) => {
    try {
      const { data, error: err } = await supabase
        .from('fiados_transacciones')
        .select('*')
        .eq('fiado_id', fiado_id)
        .order('fecha', { ascending: false })

      if (err) throw err
      setDetalles(data || [])
    } catch (err) {
      console.error('Error cargarDetalles:', err)
    }
  }, [])

  const crearFiado = useCallback(async (nombre: string, apellido: string) => {
    try {
      const { data, error: err } = await supabase
        .from('fiados_kiosco')
        .insert({
          institucion_id: institucionId,
          nombre,
          apellido,
          monto_total_fiado: 0,
          fecha_inicio: new Date().toISOString().split('T')[0],
          ultima_compra: new Date().toISOString().split('T')[0],
          estado: 'activo',
        })
        .select()
        .single()

      if (err) throw err
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error creando fiado'
      setError(msg)
      throw err
    }
  }, [institucionId])

  const agregarCompraFiada = useCallback(async (fiado_id: number, monto: number, descripcion: string) => {
    try {
      // Agregar transacción
      const { error: errTx } = await supabase
        .from('fiados_transacciones')
        .insert({
          fiado_id,
          monto,
          tipo: 'compra',
          fecha: new Date().toISOString().split('T')[0],
          descripcion,
        })

      if (errTx) throw errTx

      // Actualizar monto total y fecha última compra
      const { error: errUpdate } = await supabase
        .from('fiados_kiosco')
        .update({
          monto_total_fiado: fiados.find(f => f.id === fiado_id)?.monto_total_fiado || 0 + monto,
          ultima_compra: new Date().toISOString().split('T')[0],
        })
        .eq('id', fiado_id)

      if (errUpdate) throw errUpdate

      await cargarFiados()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error agregando compra'
      setError(msg)
      throw err
    }
  }, [fiados, cargarFiados])

  const pagarFiado = useCallback(async (fiado_id: number, monto: number) => {
    try {
      // Validar que no pague más de lo que debe
      const fiado = fiados.find(f => f.id === fiado_id)
      if (!fiado) throw new Error('Fiado no encontrado')
      if (monto > fiado.monto_total_fiado) {
        throw new Error('El monto no puede ser mayor a lo adeudado')
      }

      // Agregar transacción de pago
      const { error: errTx } = await supabase
        .from('fiados_transacciones')
        .insert({
          fiado_id,
          monto,
          tipo: 'pago',
          fecha: new Date().toISOString().split('T')[0],
          descripcion: `Pago de deuda`,
        })

      if (errTx) throw errTx

      // Actualizar monto total
      const nuevoMonto = Math.max(0, fiado.monto_total_fiado - monto)
      const nuevoEstado = nuevoMonto === 0 ? 'pagado' : 'activo'

      const { error: errUpdate } = await supabase
        .from('fiados_kiosco')
        .update({
          monto_total_fiado: nuevoMonto,
          estado: nuevoEstado,
        })
        .eq('id', fiado_id)

      if (errUpdate) throw errUpdate

      await cargarFiados()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error pagando fiado'
      setError(msg)
      throw err
    }
  }, [fiados, cargarFiados])

  const obtenerOCrearFiado = useCallback(async (nombre: string, apellido: string): Promise<Fiado> => {
    const nombreLower = nombre.toLowerCase().trim()
    const apellidoLower = apellido.toLowerCase().trim()

    // Buscar si ya existe
    const existente = fiados.find(
      f => f.nombre.toLowerCase().trim() === nombreLower && f.apellido.toLowerCase().trim() === apellidoLower
    )

    if (existente) {
      return existente
    }

    // Si no existe, crear
    const nuevoFiado = await crearFiado(nombre, apellido)
    await cargarFiados()
    return nuevoFiado
  }, [fiados, crearFiado, cargarFiados])

  return {
    fiados,
    detalles,
    loading,
    error,
    cargarFiados,
    cargarDetalles,
    crearFiado,
    agregarCompraFiada,
    pagarFiado,
    obtenerOCrearFiado,
  }
}
