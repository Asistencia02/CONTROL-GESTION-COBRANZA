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

  const { pagos, acumularPagos } = usePagos()

  const cargarDatosGlobales = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: instituciones } = await supabase
        .from('instituciones')
        .select('id, nombre')

      console.log('🔵 INSTITUCIONES:', instituciones)
      console.log('📊 PAGOS EN MEMORIA:', pagos.length)

      const datos: DatosGlobales[] = []
      let balanceGlobalTotal = 0

      for (const inst of instituciones || []) {
        try {
          // Filtrar pagos de esta institución desde memoria
          const pagosPorInst = pagos.filter(p => p.institucion_id === inst.id)

          console.log(`✅ PAGOS inst ${inst.id}:`, pagosPorInst.length)

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

          // Cargar conceptos vencidos para calcular deudas
          let totalDeudas = 0
          try {
            const { data: conceptos } = await supabase
              .from('conceptos_pago')
              .select('*')
              .eq('institucion_id', inst.id)
              .eq('activo', true)

            const anoActual = new Date().getFullYear()
            const mesActual = new Date().getMonth() + 1

            // Para cada concepto vencido, contar estudiantes y calcular deuda
            if (conceptos && conceptos.length > 0) {
              const { data: estudiantes } = await supabase
                .from('estudiantes')
                .select('id')
                .eq('institucion_id', inst.id)
                .neq('estado', 'NO_VIENE_MAS')

              const estudiantesActivos = estudiantes?.length || 0
              const pagosSet = new Set(pagosPorInst.map(p => `${p.estudiante_id}-${p.concepto_id}`))

              conceptos.forEach(concepto => {
                // Solo contar si tiene mes/año definido
                if (concepto.mes && concepto.año) {
                  if (
                    concepto.año < anoActual ||
                    (concepto.año === anoActual && concepto.mes <= mesActual)
                  ) {
                    // Deuda = estudiantes activos que no pagaron * monto concepto
                    for (let estId = 1; estId <= estudiantesActivos; estId++) {
                      if (!pagosSet.has(`${estId}-${concepto.id}`)) {
                        totalDeudas += concepto.monto
                      }
                    }
                  }
                }
              })
            }
          } catch (e) {
            console.error(`Error calculando deudas inst ${inst.id}:`, e)
          }

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

          balanceGlobalTotal += balance

          datos.push({
            institucion_id: inst.id,
            institucion_nombre: inst.nombre,
            cuotas_recaudadas: cuotasTotal,
            inscripcion_recaudada: inscripcionTotal,
            seguro_recaudado: seguroTotal,
            subtotal_cobranza: subtotalCobranza,
            total_deudas: totalDeudas,
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
  }, [pagos])

  const cargarDatosPorMes = useCallback(async (esAnual: boolean) => {
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

      console.log('📊 Calculando desglose por mes (anual:', esAnual, ', meses:', mesFinLoop, ')')
      console.log('📊 Pagos disponibles:', pagos.length)

      // Generar SOLO los meses necesarios
      for (let mes = 1; mes <= mesFinLoop; mes++) {
        const nombreMes = new Date(anoActual, mes - 1).toLocaleString('es-ES', { month: 'long' })

        let cuotasTotal = 0
        let inscripcionTotal = 0
        let seguroTotal = 0

        // Filtrar pagos por mes del concepto
        pagos.forEach(p => {
          const concepto = (p as any).conceptos_pago

          if (concepto?.mes && concepto?.año) {
            if (concepto.año === anoActual && concepto.mes === mes) {
              const nombre = concepto.nombre || ''
              const monto = p.monto_pagado || 0

              console.log(`📌 Pago: ${nombre} (mes concepto: ${concepto.mes}), monto: ${monto}`)

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

        console.log(`✅ Mes ${mes} (${nombreMes}): cuotas=${cuotasTotal}, inscrip=${inscripcionTotal}, seguro=${seguroTotal}`)

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

      console.log(`📊 Desglose guardado (esAnual=${esAnual}):`, meses.length, 'meses')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cargando datos por mes'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [pagos])

  // Cargar pagos de AMBAS instituciones al montar
  useEffect(() => {
    const cargarTodosPagos = async () => {
      const { data: instituciones } = await supabase
        .from('instituciones')
        .select('id')

      // Acumular pagos de cada institución
      for (const inst of instituciones || []) {
        console.log(`📥 Acumulando pagos institución ${inst.id}...`)
        await acumularPagos(inst.id)
      }
    }

    cargarTodosPagos()
  }, [acumularPagos])

  // Cuando cambien los pagos, actualizar datos globales
  useEffect(() => {
    if (pagos.length > 0) {
      console.log('🔄 Actualizando datos globales con', pagos.length, 'pagos')
      cargarDatosGlobales()
      cargarDatosPorMes(true)  // Siempre cargar anual
      cargarDatosPorMes(false) // Y mes actual
    }
  }, [pagos, cargarDatosGlobales, cargarDatosPorMes])

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
