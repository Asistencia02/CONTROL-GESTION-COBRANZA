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
      // Obtener instituciones
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

        // Cuotas recaudadas
        const { data: cuotas } = await supabase
          .from('pagos')
          .select('monto')
          .eq('institucion_id', inst.id)
          .eq('concepto', 'cuota')
          .filter('fecha', 'gte', `${anoActual}-${mesInicio.toString().padStart(2, '0')}-01`)
          .filter('fecha', 'lte', `${anoActual}-${mesFinMes.toString().padStart(2, '0')}-${mesFinDia.toString().padStart(2, '0')}`)

        const cuotasTotal = (cuotas || []).reduce((sum, p) => sum + (p.monto || 0), 0)

        // Inscripción recaudada
        const { data: inscripcion } = await supabase
          .from('pagos')
          .select('monto')
          .eq('institucion_id', inst.id)
          .eq('concepto', 'inscripción')
          .filter('fecha', 'gte', `${anoActual}-${mesInicio.toString().padStart(2, '0')}-01`)
          .filter('fecha', 'lte', `${anoActual}-${mesFinMes.toString().padStart(2, '0')}-${mesFinDia.toString().padStart(2, '0')}`)

        const inscripcionTotal = (inscripcion || []).reduce((sum, p) => sum + (p.monto || 0), 0)

        // Seguro recaudado
        const { data: seguro } = await supabase
          .from('pagos')
          .select('monto')
          .eq('institucion_id', inst.id)
          .eq('concepto', 'seguro')
          .filter('fecha', 'gte', `${anoActual}-${mesInicio.toString().padStart(2, '0')}-01`)
          .filter('fecha', 'lte', `${anoActual}-${mesFinMes.toString().padStart(2, '0')}-${mesFinDia.toString().padStart(2, '0')}`)

        const seguroTotal = (seguro || []).reduce((sum, p) => sum + (p.monto || 0), 0)

        // Deudas pendientes
        let deudasTotal = 0
        try {
          const { data: deudas } = await supabase
            .from('deudas_estudiantes')
            .select('monto_adeudado')
            .eq('institucion_id', inst.id)
            .eq('estado', 'activa')

          if (deudas) {
            deudasTotal = (deudas || []).reduce((sum, d) => sum + (d.monto_adeudado || 0), 0)
          }
        } catch (e) {
          // Tabla no existe, ignorar
        }

        // Gastos
        const { data: gastos } = await supabase
          .from('gastos')
          .select('monto')
          .eq('institucion_id', inst.id)
          .filter('fecha', 'gte', `${anoActual}-${mesInicio.toString().padStart(2, '0')}-01`)
          .filter('fecha', 'lte', `${anoActual}-${mesFinMes.toString().padStart(2, '0')}-${mesFinDia.toString().padStart(2, '0')}`)

        const gastosTotal = (gastos || []).reduce((sum, g) => sum + (g.monto || 0), 0)

        // Caja Grande (Kiosco)
        const { data: cajaGrande } = await supabase
          .from('caja_grande')
          .select('monto')
          .eq('institucion_id', inst.id)
          .filter('fecha_transferencia', 'gte', `${anoActual}-${mesInicio.toString().padStart(2, '0')}-01`)
          .filter('fecha_transferencia', 'lte', `${anoActual}-${mesFinMes.toString().padStart(2, '0')}-${mesFinDia.toString().padStart(2, '0')}`)

        const cajaGrandeTotal = (cajaGrande || []).reduce((sum, c) => sum + (c.monto || 0), 0)

        // Ventas Insumo
        let insumosTotal = 0
        try {
          const { data: insumos } = await supabase
            .from('ventas_insumo')
            .select('subtotal')
            .eq('institucion_id', inst.id)
            .filter('fecha_venta', 'gte', `${anoActual}-${mesInicio.toString().padStart(2, '0')}-01`)
            .filter('fecha_venta', 'lte', `${anoActual}-${mesFinMes.toString().padStart(2, '0')}-${mesFinDia.toString().padStart(2, '0')}`)

          if (insumos) {
            insumosTotal = (insumos || []).reduce((sum, i) => sum + (i.subtotal || 0), 0)
          }
        } catch (e) {
          // Tabla no existe, ignorar
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

      for (let mes = 1; mes <= mesFinLoop; mes++) {
        const mesStr = mes.toString().padStart(2, '0')
        const nombreMes = new Date(anoActual, mes - 1).toLocaleString('es-ES', { month: 'long' })
        const ultimoDiaDelMes = new Date(anoActual, mes, 0).getDate()

        // Cuotas
        const { data: cuotas } = await supabase
          .from('pagos')
          .select('monto')
          .eq('concepto', 'cuota')
          .filter('fecha', 'gte', `${anoActual}-${mesStr}-01`)
          .filter('fecha', 'lte', `${anoActual}-${mesStr}-${ultimoDiaDelMes.toString().padStart(2, '0')}`)

        const cuotasTotal = (cuotas || []).reduce((sum, p) => sum + (p.monto || 0), 0)

        // Inscripción
        const { data: inscripcion } = await supabase
          .from('pagos')
          .select('monto')
          .eq('concepto', 'inscripción')
          .filter('fecha', 'gte', `${anoActual}-${mesStr}-01`)
          .filter('fecha', 'lte', `${anoActual}-${mesStr}-${ultimoDiaDelMes.toString().padStart(2, '0')}`)

        const inscripcionTotal = (inscripcion || []).reduce((sum, p) => sum + (p.monto || 0), 0)

        // Seguro
        const { data: seguro } = await supabase
          .from('pagos')
          .select('monto')
          .eq('concepto', 'seguro')
          .filter('fecha', 'gte', `${anoActual}-${mesStr}-01`)
          .filter('fecha', 'lte', `${anoActual}-${mesStr}-${ultimoDiaDelMes.toString().padStart(2, '0')}`)

        const seguroTotal = (seguro || []).reduce((sum, p) => sum + (p.monto || 0), 0)

        // Deudas
        let deudasTotal = 0
        try {
          const { data: deudas } = await supabase
            .from('deudas_estudiantes')
            .select('monto_adeudado')
            .eq('estado', 'activa')

          if (deudas) {
            deudasTotal = (deudas || []).reduce((sum, d) => sum + (d.monto_adeudado || 0), 0)
          }
        } catch (e) {
          // Tabla no existe, ignorar
        }

        // Gastos
        const { data: gastos } = await supabase
          .from('gastos')
          .select('monto')
          .filter('fecha', 'gte', `${anoActual}-${mesStr}-01`)
          .filter('fecha', 'lte', `${anoActual}-${mesStr}-${ultimoDiaDelMes.toString().padStart(2, '0')}`)

        const gastosTotal = (gastos || []).reduce((sum, g) => sum + (g.monto || 0), 0)

        // Kiosco
        const { data: kiosco } = await supabase
          .from('caja_grande')
          .select('monto')
          .filter('fecha_transferencia', 'gte', `${anoActual}-${mesStr}-01`)
          .filter('fecha_transferencia', 'lte', `${anoActual}-${mesStr}-${ultimoDiaDelMes.toString().padStart(2, '0')}`)

        const kioscoTotal = (kiosco || []).reduce((sum, c) => sum + (c.monto || 0), 0)

        // Insumo
        let insumoTotal = 0
        try {
          const { data: insumo } = await supabase
            .from('ventas_insumo')
            .select('subtotal')
            .filter('fecha_venta', 'gte', `${anoActual}-${mesStr}-01`)
            .filter('fecha_venta', 'lte', `${anoActual}-${mesStr}-${ultimoDiaDelMes.toString().padStart(2, '0')}`)

          if (insumo) {
            insumoTotal = (insumo || []).reduce((sum, i) => sum + (i.subtotal || 0), 0)
          }
        } catch (e) {
          // Tabla no existe, ignorar
        }

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
