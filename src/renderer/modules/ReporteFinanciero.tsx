import React, { useState, useEffect } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda } from '@renderer/lib/helpers'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import {
  BarChart3,
  RefreshCw,
  X,
  AlertTriangle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

type TabReporte = 'resumen' | 'carrera' | 'meta' | 'mora'
type ModalType = 'aldia' | 'deudores' | null

interface ResumenFinanciero {
  institucion_id: number
  institucion_nombre: string
  carrera_id: number
  carrera_nombre: string
  deuda_vencida: number
  deuda_proximo_vencimiento: number
  recaudado_pagos: number
  recaudado_kiosco: number
  recaudado_insumos: number
  recaudado_total: number
  capacidad_teorica: number
  tasa_cobranza: number
  alumnos_totales: number
  alumnos_al_dia: number
  alumnos_vencidos: number
}

interface Alumno {
  id: number
  nombre: string
  deuda: number
  porcentaje: number
  carrera: string
}

const getEfficiencyClass = (porcentaje: number): string => {
  if (porcentaje >= 100) return 'bg-green-500/30 text-green-300'
  if (porcentaje >= 80) return 'bg-yellow-500/30 text-yellow-300'
  return 'bg-red-500/30 text-red-300'
}

const getNivelDeuda = (porcentaje: number) => {
  if (porcentaje >= 80) return { label: 'CRÍTICA', color: 'text-red-400 bg-red-500/20', icon: <AlertTriangle size={16} /> }
  if (porcentaje >= 50) return { label: 'MEDIA', color: 'text-orange-400 bg-orange-500/20', icon: <AlertCircle size={16} /> }
  return { label: 'BAJA', color: 'text-yellow-400 bg-yellow-500/20', icon: <AlertCircle size={16} /> }
}

export const ReporteFinanciero: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const [loading, setLoading] = useState(true)
  const [resumen, setResumen] = useState<ResumenFinanciero[]>([])
  const [gastos, setGastos] = useState(0)
  const [mesActual] = useState(new Date().getMonth() + 1)
  const [diaActual] = useState(new Date().getDate())
  const [tabActiva, setTabActiva] = useState<TabReporte>('resumen')
  const [modal, setModal] = useState<ModalType>(null)
  const [alumnosModal, setAlumnosModal] = useState<Alumno[]>([])
  const [loadingModal, setLoadingModal] = useState(false)

  // Cargar alumnos al día
  const cargarAlumnosAlDia = async () => {
    setLoadingModal(true)
    try {
      const mesVencimientoHasta = diaActual > 10 ? mesActual : mesActual - 1

      const { data: estudiantes } = await supabase
        .from('estudiantes')
        .select('id, nombre_completo, carrera_id')
        .match({ institucion_id: institucionActiva.id })

      const { data: conceptos } = await supabase
        .from('conceptos_pago')
        .select('id, carrera_id, monto')
        .eq('institucion_id', institucionActiva.id)
        .gte('mes', 3)
        .lte('mes', mesVencimientoHasta)

      let allPagos: any[] = []
      let page = 0
      let hasMore = true
      while (hasMore) {
        const from = page * 1000
        const { data: pagos } = await supabase
          .from('pagos_multiples_detalle')
          .select('concepto_id')
          .range(from, from + 999)
        if (!pagos?.length) hasMore = false
        else allPagos = [...allPagos, ...pagos]
        page++
      }

      const { data: carreras } = await supabase.from('carreras').select('id, nombre')
      const carrMap = new Map(carreras?.map(c => [c.id, c.nombre]) || [])

      const conceptosPagados = new Set(allPagos.map(p => p.concepto_id))
      const conceptosVencidosPagados = conceptos?.filter(c => conceptosPagados.has(c.id)) || []

      const alumnosAlDia: Alumno[] = []

      estudiantes?.forEach(est => {
        const conceptosEstudiante = conceptosVencidosPagados.filter(
          c => c.carrera_id === est.carrera_id
        )
        if (conceptosEstudiante.length > 0) {
          alumnosAlDia.push({
            id: est.id,
            nombre: est.nombre_completo || `Estudiante ${est.id}`,
            deuda: 0,
            porcentaje: 100,
            carrera: carrMap.get(est.carrera_id) || `Carrera ${est.carrera_id}`,
          })
        }
      })

      setAlumnosModal(alumnosAlDia)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoadingModal(false)
    }
  }

  // Cargar deudores
  const cargarDeudores = async () => {
    setLoadingModal(true)
    try {
      const mesVencimientoHasta = diaActual > 10 ? mesActual : mesActual - 1

      const { data: estudiantes } = await supabase
        .from('estudiantes')
        .select('id, nombre_completo, carrera_id')
        .match({ institucion_id: institucionActiva.id })

      const { data: conceptos } = await supabase
        .from('conceptos_pago')
        .select('id, carrera_id, monto')
        .eq('institucion_id', institucionActiva.id)
        .gte('mes', 3)
        .lte('mes', mesVencimientoHasta)

      let allPagos: any[] = []
      let page = 0
      let hasMore = true
      while (hasMore) {
        const from = page * 1000
        const { data: pagos } = await supabase
          .from('pagos_multiples_detalle')
          .select('concepto_id, monto_pagado')
          .range(from, from + 999)
        if (!pagos?.length) hasMore = false
        else allPagos = [...allPagos, ...pagos]
        page++
      }

      const { data: carreras } = await supabase.from('carreras').select('id, nombre')
      const carrMap = new Map(carreras?.map(c => [c.id, c.nombre]) || [])

      const pagosMap = new Map<number, number>()
      allPagos.forEach((p: any) => {
        pagosMap.set(p.concepto_id, (pagosMap.get(p.concepto_id) || 0) + (p.monto_pagado || 0))
      })

      const deudores: Alumno[] = []

      estudiantes?.forEach(est => {
        const conceptosEstudiante = conceptos?.filter(c => c.carrera_id === est.carrera_id) || []

        let deudaTotal = 0
        let capacidadTotal = 0

        conceptosEstudiante.forEach(c => {
          const pagado = pagosMap.get(c.id) || 0
          const pendiente = Math.max(0, (c.monto || 0) - pagado)
          deudaTotal += pendiente
          capacidadTotal += c.monto || 0
        })

        if (deudaTotal > 0) {
          const porcentaje = capacidadTotal > 0 ? (deudaTotal / capacidadTotal) * 100 : 0

          deudores.push({
            id: est.id,
            nombre: est.nombre_completo || `Estudiante ${est.id}`,
            deuda: deudaTotal,
            porcentaje,
            carrera: carrMap.get(est.carrera_id) || `Carrera ${est.carrera_id}`,
          })
        }
      })

      setAlumnosModal(deudores.sort((a, b) => b.porcentaje - a.porcentaje))
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoadingModal(false)
    }
  }

  const cargarDatos = async () => {
    try {
      setLoading(true)

      const mesVencimientoHasta = diaActual > 10 ? mesActual : mesActual - 1

      // 1. Obtener datos base
      const { data: instituciones } = await supabase.from('instituciones').select('id, nombre')
      const { data: carreras } = await supabase.from('carreras').select('id, nombre')
      const { data: configCarreras } = await supabase
        .from('configuracion_carreras')
        .select('institucion_id, carrera_id')
        .eq('institucion_id', institucionActiva.id)

      const instMap = new Map(instituciones?.map(i => [i.id, i.nombre]) || [])
      const carrMap = new Map(carreras?.map(c => [c.id, c.nombre]) || [])

      // 2. Obtener pagos
      let allPagos: any[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        const from = page * 1000
        const { data: pagosDetalle } = await supabase
          .from('pagos_multiples_detalle')
          .select('concepto_id, monto_pagado')
          .range(from, from + 999)

        if (!pagosDetalle || pagosDetalle.length === 0) {
          hasMore = false
        } else {
          allPagos = [...allPagos, ...pagosDetalle]
          page++
        }
      }

      // 3. Obtener conceptos
      const { data: conceptos } = await supabase
        .from('conceptos_pago')
        .select('id, institucion_id, carrera_id, monto, mes')
        .eq('institucion_id', institucionActiva.id)

      // 4. Ventas
      let ventasKioscoTotal = 0
      let ventasInsumosTotal = 0

      if (institucionActiva.id === 2) {
        try {
          const { data: ventasKiosco } = await supabase
            .from('venta_kiosco')
            .select('monto')
            .eq('institucion_id', institucionActiva.id)
          ventasKioscoTotal = ventasKiosco?.reduce((sum, v) => sum + (v.monto || 0), 0) || 0
        } catch (err) {}

        try {
          const { data: ventasInsumos } = await supabase
            .from('ventas_insumos')
            .select('monto')
            .eq('institucion_id', institucionActiva.id)
          ventasInsumosTotal = ventasInsumos?.reduce((sum, v) => sum + (v.monto || 0), 0) || 0
        } catch (err) {}
      }

      // 5. Gastos
      let totalGastos = 0
      try {
        const { data: gastosData } = await supabase
          .from('gastos')
          .select('monto')
          .match({ mes: mesActual })
        totalGastos = gastosData?.reduce((sum, g) => sum + (g.monto || 0), 0) || 0
      } catch (err) {
        console.log('[FINANCIERO] Gastos error:', err)
      }

      setGastos(totalGastos)

      // 6. Estudiantes
      const { data: estudiantes } = await supabase
        .from('estudiantes')
        .select('id, institucion_id, carrera_id')
        .match({ institucion_id: institucionActiva.id })

      // 7. Mapa de pagos
      const pagosMap = new Map<number, number>()
      allPagos.forEach((p: any) => {
        pagosMap.set(p.concepto_id, (pagosMap.get(p.concepto_id) || 0) + (p.monto_pagado || 0))
      })

      // 8. Resumen
      const resumenMap = new Map<string, ResumenFinanciero>()

      configCarreras?.forEach((config: any) => {
        const key = `${config.institucion_id}-${config.carrera_id}`
        const carrNombre = carrMap.get(config.carrera_id) || `Carrera ${config.carrera_id}`

        resumenMap.set(key, {
          institucion_id: config.institucion_id,
          institucion_nombre: instMap.get(config.institucion_id) || '',
          carrera_id: config.carrera_id,
          carrera_nombre: carrNombre,
          deuda_vencida: 0,
          deuda_proximo_vencimiento: 0,
          recaudado_pagos: 0,
          recaudado_kiosco: 0,
          recaudado_insumos: 0,
          recaudado_total: 0,
          capacidad_teorica: 0,
          tasa_cobranza: 0,
          alumnos_totales: 0,
          alumnos_al_dia: 0,
          alumnos_vencidos: 0,
        })
      })

      // 9. Procesar
      conceptos?.forEach((concepto: any) => {
        const key = `${concepto.institucion_id}-${concepto.carrera_id}`
        const item = resumenMap.get(key)
        if (!item) return

        const alumnosCarrera = estudiantes?.filter(
          e => e.carrera_id === concepto.carrera_id
        ) || []
        item.alumnos_totales = new Set(alumnosCarrera.map(a => a.id)).size

        if (concepto.mes >= 3 && concepto.mes <= mesVencimientoHasta) {
          item.capacidad_teorica += concepto.monto * item.alumnos_totales

          const montoPendiente = concepto.monto - (pagosMap.get(concepto.id) || 0)
          if (montoPendiente > 0) {
            item.deuda_vencida += montoPendiente
          }
        }

        if (concepto.mes === mesVencimientoHasta + 1) {
          const montoPendiente = concepto.monto - (pagosMap.get(concepto.id) || 0)
          if (montoPendiente > 0) {
            item.deuda_proximo_vencimiento += montoPendiente
          }
        }

        const monto_pagado = pagosMap.get(concepto.id) || 0
        item.recaudado_pagos += monto_pagado
      })

      // 10. Ventas
      resumenMap.forEach(item => {
        if (institucionActiva.id === 2) {
          item.recaudado_kiosco = ventasKioscoTotal
          item.recaudado_insumos = ventasInsumosTotal
        }
      })

      // 11. Finales
      resumenMap.forEach(item => {
        item.recaudado_total =
          item.recaudado_pagos + item.recaudado_kiosco + item.recaudado_insumos
        item.tasa_cobranza =
          item.capacidad_teorica > 0
            ? (item.recaudado_pagos / item.capacidad_teorica) * 100
            : 0

        item.alumnos_al_dia = Math.round(
          item.alumnos_totales * (item.tasa_cobranza / 100)
        )
        item.alumnos_vencidos = item.alumnos_totales - item.alumnos_al_dia
      })

      const resumenArray = Array.from(resumenMap.values()).sort(
        (a, b) => b.recaudado_total - a.recaudado_total
      )

      setResumen(resumenArray)
    } catch (err) {
      console.error('ERROR:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [institucionActiva.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <BarChart3 size={48} className="text-cyan-400 animate-spin" />
      </div>
    )
  }

  if (resumen.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <BarChart3 size={64} className="text-slate-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-300">Sin datos</h2>
        </div>
      </div>
    )
  }

  // Totales
  const totalRecaudado = resumen.reduce((sum, r) => sum + r.recaudado_total, 0)
  const totalCapacidad = resumen.reduce((sum, r) => sum + r.capacidad_teorica, 0)
  const totalDeuda = resumen.reduce((sum, r) => sum + r.deuda_vencida, 0)
  const totalAlumnos = resumen.reduce((sum, r) => sum + r.alumnos_totales, 0)
  const totalAlDia = resumen.reduce((sum, r) => sum + r.alumnos_al_dia, 0)
  const totalAlVencidos = resumen.reduce((sum, r) => sum + r.alumnos_vencidos, 0)
  const netFinanciero = totalRecaudado - gastos
  const porcentajeCobranza = totalCapacidad > 0 ? (totalRecaudado / totalCapacidad) * 100 : 0

  const mesVencimientoHasta = diaActual > 10 ? mesActual : mesActual - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text mb-1">
            💼 Reporte Financiero
          </h1>
          <p className="text-slate-400">{institucionActiva.nombre}</p>
        </div>
        <button onClick={cargarDatos} className="p-3 hover:bg-slate-700/50 rounded-xl transition-all">
          <RefreshCw size={24} className="text-cyan-400" />
        </button>
      </div>

      {/* TABS */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'resumen', label: 'Resumen', icon: '📊' },
          { id: 'carrera', label: 'Por Carrera', icon: '📚' },
          { id: 'meta', label: 'Meta Mensual', icon: '🎯' },
          { id: 'mora', label: 'Deuda', icon: '⚠️' },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTabActiva(id as TabReporte)}
            className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              tabActiva === id
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* RESUMEN TAB */}
      {tabActiva === 'resumen' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <button
              onClick={() => {
                setModal('aldia')
                cargarAlumnosAlDia()
              }}
              className="p-4 bg-gradient-to-br from-blue-700/40 to-blue-900/30 border-2 border-blue-500/50 rounded-xl hover:shadow-lg transition-all cursor-pointer"
            >
              <p className="text-xs text-blue-300 font-bold mb-1">ALUMNOS TOTALES</p>
              <p className="text-3xl font-black text-blue-200">{totalAlumnos}</p>
            </button>

            <button
              onClick={() => {
                setModal('aldia')
                cargarAlumnosAlDia()
              }}
              className="p-4 bg-gradient-to-br from-green-700/40 to-green-900/30 border-2 border-green-500/50 rounded-xl hover:shadow-lg transition-all cursor-pointer"
            >
              <p className="text-xs text-green-300 font-bold mb-1">AL DÍA</p>
              <p className="text-3xl font-black text-green-200">{totalAlDia}</p>
              <p className="text-xs text-green-400 mt-1">{totalAlumnos > 0 ? ((totalAlDia / totalAlumnos) * 100).toFixed(1) : '0'}%</p>
            </button>

            <button
              onClick={() => {
                setModal('deudores')
                cargarDeudores()
              }}
              className="p-4 bg-gradient-to-br from-red-700/40 to-red-900/30 border-2 border-red-500/50 rounded-xl hover:shadow-lg transition-all cursor-pointer"
            >
              <p className="text-xs text-red-300 font-bold mb-1">CON MORA</p>
              <p className="text-3xl font-black text-red-200">{totalAlVencidos}</p>
              <p className="text-xs text-red-400 mt-1">{totalAlumnos > 0 ? ((totalAlVencidos / totalAlumnos) * 100).toFixed(1) : '0'}%</p>
            </button>

            <button className="p-4 bg-gradient-to-br from-green-700/40 to-green-900/30 border-2 border-green-500/50 rounded-xl">
              <p className="text-xs text-green-300 font-bold mb-1">INGRESOS</p>
              <p className="text-2xl font-black text-green-200">{formatoMoneda(totalRecaudado)}</p>
            </button>

            <button className="p-4 bg-gradient-to-br from-orange-700/40 to-orange-900/30 border-2 border-orange-500/50 rounded-xl">
              <p className="text-xs text-orange-300 font-bold mb-1">EGRESOS</p>
              <p className="text-2xl font-black text-orange-200">{formatoMoneda(gastos)}</p>
            </button>

            <button className="p-4 bg-gradient-to-br from-violet-700/40 to-violet-900/30 border-2 border-violet-500/50 rounded-xl">
              <p className="text-xs text-violet-300 font-bold mb-1">NETO</p>
              <p className="text-2xl font-black text-violet-200">{formatoMoneda(netFinanciero)}</p>
            </button>
          </div>

          {/* Capacidad vs Recaudado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Capacidad Teórica</h2>
              <p className="text-4xl font-black text-blue-300 mb-2">{formatoMoneda(totalCapacidad)}</p>
              <p className="text-sm text-slate-400">Ingresos esperados hasta mes {mesVencimientoHasta}</p>
            </div>

            <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Mora Hasta Mes Actual</h2>
              <p className="text-4xl font-black text-red-300 mb-2">{formatoMoneda(totalDeuda)}</p>
              <p className="text-sm text-slate-400">{totalCapacidad > 0 ? ((totalDeuda / totalCapacidad) * 100).toFixed(1) : '0'}% de capacidad</p>
            </div>
          </div>

          {/* Progreso */}
          <div className="p-6 bg-gradient-to-r from-slate-800/80 via-slate-800/60 to-slate-800/40 border border-slate-700/50 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Eficiencia de Cobranza</h3>
              <p className="text-3xl font-black text-green-400">{porcentajeCobranza.toFixed(1)}%</p>
            </div>
            <div className="relative h-8 bg-slate-700/50 rounded-full overflow-hidden border border-slate-600/50">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-emerald-400 to-cyan-400"
                style={{ width: `${Math.min(porcentajeCobranza, 100)}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-end pr-4">
                <span className="text-sm font-bold text-white">{porcentajeCobranza.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CARRERA TAB */}
      {tabActiva === 'carrera' && (
        <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-700">
                <th className="px-4 py-3 text-left text-white font-bold">Carrera</th>
                <th className="px-4 py-3 text-center text-slate-300">Alumnos</th>
                <th className="px-4 py-3 text-center text-red-400">Mora</th>
                <th className="px-4 py-3 text-right text-green-400">Recaudado</th>
                <th className="px-4 py-3 text-center text-amber-400">Eficiencia</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((c, i) => (
                <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                  <td className="px-4 py-3 text-slate-200 font-bold">{c.carrera_nombre}</td>
                  <td className="px-4 py-3 text-center text-slate-300 font-bold">{c.alumnos_totales}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-red-600/30 text-red-300 rounded text-xs font-bold">
                      {c.alumnos_vencidos}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-green-400 font-bold">{formatoMoneda(c.recaudado_total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={'px-2 py-1 rounded text-xs font-bold ' + getEfficiencyClass(c.tasa_cobranza)}>
                      {c.tasa_cobranza.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* META MENSUAL TAB */}
      {tabActiva === 'meta' && (
        <div className="space-y-6">
          {resumen.map((carrera, idx) => (
            <div key={idx} className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl">
              <h3 className="text-2xl font-bold text-white mb-4 pb-4 border-b border-slate-700/50">
                🎯 {carrera.carrera_nombre}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 bg-gradient-to-r from-slate-900/80 to-slate-800/50 rounded-lg border border-slate-700/50">
                <div>
                  <p className="text-xs text-slate-400 font-bold mb-1">👥 Total de Estudiantes</p>
                  <p className="text-3xl font-black text-cyan-300">{carrera.alumnos_totales}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold mb-1">⚠️ Estudiantes en Mora</p>
                  <p className="text-3xl font-black text-red-400">{carrera.alumnos_vencidos}</p>
                  <p className="text-xs text-red-400 mt-1">{carrera.alumnos_totales > 0 ? ((carrera.alumnos_vencidos / carrera.alumnos_totales) * 100).toFixed(1) : '0'}%</p>
                </div>
              </div>

              <p className="text-sm font-bold text-white mb-3">Desglose de Recaudación</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gradient-to-r from-slate-900/50 to-slate-800/30 rounded-xl border border-slate-700/30">
                <div className="border-l-4 border-blue-500 pl-4">
                  <p className="text-xs text-slate-400 font-bold mb-1">💎 CAPACIDAD</p>
                  <p className="text-2xl font-black text-blue-300">{formatoMoneda(carrera.capacidad_teorica)}</p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-xs text-slate-400 font-bold mb-1">✅ RECAUDADO</p>
                  <p className="text-2xl font-black text-green-300">{formatoMoneda(carrera.recaudado_total)}</p>
                </div>
                <div className="border-l-4 border-red-500 pl-4">
                  <p className="text-xs text-slate-400 font-bold mb-1">❌ DEUDA</p>
                  <p className="text-2xl font-black text-red-300">{formatoMoneda(carrera.deuda_vencida)}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 p-4 bg-gradient-to-br from-green-600/30 to-green-900/20 border-2 border-green-500/40 rounded-xl">
                  <p className="text-xs text-green-300 font-bold mb-1">EFICIENCIA</p>
                  <p className="text-2xl font-black text-green-200">{carrera.tasa_cobranza.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DEUDA TAB */}
      {tabActiva === 'mora' && (
        <div className="space-y-6">
          {resumen.map((carrera, idx) => (
            <div key={idx} className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl">
              <h3 className="text-2xl font-bold text-white mb-4 pb-4 border-b border-slate-700/50">
                {carrera.carrera_nombre}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-gradient-to-br from-red-600/30 to-red-900/20 border-2 border-red-500/40 rounded-xl">
                  <p className="text-xs text-red-300 font-bold mb-2">DEUDA VENCIDA</p>
                  <p className="text-2xl font-black text-red-200">{formatoMoneda(carrera.deuda_vencida)}</p>
                  <p className="text-xs text-red-400 mt-2">
                    {carrera.capacidad_teorica > 0 ? ((carrera.deuda_vencida / carrera.capacidad_teorica) * 100).toFixed(1) : '0'}% del esperado
                  </p>
                </div>

                <div className="p-5 bg-gradient-to-br from-orange-600/30 to-orange-900/20 border-2 border-orange-500/40 rounded-xl">
                  <p className="text-xs text-orange-300 font-bold mb-2">PRÓXIMO MES</p>
                  <p className="text-2xl font-black text-orange-200">{formatoMoneda(carrera.deuda_proximo_vencimiento)}</p>
                </div>

                <div className="p-5 bg-gradient-to-br from-blue-600/30 to-blue-900/20 border-2 border-blue-500/40 rounded-xl">
                  <p className="text-xs text-blue-300 font-bold mb-2">CAPACIDAD</p>
                  <p className="text-2xl font-black text-blue-200">{formatoMoneda(carrera.capacidad_teorica)}</p>
                </div>

                <div className="p-5 bg-gradient-to-br from-slate-700/30 to-slate-900/20 border-2 border-slate-500/40 rounded-xl">
                  <p className="text-xs text-slate-300 font-bold mb-2">ALUMNOS MORA</p>
                  <p className="text-2xl font-black text-slate-200">{carrera.alumnos_vencidos}</p>
                  <p className="text-xs text-slate-400 mt-2">de {carrera.alumnos_totales}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL - ALUMNOS AL DÍA */}
      {modal === 'aldia' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">✅ Alumnos al Día ({alumnosModal.length})</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {loadingModal ? (
              <div className="flex justify-center py-8">
                <Loader2 size={32} className="text-cyan-400 animate-spin" />
              </div>
            ) : alumnosModal.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No hay alumnos al día</p>
            ) : (
              <div className="space-y-2">
                {alumnosModal.map((alumno, idx) => (
                  <div key={idx} className="p-3 bg-gradient-to-r from-slate-900/50 to-slate-800/30 border border-slate-700/30 rounded-lg hover:border-green-500/50 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-green-400">{alumno.nombre}</p>
                        <p className="text-xs text-slate-400">{alumno.carrera}</p>
                      </div>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold">100%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL - DEUDORES */}
      {modal === 'deudores' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">⚠️ Alumnos con Mora ({alumnosModal.length})</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-2 mb-4 pb-4 border-b border-slate-700/50">
              <div className="text-xs text-slate-400 font-bold mb-2">Niveles de deuda:</div>
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle size={16} className="text-red-400" />
                  <span className="text-red-400">CRÍTICA &gt;80%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <AlertCircle size={16} className="text-orange-400" />
                  <span className="text-orange-400">MEDIA 50-80%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <AlertCircle size={16} className="text-yellow-400" />
                  <span className="text-yellow-400">BAJA 10-50%</span>
                </div>
              </div>
            </div>

            {loadingModal ? (
              <div className="flex justify-center py-8">
                <Loader2 size={32} className="text-cyan-400 animate-spin" />
              </div>
            ) : alumnosModal.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No hay alumnos con mora</p>
            ) : (
              <div className="space-y-2">
                {alumnosModal.map((alumno, idx) => {
                  const nivel = getNivelDeuda(alumno.porcentaje)
                  return (
                    <div key={idx} className="p-3 bg-gradient-to-r from-slate-900/50 to-slate-800/30 border border-slate-700/30 rounded-lg hover:border-red-500/50 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-slate-200">{alumno.nombre}</p>
                          <p className="text-xs text-slate-400">{alumno.carrera}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 mb-1">Deuda</p>
                          <p className="text-sm font-bold text-red-400 mb-1">{formatoMoneda(alumno.deuda)}</p>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${nivel.color}`}>
                            {nivel.icon}
                            {nivel.label} ({alumno.porcentaje.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReporteFinanciero
