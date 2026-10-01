import { useState, useCallback } from 'react'
import { usePagos } from './usePagos'
import { supabase } from '@renderer/lib/supabase'

export interface DatosGlobales {
  institucion_id: number
  institucion_nombre: string
  cuotas_recaudadas: number
  inscripcion_recaudada: number
  seguro_recaudado: number
  subtotal_cobranza: number
  total_deudas: number
  total_gastos: number
  caja_grande_kiosco: number
  ventas_insumo: number
  subtotal_otros_ingresos: number
  total_ingresos: number
  balance: number
}

export interface DatosGlobalesPorMes {
  mes: number
  mes_nombre: string
  cuotas: number
  inscripcion: number
  seguro: number
  deudas: number
  gastos: number
  kiosco: number
  insumo: number
}

export const useGlobal = () => {
  const [datosGlobales, setDatosGlobales] = useState<DatosGlobales[]>([])
  const [datosPorMesAnual, setDatosPorMesAnual] = useState<DatosGlobalesPorMes[]>([])
  const [datosPorMesActual, setDatosPorMesActual] = useState<DatosGlobalesPorMes[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { pagos: pagosEnMemoria } = usePagos()

  const cargarDatosGlobales = useCallback(async (esAnual: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const { data: instituciones } = await supabase
        .from('instituciones')
        .select('id, nombre')

      console.log('🔵 INSTITUCIONES:', instituciones)
      console.log('📊 PAGOS EN MEMORIA:', pagosEnMemoria.length)

      const datos: DatosGlobales[] = []

      // SI HAY PAGOS EN MEMORIA, USARLOS. SINO, CARGAR DE BD
      let allPagos = pagosEnMemoria.length > 0 ? pagosEnMemoria : []

      if (allPagos.length === 0) {
        console.log('⚠️ Sin pagos en memoria, cargando de BD...')
        for (const inst of instituciones || []) {
          let page = 0
          const pageSize = 1000
          let hasMore = true

          while (hasMore) {
            const { data } = await supabase
              .from('pagos')
              .select(`
                *,
                conceptos_pago(nombre)
              `)
              .eq('institucion_id', inst.id)
              .order('fecha_pago', { ascending: false })
              .range(page * pageSize, (page + 1) * pageSize - 1)

            if (!data || data.length === 0) {
              hasMore = false
            } else {
              allPagos = [...allPagos, ...data]
              if (data.length < pageSize) {
                hasMore = false
              }
              page++
            }
          }
        }
      }

      console.log('✅ PAGOS TOTALES:', allPagos.length)

      for (const inst of instituciones || []) {
        try {
          const pagosPorInst = allPagos.filter(p => p.institucion_id === inst.id)

          console.log(`✅ PAGOS inst ${inst.id}:`, pagosPorInst.length, 'registros')

          let cuotasTotal = 0
          let inscripcionTotal = 0
          let seguroTotal = 0

          pagosPorInst.forEach(p => {
            const concepto = (p as any).conceptos_pago?.nombre || ''
            const monto = p.monto_pagado || 0

            if (concepto.toLowerCase().includes('cuota')) {
              cuotasTotal += monto
            } else if (concepto.toLowerCase().includes('inscripción') || concepto.toLowerCase().includes('inscripcion')) {
              inscripcionTotal += monto
            } else if (concepto.toLowerCase().includes('seguro')) {
              seguroTotal += monto
            }
          })

          let gastosTotal = 0
          try {
            const { data: gastosData } = await supabase
              .from('gastos')
              .select('monto')
              .eq('institucion_id', inst.id)

            console.log(`✅ GASTOS inst ${inst.id}:`, gastosData?.length || 0)
            gastosTotal = (gastosData || []).reduce((sum, g) => sum + (g.monto || 0), 0)
          } catch (e) {
            console.log(`⚠️ GASTOS error inst ${inst.id}`)
          }

          let cajaGrandeTotal = 0
          try {
            const { data: cajaData } = await supabase
              .from('caja_grande')
              .select('monto')
              .eq('institucion_id', inst.id)

            console.log(`✅ CAJA GRANDE inst ${inst.id}:`, cajaData?.length || 0)
            cajaGrandeTotal = (cajaData || []).reduce((sum, c) => sum + (c.monto || 0), 0)
          } catch (e) {
            console.log(`⚠️ CAJA GRANDE error inst ${inst.id}`)
          }

          const subtotalCobranza = cuotasTotal + inscripcionTotal + seguroTotal
          const subtotalOtros = cajaGrandeTotal
          const totalIngresos = subtotalCobranza + subtotalOtros
          const balance = totalIngresos - gastosTotal

          datos.push({
            institucion_id: inst.id,
            institucion_nombre: inst.nombre,
            cuotas_recaudadas: cuotasTotal,
            inscripcion_recaudada: inscripcionTotal,
            seguro_recaudado: seguroTotal,
            subtotal_cobranza: subtotalCobranza,
            total_deudas: 0,
            total_gastos: gastosTotal,
            caja_grande_kiosco: cajaGrandeTotal,
            ventas_insumo: 0,
            subtotal_otros_ingresos: subtotalOtros,
            total_ingresos: totalIngresos,
            balance,
          })
        } catch (err) {
          console.error(`❌ Error inst ${inst.id}:`, err)
        }
      }

      setDatosGlobales(datos)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando datos'
      setError(msg)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [pagosEnMemoria])

  const cargarDatosPorMes = useCallback(async (esAnual: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const meses: DatosGlobalesPorMes[] = []
      const anoActual = new Date().getFullYear()
      const mesActualNum = new Date().getMonth() + 1
      const mesFinLoop = esAnual ? 12 : mesActualNum

      let allPagos = pagosEnMemoria.length > 0 ? pagosEnMemoria : []

      if (allPagos.length === 0) {
        const { data: instituciones } = await supabase
          .from('instituciones')
          .select('id')

        for (const inst of instituciones || []) {
          let page = 0
          const pageSize = 1000
          let hasMore = true

          while (hasMore) {
            const { data } = await supabase
              .from('pagos')
              .select(`
                *,
                conceptos_pago(nombre)
              `)
              .eq('institucion_id', inst.id)
              .order('fecha_pago', { ascending: false })
              .range(page * pageSize, (page + 1) * pageSize - 1)

            if (!data || data.length === 0) {
              hasMore = false
            } else {
              allPagos = [...allPagos, ...data]
              if (data.length < pageSize) {
                hasMore = false
              }
              page++
            }
          }
        }
      }

      let gastosData: any[] = []
      try {
        const { data } = await supabase
          .from('gastos')
          .select('monto, fecha_gasto')
        gastosData = data || []
      } catch (e) {
        console.error('Error gastos:', e)
      }

      let cajaData: any[] = []
      try {
        const { data } = await supabase
          .from('caja_grande')
          .select('monto, fecha_transferencia')
        cajaData = data || []
      } catch (e) {
        console.error('Error caja:', e)
      }

      for (let mes = 1; mes <= mesFinLoop; mes++) {
        const nombreMes = new Date(anoActual, mes - 1).toLocaleString('es-ES', { month: 'long' })
        const mesStr = mes.toString().padStart(2, '0')

        let cuotasTotal = 0
        let inscripcionTotal = 0
        let seguroTotal = 0

        allPagos.forEach(p => {
          const fechaPago = new Date(p.fecha_pago)
          const mesDelPago = (fechaPago.getMonth() + 1).toString().padStart(2, '0')
          const anoDelPago = fechaPago.getFullYear()

          if (anoDelPago === anoActual && mesDelPago === mesStr) {
            const concepto = (p as any).conceptos_pago?.nombre || ''
            const monto = p.monto_pagado || 0

            if (concepto.toLowerCase().includes('cuota')) {
              cuotasTotal += monto
            } else if (concepto.toLowerCase().includes('inscripción') || concepto.toLowerCase().includes('inscripcion')) {
              inscripcionTotal += monto
            } else if (concepto.toLowerCase().includes('seguro')) {
              seguroTotal += monto
            }
          }
        })

        const gastosDelMes = gastosData.filter(g => {
          const fechaGasto = new Date(g.fecha_gasto)
          return fechaGasto.getMonth() + 1 === mes && fechaGasto.getFullYear() === anoActual
        })
        const gastosTotal = gastosDelMes.reduce((sum, g) => sum + (g.monto || 0), 0)

        const cajaDelMes = cajaData.filter(c => {
          const fechaCaja = new Date(c.fecha_transferencia)
          return fechaCaja.getMonth() + 1 === mes && fechaCaja.getFullYear() === anoActual
        })
        const kioscoTotal = cajaDelMes.reduce((sum, c) => sum + (c.monto || 0), 0)

        meses.push({
          mes,
          mes_nombre: nombreMes,
          cuotas: cuotasTotal,
          inscripcion: inscripcionTotal,
          seguro: seguroTotal,
          deudas: 0,
          gastos: gastosTotal,
          kiosco: kioscoTotal,
          insumo: 0,
        })
      }

      if (esAnual) {
        setDatosPorMesAnual(meses)
      } else {
        setDatosPorMesActual(meses)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando datos por mes'
      setError(msg)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [pagosEnMemoria])

  return {
    datosGlobales,
    datosPorMesAnual,
    datosPorMesActual,
    loading,
    error,
    cargarDatosGlobales,
    cargarDatosPorMes,
  }
}
