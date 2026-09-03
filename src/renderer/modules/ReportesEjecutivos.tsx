import React, { useState } from 'react'
import { useReportesEjecutivos } from '@renderer/hooks/useReportesEjecutivos'
import { formatoMoneda } from '@renderer/lib/helpers'
import { BarChart3, TrendingUp, AlertCircle, Users, RefreshCw, Target, Zap, DollarSign, Gauge, Activity, Calendar, PieChart, TrendingDown, Award, ChevronDown, ChevronUp } from 'lucide-react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler } from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler)

// ========== SUB-COMPONENTES ==========

// KPI Cards Top
interface KPICardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  bgColor: string
  textColor: string
  trend?: { value: number; positive: boolean }
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, bgColor, textColor, trend }) => (
  <div className={`p-6 rounded-2xl shadow-lg border border-slate-700/50 hover:shadow-xl transition-all ${bgColor}`}>
    <div className="flex items-start justify-between mb-3">
      <div className="p-3 bg-black/30 rounded-lg">{icon}</div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${trend.positive ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'}`}>
          {trend.positive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {trend.value.toFixed(1)}%
        </div>
      )}
    </div>
    <p className="text-xs text-slate-400 font-bold mb-1">{title}</p>
    <p className={`text-3xl font-black ${textColor} mb-1`}>{value}</p>
    {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
  </div>
)

// Alertas Inteligentes
const AlertasInteligentes: React.FC<{ alertas: any[] }> = ({ alertas }) => {
  if (alertas.length === 0) return null

  const getAlertColor = (tipo: string) => {
    const colors = {
      CRITICA: 'bg-red-500/20 border-red-500/50 text-red-300',
      ALTA: 'bg-orange-500/20 border-orange-500/50 text-orange-300',
      MEDIA: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
      BUENA: 'bg-green-500/20 border-green-500/50 text-green-300',
    }
    return colors[tipo as keyof typeof colors] || colors.MEDIA
  }

  const getAlertIcon = (tipo: string) => {
    const icons = {
      CRITICA: '🔴',
      ALTA: '🟠',
      MEDIA: '🟡',
      BUENA: '🟢',
    }
    return icons[tipo as keyof typeof icons] || '●'
  }

  return (
    <div className="space-y-2 mb-6">
      {alertas.slice(0, 4).map((alerta) => (
        <div key={alerta.id} className={`p-4 rounded-lg border ${getAlertColor(alerta.tipo)} flex items-start gap-3`}>
          <span className="text-lg">{getAlertIcon(alerta.tipo)}</span>
          <div className="flex-1">
            <p className="font-bold text-sm">{alerta.titulo}</p>
            <p className="text-xs opacity-90">{alerta.descripcion}</p>
            {alerta.accion && <p className="text-xs opacity-75 mt-1 italic">→ {alerta.accion}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// Main Component
export const ReportesEjecutivos: React.FC = () => {
  const { consolidado, isipp, milagros, comparativa, flujoCaja, rentabilidad, alertas, loading, error, refrescar } = useReportesEjecutivos()
  const [tabActiva, setTabActiva] = useState('global')

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 size={64} className="text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-bold">Cargando panel ejecutivo...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 max-w-md">
          <p className="text-red-400 font-bold mb-3">Error al cargar reportes:</p>
          <p className="text-red-300 text-sm mb-4">{error}</p>
          <button onClick={refrescar} className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Gráficos
  const chartRecaudosVsAdeudado = {
    labels: ['Recaudado', 'Adeudado'],
    datasets: [
      {
        label: 'ISIPP',
        data: [isipp.recaudoAnual, isipp.adeudadoAnual],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
      },
      {
        label: 'Milagros',
        data: [milagros.recaudoAnual, milagros.adeudadoAnual],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
      },
    ],
  }

  const chartFlujoCaja = {
    labels: flujoCaja.map(f => f.mesNombre.substring(0, 3)),
    datasets: [
      {
        label: 'Entra',
        data: flujoCaja.map(f => f.entra),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Sale',
        data: flujoCaja.map(f => f.sale),
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const chartDistribucion = {
    labels: ['ISIPP', 'Milagros'],
    datasets: [
      {
        data: [
          (isipp.recaudoAnual / (isipp.recaudoAnual + milagros.recaudoAnual)) * 100,
          (milagros.recaudoAnual / (isipp.recaudoAnual + milagros.recaudoAnual)) * 100,
        ],
        backgroundColor: ['rgba(59, 130, 246, 0.9)', 'rgba(239, 68, 68, 0.9)'],
        borderColor: ['rgba(59, 130, 246, 1)', 'rgba(239, 68, 68, 1)'],
        borderWidth: 2,
      },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-5xl font-black text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text mb-2">
            📊 PANEL EJECUTIVO
          </h1>
          <p className="text-slate-400">Visión global de ambas instituciones</p>
        </div>
        <button onClick={refrescar} className="p-3 hover:bg-slate-700/50 rounded-xl transition-all hover:scale-110" title="Actualizar">
          <RefreshCw size={24} className="text-cyan-400 animate-spin-slow" />
        </button>
      </div>

      {/* ALERTAS */}
      <AlertasInteligentes alertas={alertas} />

      {/* KPI CARDS TOP (6 cards principales) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <KPICard
          title="Recaudado Total"
          value={formatoMoneda(consolidado.recaudoTotal)}
          subtitle="Ambas instituciones"
          icon={<DollarSign className="text-green-400" size={24} />}
          bgColor="bg-gradient-to-br from-green-600/30 to-green-900/20 border border-green-500/40"
          textColor="text-green-300"
        />
        <KPICard
          title="Adeudado Total"
          value={formatoMoneda(consolidado.adeudadoTotal)}
          subtitle={`${consolidado.porcentajeMora.toFixed(1)}% en mora`}
          icon={<AlertCircle className="text-red-400" size={24} />}
          bgColor="bg-gradient-to-br from-red-600/30 to-red-900/20 border border-red-500/40"
          textColor="text-red-300"
        />
        <KPICard
          title="Gastos Totales"
          value={formatoMoneda(consolidado.gastosTotal)}
          subtitle="Ambas instituciones"
          icon={<TrendingDown className="text-orange-400" size={24} />}
          bgColor="bg-gradient-to-br from-orange-600/30 to-orange-900/20 border border-orange-500/40"
          textColor="text-orange-300"
        />
        <KPICard
          title="NETO DISPONIBLE"
          value={formatoMoneda(consolidado.netoTotal)}
          subtitle="Lo más importante"
          icon={<DollarSign className="text-purple-400" size={24} />}
          bgColor="bg-gradient-to-br from-purple-600/30 to-purple-900/20 border border-purple-500/40"
          textColor="text-purple-200"
          trend={{ value: 12.5, positive: true }}
        />
        <KPICard
          title="💵 P/Mejoras"
          value={formatoMoneda(consolidado.dineroParaMejoras)}
          subtitle="Inversión disponible"
          icon={<Zap className="text-yellow-400" size={24} />}
          bgColor="bg-gradient-to-br from-yellow-600/30 to-yellow-900/20 border border-yellow-500/40"
          textColor="text-yellow-300"
        />
        <KPICard
          title="Salud Financiera"
          value={`${consolidado.saludFinanciera}/100`}
          subtitle={consolidado.saludFinanciera > 75 ? 'Excelente' : consolidado.saludFinanciera > 60 ? 'Buena' : 'Requiere atención'}
          icon={<Activity className="text-cyan-400" size={24} />}
          bgColor="bg-gradient-to-br from-cyan-600/30 to-cyan-900/20 border border-cyan-500/40"
          textColor="text-cyan-300"
        />
      </div>

      {/* TABS */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 border-b border-slate-700/50">
        {[
          { id: 'global', label: 'Vista Global', icon: Gauge },
          { id: 'isipp', label: 'ISIPP Detallado', icon: Activity },
          { id: 'milagros', label: 'Milagros Detallado', icon: Activity },
          { id: 'comparativa', label: 'Comparativa', icon: BarChart3 },
          { id: 'flujoCaja', label: 'Flujo Caja', icon: TrendingUp },
          { id: 'rentabilidad', label: 'Rentabilidad', icon: Target },
          { id: 'insights', label: 'Insights', icon: Zap },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTabActiva(id)}
            className={`px-4 py-3 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
              tabActiva === id
                ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className="space-y-6">
        {tabActiva === 'global' && (
          <>
            {/* Vista Global */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 size={24} className="text-cyan-400" />
                  Recaudado vs Adeudado
                </h3>
                <div style={{ height: '300px' }}>
                  <Bar
                    data={chartRecaudosVsAdeudado}
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      scales: {
                        y: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(100, 116, 139, 0.1)' } },
                        x: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(100, 116, 139, 0.1)' } },
                      },
                      plugins: {
                        legend: { labels: { color: '#cbd5e1', font: { size: 12, weight: 'bold' } } },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <PieChart size={24} className="text-purple-400" />
                  Distribución de Ingresos
                </h3>
                <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: '100%', maxWidth: '200px' }}>
                    <Pie
                      data={chartDistribucion}
                      options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        plugins: {
                          legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 11 } } },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla Comparativa Rápida */}
            <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl overflow-x-auto">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={24} className="text-green-400" />
                Comparativa Rápida
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-4 py-3 text-left font-bold text-white">Institución</th>
                    <th className="px-4 py-3 text-right font-bold text-green-400">Recaudado</th>
                    <th className="px-4 py-3 text-right font-bold text-red-400">Adeudado</th>
                    <th className="px-4 py-3 text-right font-bold text-orange-400">Gastos</th>
                    <th className="px-4 py-3 text-right font-bold text-purple-400">Neto</th>
                    <th className="px-4 py-3 text-center font-bold text-cyan-400">Eficiencia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700/30 hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-200">ISIPP</td>
                    <td className="px-4 py-3 text-right text-green-300">{formatoMoneda(isipp.recaudoAnual)}</td>
                    <td className="px-4 py-3 text-right text-red-300">{formatoMoneda(isipp.adeudadoAnual)}</td>
                    <td className="px-4 py-3 text-right text-orange-300">{formatoMoneda(isipp.gastosAnual)}</td>
                    <td className="px-4 py-3 text-right text-purple-300">{formatoMoneda(isipp.netoAnual)}</td>
                    <td className="px-4 py-3 text-center text-cyan-300 font-bold">{isipp.eficiencia.toFixed(1)}%</td>
                  </tr>
                  <tr className="border-b border-slate-700/30 hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-200">Milagros</td>
                    <td className="px-4 py-3 text-right text-green-300">{formatoMoneda(milagros.recaudoAnual)}</td>
                    <td className="px-4 py-3 text-right text-red-300">{formatoMoneda(milagros.adeudadoAnual)}</td>
                    <td className="px-4 py-3 text-right text-orange-300">{formatoMoneda(milagros.gastosAnual)}</td>
                    <td className="px-4 py-3 text-right text-purple-300">{formatoMoneda(milagros.netoAnual)}</td>
                    <td className="px-4 py-3 text-center text-cyan-300 font-bold">{milagros.eficiencia.toFixed(1)}%</td>
                  </tr>
                  <tr className="bg-slate-800/50 font-bold">
                    <td className="px-4 py-3 text-slate-200">TOTAL</td>
                    <td className="px-4 py-3 text-right text-green-400">{formatoMoneda(consolidado.recaudoTotal)}</td>
                    <td className="px-4 py-3 text-right text-red-400">{formatoMoneda(consolidado.adeudadoTotal)}</td>
                    <td className="px-4 py-3 text-right text-orange-400">{formatoMoneda(consolidado.gastosTotal)}</td>
                    <td className="px-4 py-3 text-right text-purple-400">{formatoMoneda(consolidado.netoTotal)}</td>
                    <td className="px-4 py-3 text-center text-cyan-400">
                      {((consolidado.recaudoTotal / (consolidado.recaudoTotal + consolidado.adeudadoTotal)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {tabActiva === 'flujoCaja' && (
          <div className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={24} className="text-green-400" />
              Proyección Flujo de Caja 12 Meses
            </h3>
            <div style={{ height: '350px' }}>
              <Line
                data={chartFlujoCaja}
                options={{
                  maintainAspectRatio: false,
                  responsive: true,
                  scales: {
                    y: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(100, 116, 139, 0.1)' } },
                    x: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(100, 116, 139, 0.1)' } },
                  },
                  plugins: {
                    legend: { labels: { color: '#cbd5e1', font: { size: 12, weight: 'bold' } } },
                  },
                }}
              />
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-xs text-green-400 font-bold mb-1">Acumulado al cierre de año</p>
                <p className="text-3xl font-black text-green-300">{formatoMoneda(flujoCaja[flujoCaja.length - 1]?.acumulado || 0)}</p>
              </div>
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-400 font-bold mb-1">Promedio mensual neto</p>
                <p className="text-3xl font-black text-blue-300">
                  {formatoMoneda(flujoCaja.reduce((s, f) => s + f.neto, 0) / flujoCaja.length)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Placeholders para otros tabs */}
        {tabActiva === 'isipp' && <div className="p-6 bg-slate-800/50 rounded-lg text-center text-slate-400">ISIPP Detallado - En construcción...</div>}
        {tabActiva === 'milagros' && <div className="p-6 bg-slate-800/50 rounded-lg text-center text-slate-400">Milagros Detallado - En construcción...</div>}
        {tabActiva === 'comparativa' && <div className="p-6 bg-slate-800/50 rounded-lg text-center text-slate-400">Comparativa - En construcción...</div>}
        {tabActiva === 'rentabilidad' && <div className="p-6 bg-slate-800/50 rounded-lg text-center text-slate-400">Rentabilidad - En construcción...</div>}
        {tabActiva === 'insights' && <div className="p-6 bg-slate-800/50 rounded-lg text-center text-slate-400">Insights - En construcción...</div>}
      </div>
    </div>
  )
}

export default ReportesEjecutivos
