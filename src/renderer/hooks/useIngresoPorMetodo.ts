import { useEffect, useState } from 'react'
import { supabase } from '@renderer/lib/supabase'

export interface MetodoPago {
  metodo_pago: string
  total: number
  porcentaje: number
}

export const useIngresoPorMetodo = (institucionId: number) => {
  const [ingresosPorMetodo, setIngresosPorMetodo] = useState<MetodoPago[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarIngresos = async () => {
    try {
      setLoading(true)
      setError(null)

      const metodosMap: Record<string, number> = {
        EFECTIVO: 0,
        TRANSFERENCIA: 0,
        'TARJETA_CRÉDITO': 0,
        'TARJETA_DÉBITO': 0
      }

      let pagina = 0
      let tieneRangoMas = true

      // Cargar datos de pagos_multiples_detalle con metodo_pago (SIN FILTRO DE FECHA)
      while (tieneRangoMas) {
        const desde = pagina * 1000
        const hasta = desde + 999

        const { data, error: err } = await supabase
          .from('pagos_multiples_detalle')
          .select(`
            monto_pagado,
            metodo_pago,
            pagos_multiples!inner(
              institucion_id,
              estado
            )
          `)
          .eq('pagos_multiples.institucion_id', institucionId)
          .neq('pagos_multiples.estado', 'ANULADO')
          .range(desde, hasta)

        if (err) throw err

        if (!data || data.length === 0) {
          tieneRangoMas = false
        } else {
          data.forEach((item: any) => {
            let metodo = item.metodo_pago || 'EFECTIVO'
            const monto = item.monto_pagado || 0

            // Normalizar método de pago
            if (metodo === 'TARJETA_CRÉDITO' || metodo === 'TARJETA CREDITO' || metodo === 'TARJETA_CREDITO') {
              metodo = 'TARJETA_CRÉDITO'
            } else if (metodo === 'TARJETA_DÉBITO' || metodo === 'TARJETA DEBITO' || metodo === 'TARJETA_DEBITO') {
              metodo = 'TARJETA_DÉBITO'
            }

            metodosMap[metodo] = (metodosMap[metodo] || 0) + monto
          })
          pagina++
        }
      }

      const total = Object.values(metodosMap).reduce((sum, val) => sum + val, 0)

      // Convertir a array con porcentajes
      const resultado: MetodoPago[] = Object.entries(metodosMap)
        .map(([metodo, monto]) => ({
          metodo_pago: metodo,
          total: monto,
          porcentaje: total > 0 ? (monto / total) * 100 : 0
        }))
        .filter(m => m.total > 0) // Solo mostrar métodos con monto > 0

      setIngresosPorMetodo(resultado)
      console.log('[INGRESOS POR METODO]', resultado)
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido'
      setError(mensaje)
      console.error('[ERROR INGRESOS POR METODO]', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (institucionId) {
      cargarIngresos()
    }
  }, [institucionId])

  return { ingresosPorMetodo, loading, error, refrescar: cargarIngresos }
}
