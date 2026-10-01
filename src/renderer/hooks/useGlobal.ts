import { useState, useCallback } from 'react'
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

  const cargarDatosGlobales = useCallback(async (esAnual: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const { data: instituciones } = await supabase
        .from('instituciones')
        .select('id, nombre')

      console.log('🔵 INSTITUCIONES:', instituciones)

      const datos: DatosGlobales[] = []

      for (const inst of instituciones || []) {
        try {
          // 1. PAGOS - usa monto_pagado
          const { data: pagosData } = await supabase
            .from('pagos')
            .select('monto_pagado, concepto_id, conceptos_pago(nombre, tipo)')
            .eq('institucion_id', inst.id)

          console.log(`✅ PAGOS inst ${inst.id}:`, pagosData?.length || 0, 'registros')

          let cuotasTotal = 0
          let inscripcionTotal = 0
          let seguroTotal = 0

          pagosData?.forEach(p => {
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

          // 2. GASTOS (si la tabla existe)
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

          // 3. CAJA GRANDE / KIOSCO (si la tabla existe)
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
  }, [])

  const cargarDatosPorMes = useCallback(async (esAnual: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const meses: DatosGlobalesPorMes[] = []
      const anoActual = new Date().getFullYear()
      const mesActualNum = new Date().getMonth() + 1
      const mesFinLoop = esAnual ? 12 : mesActualNum

      // Obtener TODOS los pagos sin filtro
      let pagosData: any[] = []
      try {
        const { data } = await supabase
          .from('pagos')
          .select('monto_pagado, concepto_id, fecha_pago, conceptos_pago(nombre)')
        pagosData = data || []
        console.log('📊 PAGOS TOTAL:', pagosData.length)
      } catch (e) {
        console.error('Error cargando pagos:', e)
      }

      let gastosData: any[] = []
      try {
        const { data } = await supabase
          .from('gastos')
          .select('monto, fecha')
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

        let cuotasTotal = 0
        let inscripcionTotal = 0
        let seguroTotal = 0

        pagosData.forEach(p => {
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

        const gastosTotal = gastosData.reduce((sum, g) => sum + (g.monto || 0), 0)
        const kioscoTotal = cajaData.reduce((sum, c) => sum + (c.monto || 0), 0)

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
  }, [])

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
