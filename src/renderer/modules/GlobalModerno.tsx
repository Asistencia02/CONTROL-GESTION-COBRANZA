import React, { useState, useEffect } from 'react'
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

// ✅ Función idéntica a la que usa ReportesModerno
const cargarDatosInstitucion = async (institucionId: number): Promise<{
  cuotas: number
  inscripcion: number
  seguro: number
  total_recaudado: number
  total_deudas: number
  total_gastos: number
  caja_grande: number
}> => {
  const today = new Date()
  const mesActual = today.getMonth() + 1
  const anoActual = today.getFullYear()

  // ✅ 1. Cargar conceptos vencidos
  const { data: conceptos } = await supabase
    .from('conceptos_pago')
    .select('*')
    .eq('institucion_id', institucionId)
    .eq('activo', true)

  // ✅ 2. Cargar estudiantes activos
  const { data: estudiantes } = await supabase
    .from('estudiantes')
    .select('id, estado')
    .eq('institucion_id', institucionId)

  const estudiantesActivos = (estudiantes || []).filter(e => e.estado !== 'NO_VIENE_MAS')

  // ✅ 3. Cargar PAGOS INDIVIDUALES
  const { data: pagosData } = await supabase
    .from('pagos')
    .select('*')
    .eq('institucion_id', institucionId)
    .neq('estado', 'ANULADO')

  const pagosIndividuales = pagosData || []

  // ✅ 4. Cargar PAGOS MÚLTIPLES (incluyendo detalles)
  const { data: pagosMultiples } = await supabase
    .from('pagos_multiples')
    .select(`
      *,
      pagos_multiples_detalle(*)
    `)
    .eq('institucion_id', institucionId)
    .neq('estado', 'ANULADO')

  // Expandir pagos múltiples a formato de pagos individuales
  const pagosMultiplesExpandidos: any[] = []
  pagosMultiples?.forEach(pm => {
    if (pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
      pm.pagos_multiples_detalle.forEach((detalle: any) => {
        pagosMultiplesExpandidos.push({
          concepto_id: detalle.concepto_id,
          monto_pagado: detalle.monto_pagado,
          estudiante_id: pm.estudiante_id,
        })
      })
    }
  })

  // ✅ TOTAL PAGOS = individuales + múltiples
  const todosPagos = [...pagosIndividuales, ...pagosMultiplesExpandidos]
  const totalPagosRecibidos = todosPagos.reduce((sum, p) => sum + (p.monto_pagado || 0), 0)

  // ✅ 5. CLASIFICAR RECAUDOS POR TIPO
  let cuotasRecaudadas = 0
  let inscripcionRecaudada = 0
  let seguroRecaudado = 0

  todosPagos.forEach(pago => {
    const concepto = conceptos?.find(c => c.id === pago.concepto_id)
    if (concepto) {
      const nombre = concepto.nombre.toLowerCase()
      if (nombre.includes('cuota')) {
        cuotasRecaudadas += pago.monto_pagado || 0
      } else if (nombre.includes('inscripción') || nombre.includes('inscripcion')) {
        inscripcionRecaudada += pago.monto_pagado || 0
      } else if (nombre.includes('seguro')) {
        seguroRecaudado += pago.monto_pagado || 0
      }
    }
  })

  // ✅ 6. CALCULAR DEUDA: (Monto total requerido) - (Pagos recibidos)
  let totalDeudaVencida = 0
  
  const conceptosUnicos = new Map<number, any>()
  conceptos?.forEach(c => {
    let debeIncluir = false
    if (c.mes && c.año) {
      if (c.año < anoActual) {
        debeIncluir = true
      } else if (c.año === anoActual && c.mes <= mesActual) {
        debeIncluir = true
      }
    }
    if (debeIncluir && !conceptosUnicos.has(c.id)) {
      conceptosUnicos.set(c.id, c)
    }
  })

  conceptosUnicos.forEach(concepto => {
    const montoTotalRequerido = concepto.monto * estudiantesActivos.length
    const pagosDelConcepto = todosPagos
      .filter(p => p.concepto_id === concepto.id)
      .reduce((sum, p) => sum + (p.monto_pagado || 0), 0)
    const deuda = Math.max(0, montoTotalRequerido - pagosDelConcepto)
    totalDeudaVencida += deuda
  })

  // ✅ 7. GASTOS
  const { data: gastosData } = await supabase
    .from('gastos')
    .select('monto')
    .eq('institucion_id', institucionId)

  const gastosTotal = (gastosData || []).reduce((sum, g) => sum + (g.monto || 0), 0)

  // ✅ 8. CAJA GRANDE
  const { data: cajaData } = await supabase
    .from('caja_grande')
    .select('monto')
    .eq('institucion_id', institucionId)

  const cajaTotal = (cajaData || []).reduce((sum, c) => sum + (c.monto || 0), 0)

  return {
    cuotas: cuotasRecaudadas,
    inscripcion: inscripcionRecaudada,
    seguro: seguroRecaudado,
    total_recaudado: totalPagosRecibidos,
    total_deudas: totalDeudaVencida,
    total_gastos: gastosTotal,
    caja_grande: cajaTotal,
  }
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
          const datosInst = await cargarDatosInstitucion(inst.id)

          const totalIngresos = datosInst.total_recaudado + datosInst.caja_grande
          const balance = totalIngresos - datosInst.total_gastos

          datos.push({
            institucion_id: inst.id,
            institucion_nombre: inst.nombre,
            cuotas_recaudadas: datosInst.cuotas,
            inscripcion_recaudada: datosInst.inscripcion,
            seguro_recaudado: datosInst.seguro,
            total_recaudado: datosInst.total_recaudado,
            total_deudas: datosInst.total_deudas,
            total_gastos: datosInst.total_gastos,
            caja_grande: datosInst.caja_grande,
            total_ingresos: totalIngresos,
            balance,
          })

          console.log(`✅ ${inst.nombre}: Pagos=${datosInst.total_recaudado}, Deudas=${datosInst.total_deudas}`)
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

      // Cargar TODOS los pagos individuales de ambas instituciones
      const { data: todosPagos } = await supabase
        .from('pagos')
        .select('concepto_id, monto_pagado, estado')
        .neq('estado', 'ANULADO')

      // Cargar TODOS los pagos múltiples
      const { data: pagosMultiples } = await supabase
        .from('pagos_multiples')
        .select(`
          *,
          pagos_multiples_detalle(*)
        `)
        .neq('estado', 'ANULADO')

      // Expandir pagos múltiples
      const pagosMultiplesExpandidos: any[] = []
      pagosMultiples?.forEach(pm => {
        if (pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
          pm.pagos_multiples_detalle.forEach((detalle: any) => {
            pagosMultiplesExpandidos.push({
              concepto_id: detalle.concepto_id,
              monto_pagado: detalle.monto_pagado,
            })
          })
        }
      })

      const todosLosPagos = [...(todosPagos || []), ...pagosMultiplesExpandidos]

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
        todosLosPagos.forEach(pago => {
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
