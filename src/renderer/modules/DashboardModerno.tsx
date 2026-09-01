import React, { useEffect, useMemo } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { usePagos } from '@renderer/hooks/usePagos'
import { useGastos } from '@renderer/hooks/useGastos'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { useReporteConceptos } from '@renderer/hooks/useReporteConceptos'
import { DollarSign, TrendingUp, Users, CheckCircle, AlertCircle, Activity, PieChart, Calendar, Zap, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react'
import { formatoMoneda } from '@renderer/lib/helpers'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler } from 'chart.js'
import { Pie, Bar, Line } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler)

export const DashboardModerno: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { pagos, cargarPagos, loading: pagosLoading, error: pagosError } = usePagos()
  const { gastos, cargarGastos, loading: gastosLoading } = useGastos()
  const { estudiantes, cargarEstudiantes, loading: estudiantesLoading } = useEstudiantes()
  const { reporteConceptos, cargarReporteConceptos } = useReporteConceptos()

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        await cargarEstudiantes(institucionActiva.id)
        await cargarPagos(institucionActiva.id)
        await cargarGastos(institucionActiva.id)
        await cargarReporteConceptos(institucionActiva.id)
      } catch (error) {
        console.error('Error cargando dashboard:', error)
      }
    }

    cargarDatos()
  }, [institucionActiva.id])

  const esHoy = (fecha: string): boolean => {
    const hoy = new Date().toISOString().split('T')[0]
    const pagoFecha = new Date(fecha).toISOString().split('T')[0]
    return hoy === pagoFecha
  }

  // Función para detectar si un pago está anulado
  const esAnulado = (pago: any): boolean => {
    return pago.estado === 'ANULADO'
  }

  // Cálculos
  const pagosHoy = pagos.filter(p => !esAnulado(p) && esHoy(p.fecha_pago)).reduce((sum, p) => sum + p.monto_pagado, 0)
  const cantidadPagosHoy = pagos.filter(p => !esAnulado(p) && esHoy(p.fecha_pago)).length
  const totalRecaudado = pagos.filter(p => !esAnulado(p)).reduce((sum, p) => sum + p.monto_pagado, 0)
  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0)
  const neto = totalRecaudado - totalGastos

  // Estadísticas de estudiantes
  const activos = estudiantes.filter(e => e.estado === 'ACTIVO').length
  const becados50 = estudiantes.filter(e => e.estado === 'BECADO_50').length
  const becados100 = estudiantes.filter(e => e.estado === 'BECADO_100').length

  // Últimos 7 días de pagos
  const ultimosPagos = useMemo(() => {
    const hoy = new Date()
    const datos: Record<string, number> = {}
    
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy)
      fecha.setDate(fecha.getDate() - i)
      const fechaStr = fecha.toISOString().split('T')[0]
      datos[fechaStr] = pagos
        .filter(p => !esAnulado(p) && p.fecha_pago.startsWith(fechaStr))
        .reduce((sum, p) => sum + p.monto_pagado, 0)
    }
    
    return datos
  }, [pagos])

  const isLoading = pagosLoading || gastosLoading || estudiantesLoading

  // Gráficos
  const chartConceptos = {
    labels: reporteConceptos.slice(0, 5).map(c => c.concepto),
    datasets: [
      {
        label: 'Adeudado',
        data: reporteConceptos.slice(0, 5).map(c => c.monto_adeudado),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
      },
      {
        label: 'Pagado',
        data: reporteConceptos.slice(0, 5).map(c => c.monto_total_pagado),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
      },
    ],
  }

  const chartEstados = {
    labels: ['Activos', 'Becado 50%', 'Becado 100%'],
    datasets: [
      {
        data: [activos, becados50, becados100],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(168, 85, 247, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(251, 146, 60, 1)',
          'rgba(168, 85, 247, 1)',
        ],
        borderWidth: 2,
      },
    ],
  }

  const chartPagosUltimaSemana = {
    labels: Object.keys(ultimosPagos).map(f => {
      const date = new Date(f)
      return date.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit' })
    }),
    datasets: [
      {
        label: 'Pagos Diarios',
        data: Object.values(ultimosPagos),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/50 animate-pulse">
            <Activity size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-slate-400 mt-1">{institucionActiva.nombre}</p>
          </div>
        </div>
        <button className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-blue-400 transition-all duration-300">
          <RefreshCw size={24} />
        </button>
      </div>

      {/* Error State */}
      {pagosError && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-300">Error al cargar pagos</p>
            <p className="text-sm text-red-200">{pagosError}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/50">
            <Activity size={32} className="text-blue-400 animate-spin" />
          </div>
          <span className="ml-4 text-slate-400 font-semibold">Cargando datos...</span>
        </div>
      ) : (
        <>
          {/* KPIs PRINCIPALES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {/* Cobrado Hoy */}
            <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-green-500/50 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition">
                  <DollarSign size={24} className="text-green-400" />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-green-400">
                  <ArrowUp size={14} />
                  +5%
                </div>
              </div>
              <p className="text-xs text-slate-400 font-bold mb-1">Cobrado Hoy</p>
              <p className="text-2xl font-black text-green-400">{formatoMoneda(pagosHoy)}</p>
              <p className="text-xs text-slate-500 mt-2">{cantidadPagosHoy} transacción(es)</p>
            </div>

            {/* Total Recaudado */}
            <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-blue-500/50 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition">
                  <TrendingUp size={24} className="text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-slate-400 font-bold mb-1">Total Recaudado</p>
              <p className="text-2xl font-black text-blue-400">{formatoMoneda(totalRecaudado)}</p>
              <p className="text-xs text-slate-500 mt-2">{pagos.filter(p => !esAnulado(p)).length} pagos</p>
            </div>

            {/* Gastos */}
            <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-orange-500/50 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition">
                  <TrendingUp size={24} className="text-orange-400 rotate-180" />
                </div>
              </div>
              <p className="text-xs text-slate-400 font-bold mb-1">Gastos Totales</p>
              <p className="text-2xl font-black text-orange-400">{formatoMoneda(totalGastos)}</p>
              <p className="text-xs text-slate-500 mt-2">{gastos.length} gastos</p>
            </div>

            {/* Neto */}
            <div className={`p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-${neto >= 0 ? 'purple' : 'red'}-500/50 transition-all group`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg group-hover:brightness-110 transition ${neto >= 0 ? 'bg-purple-500/20' : 'bg-red-500/20'}`}>
                  <Zap size={24} className={neto >= 0 ? 'text-purple-400' : 'text-red-400'} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${neto >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                  {neto >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  {Math.abs(neto / totalRecaudado * 100).toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-slate-400 font-bold mb-1">Neto</p>
              <p className={`text-2xl font-black ${neto >= 0 ? 'text-purple-400' : 'text-red-400'}`}>{formatoMoneda(neto)}</p>
              <p className="text-xs text-slate-500 mt-2">{neto >= 0 ? '✓ Positivo' : '⚠️ Negativo'}</p>
            </div>
          </div>

          {/* GRÁFICOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            {/* Pagos Últimas 7 días */}
            <div className="lg:col-span-2 p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <h2 className="text-lg font-bold text-white mb-4">Pagos - Últimos 7 Días</h2>
              <div style={{ height: '250px' }}>
                <Line data={chartPagosUltimaSemana} options={{
                  maintainAspectRatio: false,
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      grid: { color: 'rgba(100, 116, 139, 0.1)' },
                      ticks: { color: '#cbd5e1' },
                    },
                    x: {
                      grid: { color: 'rgba(100, 116, 139, 0.1)' },
                      ticks: { color: '#cbd5e1' },
                    },
                  },
                }} />
              </div>
            </div>

            {/* Estados de Estudiantes */}
            <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <h2 className="text-lg font-bold text-white mb-4">Estudiantes</h2>
              <div style={{ height: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ width: '100%', maxWidth: '200px' }}>
                  <Pie data={chartEstados} options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                      legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 11 } } },
                    },
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* CONTENIDO INFERIOR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Deuda vs Pagos por Concepto */}
            <div className="lg:col-span-2 p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <h2 className="text-lg font-bold text-white mb-4">Top Conceptos</h2>
              <div style={{ height: '280px' }}>
                <Bar data={chartConceptos} options={{
                  maintainAspectRatio: false,
                  responsive: true,
                  indexAxis: 'y',
                  plugins: { legend: { labels: { color: '#cbd5e1' } } },
                  scales: {
                    x: {
                      grid: { color: 'rgba(100, 116, 139, 0.1)' },
                      ticks: { color: '#cbd5e1' },
                    },
                    y: {
                      grid: { color: 'rgba(100, 116, 139, 0.1)' },
                      ticks: { color: '#cbd5e1' },
                    },
                  },
                }} />
              </div>
            </div>

            {/* Información de Institución */}
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl space-y-4">
              <div>
                <p className="text-xs text-slate-400 font-bold mb-1">Institución</p>
                <p className="text-sm font-bold text-white">{institucionActiva.nombre}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold mb-1">CUIT</p>
                <p className="text-sm font-bold text-white">{institucionActiva.cuit}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold mb-1">Punto de Venta</p>
                <p className="text-sm font-bold text-white">{institucionActiva.punto_venta}</p>
              </div>
              <div className="pt-4 border-t border-slate-700/50">
                <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                  <CheckCircle size={16} />
                  Conectado a Supabase
                </div>
              </div>
            </div>
          </div>

          {/* TARJETAS RESUMEN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Estudiantes */}
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Users size={24} className="text-purple-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-300">Total Estudiantes</h3>
              </div>
              <p className="text-3xl font-black text-purple-400">{estudiantes.length}</p>
              <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Activos</span>
                  <span className="text-green-400 font-bold">{activos}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Becado 50%</span>
                  <span className="text-orange-400 font-bold">{becados50}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Becado 100%</span>
                  <span className="text-purple-400 font-bold">{becados100}</span>
                </div>
              </div>
            </div>

            {/* Pagos Registrados */}
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Calendar size={24} className="text-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-300">Pagos Registrados</h3>
              </div>
              <p className="text-3xl font-black text-blue-400">{pagos.filter(p => !p.anulado).length}</p>
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Hoy</span>
                  <span className="text-green-400 font-bold">{cantidadPagosHoy}</span>
                </div>
              </div>
            </div>

            {/* Gastos */}
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-500/20 rounded-lg">
                  <PieChart size={24} className="text-orange-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-300">Gastos</h3>
              </div>
              <p className="text-3xl font-black text-orange-400">{gastos.length}</p>
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total</span>
                  <span className="text-orange-400 font-bold">{formatoMoneda(totalGastos)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}