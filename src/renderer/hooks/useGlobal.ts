import { useState, useCallback, useEffect } from 'react'
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

  // Usar usePagos para obtener pagos individuales
  const { pagos, cargarPagos } = usePagos()

  const cargarDatosGlobales = useCallback(async (esAnual: boolean, todosPagos: any[], pagosMultiplesDetalle: any[]) => {
    setLoading(true)
    setError(null)
    try {
      const { data: instituciones } = await supabase
        .from('instituciones')
        .select('id, nombre')

      console.log('🔵 INSTITUCIONES:', instituciones)
      console.log('📊 PAGOS INDIVIDUALES:', todosPagos.length)
      console.log('📊 PAGOS MÚLTIPLES DETALLE:', pagosMultiplesDetalle.length)

      const datos: DatosGlobales[] = []

      for (const inst of instituciones || []) {
        try {
          // Pagos individuales
          const pagosPorInst = todosPagos.filter(p => p.institucion_id === inst.id)
          
          // Pagos múltiples para esta institución
          const pagosMultiplesPorInst = pagosMultiplesDetalle.filter(pm => pm.institucion_id === inst.id)

          console.log(`✅ PAGOS INDIVIDUALES inst ${inst.id}:`, pagosPorInst.length)
          console.log(`✅ PAGOS MÚLTIPLES inst ${inst.id}:`, pagosMultiplesPorInst.length)

          let cuotasTotal = 0
          let inscripcionTotal = 0
          let seguroTotal = 0

          // Sumar pagos individuales
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

          // Sumar pagos múltiples
          pagosMultiplesPorInst.forEach(pm => {
            const concepto = (pm as any).conceptos_pago?.nombre || ''
            const monto = pm.monto_pagado || 0

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

            gastosTotal = (gastosData || []).reduce((sum, g) => sum + (g.monto || 0), 0)
          } catch (e) {
            //
          }

          let cajaGrandeTotal = 0
          try {
            const { data: cajaData } = await supabase
              .from('caja_grande')
              .select('monto')
              .eq('institucion_id', inst.id)

            cajaGrandeTotal = (cajaData || []).reduce((sum, c) => sum + (c.monto || 0), 0)
          } catch (e) {
            //
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
          console.error(`Error inst ${inst.id}:`, err)
        }
      }

      setDatosGlobales(datos)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando datos'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  const cargarDatosPorMes = useCallback(async (esAnual: boolean, todosPagos: any[], pagosMultiplesDetalle: any[]) => {
    setLoading(true)
    setError(null)
    try {
      const meses: DatosGlobalesPorMes[] = []
      const anoActual = new Date().getFullYear()
      const mesActualNum = new Date().getMonth() + 1
      const mesFinLoop = esAnual ? 12 : mesActualNum

      let gastosData: any[] = []
      try {
        const { data } = await supabase
          .from('gastos')
          .select('monto, fecha_gasto')
        gastosData = data || []
      } catch (e) {
        //
      }

      let cajaData: any[] = []
      try {
        const { data } = await supabase
          .from('caja_grande')
          .select('monto, fecha_transferencia')
        cajaData = data || []
      } catch (e) {
        //
      }

      // Combinar pagos individuales y múltiples
      const allPagos = [...todosPagos, ...pagosMultiplesDetalle]

      for (let mes = 1; mes <= mesFinLoop; mes++) {
        const nombreMes = new Date(anoActual, mes - 1).toLocaleString('es-ES', { month: 'long' })

        let cuotasTotal = 0
        let inscripcionTotal = 0
        let seguroTotal = 0

        allPagos.forEach(p => {
          const concepto = (p as any).conceptos_pago

          if (concepto?.mes && concepto?.año) {
            if (concepto.año === anoActual && concepto.mes === mes) {
              const nombre = concepto.nombre || ''
              const monto = p.monto_pagado || 0

              if (nombre.toLowerCase().includes('cuota')) {
                cuotasTotal += monto
              } else if (nombre.toLowerCase().includes('inscripción') || nombre.toLowerCase().includes('inscripcion')) {
                inscripcionTotal += monto
              } else if (nombre.toLowerCase().includes('seguro')) {
                seguroTotal += monto
              }
            }
          } else {
            const fechaPago = new Date(p.fecha_pago || p.fecha_pago_multiple)
            if (fechaPago.getMonth() + 1 === mes && fechaPago.getFullYear() === anoActual) {
              const nombre = concepto?.nombre || ''
              const monto = p.monto_pagado || 0

              if (nombre.toLowerCase().includes('cuota')) {
                cuotasTotal += monto
              } else if (nombre.toLowerCase().includes('inscripción') || nombre.toLowerCase().includes('inscripcion')) {
                inscripcionTotal += monto
              } else if (nombre.toLowerCase().includes('seguro')) {
                seguroTotal += monto
              }
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
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar pagos de AMBAS instituciones y pagos múltiples
  useEffect(() => {
    const cargarTodos = async () => {
      try {
        const { data: instituciones } = await supabase
          .from('instituciones')
          .select('id')

        console.log('🔵 Instituciones encontradas:', instituciones?.length)

        // Cargar pagos individuales de cada institución
        for (const inst of instituciones || []) {
          console.log(`📥 Cargando pagos institución ${inst.id}...`)
          await cargarPagos(inst.id)
        }

        // Cargar pagos múltiples de TODAS las instituciones
        console.log('📥 Cargando pagos múltiples...')
        let allPagosMultiples: any[] = []
        const { data: pagosMultiplesData } = await supabase
          .from('pagos_multiples_detalle')
          .select(`
            *,
            pagos_multiples(institucion_id, estado, fecha_pago as fecha_pago_multiple),
            conceptos_pago(nombre, mes, año)
          `)
          .neq('pagos_multiples.estado', 'ANULADO')

        if (pagosMultiplesData) {
          allPagosMultiples = pagosMultiplesData.map(p => ({
            ...p,
            institucion_id: (p as any).pagos_multiples?.institucion_id,
            fecha_pago_multiple: (p as any).pagos_multiples?.fecha_pago,
            estado: (p as any).pagos_multiples?.estado,
          }))
        }

        console.log('✅ Pagos múltiples cargados:', allPagosMultiples.length)

        // Actualizar datos globales
        if (pagos.length > 0 || allPagosMultiples.length > 0) {
          console.log('🔄 Actualizando datos globales...')
          await cargarDatosGlobales(true, pagos, allPagosMultiples)
          await cargarDatosPorMes(true, pagos, allPagosMultiples)
        }
      } catch (err) {
        console.error('Error en useEffect:', err)
      }
    }

    cargarTodos()
  }, [cargarPagos, pagos, cargarDatosGlobales, cargarDatosPorMes])

  return {
    datosGlobales,
    datosPorMesAnual,
    datosPorMesActual,
    loading,
    error,
    cargarDatosGlobales: (esAnual: boolean) => cargarDatosGlobales(esAnual, pagos, []),
    cargarDatosPorMes: (esAnual: boolean) => cargarDatosPorMes(esAnual, pagos, []),
  }
}
