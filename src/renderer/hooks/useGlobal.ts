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
      const { data: instituciones, error: errInst } = await supabase
        .from('instituciones')
        .select('id, nombre')

      if (errInst) throw errInst

      const datos: DatosGlobales[] = []

      for (const inst of instituciones || []) {
        try {
          // Obtener pagos
          const { data: pagosData } = await supabase
            .from('pagos')
            .select('*')
            .eq('institucion_id', inst.id)

          const cuotas = (pagosData || []).filter(p => p.concepto === 'cuota')
          const cuotasTotal = cuotas.reduce((sum, p) => sum + (p.monto || 0), 0)

          const inscripciones = (pagosData || []).filter(p => p.concepto === 'inscripción')
          const inscripcionTotal = inscripciones.reduce((sum, p) => sum + (p.monto || 0), 0)

          const seguros = (pagosData || []).filter(p => p.concepto === 'seguro')
          const seguroTotal = seguros.reduce((sum, p) => sum + (p.monto || 0), 0)

          // Gastos
          const { data: gastosData } = await supabase
            .from('gastos')
            .select('*')
            .eq('institucion_id', inst.id)

          const gastosTotal = (gastosData || []).reduce((sum, g) => sum + (g.monto || 0), 0)

          // Caja Grande
          const { data: cajaData } = await supabase
            .from('caja_grande')
            .select('*')
            .eq('institucion_id', inst.id)

          const cajaGrandeTotal = (cajaData || []).reduce((sum, c) => sum + (c.monto || 0), 0)

          // Insumos
          let insumosTotal = 0
          try {
            const { data: insumosData } = await supabase
              .from('ventas_insumo')
              .select('*')
              .eq('institucion_id', inst.id)

            insumosTotal = (insumosData || []).reduce((sum, i) => sum + (i.subtotal || 0), 0)
          } catch (e) {
            // Tabla no existe
          }

          // Deudas
          let deudasTotal = 0
          try {
            const { data: deudas } = await supabase
              .from('deudas_estudiantes')
              .select('*')
              .eq('institucion_id', inst.id)
              .eq('estado', 'activa')

            if (deudas) {
              deudasTotal = deudas.reduce((sum, d) => sum + (d.monto_adeudado || 0), 0)
            }
          } catch (e) {
            // Tabla no existe
          }

          const subtotalCobranza = cuotasTotal + inscripcionTotal + seguroTotal
          const subtotalOtros = cajaGrandeTotal + insumosTotal
          const totalIngresos = subtotalCobranza + subtotalOtros
          const balance = totalIngresos - gastosTotal

          datos.push({
            institucion_id: inst.id,
            institucion_nombre: inst.nombre,
            cuotas_recaudadas: cuotasTotal,
            inscripcion_recaudada: inscripcionTotal,
            seguro_recaudado: seguroTotal,
            subtotal_cobranza: subtotalCobranza,
            total_deudas: deudasTotal,
            total_gastos: gastosTotal,
            caja_grande_kiosco: cajaGrandeTotal,
            ventas_insumo: insumosTotal,
            subtotal_otros_ingresos: subtotalOtros,
            total_ingresos: totalIngresos,
            balance,
          })
        } catch (err) {
          console.error(`Error procesando institución ${inst.id}:`, err)
        }
      }

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
        const { data } = await supabase
          .from('pagos')
          .select('*')
        pagosData = data || []
      } catch (e) {
        console.error('Error cargando pagos:', e)
      }

      let gastosData: any[] = []
      try {
        const { data } = await supabase
          .from('gastos')
          .select('*')
        gastosData = data || []
      } catch (e) {
        console.error('Error cargando gastos:', e)
      }

      let cajaData: any[] = []
      try {
        const { data } = await supabase
          .from('caja_grande')
          .select('*')
        cajaData = data || []
      } catch (e) {
        console.error('Error cargando caja_grande:', e)
      }

      let insumosData: any[] = []
      try {
        const { data } = await supabase
          .from('ventas_insumo')
          .select('*')
        insumosData = data || []
      } catch (e) {
        console.error('Error cargando ventas_insumo:', e)
      }

      let deudasData: any[] = []
      try {
        const { data } = await supabase
          .from('deudas_estudiantes')
          .select('*')
          .eq('estado', 'activa')
        deudasData = data || []
      } catch (e) {
        console.error('Error cargando deudas:', e)
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
        const insumoTotal = insumosData.reduce((sum, i) => sum + (i.subtotal || 0), 0)
        const deudasTotal = deudasData.reduce((sum, d) => sum + (d.monto_adeudado || 0), 0)

        meses.push({
          mes,
          mes_nombre: nombreMes,
          cuotas: cuotasTotal,
          inscripcion: inscripcionTotal,
          seguro: seguroTotal,
          deudas: deudasTotal,
          gastos: gastosTotal,
          kiosco: kioscoTotal,
          insumo: insumoTotal,
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
