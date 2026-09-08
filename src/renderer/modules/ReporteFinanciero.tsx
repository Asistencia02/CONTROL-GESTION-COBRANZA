import React, { useState, useEffect } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda } from '@renderer/lib/helpers'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import {
  BarChart3,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Users,
  Calendar,
  Gauge,
  Target,
  Award,
  Zap,
  Clock,
  Activity,
  PieChart,
  TrendingDown,
} from 'lucide-react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

type TabReporte = 'resumen' | 'carrera' | 'deuda' | 'mora' | 'gastos'
type VistaResumen = 'anual' | 'mes-actual'

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

const getEfficiencyClass = (porcentaje: number): string => {
  if (porcentaje >= 100) return 'bg-green-500/30 text-green-300'
  if (porcentaje >= 80) return 'bg-yellow-500/30 text-yellow-300'
  return 'bg-red-500/30 text-red-300'
}

export const ReporteFinanciero: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resumen, setResumen] = useState<ResumenFinanciero[]>([])
  const [gastos, setGastos] = useState(0)
  const [mesActual] = useState(new Date().getMonth() + 1)
  const [diaActual] = useState(new Date().getDate())
  const [tabActiva, setTabActiva] = useState<TabReporte>('resumen')
  const [vistaResumen, setVistaResumen] = useState<VistaResumen>('anual')

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`[FINANCIERO] ========== INICIANDO CARGA INSTITUCIÓN ${institucionActiva.id} ==========`)
      console.log(`[FINANCIERO] Mes actual: ${mesActual}, Día actual: ${diaActual}`)

      // 1. Definir rango de deuda vencida
      const mesVencimientoHasta = diaActual > 10 ? mesActual : mesActual - 1
      console.log(`[FINANCIERO] Deuda vencida: marzo hasta mes ${mesVencimientoHasta}`)

      // 2. Obtener instituciones, carreras, config
      const { data: instituciones } = await supabase.from('instituciones').select('id, nombre')
      const { data: carreras } = await supabase.from('carreras').select('id, nombre')
      const { data: configCarreras } = await supabase
        .from('configuracion_carreras')
        .select('institucion_id, carrera_id')
        .eq('institucion_id', institucionActiva.id)

      const instMap = new Map(instituciones?.map(i => [i.id, i.nombre]) || [])
      const carrMap = new Map(carreras?.map(c => [c.id, c.nombre]) || [])

      console.log(`[FINANCIERO] Carreras en institución ${institucionActiva.id}: ${configCarreras?.length || 0}`)

      // 3. Obtener TODOS los pagos (paginado)
      let allPagos: any[] = []
      let page = 0
      let hasMore = true

      while (hasMore) {
        const from = page * 1000
        const to = from + 999

        const { data: pagosDetalle } = await supabase
          .from('pagos_multiples_detalle')
          .select('concepto_id, monto_pagado, dias_vencimiento, created_at')
          .range(from, to)

        if (!pagosDetalle || pagosDetalle.length === 0) {
          hasMore = false
        } else {
          allPagos = [...allPagos, ...pagosDetalle]
          page++
        }
      }

      console.log(`[FINANCIERO] Total pagos (globales): ${allPagos.length}`)

      // 4. Obtener conceptos de esta institución
      const { data: conceptos } = await supabase
        .from('conceptos_pago')
        .select('id, institucion_id, carrera_id, monto, mes, año, dias_vencimiento')
        .eq('institucion_id', institucionActiva.id)

      // 5. Obtener ventas kiosco e insumos (solo si es INSM)
      let ventasKioscoTotal = 0
      let ventasInsumosTotal = 0

      if (institucionActiva.id === 2) {
        try {
          const { data: ventasKiosco } = await supabase
            .from('venta_kiosco')
            .select('monto')
            .eq('institucion_id', institucionActiva.id)
          ventasKioscoTotal = ventasKiosco?.reduce((sum, v) => sum + (v.monto || 0), 0) || 0
        } catch (err) {
          console.log('[FINANCIERO] Ventas kiosco no disponibles')
        }

        try {
          const { data: ventasInsumos } = await supabase
            .from('ventas_insumos')
            .select('monto')
            .eq('institucion_id', institucionActiva.id)
          ventasInsumosTotal = ventasInsumos?.reduce((sum, v) => sum + (v.monto || 0), 0) || 0
        } catch (err) {
          console.log('[FINANCIERO] Ventas insumos no disponibles')
        }
      }

      // 6. Obtener gastos
      let totalGastos = 0
      try {
        const { data: gastosData } = await supabase
          .from('gastos')
          .select('monto')
          .eq('mes', mesActual)
        totalGastos = gastosData?.reduce((sum, g) => sum + (g.monto || 0), 0) || 0
      } catch (err) {
        console.log('[FINANCIERO] Gastos no disponibles')
      }

      setGastos(totalGastos)
      console.log(`[FINANCIERO] Gastos mes ${mesActual}: ${formatoMoneda(totalGastos)}`)

      // 7. Obtener estudiantes de esta institución
      const { data: estudiantes } = await supabase
        .from('estudiantes')
        .select('id, institucion_id, carrera_id')
        .eq('institucion_id', institucionActiva.id)

      console.log(`[FINANCIERO] Estudiantes en institución: ${estudiantes?.length || 0}`)

      // 8. Crear mapa de pagos
      const pagosMap = new Map<number, number>()
      allPagos.forEach((p: any) => {
        pagosMap.set(p.concepto_id, (pagosMap.get(p.concepto_id) || 0) + (p.monto_pagado || 0))
      })

      // 9. Calcular resumen por carrera
      const resumenMap = new Map<string, ResumenFinanciero>()

      configCarreras?.forEach((config: any) => {
        const key = `${config.institucion_id}-${config.carrera_id}`
        const instNombre = instMap.get(config.institucion_id) || `Inst ${config.institucion_id}`
        const carrNombre = carrMap.get(config.carrera_id) || `Carrera ${config.carrera_id}`

        resumenMap.set(key, {
          institucion_id: config.institucion_id,
          institucion_nombre: instNombre,
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

      // 10. Procesar conceptos
      conceptos?.forEach((concepto: any) => {
        const key = `${concepto.institucion_id}-${concepto.carrera_id}`
        const item = resumenMap.get(key)
        if (!item) return

        const alumnosCarrera = estudiantes?.filter(
          e => e.institucion_id === concepto.institucion_id && e.carrera_id === concepto.carrera_id
        ) || []
        item.alumnos_totales = new Set(alumnosCarrera.map(a => a.id)).size
        item.capacidad_teorica += concepto.monto * item.alumnos_totales

        if (concepto.mes >= 3 && concepto.mes <= mesVencimientoHasta) {
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

      // 11. Agregar ventas kiosco e insumos
      resumenMap.forEach(item => {
        if (institucionActiva.id === 2) {
          item.recaudado_kiosco = ventasKioscoTotal
          item.recaudado_insumos = ventasInsumosTotal
        }
      })

      // 12. Calcular totales y porcentajes
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

      console.log(`[FINANCIERO] ✅ Resumen cargado: ${resumenArray.length} carreras`)
    } catch (err) {
      console.error('[FINANCIERO] ERROR:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 max-w-md">
          <p className="text-red-400 font-bold mb-2">Error</p>
          <p className="text-red-300 text-sm mb-4">{error}</p>
          <button
            onClick={cargarDatos}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (resumen.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <BarChart3 size={64} className="text-slate-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-300 mb-2">Sin datos disponibles</h2>
          <p className="text-slate-400 mb-6">No hay carreras configuradas para esta institución</p>
          <button
            onClick={cargarDatos}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }

  // Calcular totales
  const totalRecaudado = resumen.reduce((sum, r) => sum + r.recaudado_total, 0)
  const totalCapacidad = resumen.reduce((sum, r) => sum + r.capacidad_teorica, 0)
  const totalDeuda = resumen.reduce((sum, r) => sum + r.deuda_vencida, 0)
  const totalAlumnos = resumen.reduce((sum, r) => sum + r.alumnos_totales, 0)
  const totalAlDia = resumen.reduce((sum, r) => sum + r.alumnos_al_dia, 0)
  const totalAlVencidos = resumen.reduce((sum, r) => sum + r.alumnos_vencidos, 0)
  const netFinanciero = totalRecaudado - gastos
  const porcentajeCobranza = totalCapacidad > 0 ? (totalRecaudado / totalCapacidad) * 100 : 0

  // Charts
  const chartResumen = {
    labels: ['Recaudado', 'Deuda'],
    datasets: [
      {
        data: [Math.round(totalRecaudado), Math.round(totalDeuda)],
        backgroundColor: ['rgba(34, 197, 94, 0.95)', 'rgba(239, 68, 68, 0.95)'],
        borderColor: ['rgba(34, 197, 94, 1)', 'rgba(239, 68, 68, 1)'],
        borderWidth: 3,
      },
    ],
  }

  const chartCarreras = {
    labels: resumen.map(c => c.carrera_nombre),
    datasets: [
      {
        label: 'Recaudado',
        data: resumen.map(c => c.recaudado_total),
        backgroundColor: 'rgba(34, 197, 94, 0.85)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      },
      {
        label: 'Deuda',
        data: resumen.map(c => c.deuda_vencida),
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 1,
      },
    ],
  }

  const chartEficiencia = {
    labels: resumen.map(c => c.carrera_nombre),
    datasets: [
      {
        label: 'Cobranza %',
        data: resumen.map(c => c.tasa_cobranza),
        backgroundColor: resumen.map(c =>
          c.tasa_cobranza >= 100
            ? 'rgba(34, 197, 94, 0.9)'
            : c.tasa_cobranza >= 80
            ? 'rgba(251, 146, 60, 0.9)'
            : 'rgba(239, 68, 68, 0.9)'
        ),
        borderColor: resumen.map(c =>
          c.tasa_cobranza >= 100
            ? 'rgba(34, 197, 94, 1)'
            : c.tasa_cobranza >= 80
            ? 'rgba(251, 146, 60, 1)'
            : 'rgba(239, 68, 68, 1)'
        ),
        borderWidth: 2,
      },
    ],
  }

  const mesVencimientoHasta = diaActual > 10 ? mesActual : mesActual - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-5xl font-black text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text mb-2">
              💼 Reporte Financiero
            </h1>
            <p className="text-slate-400 flex items-center gap-2">
              <Activity size={16} />
              {institucionActiva.nombre}
            </p>
          </div>
          <button onClick={cargarDatos} className="p-3 hover:bg-slate-700/50 rounded-xl transition-all hover:scale-110">
            <RefreshCw size={24} className="text-cyan-400" />
          </button>
        </div>
      </div>

      {/* KPIs GLOBALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="p-5 bg-gradient-to-br from-blue-700/40 to-blue-900/30 border-2 border-blue-500/50 rounded-xl shadow-lg">
          <p className="text-xs text-blue-300 font-bold mb-2">ALUMNOS TOTALES</p>
          <p className="text-3xl font-black text-blue-200">{totalAlumnos}</p>
        </div>

        <div className="p-5 bg-gradient-to-br from-green-700/40 to-green-900/30 border-2 border-green-500/50 rounded-xl shadow-lg">
          <p className="text-xs text-green-300 font-bold mb-2">AL DÍA</p>
          <p className="text-3xl font-black text-green-200">{totalAlDia}</p>
          <p className="text-xs text-green-400 mt-1">{((totalAlDia / totalAlumnos) * 100).toFixed(1)}%</p>
        </div>

        <div className="p-5 bg-gradient-to-br from-red-700/40 to-red-900/30 border-2 border-red-500/50 rounded-xl shadow-lg">
          <p className="text-xs text-red-300 font-bold mb-2">VENCIDOS</p>
          <p className="text-3xl font-black text-red-200">{totalAlVencidos}</p>
          <p className="text-xs text-red-400 mt-1">{((totalAlVencidos / totalAlumnos) * 100).toFixed(1)}%</p>
        </div>

        <div className="p-5 bg-gradient-to-br from-green-700/40 to-green-900/30 border-2 border-green-500/50 rounded-xl shadow-lg">
          <p className="text-xs text-green-300 font-bold mb-2">RECAUDADO</p>
          <p className="text-2xl font-black text-green-200">{formatoMoneda(totalRecaudado)}</p>
          <p className="text-xs text-green-400 mt-1">{porcentajeCobranza.toFixed(1)}%</p>
        </div>

        <div className="p-5 bg-gradient-to-br from-violet-700/40 to-violet-900/30 border-2 border-violet-500/50 rounded-xl shadow-lg">
          <p className="text-xs text-violet-300 font-bold mb-2">NETO</p>
          <p className="text-2xl font-black text-violet-200">{formatoMoneda(netFinanciero)}</p>
        </div>
      </div>

      {/* TABS */}
      <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
        {[
          { id: 'resumen', label: 'Resumen', icon: Gauge, color: 'from-purple-600 to-purple-700' },
          { id: 'carrera', label: 'Por Carrera', icon: Users, color: 'from-blue-600 to-blue-700' },
          { id: 'deuda', label: 'Deuda', icon: Target, color: 'from-cyan-600 to-cyan-700' },
          { id: 'mora', label: 'Mora', icon: AlertCircle, color: 'from-red-600 to-red-700' },
          { id: 'gastos', label: 'Gastos', icon: Zap, color: 'from-amber-600 to-amber-700' },
        ].map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setTabActiva(id as TabReporte)}
            className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              tabActiva === id
                ? `bg-gradient-to-r ${color} text-white shadow-lg`
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* CONTENIDO TABS */}
      <div className="space-y-6">
        {tabActiva === 'resumen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <PieChart size={24} className="text-purple-400" />
                  Recaudado vs Deuda
                </h2>
                <div style={{ height: '300px' }}>
                  <Pie
                    data={chartResumen}
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      plugins: {
                        legend: {
                          labels: { color: '#cbd5e1', font: { size: 14, weight: 'bold' as const } },
                          padding: 20,
                        },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-5 bg-gradient-to-br from-blue-700/40 to-blue-900/30 border-2 border-blue-500/50 rounded-xl">
                  <p className="text-xs text-blue-300 font-bold mb-2">CAPACIDAD TEÓRICA</p>
                  <p className="text-2xl font-black text-blue-200">{formatoMoneda(totalCapacidad)}</p>
                  <p className="text-xs text-blue-400 mt-1">100% esperado</p>
                </div>

                <div className="p-5 bg-gradient-to-br from-red-700/40 to-red-900/30 border-2 border-red-500/50 rounded-xl">
                  <p className="text-xs text-red-300 font-bold mb-2">DEUDA VENCIDA</p>
                  <p className="text-2xl font-black text-red-200">{formatoMoneda(totalDeuda)}</p>
                  <p className="text-xs text-red-400 mt-1">{((totalDeuda / totalCapacidad) * 100).toFixed(1)}%</p>
                </div>

                <div className="p-5 bg-gradient-to-br from-orange-700/40 to-orange-900/30 border-2 border-orange-500/50 rounded-xl">
                  <p className="text-xs text-orange-300 font-bold mb-2">GASTOS</p>
                  <p className="text-2xl font-black text-orange-200">{formatoMoneda(gastos)}</p>
                  <p className="text-xs text-orange-400 mt-1">{((gastos / totalRecaudado) * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-r from-slate-800/80 via-slate-800/60 to-slate-800/40 border border-slate-700/50 rounded-2xl shadow-xl">
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

        {tabActiva === 'carrera' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl">
                <h2 className="text-xl font-bold text-white mb-4">Recaudación por Carrera</h2>
                <div style={{ height: '300px' }}>
                  <Bar data={chartCarreras} options={{ maintainAspectRatio: false, responsive: true }} />
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl">
                <h2 className="text-xl font-bold text-white mb-4">Eficiencia por Carrera</h2>
                <div style={{ height: '300px' }}>
                  <Bar
                    data={chartEficiencia}
                    options={{
                      indexAxis: 'y' as const,
                      maintainAspectRatio: false,
                      responsive: true,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl overflow-x-auto">
              <h2 className="text-xl font-bold text-white mb-4">Detalles por Carrera</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-700">
                    <th className="px-4 py-3 text-left text-white font-bold">Carrera</th>
                    <th className="px-4 py-3 text-center text-slate-300">Alumnos</th>
                    <th className="px-4 py-3 text-center text-red-400">Vencidos</th>
                    <th className="px-4 py-3 text-right text-green-400">Recaudado</th>
                    <th className="px-4 py-3 text-center text-amber-400">Eficiencia</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.map((c, i) => (
                    <tr key={i} className="border-b border-slate-700/30">
                      <td className="px-4 py-3 text-slate-200 font-bold">{c.carrera_nombre}</td>
                      <td className="px-4 py-3 text-center text-slate-300">{c.alumnos_totales}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-red-600/30 text-red-300 rounded text-xs">
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
          </div>
        )}

        {tabActiva === 'deuda' && (
          <div className="space-y-6">
            {resumen.map((carrera, idx) => (
              <div key={idx} className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl">
                <h3 className="text-2xl font-bold text-white mb-4 pb-4 border-b border-slate-700/50">
                  {carrera.carrera_nombre}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 bg-gradient-to-br from-red-600/30 to-red-900/20 border-2 border-red-500/40 rounded-xl">
                    <p className="text-xs text-red-300 font-bold mb-2">DEUDA VENCIDA</p>
                    <p className="text-3xl font-black text-red-200">{formatoMoneda(carrera.deuda_vencida)}</p>
                    <p className="text-xs text-red-400 mt-2">
                      {((carrera.deuda_vencida / carrera.capacidad_teorica) * 100).toFixed(1)}% de capacidad
                    </p>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-orange-600/30 to-orange-900/20 border-2 border-orange-500/40 rounded-xl">
                    <p className="text-xs text-orange-300 font-bold mb-2">PRÓXIMO VENCIMIENTO</p>
                    <p className="text-3xl font-black text-orange-200">
                      {formatoMoneda(carrera.deuda_proximo_vencimiento)}
                    </p>
                    <p className="text-xs text-orange-400 mt-2">Mes siguiente</p>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-blue-600/30 to-blue-900/20 border-2 border-blue-500/40 rounded-xl">
                    <p className="text-xs text-blue-300 font-bold mb-2">CAPACIDAD TEÓRICA</p>
                    <p className="text-3xl font-black text-blue-200">{formatoMoneda(carrera.capacidad_teorica)}</p>
                    <p className="text-xs text-blue-400 mt-2">{carrera.alumnos_totales} alumnos</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tabActiva === 'mora' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumen.map((carrera, idx) => (
              <div key={idx} className="p-5 bg-gradient-to-br from-red-600/30 to-red-900/20 border-2 border-red-500/40 rounded-xl">
                <h3 className="font-bold text-red-300 mb-3 text-lg">{carrera.carrera_nombre}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <p className="text-slate-400">Total:</p>
                    <p className="text-slate-300 font-bold">{carrera.alumnos_totales}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-slate-400">Al día:</p>
                    <p className="text-green-400 font-bold">{carrera.alumnos_al_dia}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-slate-400">Vencidos:</p>
                    <p className="text-red-400 font-bold">{carrera.alumnos_vencidos}</p>
                  </div>
                  <div className="pt-2 border-t border-red-500/20">
                    <p className="text-xs text-red-400 font-bold">
                      {((carrera.alumnos_vencidos / carrera.alumnos_totales) * 100).toFixed(1)}% en mora
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tabActiva === 'gastos' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-8 bg-gradient-to-br from-orange-600/25 via-orange-700/15 to-orange-900/10 border-2 border-orange-500/40 rounded-2xl">
              <h3 className="text-2xl font-bold text-orange-300 mb-4">Gastos del Mes</h3>
              <p className="text-4xl font-black text-orange-300 mb-2">{formatoMoneda(gastos)}</p>
              <p className="text-sm text-orange-400">{((gastos / totalRecaudado) * 100).toFixed(1)}% de recaudación</p>
            </div>

            <div className="p-8 bg-gradient-to-br from-violet-600/25 via-violet-700/15 to-violet-900/10 border-2 border-violet-500/40 rounded-2xl">
              <h3 className="text-2xl font-bold text-violet-300 mb-4">Neto Financiero</h3>
              <p className="text-4xl font-black text-violet-300 mb-2">{formatoMoneda(netFinanciero)}</p>
              <p className="text-sm text-violet-400">{((netFinanciero / totalCapacidad) * 100).toFixed(1)}% de capacidad</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReporteFinanciero
