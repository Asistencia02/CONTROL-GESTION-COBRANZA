import { useEffect, useState } from 'react'
import { supabase } from '@renderer/lib/supabase'

export interface IngresosPorMetodo {
  EFECTIVO: number
  TRANSFERENCIA: number
  TARJETA_CREDITO: number
  TARJETA_DEBITO: number
  TOTAL: number
}

export const useIngresoPorMetodo = (institucionId: number) => {
  const [ingresos, setIngresos] = useState<IngresosPorMetodo>({
    EFECTIVO: 0,
    TRANSFERENCIA: 0,
    TARJETA_CREDITO: 0,
    TARJETA_DEBITO: 0,
    TOTAL: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarIngresos = async () => {
    try {
      setLoading(true)
      setError(null)

      const metodosMap: Record<string, number> = {
        EFECTIVO: 0,
        TRANSFERENCIA: 0,
        TARJETA_CREDITO: 0,
        TARJETA_DEBITO: 0
      }

      let pagina = 0
      let tieneRangoMas = true

      // Cargar datos de pagos_multiples_detalle con metodo_pago
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
            const metodo = item.metodo_pago || 'EFECTIVO'
            const monto = item.monto_pagado || 0

            // Normalizar método de pago
            if (metodo === 'TARJETA_CRÉDITO' || metodo === 'TARJETA CREDITO') {
              metodosMap['TARJETA_CREDITO'] += monto
            } else if (metodo === 'TARJETA_DÉBITO' || metodo === 'TARJETA DEBITO') {
              metodosMap['TARJETA_DEBITO'] += monto
            } else {
              metodosMap[metodo] = (metodosMap[metodo] || 0) + monto
            }
          })
          pagina++
        }
      }

      const total = Object.values(metodosMap).reduce((sum, val) => sum + val, 0)

      setIngresos({
        EFECTIVO: metodosMap.EFECTIVO,
        TRANSFERENCIA: metodosMap.TRANSFERENCIA,
        TARJETA_CREDITO: metodosMap.TARJETA_CREDITO,
        TARJETA_DEBITO: metodosMap.TARJETA_DEBITO,
        TOTAL: total
      })

      console.log('[INGRESOS POR METODO]', metodosMap)
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

  return { ingresos, loading, error, refrescar: cargarIngresos }
}
