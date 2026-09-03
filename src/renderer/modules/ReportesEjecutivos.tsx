import React, { useState } from 'react'
import { useReportesEjecutivos } from '@renderer/hooks/useReportesEjecutivos'
import { formatoMoneda } from '@renderer/lib/helpers'
import { BarChart3, TrendingUp, AlertCircle, Users, RefreshCw, Target, Zap, DollarSign, Gauge, Activity, Calendar, PieChart, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler } from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler)

// ========== KPI CARD ==========
interface KPICardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  bgColor: string
  textColor: string
  size?: 'sm' | 'md'
}

const KPICard: React.FC<KPICardProps> = ({ title, value, subtitle, icon, bgColor, textColor, size = 'md' }) => (
  <div className={`p-4 rounded-lg shadow-lg border border-slate-700/50 hover:shadow-xl transition-all ${bgColor}`}>
    <div className="flex items-start justify-between mb-2">
      <div className="p-2 bg-black/40 rounded-lg text-lg">{icon}</div>
    </div>
    <p className="text-xs text-slate-400 font-bold mb-1">{title}</p>
    <p className={`${size === 'sm' ? 'text-lg' : 'text-2xl'} font-black ${textColor} leading-tight mb-1 break-words`}>{value}</p>
    {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
  </div>
)

// ========== ALERTAS COLAPSABLES ==========
const AlertasColapsables: React.FC<{ alertas: any[] }> = ({ alertas }) => {
  const [expandido, setExpandido] = useState(true)

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

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 rounded-lg transition-all font-bold text-slate-200"
      >
        <div className="flex items-center gap-2">
          <AlertCircle size={18} className="text-yellow-400" />
          <span>🔔 Alertas ({alertas.length})</span>
        </div>
        {expandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {expandido && (
        <div className="mt-2 space-y-2">
          {alertas.slice(0, 5).map((alerta) => (
            <div key={alerta.id} className={`p-3 rounded-lg ${getAlertBg(alerta.tipo)} flex items-start gap-2`}>
              <span className="text-sm flex-shrink-0 mt-0.5">{getIcon(alerta.tipo)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200">{alerta.titulo}</p>
                <p className="text-xs text-slate-400 line-clamp-2">{alerta.descripcion}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ========== MAIN COMPONENT ==========
export const ReportesEjecutivos: React.FC = () => {
  const { consolidado, isipp, milagros, comparativa, flujoCaja, rentabilidad, alertas, loading, error, refrescar } = useReportesEjecutivos()
  const [tabActiva, setTabActiva] = useState('global')
  const [expandidosISIPP, setExpandidosISIPP] = useState<Record<string, boolean>>({})
  const [expandidosMilagros, setExpandidosMilagros] = useState<Record<string, boolean>>({})

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

  // CHARTS
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

  const chartMoraVsAlDia = {
    labels: ['En Mora', 'Al Día'],
    datasets: [
      {
        label: 'ISIPP',
        data: [isipp.estudiantesMora, isipp.totalEstudiantes - isipp.estudiantesMora],
        backgroundColor: ['rgba(239, 68, 68, 0.8)', 'rgba(34, 197, 94, 0.8)'],
      },
      {
        label: 'Milagros',
        data: [milagros.estudiantesMora, milagros.totalEstudiantes - milagros.estudiantesMora],
        backgroundColor: ['rgba(249, 115, 22, 0.8)', 'rgba(34, 197, 94, 0.6)'],
      },
    ],
  }

  const chartEficiencia = {
    labels: ['ISIPP', 'Milagros'],
    datasets: [
      {
        label: 'Eficiencia %',
        data: [isipp.eficiencia, milagros.eficiencia],
        backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(239, 68, 68, 0.7)'],
        borderColor: ['rgba(59, 130, 246, 1)', 'rgba(239, 68, 68, 1)'],
        borderWidth: 2,
      },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text mb-1">
            📊 PANEL EJECUTIVO
          </h1>
          <p className="text-slate-400 text-xs md:text-sm">Consolidado financiero de ambas instituciones</p>
        </div>
        <button onClick={refrescar} className="p-2 hover:bg-slate-700/50 rounded-lg transition-all" title="Actualizar">
          <RefreshCw size={20} className="text-cyan-400" />
        </button>
      </div>

      {/* ALERTAS COLAPSABLES */}
      <AlertasColapsables alertas={alertas} />

      {/* TABS */}
      <div className="mb-4 flex gap-1 overflow-x-auto pb-2 border-b border-slate-700/50">
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
        {/* TAB: GLOBAL */}
        {tabActiva === 'global' && (
          <>
            {/* KPI CARDS DENTRO DE GLOBAL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <KPICard
                title="💰 Recaudado Total"
                value={formatoMoneda(consolidado.recaudoTotal)}
                subtitle="Año en curso"
                icon={<DollarSign className="text-green-400" size={20} />}
                bgColor="bg-gradient-to-br from-green-600/25 to-green-900/15 border border-green-500/30"
                textColor="text-green-300"
              />
              <KPICard
                title="📌 Adeudado Total"
                value={formatoMoneda(consolidado.adeudadoTotal)}
                subtitle={`${consolidado.porcentajeMora.toFixed(1)}% estudiantes`}
                icon={<AlertCircle className="text-red-400" size={20} />}
                bgColor="bg-gradient-to-br from-red-600/25 to-red-900/15 border border-red-500/30"
                textColor="text-red-300"
              />
              <KPICard
                title="💸 Gastos Totales"
                value={formatoMoneda(consolidado.gastosTotal)}
                subtitle="Invertido en operaciones"
                icon={<TrendingDown className="text-orange-400" size={20} />}
                bgColor="bg-gradient-to-br from-orange-600/25 to-orange-900/15 border border-orange-500/30"
                textColor="text-orange-300"
              />
              <KPICard
                title="🟣 Neto Disponible"
                value={formatoMoneda(consolidado.netoTotal)}
                subtitle="Recaudado - Gastos"
                icon={<DollarSign className="text-purple-400" size={20} />}
                bgColor="bg-gradient-to-br from-purple-600/25 to-purple-900/15 border border-purple-500/30"
                textColor="text-purple-300"
              />
              <KPICard
                title="💵 Para Mejoras"
                value={formatoMoneda(consolidado.dineroParaMejoras)}
                subtitle="80% del neto"
                icon={<Zap className="text-yellow-400" size={20} />}
                bgColor="bg-gradient-to-br from-yellow-600/25 to-yellow-900/15 border border-yellow-500/30"
                textColor="text-yellow-300"
              />
              <KPICard
                title="📊 Salud Financiera"
                value={`${consolidado.saludFinanciera}/100`}
                subtitle={consolidado.saludFinanciera > 75 ? '✅ Excelente' : consolidado.saludFinanciera > 60 ? '⚠️ Buena' : '🔴 Alerta'}
                icon={<Activity className="text-cyan-400" size={20} />}
                bgColor="bg-gradient-to-br from-cyan-600/25 to-cyan-900/15 border border-cyan-500/30"
                textColor="text-cyan-300"
              />
            </div>

            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/50 rounded-lg shadow-lg">
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

              <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/50 rounded-lg shadow-lg">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Users size={18} className="text-purple-400" />
                  Estudiantes: Mora vs Al Día
                </h3>
                <div style={{ height: '250px' }}>
                  <Bar
                    data={chartMoraVsAlDia}
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

              <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/50 rounded-lg shadow-lg">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <PieChart size={18} className="text-green-400" />
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

              <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/50 rounded-lg shadow-lg">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-400" />
                  Eficiencia de Cobranza
                </h3>
                <div style={{ height: '250px' }}>
                  <Bar
                    data={chartEficiencia}
                    options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      indexAxis: 'y',
                      scales: {
                        x: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { color: 'rgba(100, 116, 139, 0.05)' } },
                        y: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { display: false } },
                      },
                      plugins: {
                        legend: { labels: { color: '#cbd5e1', font: { size: 11 } }, padding: 10 },
                      },
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Tabla Comparativa */}
            <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/50 rounded-lg shadow-lg overflow-x-auto">
              <h3 className="text-sm font-bold text-white mb-3">📋 Comparativa Consolidada</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-900/50">
                    <th className="px-3 py-2 text-left font-bold text-slate-300">Institución</th>
                    <th className="px-3 py-2 text-right text-green-400">Recaudado</th>
                    <th className="px-3 py-2 text-right text-red-400">Adeudado</th>
                    <th className="px-3 py-2 text-right text-orange-400">Gastos</th>
                    <th className="px-3 py-2 text-right text-purple-400">Neto</th>
                    <th className="px-3 py-2 text-right text-blue-400">Eficiencia</th>
                    <th className="px-3 py-2 text-right text-yellow-400">Estudiantes</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-b border-slate-700/30 hover:bg-slate-900/50">
                    <td className="px-3 py-2 font-bold text-cyan-300">ISIPP</td>
                    <td className="px-3 py-2 text-right text-green-300 font-semibold">{formatoMoneda(isipp.recaudoAnual)}</td>
                    <td className="px-3 py-2 text-right text-red-300">{formatoMoneda(isipp.adeudadoAnual)}</td>
                    <td className="px-3 py-2 text-right text-orange-300">{formatoMoneda(isipp.gastosAnual)}</td>
                    <td className="px-3 py-2 text-right text-purple-300">{formatoMoneda(isipp.netoAnual)}</td>
                    <td className="px-3 py-2 text-right text-blue-300 font-bold">{isipp.eficiencia.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right text-yellow-300">{isipp.totalEstudiantes}</td>
                  </tr>
                  <tr className="border-b border-slate-700/30 hover:bg-slate-900/50">
                    <td className="px-3 py-2 font-bold text-orange-300">Milagros</td>
                    <td className="px-3 py-2 text-right text-green-300 font-semibold">{formatoMoneda(milagros.recaudoAnual)}</td>
                    <td className="px-3 py-2 text-right text-red-300">{formatoMoneda(milagros.adeudadoAnual)}</td>
                    <td className="px-3 py-2 text-right text-orange-300">{formatoMoneda(milagros.gastosAnual)}</td>
                    <td className="px-3 py-2 text-right text-purple-300">{formatoMoneda(milagros.netoAnual)}</td>
                    <td className="px-3 py-2 text-right text-blue-300 font-bold">{milagros.eficiencia.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right text-yellow-300">{milagros.totalEstudiantes}</td>
                  </tr>
                  <tr className="bg-slate-800/60 border-t-2 border-slate-700">
                    <td className="px-3 py-3 font-bold text-slate-200">TOTAL</td>
                    <td className="px-3 py-3 text-right text-green-400 font-bold text-sm">{formatoMoneda(consolidado.recaudoTotal)}</td>
                    <td className="px-3 py-3 text-right text-red-400 font-bold text-sm">{formatoMoneda(consolidado.adeudadoTotal)}</td>
                    <td className="px-3 py-3 text-right text-orange-400 font-bold text-sm">{formatoMoneda(consolidado.gastosTotal)}</td>
                    <td className="px-3 py-3 text-right text-purple-400 font-bold text-sm">{formatoMoneda(consolidado.netoTotal)}</td>
                    <td className="px-3 py-3 text-right text-blue-400 font-bold text-sm">{((consolidado.recaudoTotal / (consolidado.recaudoTotal + consolidado.adeudadoTotal)) * 100).toFixed(1)}%</td>
                    <td className="px-3 py-3 text-right text-yellow-400 font-bold text-sm">{consolidado.totalEstudiantes}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB: ISIPP CON SEPARACIÓN POR CARRERAS */}
        {tabActiva === 'isipp' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard title="📊 Recaudado" value={formatoMoneda(isipp.recaudoAnual)} icon={<DollarSign size={18} className="text-green-400" />} bgColor="bg-green-900/30 border border-green-700/50" textColor="text-green-300" size="sm" />
              <KPICard title="📌 Adeudado" value={formatoMoneda(isipp.adeudadoAnual)} icon={<AlertCircle size={18} className="text-red-400" />} bgColor="bg-red-900/30 border border-red-700/50" textColor="text-red-300" size="sm" />
              <KPICard title="👥 Estudiantes" value={isipp.totalEstudiantes.toString()} subtitle={`${isipp.estudiantesMora} en mora`} icon={<Users size={18} className="text-blue-400" />} bgColor="bg-blue-900/30 border border-blue-700/50" textColor="text-blue-300" size="sm" />
              <KPICard title="⚡ Eficiencia" value={`${isipp.eficiencia.toFixed(1)}%`} icon={<TrendingUp size={18} className="text-cyan-400" />} bgColor="bg-cyan-900/30 border border-cyan-700/50" textColor="text-cyan-300" size="sm" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                <h4 className="text-sm font-bold text-white mb-3">📈 Detalle Financiero</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Gastos Anuales:</span><span className="text-orange-300 font-semibold">{formatoMoneda(isipp.gastosAnual)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Neto Anual:</span><span className="text-purple-300 font-semibold">{formatoMoneda(isipp.netoAnual)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Margen Neto:</span><span className="text-green-300 font-semibold">{isipp.margenNeto.toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Costo/Estudiante:</span><span className="text-yellow-300 font-semibold">{formatoMoneda(isipp.costoPorEstudiante)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Ingreso/Estudiante:</span><span className="text-blue-300 font-semibold">{formatoMoneda(isipp.ingresoPorEstudiante)}</span></div>
                </div>
              </div>

              <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                <h4 className="text-sm font-bold text-white mb-3">👥 Estado Estudiantes</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Activos:</span><span className="text-cyan-300 font-semibold">{isipp.totalEstudiantes}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">En Mora:</span><span className="text-red-300 font-semibold">{isipp.estudiantesMora} ({isipp.mora.toFixed(1)}%)</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Al Día:</span><span className="text-green-300 font-semibold">{isipp.totalEstudiantes - isipp.estudiantesMora}</span></div>
                  <div className="border-t border-slate-700 pt-2 mt-2"></div>
                  <div className="flex justify-between"><span className="text-slate-400">Tasa de Mora:</span><span className={`font-semibold ${isipp.mora > 50 ? 'text-red-400' : 'text-green-300'}`}>{isipp.mora.toFixed(1)}%</span></div>
                </div>
              </div>
            </div>

            {/* CARRERAS DESPLEGABLES */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white">📚 Detalle por Carreras</h4>
              {isipp.porCarrera && isipp.porCarrera.length > 0 ? (
                isipp.porCarrera.map((carrera, idx) => (
                  <div key={idx} className="bg-slate-800/60 border border-slate-700/50 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandidosISIPP({ ...expandidosISIPP, [idx]: !expandidosISIPP[idx] })}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{carrera.carrera}</span>
                        <span className="text-xs text-slate-400">({carrera.estudiantes} estudiantes)</span>
                      </div>
                      {expandidosISIPP[idx] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {expandidosISIPP[idx] && (
                      <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 text-xs space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div><p className="text-slate-400">Recaudable</p><p className="text-green-300 font-bold">{formatoMoneda(carrera.recaudable)}</p></div>
                          <div><p className="text-slate-400">Recaudado</p><p className="text-blue-300 font-bold">{formatoMoneda(carrera.recaudado)}</p></div>
                          <div><p className="text-slate-400">Deuda</p><p className="text-red-300 font-bold">{formatoMoneda(carrera.deuda)}</p></div>
                          <div><p className="text-slate-400">Eficiencia</p><p className="text-cyan-300 font-bold">{carrera.eficiencia.toFixed(1)}%</p></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs">Sin carreras</p>
              )}
            </div>

            {/* TOP MOROSOS */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
              <h4 className="text-sm font-bold text-white mb-3">📍 Top 5 Morosos</h4>
              {isipp.topMorosos && isipp.topMorosos.length > 0 ? (
                <div className="space-y-2">
                  {isipp.topMorosos.slice(0, 5).map((moroso, idx) => (
                    <div key={idx} className="flex justify-between text-xs p-2 bg-slate-900/50 rounded border border-slate-700/30">
                      <div>
                        <p className="text-slate-200 font-semibold">{idx + 1}. {moroso.nombre}</p>
                        <p className="text-slate-500 text-xs">{moroso.carrera}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-300 font-bold">{formatoMoneda(moroso.deuda)}</p>
                        <p className="text-slate-400 text-xs">{moroso.mesesEnMora} meses</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-xs">Sin morosos</p>
              )}
            </div>
          </div>
        )}

        {/* TAB: MILAGROS CON SEPARACIÓN POR CARRERAS */}
        {tabActiva === 'milagros' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <KPICard title="📊 Recaudado" value={formatoMoneda(milagros.recaudoAnual)} icon={<DollarSign size={18} className="text-green-400" />} bgColor="bg-green-900/30 border border-green-700/50" textColor="text-green-300" size="sm" />
              <KPICard title="📌 Adeudado" value={formatoMoneda(milagros.adeudadoAnual)} icon={<AlertCircle size={18} className="text-red-400" />} bgColor="bg-red-900/30 border border-red-700/50" textColor="text-red-300" size="sm" />
              <KPICard title="👥 Estudiantes" value={milagros.totalEstudiantes.toString()} subtitle={`${milagros.estudiantesMora} en mora`} icon={<Users size={18} className="text-blue-400" />} bgColor="bg-blue-900/30 border border-blue-700/50" textColor="text-blue-300" size="sm" />
              <KPICard title="⚡ Eficiencia" value={`${milagros.eficiencia.toFixed(1)}%`} icon={<TrendingUp size={18} className="text-cyan-400" />} bgColor="bg-cyan-900/30 border border-cyan-700/50" textColor="text-cyan-300" size="sm" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                <h4 className="text-sm font-bold text-white mb-3">📈 Detalle Financiero</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Recaudos (Estudiantes):</span><span className="text-green-300 font-semibold">{formatoMoneda(milagros.recaudoAnual - (milagros.ventasInsumos || 0) - (milagros.ventasKiosco || 0))}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Ventas Insumos:</span><span className="text-blue-300 font-semibold">{formatoMoneda(milagros.ventasInsumos || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Ventas Kiosco:</span><span className="text-purple-300 font-semibold">{formatoMoneda(milagros.ventasKiosco || 0)}</span></div>
                  <div className="border-t border-slate-700 my-2"></div>
                  <div className="flex justify-between"><span className="text-slate-400">Gastos Anuales:</span><span className="text-orange-300 font-semibold">{formatoMoneda(milagros.gastosAnual)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Neto Anual:</span><span className="text-purple-300 font-semibold">{formatoMoneda(milagros.netoAnual)}</span></div>
                </div>
              </div>

              <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                <h4 className="text-sm font-bold text-white mb-3">👥 Estado Estudiantes</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Activos:</span><span className="text-cyan-300 font-semibold">{milagros.totalEstudiantes}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">En Mora:</span><span className="text-red-300 font-semibold">{milagros.estudiantesMora} ({milagros.mora.toFixed(1)}%)</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Al Día:</span><span className="text-green-300 font-semibold">{milagros.totalEstudiantes - milagros.estudiantesMora}</span></div>
                  <div className="border-t border-slate-700 pt-2 mt-2"></div>
                  <div className="flex justify-between"><span className="text-slate-400">Tasa de Mora:</span><span className={`font-semibold ${milagros.mora > 50 ? 'text-red-400' : 'text-green-300'}`}>{milagros.mora.toFixed(1)}%</span></div>
                </div>
              </div>
            </div>

            {/* CARRERAS DESPLEGABLES */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white">📚 Detalle por Carreras</h4>
              {milagros.porCarrera && milagros.porCarrera.length > 0 ? (
                milagros.porCarrera.map((carrera, idx) => (
                  <div key={idx} className="bg-slate-800/60 border border-slate-700/50 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandidosMilagros({ ...expandidosMilagros, [idx]: !expandidosMilagros[idx] })}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{carrera.carrera}</span>
                        <span className="text-xs text-slate-400">({carrera.estudiantes} estudiantes)</span>
                      </div>
                      {expandidosMilagros[idx] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {expandidosMilagros[idx] && (
                      <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 text-xs space-y-2">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div><p className="text-slate-400">Recaudable</p><p className="text-green-300 font-bold">{formatoMoneda(carrera.recaudable)}</p></div>
                          <div><p className="text-slate-400">Recaudado</p><p className="text-blue-300 font-bold">{formatoMoneda(carrera.recaudado)}</p></div>
                          <div><p className="text-slate-400">Deuda</p><p className="text-red-300 font-bold">{formatoMoneda(carrera.deuda)}</p></div>
                          <div><p className="text-slate-400">Eficiencia</p><p className="text-cyan-300 font-bold">{carrera.eficiencia.toFixed(1)}%</p></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs">Sin carreras</p>
              )}
            </div>

            {/* TOP MOROSOS */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
              <h4 className="text-sm font-bold text-white mb-3">📍 Top 5 Morosos</h4>
              {milagros.topMorosos && milagros.topMorosos.length > 0 ? (
                <div className="space-y-2">
                  {milagros.topMorosos.slice(0, 5).map((moroso, idx) => (
                    <div key={idx} className="flex justify-between text-xs p-2 bg-slate-900/50 rounded border border-slate-700/30">
                      <div>
                        <p className="text-slate-200 font-semibold">{idx + 1}. {moroso.nombre}</p>
                        <p className="text-slate-500 text-xs">{moroso.carrera}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-300 font-bold">{formatoMoneda(moroso.deuda)}</p>
                        <p className="text-slate-400 text-xs">{moroso.mesesEnMora} meses</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-xs">Sin morosos</p>
              )}
            </div>
          </div>
        )}

        {/* TAB: COMPARATIVA */}
        {tabActiva === 'comparativa' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                <h4 className="text-sm font-bold text-white mb-4">📊 Análisis Comparativo</h4>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-slate-900/50 rounded border border-slate-700/30">
                    <p className="text-slate-400">Eficiencia de Cobranza</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-cyan-300 font-bold">ISIPP: {isipp.eficiencia.toFixed(1)}%</span>
                      <span className="text-orange-300 font-bold">Milagros: {milagros.eficiencia.toFixed(1)}%</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {comparativa.institucionMejor === 'Milagros' ? `✅ Milagros es más eficiente (+${comparativa.eficienciaDif.toFixed(1)}%)` : `✅ ISIPP es más eficiente (+${Math.abs(comparativa.eficienciaDif).toFixed(1)}%)`}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/50 rounded border border-slate-700/30">
                    <p className="text-slate-400">Tasa de Mora</p>
                    <div className="flex justify-between mt-2">
                      <span className={`font-bold ${isipp.mora > milagros.mora ? 'text-red-300' : 'text-green-300'}`}>ISIPP: {isipp.mora.toFixed(1)}%</span>
                      <span className={`font-bold ${milagros.mora > isipp.mora ? 'text-red-300' : 'text-green-300'}`}>Milagros: {milagros.mora.toFixed(1)}%</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {comparativa.moraDif > 0 ? `✅ ISIPP tiene mejor tasa (-${comparativa.moraDif.toFixed(1)}%)` : `✅ Milagros tiene mejor tasa (-${Math.abs(comparativa.moraDif).toFixed(1)}%)`}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900/50 rounded border border-slate-700/30">
                    <p className="text-slate-400">Salud Financiera General</p>
                    <p className="text-cyan-300 font-bold mt-2">Puntuación: {consolidado.saludFinanciera}/100</p>
                    <p className={`text-xs mt-2 ${consolidado.saludFinanciera > 75 ? 'text-green-400' : consolidado.saludFinanciera > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {consolidado.saludFinanciera > 75 ? '✅ Excelente' : consolidado.saludFinanciera > 60 ? '⚠️ Buena' : '🔴 Requiere atención'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                <h4 className="text-sm font-bold text-white mb-4">💡 Recomendaciones</h4>
                <div className="space-y-2">
                  {comparativa.recomendaciones && comparativa.recomendaciones.length > 0 ? (
                    comparativa.recomendaciones.map((rec, idx) => (
                      <div key={idx} className="p-3 bg-slate-900/50 rounded border-l-4 border-yellow-500 text-xs text-slate-300">
                        <p className="font-semibold text-slate-200">💡 {rec}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-xs">Sin recomendaciones en este momento</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: FLUJO CAJA */}
        {tabActiva === 'flujoCaja' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
              <h3 className="text-sm font-bold text-white mb-3">📈 Proyección de Flujo de Caja (12 Meses)</h3>
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

            <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg overflow-x-auto">
              <h3 className="text-sm font-bold text-white mb-3">📊 Detalle Mensual</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-2 py-2 text-left text-slate-300">Mes</th>
                    <th className="px-2 py-2 text-right text-green-400">Entra</th>
                    <th className="px-2 py-2 text-right text-red-400">Sale</th>
                    <th className="px-2 py-2 text-right text-blue-400">Neto</th>
                    <th className="px-2 py-2 text-right text-purple-400">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {flujoCaja.map((mes, idx) => (
                    <tr key={idx} className="border-b border-slate-700/30 hover:bg-slate-900/50">
                      <td className="px-2 py-2 font-semibold text-slate-300">{mes.mesNombre}</td>
                      <td className="px-2 py-2 text-right text-green-300">{formatoMoneda(mes.entra)}</td>
                      <td className="px-2 py-2 text-right text-red-300">{formatoMoneda(mes.sale)}</td>
                      <td className="px-2 py-2 text-right text-blue-300 font-semibold">{formatoMoneda(mes.neto)}</td>
                      <td className="px-2 py-2 text-right text-purple-300 font-bold">{formatoMoneda(mes.acumulado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: RENTABILIDAD */}
        {tabActiva === 'rentabilidad' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Target size={18} /> ISIPP</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-slate-900/50 rounded"><span className="text-slate-400">Margen Bruto</span><span className={`font-bold ${rentabilidad.isipp.margenBruto > 70 ? 'text-green-300' : 'text-yellow-300'}`}>{rentabilidad.isipp.margenBruto.toFixed(1)}%</span></div>
                  <div className="flex justify-between p-2 bg-slate-900/50 rounded"><span className="text-slate-400">Margen Neto</span><span className={`font-bold ${rentabilidad.isipp.margenNeto > 20 ? 'text-green-300' : 'text-yellow-300'}`}>{rentabilidad.isipp.margenNeto.toFixed(1)}%</span></div>
                  <div className="flex justify-between p-2 bg-slate-900/50 rounded"><span className="text-slate-400">Gastos %</span><span className={`font-bold ${rentabilidad.isipp.gastoPct < 30 ? 'text-green-300' : 'text-red-300'}`}>{rentabilidad.isipp.gastoPct.toFixed(1)}%</span></div>
                  <div className="flex justify-between p-2 bg-slate-900/50 rounded"><span className="text-slate-400">ROI Estimado</span><span className={`font-bold ${rentabilidad.isipp.roiEstimado > 100 ? 'text-green-300' : 'text-yellow-300'}`}>{rentabilidad.isipp.roiEstimado.toFixed(1)}%</span></div>
                </div>
              </div>

              <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Target size={18} /> Milagros</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-slate-900/50 rounded"><span className="text-slate-400">Margen Bruto</span><span className={`font-bold ${rentabilidad.milagros.margenBruto > 70 ? 'text-green-300' : 'text-yellow-300'}`}>{rentabilidad.milagros.margenBruto.toFixed(1)}%</span></div>
                  <div className="flex justify-between p-2 bg-slate-900/50 rounded"><span className="text-slate-400">Margen Neto</span><span className={`font-bold ${rentabilidad.milagros.margenNeto > 20 ? 'text-green-300' : 'text-yellow-300'}`}>{rentabilidad.milagros.margenNeto.toFixed(1)}%</span></div>
                  <div className="flex justify-between p-2 bg-slate-900/50 rounded"><span className="text-slate-400">Gastos %</span><span className={`font-bold ${rentabilidad.milagros.gastoPct < 30 ? 'text-green-300' : 'text-red-300'}`}>{rentabilidad.milagros.gastoPct.toFixed(1)}%</span></div>
                  <div className="flex justify-between p-2 bg-slate-900/50 rounded"><span className="text-slate-400">ROI Estimado</span><span className={`font-bold ${rentabilidad.milagros.roiEstimado > 100 ? 'text-green-300' : 'text-yellow-300'}`}>{rentabilidad.milagros.roiEstimado.toFixed(1)}%</span></div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
              <h4 className="text-sm font-bold text-white mb-3">🎯 Oportunidades</h4>
              <div className="space-y-2">
                {rentabilidad.oportunidades.map((oportunidad, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/50 rounded border-l-4 border-cyan-500 text-xs text-slate-300">
                    <p className="font-semibold text-slate-200">🚀 {oportunidad}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: INSIGHTS */}
        {tabActiva === 'insights' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                <h4 className="text-sm font-bold text-white mb-4">📊 Indicadores</h4>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-slate-900/50 rounded"><p className="text-slate-400 text-xs mb-1">Recaudación Total</p><p className="text-green-300 font-bold text-lg">{formatoMoneda(consolidado.recaudoTotal)}</p></div>
                  <div className="p-3 bg-slate-900/50 rounded"><p className="text-slate-400 text-xs mb-1">Deuda Pendiente</p><p className="text-red-300 font-bold text-lg">{formatoMoneda(consolidado.adeudadoTotal)}</p></div>
                  <div className="p-3 bg-slate-900/50 rounded"><p className="text-slate-400 text-xs mb-1">Para Mejoras</p><p className="text-purple-300 font-bold text-lg">{formatoMoneda(consolidado.dineroParaMejoras)}</p></div>
                </div>
              </div>

              <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
                <h4 className="text-sm font-bold text-white mb-4">⚡ Desempeño</h4>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-slate-900/50 rounded"><p className="text-slate-400 text-xs mb-1">Total Estudiantes</p><p className="text-blue-300 font-bold text-lg">{consolidado.totalEstudiantes}</p></div>
                  <div className="p-3 bg-slate-900/50 rounded"><p className="text-slate-400 text-xs mb-1">En Mora</p><p className={`font-bold text-lg ${consolidado.porcentajeMora > 50 ? 'text-red-300' : 'text-yellow-300'}`}>{consolidado.porcentajeMora.toFixed(1)}%</p></div>
                  <div className="p-3 bg-slate-900/50 rounded"><p className="text-slate-400 text-xs mb-1">Eficiencia Global</p><p className="text-cyan-300 font-bold text-lg">{((consolidado.recaudoTotal / (consolidado.recaudoTotal + consolidado.adeudadoTotal)) * 100).toFixed(1)}%</p></div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
              <h4 className="text-sm font-bold text-white mb-3">🎯 Acciones</h4>
              <div className="space-y-2">
                {consolidado.porcentajeMora > 50 && (
                  <div className="p-3 bg-red-900/30 rounded border-l-4 border-red-500 text-xs text-slate-300">
                    <p className="font-semibold text-red-200">🔴 URGENTE: Contactar morosos</p>
                    <p>Se detectó {consolidado.porcentajeMora.toFixed(1)}% en mora.</p>
                  </div>
                )}
                {consolidado.gastosTotal > consolidado.recaudoTotal * 0.3 && (
                  <div className="p-3 bg-orange-900/30 rounded border-l-4 border-orange-500 text-xs text-slate-300">
                    <p className="font-semibold text-orange-200">⚠️ REVISAR: Gastos altos</p>
                    <p>Gastos representan {((consolidado.gastosTotal / consolidado.recaudoTotal) * 100).toFixed(1)}%.</p>
                  </div>
                )}
                {consolidado.netoTotal > 0 && (
                  <div className="p-3 bg-green-900/30 rounded border-l-4 border-green-500 text-xs text-slate-300">
                    <p className="font-semibold text-green-200">✅ POSITIVO: Neto disponible</p>
                    <p>Hay {formatoMoneda(consolidado.dineroParaMejoras)} para reinversión.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportesEjecutivos
