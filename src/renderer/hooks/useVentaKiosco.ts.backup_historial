import { useEffect, useState } from 'react'
import { supabase } from '@renderer/lib/supabase'

export interface VentaKiosco {
  id: number
  institucion_id: number
  producto: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  metodo_pago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'CHEQUE'
  monto_entregado?: number
  cambio?: number
  caja_chica_id?: number
  fecha_venta: string
  created_at: string
}

export interface CajaChica {
  id: number
  institucion_id: number
  fecha_apertura: string
  fecha_cierre?: string
  saldo_inicial: number
  saldo_final?: number
  saldo_residual: number
  monto_transferido?: number
  estado: 'ABIERTA' | 'CERRADA'
  created_at: string
}

export const useVentaKiosco = (institucionId?: number) => {
  const [ventasKiosco, setVentasKiosco] = useState<VentaKiosco[]>([])
  const [cajaChica, setCajaChica] = useState<CajaChica | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarVentasKiosco = async (instId?: number) => {
    try {
      setLoading(true)
      setError(null)

      const id = instId || institucionId
      if (!id) throw new Error('ID institución requerido')

      const { data, error: err } = await supabase
        .from('venta_kiosco')
        .select('*')
        .eq('institucion_id', id)
        .order('fecha_venta', { ascending: false })

      if (err) throw err
      setVentasKiosco(data || [])
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error cargando ventas kiosco'
      setError(mensaje)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const cargarCajaChicaActiva = async (instId?: number) => {
    try {
      const id = instId || institucionId
      if (!id) throw new Error('ID institución requerido')

      const hoy = new Date().toISOString().split('T')[0]

      const { data, error: err } = await supabase
        .from('caja_chica')
        .select('*')
        .eq('institucion_id', id)
        .eq('fecha_apertura', hoy)
        .eq('estado', 'ABIERTA')
        .single()

      if (err && err.code !== 'PGRST116') throw err
      setCajaChica(data || null)
    } catch (err) {
      console.error('Error cargando caja chica:', err)
      setCajaChica(null)
    }
  }

  const abrirCajaChica = async (instId: number, saldo_inicial: number) => {
    try {
      const hoy = new Date().toISOString().split('T')[0]
      const { data, error: err } = await supabase
        .from('caja_chica')
        .insert([{
          institucion_id: instId,
          fecha_apertura: hoy,
          saldo_inicial,
          saldo_residual: saldo_inicial,
          estado: 'ABIERTA'
        }])
        .select()
        .single()

      if (err) throw err
      setCajaChica(data)
      return data
    } catch (err) {
      throw new Error('Error abriendo caja: ' + err)
    }
  }

  const cerrarCajaChica = async (cajaId: number, saldo_final: number, saldo_minimo: number) => {
    try {
      const monto_transferido = Math.max(0, saldo_final - saldo_minimo)
      const hoy = new Date().toISOString().split('T')[0]

      const { data, error: err } = await supabase
        .from('caja_chica')
        .update({
          fecha_cierre: hoy,
          saldo_final,
          saldo_residual: saldo_minimo,
          monto_transferido,
          estado: 'CERRADA'
        })
        .eq('id', cajaId)
        .select()
        .single()

      if (err) throw err
      setCajaChica(null)
      
      // Crear transferencia a caja grande si hay monto
      if (monto_transferido > 0) {
        await supabase
          .from('caja_grande')
          .insert([{
            institucion_id: cajaChica?.institucion_id,
            fecha_transferencia: hoy,
            monto: monto_transferido,
            origen_caja_chica_id: cajaId,
            estado: 'COMPLETADA'
          }])
      }

      return data
    } catch (err) {
      throw new Error('Error cerrando caja: ' + err)
    }
  }

  const agregarVentaKiosco = async (venta: Omit<VentaKiosco, 'id' | 'created_at'>) => {
    try {
      const { data, error: err } = await supabase
        .from('venta_kiosco')
        .insert([venta])
        .select()
        .single()

      if (err) throw err
      if (data) {
        setVentasKiosco([data, ...ventasKiosco])
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error agregando venta'
      throw new Error(mensaje)
    }
  }

  const totalVentasKiosco = ventasKiosco.reduce((sum, v) => sum + v.subtotal, 0)
  const totalEfectivo = ventasKiosco
    .filter(v => v.metodo_pago === 'EFECTIVO')
    .reduce((sum, v) => sum + v.subtotal, 0)

  useEffect(() => {
    if (institucionId) {
      cargarVentasKiosco(institucionId)
      cargarCajaChicaActiva(institucionId)
    }
  }, [institucionId])

  return {
    ventasKiosco,
    cajaChica,
    loading,
    error,
    cargarVentasKiosco,
    cargarCajaChicaActiva,
    abrirCajaChica,
    cerrarCajaChica,
    agregarVentaKiosco,
    totalVentasKiosco,
    totalEfectivo,
  }
}
