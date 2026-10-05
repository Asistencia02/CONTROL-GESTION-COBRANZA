import React, { useState, useEffect } from 'react'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { usePagos } from '@renderer/hooks/usePagos'
import { useReporteConceptos } from '@renderer/hooks/useReporteConceptos'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda } from '@renderer/lib/helpers'
import { TrendingUp, RefreshCw } from 'lucide-react'

type VistaGlobal = 'anual' | 'mes-actual'

export interface DatosGlobales {
  institucion_id: number
  institucion_nombre: string
  cuotas_recaudadas: number
  inscripcion_recaudada: number
  seguro_recaudado: number
  total_recaudado: number
  total_deudas: number
  total_gastos: number
  caja_grande: number
  total_ingresos: number
  balance: number
}

export interface DatosGlobalesPorMes {
  mes: number
  mes_nombre: string
  cuotas: number
  inscripcion: number
  seguro: number
  cobranza_total: number
  kiosco: number
  gastos: number
  total_mes: number
}

export const GlobalModerno: React.FC = () => {
  const [vistaActiva, setVistaActiva] = useState<VistaGlobal>('anual')
  const [datosGlobales, setDatosGlobales] = useState<DatosGlobales[]>([])
  const [datosPorMes, setDatosPorMes] = useState<DatosGlobalesPorMes[]>([])
  const [loading, setLoading] = useState(false)

  const cargarDatosGlobales = async () => {
    setLoading(true)
    try {
      const { data: instituciones } = await supabase
        .from('instituciones')
        .select('id, nombre')

      const datos: DatosGlobales[] = []

      for (const inst of instituciones || []) {
        try {
          const today = new Date()
          const mesActual = today.getMonth() + 1
          const anoActual = today.getFullYear()

          // ✅ Cargar conceptos vencidos
          const { data: conceptos } = await supabase
            .from('conceptos_pago')
            .select('id, nombre, tipo, monto, mes, año')
            .eq('institucion_id', inst.id)
            .eq('activo', true)

          const conceptosFiltrados = (conceptos || []).filter(c => {
            if (!c.mes || !c.año) return false
            if (c.año < anoActual) return true
            if (c.año === anoActual && c.mes <= mesActual) return true
            return false
          })

          // ✅ Cargar estudiantes activos
          const { data: estudiantesData } = await supabase
            .from('estudiantes')
            .select('id, estado')
            .eq('institucion_id', inst.id)

          const estudiantesActivos = (estudiantesData || []).filter(e => e.estado !== 'NO_VIENE_MAS')

          // ✅ Cargar TODOS los pagos individuales
          let pagosIndividuales: any[] = []
          let pagina = 0
          let tieneRangoMas = true

          while (tieneRangoMas) {
            const desde = pagina * 1000
            const hasta = desde + 999
            
            const { data: pagosBloques } = await supabase
              .from('pagos')
              .select('concepto_id, monto_pagado, estado')
              .eq('institucion_id', inst.id)
              .neq('estado', 'ANULADO')
              .range(desde, hasta)

            if (!pagosBloques || pagosBloques.length === 0) {
              tieneRangoMas = false
            } else {
              pagosIndividuales = [...pagosIndividuales, ...pagosBloques]
              if (pagosBloques.length < 1000) {
                tieneRangoMas = false
              }
              pagina++
            }
          }

          // ✅ Cargar TODOS los pagos múltiples CON CONCEPTOS
          const { data: pagosMultiDetalle } = await supabase
            .from('pagos_multiples_detalle')
            .select(`
              monto_pagado,
              concepto_id,
              pagos_multiples!inner(institucion_id, estado)
            `)
            .eq('pagos_multiples.institucion_id', inst.id)
            .neq('pagos_multiples.estado', 'ANULADO')

          const pagosMultiples = pagosMultiDetalle || []

          // ✅ TOTAL PAGOS RECIBIDOS (sumar TODOS)
          const totalPagosIndividuales = pagosIndividuales.reduce((sum, p) => sum + (p.monto_pagado || 0), 0)
          const totalPagosMultiples = pagosMultiples.reduce((sum, p) => sum + (p.monto_pagado || 0), 0)
          const totalRecaudado = totalPagosIndividuales + totalPagosMultiples

          // ✅ CLASIFICAR RECAUDOS POR TIPO
          let cuotasRecaudadas = 0
          let inscripcionRecaudada = 0
          let seguroRecaudado = 0

          // Pagos individuales
          pagosIndividuales.forEach(pago => {
            const concepto = conceptos?.find(c => c.id === pago.concepto_id)
            if (concepto) {
              const nombre = concepto.nombre.toLowerCase()
              if (nombre.includes('cuota')) cuotasRecaudadas += pago.monto_pagado || 0
              else if (nombre.includes('inscripción') || nombre.includes('inscripcion')) inscripcionRecaudada += pago.monto_pagado || 0
              else if (nombre.includes('seguro')) seguroRecaudado += pago.monto_pagado || 0
            }
          })

          // Pagos múltiples
          pagosMultiples.forEach(pago => {
            const concepto = conceptos?.find(c => c.id === pago.concepto_id)
            if (concepto) {
              const nombre = concepto.nombre.toLowerCase()
              if (nombre.includes('cuota')) cuotasRecaudadas += pago.monto_pagado || 0
              else if (nombre.includes('inscripción') || nombre.includes('inscripcion')) inscripcionRecaudada += pago.monto_pagado || 0
              else if (nombre.includes('seguro')) seguroRecaudado += pago.monto_pagado || 0
            }
          })

          // ✅ CALCULAR DEUDA: estudiantes SIN PAGO de conceptos vencidos
          const pagosMap = new Map<string, number>()
          
          // Mapear pagos individuales por estudiante-concepto
          pagosIndividuales.forEach(pago => {
            const key = `${pago.concepto_id}`
            const actual = pagosMap.get(key) || 0
            pagosMap.set(key, actual + (pago.monto_pagado || 0))
          })

          // Mapear pagos múltiples por concepto
          pagosMultiples.forEach(pago => {
            const key = `${pago.concepto_id}`
            const actual = pagosMap.get(key) || 0
            pagosMap.set(key, actual + (pago.monto_pagado || 0))
          })

          let totalDeudas = 0
          conceptosFiltrados.forEach(concepto => {
            const montoRequerido = concepto.monto * estudiantesActivos.length
            const montoPagado = pagosMap.get(`${concepto.id}`) || 0
            const deuda = Math.max(0, montoRequerido - montoPagado)
            totalDeudas += deuda
          })

          // ✅ GASTOS
          const { data: gastosData } = await supabase
            .from('gastos')
            .select('monto')
            .eq('institucion_id', inst.id)

          const gastosTotal = (gastosData || []).reduce((sum, g) => sum + (g.monto || 0), 0)

          // ✅ CAJA GRANDE
          const { data: cajaData } = await supabase
            .from('caja_grande')
            .select('monto')
            .eq('institucion_id', inst.id)

          const cajaTotal = (cajaData || []).reduce((sum, c) => sum + (c.monto || 0), 0)

          const totalIngresos = totalRecaudado + cajaTotal
          const balance = totalIngresos - gastosTotal

          console.log(`✅ ${inst.nombre}: Pagos=${totalRecaudado}, Deudas=${totalDeudas}`)

          datos.push({
            institucion_id: inst.id,
            institucion_nombre: inst.nombre,
            cuotas_recaudadas: cuotasRecaudadas,
            inscripcion_recaudada: inscripcionRecaudada,
            seguro_recaudado: seguroRecaudado,
            total_recaudado: totalRecaudado,
            total_deudas: totalDeudas,
            total_gastos: gastosTotal,
            caja_grande: cajaTotal,
            total_ingresos: totalIngresos,
            balance,
          })
        } catch (err) {
          console.error(`Error institución ${inst.id}:`, err)
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

      // Cargar conceptos
      const { data: todosConceptos } = await supabase
        .from('conceptos_pago')
        .select('id, nombre, mes, año')
        .eq('activo', true)

      // Cargar TODOS los pagos de ambas instituciones
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
            .neq('estado', 'ANULADO')
            .range(desde, hasta)

          if (!pagosBloques || pagosBloques.length === 0) {
            tieneRangoMas = false
          } else {
            todosPagos = [...todosPagos, ...pagosBloques]
            if (pagosBloques.length < 1000) {
              tieneRangoMas = false
            }
            pagina++
          }
        }
      }

      // Cargar pagos múltiples
      const { data: pagosMultiDetalle } = await supabase
        .from('pagos_multiples_detalle')
        .select('concepto_id, monto_pagado, pagos_multiples!inner(estado)')
        .neq('pagos_multiples.estado', 'ANULADO')

      if (pagosMultiDetalle) {
        todosPagos = [...todosPagos, ...pagosMultiDetalle]
      }

      // Cargar gastos y caja
      const { data: gastosData } = await supabase
        .from('gastos')
        .select('monto, fecha_gasto')

      const { data: cajaData } = await supabase
        .from('caja_grande')
        .select('monto, fecha_transferencia')

      // Procesar cada mes
      for (let mes = 1; mes <= 12; mes++) {
        const nombreMes = new Date(anoActual, mes - 1).toLocaleString('es-ES', { month: 'long' })

        let cuotasTotal = 0
        let inscripcionTotal = 0
        let seguroTotal = 0

        // Sumar pagos del mes
        todosPagos.forEach(pago => {
          const concepto = todosConceptos?.find(c => c.id === pago.concepto_id)
          if (concepto?.mes === mes && concepto?.año === anoActual) {
            const nombre = concepto.nombre.toLowerCase()
            if (nombre.includes('cuota')) cuotasTotal += pago.monto_pagado || 0
            else if (nombre.includes('inscripción') || nombre.includes('inscripcion')) inscripcionTotal += pago.monto_pagado || 0
            else if (nombre.includes('seguro')) seguroTotal += pago.monto_pagado || 0
          }
        })

        const cobranzaTotal = cuotasTotal + inscripcionTotal + seguroTotal

        // Gastos del mes
        const gastosDelMes = (gastosData || []).filter(g => {
          const fechaGasto = new Date(g.fecha_gasto)
          return fechaGasto.getMonth() + 1 === mes && fechaGasto.getFullYear() === anoActual
        })
        const gastosTotal = gastosDelMes.reduce((sum, g) => sum + (g.monto || 0), 0)

        // Caja del mes
        const cajaDelMes = (cajaData || []).filter(c => {
          const fechaCaja = new Date(c.fecha_transferencia)
          return fechaCaja.getMonth() + 1 === mes && fechaCaja.getFullYear() === anoActual
        })
        const kioscoTotal = cajaDelMes.reduce((sum, c) => sum + (c.monto || 0), 0)

        const totalMes = cobranzaTotal + kioscoTotal - gastosTotal

        meses.push({
          mes,
          mes_nombre: nombreMes,
          cuotas: cuotasTotal,
          inscripcion: inscripcionTotal,
          seguro: seguroTotal,
          cobranza_total: cobranzaTotal,
          kiosco: kioscoTotal,
          gastos: gastosTotal,
          total_mes: totalMes,
        })
      }

      setDatosPorMes(meses)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatosGlobales()
    cargarDatosPorMes()
  }, [])

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
          <p className="text-slate-400 font-semibold">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/50">
              <TrendingUp size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Reporte Global
              </h1>
              <p className="text-slate-400 mt-1">Consolidado de ambas instituciones</p>
            </div>
          </div>
          <button
            onClick={() => {
              cargarDatosGlobales()
              cargarDatosPorMes()
            }}
            disabled={loading}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-purple-400 transition-all"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
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
                <th className="px-4 py-3 text-right text-slate-300 font-bold">TOTAL GLOBAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              <tr className="bg-slate-700/30"><td className="px-4 py-3 font-bold text-white">RECAUDOS</td><td colSpan={datosGlobales.length + 1}></td></tr>
              
              <tr className="hover:bg-slate-700/30">
                <td className="px-4 py-3 font-semibold text-slate-300">Cuotas</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-orange-400 font-semibold">
                    {formatoMoneda(inst.cuotas_recaudadas)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-orange-300 font-bold">
                  {formatoMoneda(datosGlobales.reduce((s, i) => s + i.cuotas_recaudadas, 0))}
                </td>
              </tr>

              <tr className="hover:bg-slate-700/30">
                <td className="px-4 py-3 font-semibold text-slate-300">Inscripción</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-blue-400 font-semibold">
                    {formatoMoneda(inst.inscripcion_recaudada)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-blue-300 font-bold">
                  {formatoMoneda(datosGlobales.reduce((s, i) => s + i.inscripcion_recaudada, 0))}
                </td>
              </tr>

              <tr className="hover:bg-slate-700/30">
                <td className="px-4 py-3 font-semibold text-slate-300">Seguro</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-green-400 font-semibold">
                    {formatoMoneda(inst.seguro_recaudado)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-green-300 font-bold">
                  {formatoMoneda(datosGlobales.reduce((s, i) => s + i.seguro_recaudado, 0))}
                </td>
              </tr>

              <tr className="bg-amber-600/20 border-y border-amber-600/50">
                <td className="px-4 py-3 font-bold text-amber-300">TOTAL RECAUDADO</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-amber-300 font-black text-lg">
                    {formatoMoneda(inst.total_recaudado)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-amber-200 font-black text-lg">
                  {formatoMoneda(datosGlobales.reduce((s, i) => s + i.total_recaudado, 0))}
                </td>
              </tr>

              <tr className="bg-red-600/20 border-y border-red-600/50">
                <td className="px-4 py-3 font-bold text-red-300">DEUDA PENDIENTE</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-red-300 font-black text-lg">
                    {formatoMoneda(inst.total_deudas)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-red-200 font-black text-lg">
                  {formatoMoneda(datosGlobales.reduce((s, i) => s + i.total_deudas, 0))}
                </td>
              </tr>

              <tr className="bg-slate-700/30"><td className="px-4 py-3 font-bold text-white">OTROS INGRESOS</td><td colSpan={datosGlobales.length + 1}></td></tr>

              <tr className="hover:bg-slate-700/30">
                <td className="px-4 py-3 font-semibold text-slate-300">Caja Grande</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-cyan-400 font-semibold">
                    {formatoMoneda(inst.caja_grande)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-cyan-300 font-bold">
                  {formatoMoneda(datosGlobales.reduce((s, i) => s + i.caja_grande, 0))}
                </td>
              </tr>

              <tr className="bg-purple-600/30 border-y border-purple-600/50">
                <td className="px-4 py-3 font-bold text-purple-300">TOTAL INGRESOS</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-purple-300 font-black text-lg">
                    {formatoMoneda(inst.total_ingresos)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-purple-200 font-black text-lg">
                  {formatoMoneda(datosGlobales.reduce((s, i) => s + i.total_ingresos, 0))}
                </td>
              </tr>

              <tr className="bg-slate-700/30"><td className="px-4 py-3 font-bold text-white">EGRESOS</td><td colSpan={datosGlobales.length + 1}></td></tr>

              <tr className="hover:bg-slate-700/30">
                <td className="px-4 py-3 font-semibold text-slate-300">Gastos</td>
                {datosGlobales.map(inst => (
                  <td key={inst.institucion_id} className="px-4 py-3 text-right text-rose-400 font-semibold">
                    {formatoMoneda(inst.total_gastos)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right text-rose-300 font-bold">
                  {formatoMoneda(datosGlobales.reduce((s, i) => s + i.total_gastos, 0))}
                </td>
              </tr>

              <tr className="bg-gradient-to-r from-blue-600/40 to-cyan-600/40 border-y border-blue-500/50">
                <td className="px-4 py-3 font-black text-white text-lg">🎯 BALANCE FINAL</td>
                {datosGlobales.map(inst => (
                  <td
                    key={inst.institucion_id}
                    className={`px-4 py-3 text-right font-black text-lg ${
                      inst.balance >= 0 ? 'text-green-300' : 'text-red-300'
                    }`}
                  >
                    {formatoMoneda(inst.balance)}
                  </td>
                ))}
                <td
                  className={`px-4 py-3 text-right font-black text-xl ${
                    datosGlobales.reduce((s, i) => s + i.balance, 0) >= 0 ? 'text-green-300' : 'text-red-300'
                  }`}
                >
                  {formatoMoneda(datosGlobales.reduce((s, i) => s + i.balance, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA MENSUAL */}
      {datosPorMes.length > 0 && (
        <div className="overflow-x-auto">
          <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-6">Desglose Anual Consolidado</h2>
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-300 font-bold">Mes</th>
                  <th className="px-4 py-3 text-right text-orange-300 font-bold">Cuotas</th>
                  <th className="px-4 py-3 text-right text-blue-300 font-bold">Inscripción</th>
                  <th className="px-4 py-3 text-right text-green-300 font-bold">Seguro</th>
                  <th className="px-4 py-3 text-right text-amber-300 font-bold">Cobranza</th>
                  <th className="px-4 py-3 text-right text-cyan-300 font-bold">Kiosco</th>
                  <th className="px-4 py-3 text-right text-rose-300 font-bold">Gastos</th>
                  <th className="px-4 py-3 text-right text-purple-300 font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {datosPorMes.map((mes, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-semibold text-slate-300 capitalize">{mes.mes_nombre}</td>
                    <td className="px-4 py-3 text-right text-orange-400 font-semibold">{formatoMoneda(mes.cuotas)}</td>
                    <td className="px-4 py-3 text-right text-blue-400 font-semibold">{formatoMoneda(mes.inscripcion)}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatoMoneda(mes.seguro)}</td>
                    <td className="px-4 py-3 text-right text-amber-400 font-semibold">{formatoMoneda(mes.cobranza_total)}</td>
                    <td className="px-4 py-3 text-right text-cyan-400 font-semibold">{formatoMoneda(mes.kiosco)}</td>
                    <td className="px-4 py-3 text-right text-rose-400 font-semibold">{formatoMoneda(mes.gastos)}</td>
                    <td className="px-4 py-3 text-right text-purple-400 font-bold">{formatoMoneda(mes.total_mes)}</td>
                  </tr>
                ))}
                <tr className="bg-gradient-to-r from-slate-700/50 to-slate-700/70 border-t-2 border-slate-600">
                  <td className="px-4 py-3 font-bold text-white text-lg">TOTAL ANUAL</td>
                  <td className="px-4 py-3 text-right text-orange-300 font-black">{formatoMoneda(totalPorConcepto('cuotas'))}</td>
                  <td className="px-4 py-3 text-right text-blue-300 font-black">{formatoMoneda(totalPorConcepto('inscripcion'))}</td>
                  <td className="px-4 py-3 text-right text-green-300 font-black">{formatoMoneda(totalPorConcepto('seguro'))}</td>
                  <td className="px-4 py-3 text-right text-amber-300 font-black">{formatoMoneda(totalPorConcepto('cobranza_total'))}</td>
                  <td className="px-4 py-3 text-right text-cyan-300 font-black">{formatoMoneda(totalPorConcepto('kiosco'))}</td>
                  <td className="px-4 py-3 text-right text-rose-300 font-black">{formatoMoneda(totalPorConcepto('gastos'))}</td>
                  <td className="px-4 py-3 text-right text-purple-300 font-black text-lg">{formatoMoneda(totalPorConcepto('total_mes'))}</td>
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
