import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useReporteConceptos } from '@renderer/hooks/useReporteConceptos'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda } from '@renderer/lib/helpers'
import { TrendingUp, RefreshCw, AlertCircle } from 'lucide-react'

type VistaGlobal = 'anual' | 'mes-actual'

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
  subtotal_cobranza: number
  deudas: number
  gastos: number
  kiosco: number
  insumo: number
  subtotal_otros: number
  total_mes: number
}

export const GlobalModerno: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { reporteConceptos: reporteConceptosISIP } = useReporteConceptos()
  
  const [vistaActiva, setVistaActiva] = useState<VistaGlobal>('anual')
  const [datosGlobales, setDatosGlobales] = useState<DatosGlobales[]>([])
  const [datosPorMesAnual, setDatosPorMesAnual] = useState<DatosGlobalesPorMes[]>([])
  const [datosPorMesActual, setDatosPorMesActual] = useState<DatosGlobalesPorMes[]>([])
  const [loading, setLoading] = useState(false)

  const cargarDatosGlobales = async () => {
    setLoading(true)
    try {
      const { data: instituciones } = await supabase
        .from('instituciones')
        .select('id, nombre')

      const datos: DatosGlobales[] = []
      const today = new Date()
      const mesActual = today.getMonth() + 1
      const anoActual = today.getFullYear()

      for (const inst of instituciones || []) {
        try {
          // Cargar conceptos CON mes/año definidos (vencidos)
          const { data: conceptos } = await supabase
            .from('conceptos_pago')
            .select('id, nombre, tipo, monto, mes, año')
            .eq('institucion_id', inst.id)
            .eq('activo', true)

          // ✅ FILTRO CORRECTO: Solo conceptos vencidos
          const conceptosFiltrados = (conceptos || []).filter(c => {
            if (!c.mes || !c.año) return false
            if (c.año < anoActual) return true
            if (c.año === anoActual && c.mes <= mesActual) return true
            return false
          })

          // ✅ Separar conceptos sin fecha (no se incluyen en deudas)
          const conceptosSinFecha = (conceptos || []).filter(c => !c.mes || !c.año)

          // Cargar pagos individuales
          let todosPagos: any[] = []
          let pagina = 0
          let tieneRangoMas = true

          while (tieneRangoMas) {
            const desde = pagina * 1000
            const hasta = desde + 999
            
            const { data: pagosBloques } = await supabase
              .from('pagos')
              .select('concepto_id, estudiante_id, monto_pagado, estado, conceptos_pago(nombre)')
              .eq('institucion_id', inst.id)
              .range(desde, hasta)

            if (!pagosBloques || pagosBloques.length === 0) {
              tieneRangoMas = false
            } else {
              const pagosValidos = pagosBloques.filter((p: any) => p.estado !== 'ANULADO')
              todosPagos = [...todosPagos, ...pagosValidos]
              if (pagosBloques.length < 1000) {
                tieneRangoMas = false
              }
              pagina++
            }
          }

          // Cargar pagos múltiples
          const { data: pagosMultiplesData } = await supabase
            .from('pagos_multiples')
            .select(`
              id,
              institucion_id,
              estado,
              pagos_multiples_detalle(
                concepto_id,
                monto_pagado
              )
            `)
            .eq('institucion_id', inst.id)

          if (pagosMultiplesData) {
            pagosMultiplesData.forEach((pm: any) => {
              if (pm.estado !== 'ANULADO' && pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
                pm.pagos_multiples_detalle.forEach((detalle: any) => {
                  todosPagos.push({
                    concepto_id: detalle.concepto_id,
                    estudiante_id: pm.estudiante_id,
                    monto_pagado: detalle.monto_pagado,
                    conceptos_pago: { nombre: '' }
                  })
                })
              }
            })
          }

          // Obtener estudiantes activos
          const { data: estudiantesData } = await supabase
            .from('estudiantes')
            .select('id')
            .eq('institucion_id', inst.id)
            .neq('estado', 'NO_VIENE_MAS')

          const totalEstudiantes = estudiantesData?.length || 0

          // ✅ Calcular recaudos por tipo de concepto
          let cuotasTotal = 0
          let inscripcionTotal = 0
          let seguroTotal = 0

          // Recaudos de conceptos VENCIDOS
          conceptosFiltrados.forEach(concepto => {
            const pagosDelConcepto = todosPagos.filter((p: any) => p.concepto_id === concepto.id)
            pagosDelConcepto.forEach(p => {
              const nombreConcepto = concepto.nombre.toLowerCase()
              if (nombreConcepto.includes('cuota')) {
                cuotasTotal += p.monto_pagado || 0
              } else if (nombreConcepto.includes('inscripción') || nombreConcepto.includes('inscripcion')) {
                inscripcionTotal += p.monto_pagado || 0
              } else if (nombreConcepto.includes('seguro')) {
                seguroTotal += p.monto_pagado || 0
              }
            })
          })

          // Recaudos de conceptos SIN FECHA (flexible)
          conceptosSinFecha.forEach(concepto => {
            const pagosDelConcepto = todosPagos.filter((p: any) => p.concepto_id === concepto.id)
            pagosDelConcepto.forEach(p => {
              const nombreConcepto = concepto.nombre.toLowerCase()
              if (nombreConcepto.includes('cuota')) {
                cuotasTotal += p.monto_pagado || 0
              } else if (nombreConcepto.includes('inscripción') || nombreConcepto.includes('inscripcion')) {
                inscripcionTotal += p.monto_pagado || 0
              } else if (nombreConcepto.includes('seguro')) {
                seguroTotal += p.monto_pagado || 0
              }
            })
          })

          const subtotalCobranza = cuotasTotal + inscripcionTotal + seguroTotal

          // ✅ CÁLCULO CORRECTO DE DEUDAS ACTUALES
          // Solo contar la deuda NO PAGADA de conceptos vencidos
          // Deuda = SUM(monto_concepto * estudiantes_activos - pagos_recibidos) para cada concepto
          let totalDeudas = 0
          const conceptosUnicos = new Map<number, any>()
          
          conceptosFiltrados.forEach(concepto => {
            if (!conceptosUnicos.has(concepto.id)) {
              conceptosUnicos.set(concepto.id, concepto)
            }
          })
          
          conceptosUnicos.forEach((concepto) => {
            const pagosDelConcepto = todosPagos.filter((p: any) => p.concepto_id === concepto.id)
            const montoTotalRequerido = concepto.monto * totalEstudiantes
            const montoTotalPagado = pagosDelConcepto.reduce((sum: number, p: any) => sum + (p.monto_pagado || 0), 0)
            const deudaDelConcepto = Math.max(0, montoTotalRequerido - montoTotalPagado)
            totalDeudas += deudaDelConcepto
          })

          let gastosTotal = 0
          const { data: gastosData } = await supabase
            .from('gastos')
            .select('monto')
            .eq('institucion_id', inst.id)

          gastosTotal = (gastosData || []).reduce((sum, g) => sum + (g.monto || 0), 0)

          let cajaGrandeTotal = 0
          const { data: cajaData } = await supabase
            .from('caja_grande')
            .select('monto')
            .eq('institucion_id', inst.id)

          cajaGrandeTotal = (cajaData || []).reduce((sum, c) => sum + (c.monto || 0), 0)

          const subtotalOtros = cajaGrandeTotal
          const totalIngresos = subtotalCobranza + subtotalOtros
          const balance = totalIngresos - gastosTotal

          console.log(`✅ ${inst.nombre}: Recaudable=${totalRecaudable}, Recaudado=${subtotalCobranza}, Deudas=${totalDeudas}`)

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
          console.error(`Error cargando institución ${inst.id}:`, err)
        }
      }

      setDatosGlobales(datos)
    } finally {
      setLoading(false)
    }
  }

  const cargarDatosPorMes = async () => {
    setLoading(true)
    try {
      const meses: DatosGlobalesPorMes[] = []
      const anoActual = new Date().getFullYear()
      const mesActualNum = new Date().getMonth() + 1
      const mesFinLoop = vistaActiva === 'anual' ? 12 : mesActualNum

      // ✅ Cargar TODOS los conceptos de AMBAS INSTITUCIONES
      const { data: todosConceptos } = await supabase
        .from('conceptos_pago')
        .select('id, institucion_id, nombre, mes, año')
        .eq('activo', true)

      // ✅ Cargar TODOS los pagos de AMBAS INSTITUCIONES
      let todosPagos: any[] = []
      const { data: instituciones } = await supabase
        .from('instituciones')
        .select('id')

      for (const inst of instituciones || []) {
        let pagina = 0
        let tieneRangoMas = true

        while (tieneRangoMas) {
          const desde = pagina * 1000
          const hasta = desde + 999
          
          const { data: pagosBloques } = await supabase
            .from('pagos')
            .select('concepto_id, monto_pagado, estado')
            .eq('institucion_id', inst.id)
            .range(desde, hasta)

          if (!pagosBloques || pagosBloques.length === 0) {
            tieneRangoMas = false
          } else {
            const pagosValidos = pagosBloques.filter((p: any) => p.estado !== 'ANULADO')
            todosPagos = [...todosPagos, ...pagosValidos]
            if (pagosBloques.length < 1000) {
              tieneRangoMas = false
            }
            pagina++
          }
        }
      }

      // ✅ Cargar pagos múltiples
      const { data: pagosMultiplesData } = await supabase
        .from('pagos_multiples')
        .select(`
          estado,
          pagos_multiples_detalle(
            concepto_id,
            monto_pagado
          )
        `)

      if (pagosMultiplesData) {
        pagosMultiplesData.forEach((pm: any) => {
          if (pm.estado !== 'ANULADO' && pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
            pm.pagos_multiples_detalle.forEach((detalle: any) => {
              todosPagos.push({
                concepto_id: detalle.concepto_id,
                monto_pagado: detalle.monto_pagado
              })
            })
          }
        })
      }

      // ✅ Cargar gastos y caja (de AMBAS instituciones)
      let gastosData: any[] = []
      const { data: gastos } = await supabase
        .from('gastos')
        .select('monto, fecha_gasto')
      gastosData = gastos || []

      let cajaData: any[] = []
      const { data: caja } = await supabase
        .from('caja_grande')
        .select('monto, fecha_transferencia')
      cajaData = caja || []

      // ✅ Procesar por mes
      for (let mes = 1; mes <= mesFinLoop; mes++) {
        const nombreMes = new Date(anoActual, mes - 1).toLocaleString('es-ES', { month: 'long' })

        let cuotasTotal = 0
        let inscripcionTotal = 0
        let seguroTotal = 0

        // ✅ Para CADA pago, buscar su concepto y verificar si es del mes
        todosPagos.forEach(pago => {
          const concepto = todosConceptos?.find(c => c.id === pago.concepto_id)
          
          if (concepto) {
            const nombre = concepto.nombre || ''
            const monto = pago.monto_pagado || 0
            
            // ✅ CRITERIO: Si concepto tiene mes/año, agrupar por ese mes
            // Si NO tiene mes/año, agrupar en mes 1 (enero) - SOLO UNA VEZ
            let mesDeferencia = concepto.mes || 1
            let anioDeferencia = concepto.año || anoActual

            if (anioDeferencia === anoActual && mesDeferencia === mes) {
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

        const subtotalCobranza = cuotasTotal + inscripcionTotal + seguroTotal

        // ✅ Gastos del mes
        const gastosDelMes = gastosData.filter(g => {
          const fechaGasto = new Date(g.fecha_gasto)
          return fechaGasto.getMonth() + 1 === mes && fechaGasto.getFullYear() === anoActual
        })
        const gastosTotal = gastosDelMes.reduce((sum, g) => sum + (g.monto || 0), 0)

        // ✅ Caja (Kiosco) del mes
        const cajaDelMes = cajaData.filter(c => {
          const fechaCaja = new Date(c.fecha_transferencia)
          return fechaCaja.getMonth() + 1 === mes && fechaCaja.getFullYear() === anoActual
        })
        const kioscoTotal = cajaDelMes.reduce((sum, c) => sum + (c.monto || 0), 0)

        const subtotalOtros = kioscoTotal
        const totalMes = subtotalCobranza + subtotalOtros - gastosTotal

        meses.push({
          mes,
          mes_nombre: nombreMes,
          cuotas: cuotasTotal,
          inscripcion: inscripcionTotal,
          seguro: seguroTotal,
          subtotal_cobranza: subtotalCobranza,
          deudas: 0,
          gastos: gastosTotal,
          kiosco: kioscoTotal,
          insumo: 0,
          subtotal_otros: subtotalOtros,
          total_mes: totalMes,
        })
      }

      if (vistaActiva === 'anual') {
        setDatosPorMesAnual(meses)
      } else {
        setDatosPorMesActual(meses)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatosGlobales()
    cargarDatosPorMes()
  }, [vistaActiva])

  const datosPorMes = vistaActiva === 'anual' ? datosPorMesAnual : datosPorMesActual

  const totalPorConcepto = (concepto: keyof DatosGlobalesPorMes) => {
    return datosPorMes.reduce((sum, mes) => sum + (mes[concepto] as number || 0), 0)
  }

  if (loading && datosGlobales.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl mb-4 border border-purple-500/50">
            <TrendingUp size={32} className="text-purple-400 animate-spin" />
          </div>
          <p className="text-slate-400 font-semibold">Cargando reporte global...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4 md:p-8">
      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/50">
              <TrendingUp size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Reporte Global
              </h1>
              <p className="text-slate-400 mt-1">Vista consolidada de ambas instituciones</p>
            </div>
          </div>
          <button
            onClick={() => {
              cargarDatosGlobales()
              cargarDatosPorMes()
            }}
            disabled={loading}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-purple-400 transition-all duration-300"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="mb-8">
        <div className="flex gap-2 p-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
          <button
            onClick={() => setVistaActiva('anual')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 ${
              vistaActiva === 'anual'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📅 Anual
          </button>
          <button
            onClick={() => setVistaActiva('mes-actual')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 ${
              vistaActiva === 'mes-actual'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Mes Actual
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL - POR INSTITUCIÓN */}
      <div className="mb-8 overflow-x-auto">
        <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
          <h2 className="text-xl font-bold text-white mb-6">Resumen por Institución</h2>

          <table className="w-full text-sm">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-slate-300 font-bold">Concepto</th>
                {datosGlobales.map(inst => (
                  <th key={inst.institucion_id} className="px-4 py-3 text-right text-slate-300 font-bold">
                    {inst.institucion_nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {/* Cuotas */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300">Cuotas Recaudadas</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-orange-400 font-semibold">
                    {formatoMoneda(inst.cuotas_recaudadas)}
                  </td>
                ))}
              </tr>

              {/* Inscripción */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300">Inscripción Recaudada</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-blue-400 font-semibold">
                    {formatoMoneda(inst.inscripcion_recaudada)}
                  </td>
                ))}
              </tr>

              {/* Seguro */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300">Seguro Recaudado</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-green-400 font-semibold">
                    {formatoMoneda(inst.seguro_recaudado)}
                  </td>
                ))}
              </tr>

              {/* Subtotal Cobranza */}
              <tr className="bg-slate-700/50 hover:bg-slate-700/70 transition border-y border-slate-600/50">
                <td className="px-4 py-3 font-bold text-white">Subtotal Cobranza</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-amber-400 font-black text-lg">
                    {formatoMoneda(inst.subtotal_cobranza)}
                  </td>
                ))}
              </tr>

              {/* Deudas Pendientes */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300">Total Deudas Pendientes</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-red-400 font-semibold">
                    {formatoMoneda(inst.total_deudas)}
                  </td>
                ))}
              </tr>

              {/* Gastos */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300">Total Gastos</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-rose-400 font-semibold">
                    {formatoMoneda(inst.total_gastos)}
                  </td>
                ))}
              </tr>

              {/* Otros Ingresos */}
              <tr className="bg-slate-700/30 hover:bg-slate-700/50 transition border-y border-slate-600/50">
                <td className="px-4 py-3 font-bold text-slate-200">Otros Ingresos:</td>
                <td></td>
              </tr>

              {/* Caja Grande Kiosco */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300 pl-8">├─ Caja Grande (Kiosco)</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-cyan-400 font-semibold">
                    {formatoMoneda(inst.caja_grande_kiosco)}
                  </td>
                ))}
              </tr>

              {/* Ventas Insumo */}
              <tr className="hover:bg-slate-700/30 transition">
                <td className="px-4 py-3 font-semibold text-slate-300 pl-8">└─ Ventas Insumo</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-cyan-400 font-semibold">
                    {formatoMoneda(inst.ventas_insumo)}
                  </td>
                ))}
              </tr>

              {/* Subtotal Otros Ingresos */}
              <tr className="bg-slate-700/50 hover:bg-slate-700/70 transition border-y border-slate-600/50">
                <td className="px-4 py-3 font-bold text-white">Subtotal Otros Ingresos</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-cyan-300 font-black text-lg">
                    {formatoMoneda(inst.subtotal_otros_ingresos)}
                  </td>
                ))}
              </tr>

              {/* Total Ingresos */}
              <tr className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/40 hover:to-pink-600/40 transition border-y border-purple-500/50">
                <td className="px-4 py-3 font-bold text-white">TOTAL INGRESOS</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-purple-300 font-black text-xl">
                    {formatoMoneda(inst.total_ingresos)}
                  </td>
                ))}
              </tr>

              {/* Balance Final */}
              <tr className="bg-gradient-to-r from-green-600/30 to-emerald-600/30 hover:from-green-600/40 hover:to-emerald-600/40 transition border-y border-green-500/50">
                <td className="px-4 py-3 font-black text-white">💰 BALANCE FINAL</td>
                {datosGlobales.map(inst => (
                  <td
                    key={inst.institucion_id}
                    className={`px-4 py-3 text-right font-black text-xl ${
                      inst.balance >= 0 ? 'text-green-300' : 'text-red-300'
                    }`}
                  >
                    {formatoMoneda(inst.balance)}
                  </td>
                ))}
              </tr>

              {/* BALANCE GLOBAL (SUMA DE AMBAS) */}
              <tr className="bg-gradient-to-r from-blue-600/40 to-cyan-600/40 border-y border-blue-500/50">
                <td className="px-4 py-3 font-black text-white text-lg">🌍 BALANCE GLOBAL TOTAL</td>
                <td
                  colSpan={datosGlobales.length}
                  className={`px-4 py-3 text-right font-black text-2xl ${
                    datosGlobales.reduce((sum, inst) => sum + inst.balance, 0) >= 0 ? 'text-cyan-300' : 'text-red-300'
                  }`}
                >
                  {formatoMoneda(datosGlobales.reduce((sum, inst) => sum + inst.balance, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA DETALLADA POR MES - CONSOLIDADA */}
      {datosPorMes.length > 0 && (
        <div className="overflow-x-auto mb-8">
          <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-6">
              Desglose {vistaActiva === 'anual' ? 'Anual' : 'Mes Actual'} - Consolidado (Ambas Instituciones)
            </h2>

            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-300 font-bold">Mes</th>
                  <th className="px-4 py-3 text-right text-orange-300 font-bold">Cuotas</th>
                  <th className="px-4 py-3 text-right text-blue-300 font-bold">Inscrip.</th>
                  <th className="px-4 py-3 text-right text-green-300 font-bold">Seguro</th>
                  <th className="px-4 py-3 text-right text-amber-300 font-bold">Subtotal Cobranza</th>
                  <th className="px-4 py-3 text-right text-cyan-300 font-bold">Kiosco</th>
                  <th className="px-4 py-3 text-right text-rose-300 font-bold">Gastos</th>
                  <th className="px-4 py-3 text-right text-purple-300 font-bold">Total Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {datosPorMes.map((mes, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 font-semibold text-slate-300 capitalize">{mes.mes_nombre}</td>
                    <td className="px-4 py-3 text-right text-orange-400 font-semibold">{formatoMoneda(mes.cuotas)}</td>
                    <td className="px-4 py-3 text-right text-blue-400 font-semibold">{formatoMoneda(mes.inscripcion)}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatoMoneda(mes.seguro)}</td>
                    <td className="px-4 py-3 text-right text-amber-400 font-semibold">{formatoMoneda(mes.subtotal_cobranza)}</td>
                    <td className="px-4 py-3 text-right text-cyan-400 font-semibold">{formatoMoneda(mes.kiosco)}</td>
                    <td className="px-4 py-3 text-right text-rose-400 font-semibold">{formatoMoneda(mes.gastos)}</td>
                    <td className="px-4 py-3 text-right text-purple-400 font-bold">{formatoMoneda(mes.total_mes)}</td>
                  </tr>
                ))}
                {/* Fila de totales */}
                <tr className="bg-gradient-to-r from-slate-700/50 to-slate-700/70 border-t-2 border-slate-600">
                  <td className="px-4 py-3 font-bold text-white text-lg">TOTAL</td>
                  <td className="px-4 py-3 text-right text-orange-300 font-black text-lg">{formatoMoneda(totalPorConcepto('cuotas'))}</td>
                  <td className="px-4 py-3 text-right text-blue-300 font-black text-lg">{formatoMoneda(totalPorConcepto('inscripcion'))}</td>
                  <td className="px-4 py-3 text-right text-green-300 font-black text-lg">{formatoMoneda(totalPorConcepto('seguro'))}</td>
                  <td className="px-4 py-3 text-right text-amber-300 font-black text-lg">{formatoMoneda(totalPorConcepto('subtotal_cobranza'))}</td>
                  <td className="px-4 py-3 text-right text-cyan-300 font-black text-lg">{formatoMoneda(totalPorConcepto('kiosco'))}</td>
                  <td className="px-4 py-3 text-right text-rose-300 font-black text-lg">{formatoMoneda(totalPorConcepto('gastos'))}</td>
                  <td className="px-4 py-3 text-right text-purple-300 font-black text-xl">{formatoMoneda(totalPorConcepto('total_mes'))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default GlobalModerno
