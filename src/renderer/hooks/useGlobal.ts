import { useState, useCallback, useEffect } from 'react'
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
  const [todosPagos, setTodosPagos] = useState<any[]>([])

  const cargarDatosGlobales = useCallback(async (esAnual: boolean, pagos: any[]) => {
    setLoading(true)
    setError(null)
    try {
      const { data: instituciones } = await supabase
        .from('instituciones')
        .select('id, nombre')

      console.log('🔵 INSTITUCIONES:', instituciones)
      console.log('📊 PAGOS TOTALES:', pagos.length)

      const datos: DatosGlobales[] = []

      for (const inst of instituciones || []) {
        try {
          const pagosPorInst = pagos.filter(p => p.institucion_id === inst.id)

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

  const cargarDatosPorMes = useCallback(async (esAnual: boolean, pagos: any[]) => {
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

      for (let mes = 1; mes <= mesFinLoop; mes++) {
        const nombreMes = new Date(anoActual, mes - 1).toLocaleString('es-ES', { month: 'long' })

        let cuotasTotal = 0
        let inscripcionTotal = 0
        let seguroTotal = 0

        pagos.forEach(p => {
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
            const fechaPago = new Date(p.fecha_pago)
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

  // Cargar pagos de AMBAS instituciones
  useEffect(() => {
    const cargarTodosPagos = async () => {
      const { data: instituciones } = await supabase
        .from('instituciones')
        .select('id')

      let allPagos: any[] = []

      for (const inst of instituciones || []) {
        let page = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
          const { data } = await supabase
            .from('pagos')
            .select(`
              *,
              conceptos_pago(nombre, mes, año)
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

      console.log('✅ TODOS LOS PAGOS ACUMULADOS:', allPagos.length)
      setTodosPagos(allPagos)

      // Cargar datos después de obtener pagos
      await cargarDatosGlobales(true, allPagos)
      await cargarDatosPorMes(true, allPagos)
    }

    cargarTodosPagos()
  }, [cargarDatosGlobales, cargarDatosPorMes])

  return {
    datosGlobales,
    datosPorMesAnual,
    datosPorMesActual,
    loading,
    error,
    cargarDatosGlobales: (esAnual: boolean) => cargarDatosGlobales(esAnual, todosPagos),
    cargarDatosPorMes: (esAnual: boolean) => cargarDatosPorMes(esAnual, todosPagos),
  }
}
