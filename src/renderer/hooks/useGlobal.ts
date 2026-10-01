import { useState, useCallback } from 'react'
import { usePagos } from './usePagos'
import { useInstitucion } from './useInstitucion'
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

  const { pagos: pagosCargados } = usePagos()
  const { institucionActiva } = useInstitucion()

  const cargarDatosGlobales = useCallback(async (esAnual: boolean) => {
    setLoading(true)
    setError(null)
    try {
      // Obtener instituciones
      const { data: instituciones } = await supabase
        .from('instituciones')
        .select('id, nombre')

      console.log('🔵 INSTITUCIONES:', instituciones)
      console.log('📊 PAGOS EN MEMORIA (usePagos):', pagosCargados.length)

      const datos: DatosGlobales[] = []

      for (const inst of instituciones || []) {
        try {
          // Usar pagos ya cargados en memoria
          const pagosPorInst = pagosCargados.filter(p => p.institucion_id === inst.id)

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

          // GASTOS - usa fecha_gasto, no fecha
          let gastosTotal = 0
          try {
            const { data: gastosData } = await supabase
              .from('gastos')
              .select('monto')
              .eq('institucion_id', inst.id)

            console.log(`✅ GASTOS inst ${inst.id}:`, gastosData?.length || 0, 'registros')
            gastosTotal = (gastosData || []).reduce((sum, g) => sum + (g.monto || 0), 0)
          } catch (e) {
            console.log(`⚠️ GASTOS no disponible para inst ${inst.id}`)
          }

          // CAJA GRANDE
          let cajaGrandeTotal = 0
          try {
            const { data: cajaData } = await supabase
              .from('caja_grande')
              .select('monto')
              .eq('institucion_id', inst.id)

            console.log(`✅ CAJA GRANDE inst ${inst.id}:`, cajaData?.length || 0, 'registros')
            cajaGrandeTotal = (cajaData || []).reduce((sum, c) => sum + (c.monto || 0), 0)
          } catch (e) {
            console.log(`⚠️ CAJA GRANDE no disponible para inst ${inst.id}`)
          }

          console.log(`💰 INST ${inst.id}: cuotas=${cuotasTotal}, inscripcion=${inscripcionTotal}, seguro=${seguroTotal}, gastos=${gastosTotal}, caja=${cajaGrandeTotal}`)

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
          console.error(`❌ Error procesando institución ${inst.id}:`, err)
        }
      }

      console.log('✅ DATOS GLOBALES FINAL:', datos)
      setDatosGlobales(datos)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando datos'
      setError(msg)
      console.error('Error cargarDatosGlobales:', err)
    } finally {
      setLoading(false)
    }
  }, [pagosCargados])

  const cargarDatosPorMes = useCallback(async (esAnual: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const meses: DatosGlobalesPorMes[] = []
      const anoActual = new Date().getFullYear()
      const mesActualNum = new Date().getMonth() + 1
      const mesFinLoop = esAnual ? 12 : mesActualNum

      // Usar pagos cargados en memoria
      console.log('📊 PAGOS PARA POR MES:', pagosCargados.length)

      let gastosData: any[] = []
      try {
        const { data } = await supabase
          .from('gastos')
          .select('monto, fecha_gasto')
        gastosData = data || []
        console.log('📊 GASTOS TOTAL:', gastosData.length)
      } catch (e) {
        console.error('Error cargando gastos:', e)
      }

      let cajaData: any[] = []
      try {
        const { data } = await supabase
          .from('caja_grande')
          .select('monto, fecha_transferencia')
        cajaData = data || []
        console.log('📊 CAJA TOTAL:', cajaData.length)
      } catch (e) {
        console.error('Error cargando caja_grande:', e)
      }

      for (let mes = 1; mes <= mesFinLoop; mes++) {
        const nombreMes = new Date(anoActual, mes - 1).toLocaleString('es-ES', { month: 'long' })
        const mesStr = mes.toString().padStart(2, '0')

        let cuotasTotal = 0
        let inscripcionTotal = 0
        let seguroTotal = 0

        // Filtrar pagos por mes
        pagosCargados.forEach(p => {
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

        // Filtrar gastos por mes - usa fecha_gasto
        const gastosDelMes = gastosData.filter(g => {
          const fechaGasto = new Date(g.fecha_gasto)
          return fechaGasto.getMonth() + 1 === mes && fechaGasto.getFullYear() === anoActual
        })
        const gastosTotal = gastosDelMes.reduce((sum, g) => sum + (g.monto || 0), 0)

        // Filtrar caja por mes - usa fecha_transferencia
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
      console.error('Error cargarDatosPorMes:', err)
    } finally {
      setLoading(false)
    }
  }, [pagosCargados])

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
