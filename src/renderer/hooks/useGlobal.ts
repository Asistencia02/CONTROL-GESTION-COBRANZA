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
      // DEBUG: Obtener lista de tablas
      const { data: tablas } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')

      console.log('📋 TABLAS EN LA BD:', tablas?.map((t: any) => t.table_name))

      const { data: instituciones, error: errInst } = await supabase
        .from('instituciones')
        .select('id, nombre')

      if (errInst) throw errInst

      console.log('🔵 INSTITUCIONES:', instituciones)

      // DEBUG: Obtener primeros registros SIN FILTRO de cada tabla
      const { data: pruebaPageos } = await supabase.from('pagos').select('*').limit(3)
      const { data: pruebaGastos } = await supabase.from('gastos').select('*').limit(3)
      const { data: pruebaCaja } = await supabase.from('caja_grande').select('*').limit(3)
      const { data: pruebaCobranzas } = await supabase.from('cobranzas').select('*').limit(3)

      console.log('🔍 Primeros 3 PAGOS:', pruebaPageos)
      console.log('🔍 Primeros 3 GASTOS:', pruebaGastos)
      console.log('🔍 Primeros 3 CAJA GRANDE:', pruebaCaja)
      console.log('🔍 Primeros 3 COBRANZAS:', pruebaCobranzas)

      const datos: DatosGlobales[] = []

      // Intentar con todas las tablas posibles
      for (const inst of instituciones || []) {
        try {
          let cuotasTotal = 0
          let inscripcionTotal = 0
          let seguroTotal = 0
          let gastosTotal = 0
          let cajaGrandeTotal = 0

          // Intentar COBRANZAS en lugar de PAGOS
          const { data: cobranzasData } = await supabase
            .from('cobranzas')
            .select('*')
            .eq('institucion_id', inst.id)

          if (cobranzasData && cobranzasData.length > 0) {
            console.log(`✅ COBRANZAS inst ${inst.id}: ${cobranzasData.length} registros`)
            const cuotas = cobranzasData.filter(p => p.concepto === 'cuota')
            cuotasTotal = cuotas.reduce((sum, p) => sum + (p.monto || 0), 0)

            const inscripciones = cobranzasData.filter(p => p.concepto === 'inscripción')
            inscripcionTotal = inscripciones.reduce((sum, p) => sum + (p.monto || 0), 0)

            const seguros = cobranzasData.filter(p => p.concepto === 'seguro')
            seguroTotal = seguros.reduce((sum, p) => sum + (p.monto || 0), 0)
          } else {
            console.log(`❌ COBRANZAS inst ${inst.id}: sin datos`)
          }

          // Intentar PAGOS como backup
          const { data: pagosData } = await supabase
            .from('pagos')
            .select('*')
            .eq('institucion_id', inst.id)

          if (pagosData && pagosData.length > 0) {
            console.log(`✅ PAGOS inst ${inst.id}: ${pagosData.length} registros`)
            const cuotas = pagosData.filter(p => p.concepto === 'cuota')
            cuotasTotal = Math.max(cuotasTotal, cuotas.reduce((sum, p) => sum + (p.monto || 0), 0))
          }

          // Gastos
          const { data: gastosData } = await supabase
            .from('gastos')
            .select('*')
            .eq('institucion_id', inst.id)

          if (gastosData && gastosData.length > 0) {
            console.log(`✅ GASTOS inst ${inst.id}: ${gastosData.length} registros`)
            gastosTotal = gastosData.reduce((sum, g) => sum + (g.monto || 0), 0)
          }

          // Caja Grande
          const { data: cajaData } = await supabase
            .from('caja_grande')
            .select('*')
            .eq('institucion_id', inst.id)

          if (cajaData && cajaData.length > 0) {
            console.log(`✅ CAJA GRANDE inst ${inst.id}: ${cajaData.length} registros`)
            cajaGrandeTotal = cajaData.reduce((sum, c) => sum + (c.monto || 0), 0)
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
          console.error(`Error procesando institución ${inst.id}:`, err)
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

      // Obtener TODOS los datos
      let pagosData: any[] = []
      try {
        const { data } = await supabase.from('pagos').select('*')
        pagosData = data || []
      } catch (e) {
        console.error('Error cargando pagos:', e)
      }

      let gastosData: any[] = []
      try {
        const { data } = await supabase.from('gastos').select('*')
        gastosData = data || []
      } catch (e) {
        console.error('Error cargando gastos:', e)
      }

      let cajaData: any[] = []
      try {
        const { data } = await supabase.from('caja_grande').select('*')
        cajaData = data || []
      } catch (e) {
        console.error('Error cargando caja_grande:', e)
      }

      for (let mes = 1; mes <= mesFinLoop; mes++) {
        const nombreMes = new Date(anoActual, mes - 1).toLocaleString('es-ES', { month: 'long' })

        // Filtrar en memoria
        const cuotas = pagosData.filter(p => p.concepto === 'cuota')
        const cuotasTotal = cuotas.reduce((sum, p) => sum + (p.monto || 0), 0)

        const inscripciones = pagosData.filter(p => p.concepto === 'inscripción')
        const inscripcionTotal = inscripciones.reduce((sum, p) => sum + (p.monto || 0), 0)

        const seguros = pagosData.filter(p => p.concepto === 'seguro')
        const seguroTotal = seguros.reduce((sum, p) => sum + (p.monto || 0), 0)

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
