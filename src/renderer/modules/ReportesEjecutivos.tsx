import React, { useState } from 'react'
import { useReportesEjecutivos } from '@renderer/hooks/useReportesEjecutivos'
import { formatoMoneda } from '@renderer/lib/helpers'
import { BarChart3, TrendingUp, AlertCircle, Users, RefreshCw, Target, Zap, DollarSign, Gauge, Activity, Calendar, PieChart, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler } from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler)

// ========== KPI CARD MEJORADA ==========
interface KPICardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  bgColor: string
  textColor: string
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, bgColor, textColor }) => (
  <div className={`p-4 rounded-xl shadow-lg border border-slate-700/50 hover:shadow-xl transition-all ${bgColor}`}>
    <div className="flex items-start justify-between mb-2">
      <div className="p-2 bg-black/40 rounded-lg text-lg">{icon}</div>
    </div>
    <p className="text-xs text-slate-400 font-bold mb-1">{title}</p>
    <p className={`text-2xl font-black ${textColor} leading-tight mb-1 break-words`}>{value}</p>
    {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
  </div>
)

// ========== ALERTAS COMPACTAS ==========
const AlertasCompactas: React.FC<{ alertas: any[] }> = ({ alertas }) => {
  if (alertas.length === 0) return null

  const getAlertBg = (tipo: string) => {
    const map = {
      CRITICA: 'bg-red-500/15 border-l-4 border-red-500',
      ALTA: 'bg-orange-500/15 border-l-4 border-orange-500',
      MEDIA: 'bg-yellow-500/15 border-l-4 border-yellow-500',
      BUENA: 'bg-green-500/15 border-l-4 border-green-500',
    }
    return map[tipo as keyof typeof map] || map.MEDIA
  }

  const getIcon = (tipo: string) => {
    const map = {
      CRITICA: '🔴',
      ALTA: '🟠',
      MEDIA: '🟡',
      BUENA: '✅',
    }
    return map[tipo as keyof typeof map] || '●'
  }

  const alertasTop = alertas.slice(0, 3)

  return (
    <div className="mb-6 space-y-2">
      {alertasTop.map((alerta) => (
        <div key={alerta.id} className={`p-3 rounded-lg ${getAlertBg(alerta.tipo)} flex items-start gap-2`}>
          <span className="text-sm flex-shrink-0 mt-0.5">{getIcon(alerta.tipo)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-200">{alerta.titulo}</p>
            <p className="text-xs text-slate-400 line-clamp-1">{alerta.descripcion}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ========== MAIN COMPONENT ==========
export const ReportesEjecutivos: React.FC = () => {
  const { consolidado, isipp, milagros, comparativa, flujoCaja, rentabilidad, alertas, loading, error, refrescar } = useReportesEjecutivos()
  const [tabActiva, setTabActiva] = useState('global')

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 size={48} className="text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-bold">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 max-w-sm">
          <p className="text-red-400 font-bold text-sm mb-2">Error:</p>
          <p className="text-red-300 text-xs mb-3">{error}</p>
          <button onClick={refrescar} className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const chartRecaudosVsAdeudado = {
    labels: ['Recaudado', 'Adeudado'],
    datasets: [
      { label: 'ISIPP', data: [isipp.recaudoAnual, isipp.adeudadoAnual], backgroundColor: 'rgba(59, 130, 246, 0.7)', borderColor: 'rgba(59, 130, 246, 1)' },
      { label: 'Milagros', data: [milagros.recaudoAnual, milagros.adeudadoAnual], backgroundColor: 'rgba(239, 68, 68, 0.7)', borderColor: 'rgba(239, 68, 68, 1)' },
    ],
  }

  const chartFlujoCaja = {
    labels: flujoCaja.map(f => f.mesNombre.substring(0, 3)),
    datasets: [
      { label: 'Entra', data: flujoCaja.map(f => f.entra), borderColor: 'rgba(34, 197, 94, 1)', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderWidth: 2, fill: true, tension: 0.4 },
      { label: 'Sale', data: flujoCaja.map(f => f.sale), borderColor: 'rgba(239, 68, 68, 1)', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 2, fill: true, tension: 0.4 },
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
        backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(239, 68, 68, 0.8)'],
        borderWidth: 2,
      },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text mb-1">
            📊 PANEL EJECUTIVO
          </h1>
          <p className="text-slate-400 text-xs md:text-sm">Visión global de ambas instituciones</p>
        </div>
        <button onClick={refrescar} className="p-2 hover:bg-slate-700/50 rounded-lg transition-all" title="Actualizar">
          <RefreshCw size={20} className="text-cyan-400" />
        </button>
      </div>

      {/* ALERTAS COMPACTAS */}
      <AlertasCompactas alertas={alertas} />

      {/* KPI CARDS - 3x2 GRID MEJOR ESPACIADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <KPICard
          title="💰 Recaudado Total"
          value={formatoMoneda(consolidado.recaudoTotal)}
          subtitle="Ambas instituciones"
          icon={<DollarSign className="text-green-400" size={20} />}
          bgColor="bg-gradient-to-br from-green-600/25 to-green-900/15 border border-green-500/30"
          textColor="text-green-300"
        />
        <KPICard
          title="📌 Adeudado Total"
          value={formatoMoneda(consolidado.adeudadoTotal)}
          subtitle={`${consolidado.porcentajeMora.toFixed(1)}% en mora`}
          icon={<AlertCircle className="text-red-400" size={20} />}
          bgColor="bg-gradient-to-br from-red-600/25 to-red-900/15 border border-red-500/30"
          textColor="text-red-300"
        />
        <KPICard
          title="💸 Gastos Totales"
          value={formatoMoneda(consolidado.gastosTotal)}
          subtitle="De ambas instituciones"
          icon={<TrendingDown className="text-orange-400" size={20} />}
          bgColor="bg-gradient-to-br from-orange-600/25 to-orange-900/15 border border-orange-500/30"
          textColor="text-orange-300"
        />
        <KPICard
          title="🟣 NETO DISPONIBLE"
          value={formatoMoneda(consolidado.netoTotal)}
          subtitle="Recaudado - Gastos"
          icon={<DollarSign className="text-purple-400" size={20} />}
          bgColor="bg-gradient-to-br from-purple-600/25 to-purple-900/15 border border-purple-500/30"
          textColor="text-purple-300"
        />
        <KPICard
          title="💵 P/Mejoras"
          value={formatoMoneda(consolidado.dineroParaMejoras)}
          subtitle="80% del neto"
          icon={<Zap className="text-yellow-400" size={20} />}
          bgColor="bg-gradient-to-br from-yellow-600/25 to-yellow-900/15 border border-yellow-500/30"
          textColor="text-yellow-300"
        />
        <KPICard
          title="📊 Salud Financiera"
          value={`${consolidado.saludFinanciera}/100`}
          subtitle={consolidado.saludFinanciera > 75 ? 'Excelente' : consolidado.saludFinanciera > 60 ? 'Buena' : 'Alerta'}
          icon={<Activity className="text-cyan-400" size={20} />}
          bgColor="bg-gradient-to-br from-cyan-600/25 to-cyan-900/15 border border-cyan-500/30"
          textColor="text-cyan-300"
        />
      </div>

      {/* TABS */}
      <div className="mb-6 flex gap-1 overflow-x-auto pb-1 border-b border-slate-700/50">
        {[
          { id: 'global', label: 'Global', icon: Gauge },
          { id: 'isipp', label: 'ISIPP', icon: Activity },
          { id: 'milagros', label: 'Milagros', icon: Activity },
          { id: 'comparativa', label: 'Comparativa', icon: BarChart3 },
          { id: 'flujoCaja', label: 'Flujo Caja', icon: TrendingUp },
          { id: 'rentabilidad', label: 'Rentabilidad', icon: Target },
          { id: 'insights', label: 'Insights', icon: Zap },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTabActiva(id)}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 whitespace-nowrap transition-all ${
              tabActiva === id
                ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg'
                : 'bg-slate-700/30 text-slate-400 hover:bg-slate-600/50'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      <div className="space-y-4">
        {tabActiva === 'global' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/50 rounded-xl shadow-lg">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <BarChart3 size={18} className="text-cyan-400" />
                  Recaudado vs Adeudado
                </h3>
                <div style={{ height: '250px' }}>
                  <Bar
                    data={chartRecaudosVsAdeudado}
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      scales: {
                        y: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { color: 'rgba(100, 116, 139, 0.05)' } },
                        x: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { display: false } },
                      },
                      plugins: {
                        legend: { labels: { color: '#cbd5e1', font: { size: 11 } }, padding: 10 },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/50 rounded-xl shadow-lg">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <PieChart size={18} className="text-purple-400" />
                  Distribución de Ingresos
                </h3>
                <div style={{ height: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: '100%', maxWidth: '180px' }}>
                    <Pie
                      data={chartDistribucion}
                      options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        plugins: {
                          legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 10 } }, padding: 8 },
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla */}
            <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/50 rounded-xl shadow-lg overflow-x-auto">
              <h3 className="text-sm font-bold text-white mb-3">Comparativa</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-900/50">
                    <th className="px-2 py-2 text-left font-bold text-slate-300">Inst.</th>
                    <th className="px-2 py-2 text-right text-green-400">Recaudado</th>
                    <th className="px-2 py-2 text-right text-red-400">Adeudado</th>
                    <th className="px-2 py-2 text-right text-orange-400">Gastos</th>
                    <th className="px-2 py-2 text-right text-purple-400">Neto</th>
                    <th className="px-2 py-2 text-right text-cyan-400">Efic.</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-b border-slate-700/30 hover:bg-slate-900/50">
                    <td className="px-2 py-2 font-bold text-slate-300">ISIPP</td>
                    <td className="px-2 py-2 text-right text-green-300">{formatoMoneda(isipp.recaudoAnual).split('.')[0]}</td>
                    <td className="px-2 py-2 text-right text-red-300">{formatoMoneda(isipp.adeudadoAnual).split('.')[0]}</td>
                    <td className="px-2 py-2 text-right text-orange-300">{formatoMoneda(isipp.gastosAnual).split('.')[0]}</td>
                    <td className="px-2 py-2 text-right text-purple-300">{formatoMoneda(isipp.netoAnual).split('.')[0]}</td>
                    <td className="px-2 py-2 text-right text-cyan-300 font-bold">{isipp.eficiencia.toFixed(0)}%</td>
                  </tr>
                  <tr className="border-b border-slate-700/30 hover:bg-slate-900/50">
                    <td className="px-2 py-2 font-bold text-slate-300">Milagros</td>
                    <td className="px-2 py-2 text-right text-green-300">{formatoMoneda(milagros.recaudoAnual).split('.')[0]}</td>
                    <td className="px-2 py-2 text-right text-red-300">{formatoMoneda(milagros.adeudadoAnual).split('.')[0]}</td>
                    <td className="px-2 py-2 text-right text-orange-300">{formatoMoneda(milagros.gastosAnual).split('.')[0]}</td>
                    <td className="px-2 py-2 text-right text-purple-300">{formatoMoneda(milagros.netoAnual).split('.')[0]}</td>
                    <td className="px-2 py-2 text-right text-cyan-300 font-bold">{milagros.eficiencia.toFixed(0)}%</td>
                  </tr>
                  <tr className="bg-slate-800/50 font-bold text-xs">
                    <td className="px-2 py-2 text-slate-200">TOTAL</td>
                    <td className="px-2 py-2 text-right text-green-400">{formatoMoneda(consolidado.recaudoTotal).split('.')[0]}</td>
                    <td className="px-2 py-2 text-right text-red-400">{formatoMoneda(consolidado.adeudadoTotal).split('.')[0]}</td>
                    <td className="px-2 py-2 text-right text-orange-400">{formatoMoneda(consolidado.gastosTotal).split('.')[0]}</td>
                    <td className="px-2 py-2 text-right text-purple-400">{formatoMoneda(consolidado.netoTotal).split('.')[0]}</td>
                    <td className="px-2 py-2 text-right text-cyan-400">{((consolidado.recaudoTotal / (consolidado.recaudoTotal + consolidado.adeudadoTotal)) * 100).toFixed(0)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {tabActiva === 'flujoCaja' && (
          <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/50 rounded-xl shadow-lg">
            <h3 className="text-sm font-bold text-white mb-3">Proyección 12 Meses</h3>
            <div style={{ height: '280px' }}>
              <Line
                data={chartFlujoCaja}
                options={{
                  maintainAspectRatio: false,
                  responsive: true,
                  scales: {
                    y: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { color: 'rgba(100, 116, 139, 0.05)' } },
                    x: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { display: false } },
                  },
                  plugins: {
                    legend: { labels: { color: '#cbd5e1', font: { size: 11 } }, padding: 10 },
                  },
                }}
              />
            </div>
          </div>
        )}

        {['isipp', 'milagros', 'comparativa', 'rentabilidad', 'insights'].includes(tabActiva) && (
          <div className="p-6 bg-slate-800/50 rounded-lg text-center text-slate-400 text-sm">
            {tabActiva.charAt(0).toUpperCase() + tabActiva.slice(1)} - Próximamente
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportesEjecutivos
