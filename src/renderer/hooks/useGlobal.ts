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
      const anoActual = new Date().getFullYear()
      const mesActual = new Date().getMonth() + 1

      for (const inst of instituciones || []) {
        const mesInicio = esAnual ? 1 : 1
        const mesFinMes = esAnual ? 12 : mesActual
        const mesFinDia = new Date(anoActual, mesFinMes, 0).getDate()
        const fechaInicio = `${anoActual}-${mesInicio.toString().padStart(2, '0')}-01`
        const fechaFin = `${anoActual}-${mesFinMes.toString().padStart(2, '0')}-${mesFinDia.toString().padStart(2, '0')}`

        // Cuotas
        const { data: pagosData } = await supabase
          .from('pagos')
          .select('monto, concepto, fecha')
          .eq('institucion_id', inst.id)

        const cuotas = pagosData?.filter(p => p.concepto === 'cuota' && p.fecha >= fechaInicio && p.fecha <= fechaFin) || []
        const cuotasTotal = cuotas.reduce((sum, p) => sum + (p.monto || 0), 0)

        const inscripciones = pagosData?.filter(p => p.concepto === 'inscripción' && p.fecha >= fechaInicio && p.fecha <= fechaFin) || []
        const inscripcionTotal = inscripciones.reduce((sum, p) => sum + (p.monto || 0), 0)

        const seguros = pagosData?.filter(p => p.concepto === 'seguro' && p.fecha >= fechaInicio && p.fecha <= fechaFin) || []
        const seguroTotal = seguros.reduce((sum, p) => sum + (p.monto || 0), 0)

        // Deudas
        let deudasTotal = 0
        try {
          const { data: deudas } = await supabase
            .from('deudas_estudiantes')
            .select('monto_adeudado')
            .eq('institucion_id', inst.id)
            .eq('estado', 'activa')

          if (deudas) {
            deudasTotal = deudas.reduce((sum, d) => sum + (d.monto_adeudado || 0), 0)
          }
        } catch (e) {
          // Tabla no existe
        }

        // Gastos
        const { data: gastosData } = await supabase
          .from('gastos')
          .select('monto, fecha')
          .eq('institucion_id', inst.id)

        const gastos = gastosData?.filter(g => g.fecha >= fechaInicio && g.fecha <= fechaFin) || []
        const gastosTotal = gastos.reduce((sum, g) => sum + (g.monto || 0), 0)

        // Caja Grande
        const { data: cajaData } = await supabase
          .from('caja_grande')
          .select('monto, fecha_transferencia')
          .eq('institucion_id', inst.id)

        const cajaGrande = cajaData?.filter(c => c.fecha_transferencia >= fechaInicio && c.fecha_transferencia <= fechaFin) || []
        const cajaGrandeTotal = cajaGrande.reduce((sum, c) => sum + (c.monto || 0), 0)

        // Insumos
        let insumosTotal = 0
        try {
          const { data: insumosData } = await supabase
            .from('ventas_insumo')
            .select('subtotal, fecha_venta')
            .eq('institucion_id', inst.id)

          const insumos = insumosData?.filter(i => i.fecha_venta >= fechaInicio && i.fecha_venta <= fechaFin) || []
          insumosTotal = insumos.reduce((sum, i) => sum + (i.subtotal || 0), 0)
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

      // Obtener TODOS los datos sin filtro de fecha
      const { data: pagosData } = await supabase
        .from('pagos')
        .select('monto, concepto, fecha')

      const { data: gastosData } = await supabase
        .from('gastos')
        .select('monto, fecha')

      const { data: cajaData } = await supabase
        .from('caja_grande')
        .select('monto, fecha_transferencia')

      let insumosData: any[] = []
      try {
        const { data: insumosRaw } = await supabase
          .from('ventas_insumo')
          .select('subtotal, fecha_venta')
        insumosData = insumosRaw || []
      } catch (e) {
        // Tabla no existe
      }

      let deudasData: any[] = []
      try {
        const { data: deudasRaw } = await supabase
          .from('deudas_estudiantes')
          .select('monto_adeudado')
          .eq('estado', 'activa')
        deudasData = deudasRaw || []
      } catch (e) {
        // Tabla no existe
      }

      for (let mes = 1; mes <= mesFinLoop; mes++) {
        const mesStr = mes.toString().padStart(2, '0')
        const nombreMes = new Date(anoActual, mes - 1).toLocaleString('es-ES', { month: 'long' })
        const ultimoDiaDelMes = new Date(anoActual, mes, 0).getDate()
        const fechaInicio = `${anoActual}-${mesStr}-01`
        const fechaFin = `${anoActual}-${mesStr}-${ultimoDiaDelMes.toString().padStart(2, '0')}`

        // Filtrar en memoria
        const cuotas = pagosData?.filter(p => p.concepto === 'cuota' && p.fecha >= fechaInicio && p.fecha <= fechaFin) || []
        const cuotasTotal = cuotas.reduce((sum, p) => sum + (p.monto || 0), 0)

        const inscripciones = pagosData?.filter(p => p.concepto === 'inscripción' && p.fecha >= fechaInicio && p.fecha <= fechaFin) || []
        const inscripcionTotal = inscripciones.reduce((sum, p) => sum + (p.monto || 0), 0)

        const seguros = pagosData?.filter(p => p.concepto === 'seguro' && p.fecha >= fechaInicio && p.fecha <= fechaFin) || []
        const seguroTotal = seguros.reduce((sum, p) => sum + (p.monto || 0), 0)

        const gastos = gastosData?.filter(g => g.fecha >= fechaInicio && g.fecha <= fechaFin) || []
        const gastosTotal = gastos.reduce((sum, g) => sum + (g.monto || 0), 0)

        const kiosco = cajaData?.filter(c => c.fecha_transferencia >= fechaInicio && c.fecha_transferencia <= fechaFin) || []
        const kioscoTotal = kiosco.reduce((sum, c) => sum + (c.monto || 0), 0)

        const insumos = insumosData.filter(i => i.fecha_venta >= fechaInicio && i.fecha_venta <= fechaFin) || []
        const insumoTotal = insumos.reduce((sum, i) => sum + (i.subtotal || 0), 0)

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
