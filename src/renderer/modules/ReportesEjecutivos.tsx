import React, { useState, useEffect } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda } from '@renderer/lib/helpers'
import { BarChart3, TrendingUp, AlertCircle, Users, RefreshCw, Target, Zap, DollarSign, Gauge, Activity, ChevronDown, ChevronUp } from 'lucide-react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler } from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler)

// ========== CONSTANTES ==========
const PRIMER_MES_ACADEMICO = 3  // Marzo
const ULTIMO_MES_ACADEMICO = 8  // Agosto
const PRIMER_DIA_VENCIMIENTO = 10

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

// ========== MAIN COMPONENT ==========
export const ReportesEjecutivos: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabActiva, setTabActiva] = useState('global')
  const [expandidosISIPP, setExpandidosISIPP] = useState<Record<string, boolean>>({})
  const [expandidosMilagros, setExpandidosMilagros] = useState<Record<string, boolean>>({})

  // DATA STATES
  const [consolidado, setConsolidado] = useState({
    recaudoTotal: 0,
    adeudadoTotal: 0,
    gastosTotal: 0,
    netoTotal: 0,
    dineroParaMejoras: 0,
    saludFinanciera: 0,
    totalEstudiantes: 0,
    totalMorosos: 0,
    totalAlDia: 0,
    porcentajeMora: 0,
    porcentajeAlDia: 0,
  })

  const [isipp, setISIPP] = useState({
    recaudoAnual: 0,
    adeudadoAnual: 0,
    gastosAnual: 0,
    netoAnual: 0,
    eficiencia: 0,
    mora: 0,
    margenNeto: 0,
    costoPorEstudiante: 0,
    ingresoPorEstudiante: 0,
    totalEstudiantes: 0,
    estudiantesMora: 0,
    estudiantesAlDia: 0,
    porCarrera: [] as any[],
    topMorosos: [] as any[],
  })

  const [milagros, setMilagros] = useState({
    recaudoAnual: 0,
    adeudadoAnual: 0,
    gastosAnual: 0,
    netoAnual: 0,
    eficiencia: 0,
    mora: 0,
    margenNeto: 0,
    costoPorEstudiante: 0,
    ingresoPorEstudiante: 0,
    totalEstudiantes: 0,
    estudiantesMora: 0,
    estudiantesAlDia: 0,
    porCarrera: [] as any[],
    topMorosos: [] as any[],
    ventasInsumos: 0,
    ventasKiosco: 0,
  })

  // ========== CARGAR DATOS DESDE BD ==========
  const cargarReportes = async () => {
    try {
      setLoading(true)
      setError(null)

      const today = new Date()
      const diaActual = today.getDate()
      const mesActual = today.getMonth() + 1
      const anioActual = today.getFullYear()

      // PROCESAR AMBAS INSTITUCIONES
      const institucionesData = await Promise.all([
        procesarInstitucion(1, diaActual, mesActual, anioActual),
        procesarInstitucion(2, diaActual, mesActual, anioActual),
      ])

      const [isippData, milagrosData] = institucionesData

      setISIPP(isippData)
      setMilagros(milagrosData)

      // CONSOLIDAR
      const consolidadoData = {
        recaudoTotal: isippData.recaudoAnual + milagrosData.recaudoAnual,
        adeudadoTotal: isippData.adeudadoAnual + milagrosData.adeudadoAnual,
        gastosTotal: isippData.gastosAnual + milagrosData.gastosAnual,
        netoTotal: isippData.netoAnual + milagrosData.netoAnual,
        dineroParaMejoras: (isippData.netoAnual + milagrosData.netoAnual) * 0.8,
        saludFinanciera: 0,
        totalEstudiantes: isippData.totalEstudiantes + milagrosData.totalEstudiantes,
        totalMorosos: isippData.estudiantesMora + milagrosData.estudiantesMora,
        totalAlDia: isippData.estudiantesAlDia + milagrosData.estudiantesAlDia,
        porcentajeMora:
          isippData.totalEstudiantes + milagrosData.totalEstudiantes > 0
            ? ((isippData.estudiantesMora + milagrosData.estudiantesMora) / (isippData.totalEstudiantes + milagrosData.totalEstudiantes)) * 100
            : 0,
        porcentajeAlDia:
          isippData.totalEstudiantes + milagrosData.totalEstudiantes > 0
            ? ((isippData.estudiantesAlDia + milagrosData.estudiantesAlDia) / (isippData.totalEstudiantes + milagrosData.totalEstudiantes)) * 100
            : 0,
      }

      setConsolidado(consolidadoData)
    } catch (err) {
      console.error('[PANEL EJECUTIVO] Error:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // ========== PROCESAR INSTITUCIÓN ==========
  const procesarInstitucion = async (institucionId: number, diaActual: number, mesActual: number, anioActual: number) => {
    try {
      // 1. OBTENER ESTUDIANTES ACTIVOS
      const { data: estudiantes } = await supabase
        .from('estudiantes')
        .select('id, nombre, apellido, dni, carrera_id, estado, carreras(id, nombre)')
        .eq('institucion_id', institucionId)
        .neq('estado', 'NO_VIENE_MAS')

      const estudiantesActivos = estudiantes || []
      const totalEstudiantes = estudiantesActivos.length

      // 2. OBTENER CONCEPTOS
      const { data: conceptos } = await supabase
        .from('conceptos_pago')
        .select('id, nombre, tipo, monto, mes, año, carrera_id')
        .eq('institucion_id', institucionId)
        .eq('activo', true)

      const conceptosArr = conceptos || []

      // 3. FILTRAR CONCEPTOS VENCIDOS (excluir enero-febrero, antes del día 10 en mes actual)
      const conceptosVencidos = conceptosArr.filter(c => {
        if (c.tipo?.toUpperCase() === 'INSCRIPCION' && (!c.mes || !c.año)) {
          return true
        }
        if (c.mes && c.año) {
          if (c.mes < PRIMER_MES_ACADEMICO || c.mes > ULTIMO_MES_ACADEMICO) return false

          if (c.año < anioActual) return true
          if (c.año === anioActual) {
            if (c.mes === mesActual && diaActual < PRIMER_DIA_VENCIMIENTO) return false
            if (c.mes < mesActual) return true
            if (c.mes === mesActual && diaActual >= PRIMER_DIA_VENCIMIENTO) return true
          }
        }
        return false
      })

      // 4. OBTENER PAGOS
      const { data: pagos } = await supabase
        .from('pagos')
        .select('id, estudiante_id, concepto_id, monto_pagado')
        .eq('institucion_id', institucionId)
        .neq('estado', 'ANULADO')

      const { data: pagosMultiples } = await supabase
        .from('pagos_multiples_detalle')
        .select('id, concepto_id, monto_pagado, pagos_multiples!inner(estudiante_id, estado, institucion_id)')
        .eq('pagos_multiples.institucion_id', institucionId)
        .neq('pagos_multiples.estado', 'ANULADO')

      const pagosMultiplesFormato = (pagosMultiples || []).map((p: any) => ({
        estudiante_id: p.pagos_multiples?.estudiante_id,
        concepto_id: p.concepto_id,
        monto_pagado: p.monto_pagado,
      }))

      const todosPagos = [...(pagos || []), ...pagosMultiplesFormato]

      // 5. CREAR MAPA DE PAGOS
      const pagosMap = new Map<string, number>()
      todosPagos.forEach(p => {
        const key = `${p.estudiante_id}-${p.concepto_id}`
        pagosMap.set(key, (pagosMap.get(key) || 0) + p.monto_pagado)
      })

      // 6. CALCULAR DEUDAS POR ESTUDIANTE
      let totalRecaudable = 0
      let totalRecaudado = 0
      let estudiantesEnMora = 0
      let estudiantesAlDia = 0
      const topMorosos: any[] = []

      estudiantesActivos.forEach(est => {
        let deudaEst = 0
        let tieneDeuda = false

        const conceptosDelEst = conceptosVencidos.filter(c => c.carrera_id === est.carrera_id)
        if (conceptosDelEst.length === 0) return

        conceptosDelEst.forEach(c => {
          const montoPago = pagosMap.get(`${est.id}-${c.id}`) || 0
          const deudaConcepto = Math.max(0, c.monto - montoPago)

          deudaEst += deudaConcepto
          totalRecaudable += c.monto

          if (deudaConcepto > 0) {
            tieneDeuda = true
          }
        })

        totalRecaudado += todosPagos
          .filter(p => p.estudiante_id === est.id)
          .reduce((sum, p) => sum + p.monto_pagado, 0)

        if (tieneDeuda) {
          estudiantesEnMora++
          if (deudaEst > 0) {
            topMorosos.push({
              dni: est.dni,
              nombre: `${est.nombre} ${est.apellido}`,
              carrera: (est as any).carreras?.nombre || '',
              deuda: deudaEst,
            })
          }
        } else {
          estudiantesAlDia++
        }
      })

      topMorosos.sort((a, b) => b.deuda - a.deuda)

      // 7. OBTENER GASTOS
      const { data: gastosData } = await supabase
        .from('gastos')
        .select('monto')
        .eq('institucion_id', institucionId)

      const gastosAnual = (gastosData || []).reduce((sum, g) => sum + (g.monto || 0), 0)

      // 8. CALCULAR MÉTRICAS
      const adeudadoAnual = Math.max(0, totalRecaudable - totalRecaudado)
      const netoAnual = totalRecaudado - gastosAnual
      const eficiencia = totalRecaudable > 0 ? (totalRecaudado / totalRecaudable) * 100 : 0
      const mora = totalEstudiantes > 0 ? (estudiantesEnMora / totalEstudiantes) * 100 : 0
      const margenNeto = totalRecaudado > 0 ? (netoAnual / totalRecaudado) * 100 : 0
      const costoPorEstudiante = totalEstudiantes > 0 ? gastosAnual / totalEstudiantes : 0
      const ingresoPorEstudiante = totalEstudiantes > 0 ? totalRecaudado / totalEstudiantes : 0

      // 9. DESGLOSE POR CARRERA
      const carrerasMap = new Map<number, any>()
      estudiantesActivos.forEach(est => {
        if (!carrerasMap.has(est.carrera_id)) {
          carrerasMap.set(est.carrera_id, {
            carrera_id: est.carrera_id,
            carrera: (est as any).carreras?.nombre || 'Sin carrera',
            estudiantes: [],
          })
        }
        carrerasMap.get(est.carrera_id).estudiantes.push(est.id)
      })

      const porCarrera = Array.from(carrerasMap.values()).map(carr => {
        let recaudado = 0
        let enMora = 0
        let recaudable = 0
        let deuda = 0

        carr.estudiantes.forEach((estId: number) => {
          let deudaEst = 0
          let tieneDeuda = false

          conceptosVencidos
            .filter(c => c.carrera_id === carr.carrera_id)
            .forEach(c => {
              const montoPago = pagosMap.get(`${estId}-${c.id}`) || 0
              const deudaConcepto = Math.max(0, c.monto - montoPago)

              deudaEst += deudaConcepto
              recaudable += c.monto

              if (deudaConcepto > 0) {
                tieneDeuda = true
              }
            })

          if (tieneDeuda) {
            enMora++
            deuda += deudaEst
          }

          recaudado += todosPagos.filter(p => p.estudiante_id === estId).reduce((s, p) => s + p.monto_pagado, 0)
        })

        const eficienciaCarrera = recaudable > 0 ? (recaudado / recaudable) * 100 : 0
        const moraCarrera = carr.estudiantes.length > 0 ? (enMora / carr.estudiantes.length) * 100 : 0

        return {
          carreraId: carr.carrera_id,
          carrera: carr.carrera,
          estudiantes: carr.estudiantes.length,
          recaudable,
          recaudado,
          deuda,
          eficiencia: parseFloat(eficienciaCarrera.toFixed(1)),
          mora: parseFloat(moraCarrera.toFixed(1)),
        }
      })

      return {
        recaudoAnual: totalRecaudado,
        adeudadoAnual,
        gastosAnual,
        netoAnual,
        eficiencia: parseFloat(eficiencia.toFixed(1)),
        mora: parseFloat(mora.toFixed(1)),
        margenNeto: parseFloat(margenNeto.toFixed(1)),
        costoPorEstudiante: parseFloat(costoPorEstudiante.toFixed(2)),
        ingresoPorEstudiante: parseFloat(ingresoPorEstudiante.toFixed(2)),
        totalEstudiantes,
        estudiantesMora: estudiantesEnMora,
        estudiantesAlDia,
        porCarrera,
        topMorosos: topMorosos.slice(0, 10),
      }
    } catch (err) {
      console.error(`[PANEL EJECUTIVO] Error procesando institución ${institucionId}:`, err)
      throw err
    }
  }

  useEffect(() => {
    cargarReportes()
  }, [])

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
          <button onClick={cargarReportes} className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold">
            Reintentar
          </button>
        </div>
      </div>
    )
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
        <button onClick={cargarReportes} className="p-2 hover:bg-slate-700/50 rounded-lg transition-all" title="Actualizar">
          <RefreshCw size={20} className="text-cyan-400" />
        </button>
      </div>

      {/* TABS */}
      <div className="mb-4 flex gap-1 overflow-x-auto pb-2 border-b border-slate-700/50">
        {[
          { id: 'global', label: 'Global', icon: Gauge },
          { id: 'isipp', label: 'ISIPP', icon: Activity },
          { id: 'milagros', label: 'Milagros', icon: Activity },
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

      {/* TAB: GLOBAL */}
      {tabActiva === 'global' && (
        <div className="space-y-4">
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
              subtitle={`${consolidado.porcentajeMora.toFixed(1)}% en mora`}
              icon={<AlertCircle className="text-red-400" size={20} />}
              bgColor="bg-gradient-to-br from-red-600/25 to-red-900/15 border border-red-500/30"
              textColor="text-red-300"
            />
            <KPICard
              title="👥 Estudiantes"
              value={consolidado.totalEstudiantes.toString()}
              subtitle={`${consolidado.totalAlDia} al día`}
              icon={<Users className="text-blue-400" size={20} />}
              bgColor="bg-gradient-to-br from-blue-600/25 to-blue-900/15 border border-blue-500/30"
              textColor="text-blue-300"
            />
          </div>

          {/* TABLA COMPARATIVA */}
          <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/50 rounded-lg shadow-lg overflow-x-auto">
            <h3 className="text-sm font-bold text-white mb-3">📋 Comparativa</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-900/50">
                  <th className="px-3 py-2 text-left font-bold text-slate-300">Institución</th>
                  <th className="px-3 py-2 text-right text-green-400">Recaudado</th>
                  <th className="px-3 py-2 text-right text-red-400">Adeudado</th>
                  <th className="px-3 py-2 text-right text-yellow-400">Estudiantes</th>
                  <th className="px-3 py-2 text-right text-blue-400">Al Día</th>
                  <th className="px-3 py-2 text-right text-orange-400">Eficiencia</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-700/30 hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-bold text-cyan-300">ISIPP</td>
                  <td className="px-3 py-2 text-right text-green-300 font-semibold">{formatoMoneda(isipp.recaudoAnual)}</td>
                  <td className="px-3 py-2 text-right text-red-300">{formatoMoneda(isipp.adeudadoAnual)}</td>
                  <td className="px-3 py-2 text-right text-yellow-300">{isipp.totalEstudiantes}</td>
                  <td className="px-3 py-2 text-right text-blue-300">{isipp.estudiantesAlDia}</td>
                  <td className="px-3 py-2 text-right text-orange-300 font-bold">{isipp.eficiencia.toFixed(1)}%</td>
                </tr>
                <tr className="border-b border-slate-700/30 hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-bold text-orange-300">Milagros</td>
                  <td className="px-3 py-2 text-right text-green-300 font-semibold">{formatoMoneda(milagros.recaudoAnual)}</td>
                  <td className="px-3 py-2 text-right text-red-300">{formatoMoneda(milagros.adeudadoAnual)}</td>
                  <td className="px-3 py-2 text-right text-yellow-300">{milagros.totalEstudiantes}</td>
                  <td className="px-3 py-2 text-right text-blue-300">{milagros.estudiantesAlDia}</td>
                  <td className="px-3 py-2 text-right text-orange-300 font-bold">{milagros.eficiencia.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: ISIPP */}
      {tabActiva === 'isipp' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard title="📊 Recaudado" value={formatoMoneda(isipp.recaudoAnual)} icon={<DollarSign size={18} className="text-green-400" />} bgColor="bg-green-900/30 border border-green-700/50" textColor="text-green-300" size="sm" />
            <KPICard title="📌 Adeudado" value={formatoMoneda(isipp.adeudadoAnual)} icon={<AlertCircle size={18} className="text-red-400" />} bgColor="bg-red-900/30 border border-red-700/50" textColor="text-red-300" size="sm" />
            <KPICard title="👥 Al Día" value={isipp.estudiantesAlDia.toString()} icon={<Users size={18} className="text-green-400" />} bgColor="bg-green-900/30 border border-green-700/50" textColor="text-green-300" size="sm" />
            <KPICard title="⚡ Eficiencia" value={`${isipp.eficiencia.toFixed(1)}%`} icon={<TrendingUp size={18} className="text-cyan-400" />} bgColor="bg-cyan-900/30 border border-cyan-700/50" textColor="text-cyan-300" size="sm" />
          </div>

          {/* CARRERAS */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">📚 Detalle por Carreras</h4>
            {isipp.porCarrera.map((carr, idx) => (
              <div key={idx} className="bg-slate-800/60 border border-slate-700/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandidosISIPP({ ...expandidosISIPP, [idx]: !expandidosISIPP[idx] })}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{carr.carrera}</span>
                    <span className="text-xs text-slate-400">({carr.estudiantes} est.)</span>
                  </div>
                  {expandidosISIPP[idx] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandidosISIPP[idx] && (
                  <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 grid grid-cols-4 gap-2 text-xs">
                    <div><p className="text-slate-400">Recaudable</p><p className="text-green-300 font-bold">{formatoMoneda(carr.recaudable)}</p></div>
                    <div><p className="text-slate-400">Recaudado</p><p className="text-blue-300 font-bold">{formatoMoneda(carr.recaudado)}</p></div>
                    <div><p className="text-slate-400">Deuda</p><p className="text-red-300 font-bold">{formatoMoneda(carr.deuda)}</p></div>
                    <div><p className="text-slate-400">Eficiencia</p><p className="text-cyan-300 font-bold">{carr.eficiencia.toFixed(1)}%</p></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* TOP MOROSOS */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
            <h4 className="text-sm font-bold text-white mb-3">📍 Top Morosos</h4>
            {isipp.topMorosos.length > 0 ? (
              <div className="space-y-2">
                {isipp.topMorosos.slice(0, 5).map((moroso, idx) => (
                  <div key={idx} className="flex justify-between text-xs p-2 bg-slate-900/50 rounded">
                    <div>
                      <p className="text-slate-200 font-semibold">{idx + 1}. {moroso.nombre}</p>
                      <p className="text-slate-500">{moroso.carrera}</p>
                    </div>
                    <p className="text-red-300 font-bold">{formatoMoneda(moroso.deuda)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs">Sin morosos</p>
            )}
          </div>
        </div>
      )}

      {/* TAB: MILAGROS */}
      {tabActiva === 'milagros' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard title="📊 Recaudado" value={formatoMoneda(milagros.recaudoAnual)} icon={<DollarSign size={18} className="text-green-400" />} bgColor="bg-green-900/30 border border-green-700/50" textColor="text-green-300" size="sm" />
            <KPICard title="📌 Adeudado" value={formatoMoneda(milagros.adeudadoAnual)} icon={<AlertCircle size={18} className="text-red-400" />} bgColor="bg-red-900/30 border border-red-700/50" textColor="text-red-300" size="sm" />
            <KPICard title="👥 Al Día" value={milagros.estudiantesAlDia.toString()} icon={<Users size={18} className="text-green-400" />} bgColor="bg-green-900/30 border border-green-700/50" textColor="text-green-300" size="sm" />
            <KPICard title="⚡ Eficiencia" value={`${milagros.eficiencia.toFixed(1)}%`} icon={<TrendingUp size={18} className="text-cyan-400" />} bgColor="bg-cyan-900/30 border border-cyan-700/50" textColor="text-cyan-300" size="sm" />
          </div>

          {/* CARRERAS */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white">📚 Detalle por Carreras</h4>
            {milagros.porCarrera.map((carr, idx) => (
              <div key={idx} className="bg-slate-800/60 border border-slate-700/50 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandidosMilagros({ ...expandidosMilagros, [idx]: !expandidosMilagros[idx] })}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{carr.carrera}</span>
                    <span className="text-xs text-slate-400">({carr.estudiantes} est.)</span>
                  </div>
                  {expandidosMilagros[idx] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandidosMilagros[idx] && (
                  <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 grid grid-cols-4 gap-2 text-xs">
                    <div><p className="text-slate-400">Recaudable</p><p className="text-green-300 font-bold">{formatoMoneda(carr.recaudable)}</p></div>
                    <div><p className="text-slate-400">Recaudado</p><p className="text-blue-300 font-bold">{formatoMoneda(carr.recaudado)}</p></div>
                    <div><p className="text-slate-400">Deuda</p><p className="text-red-300 font-bold">{formatoMoneda(carr.deuda)}</p></div>
                    <div><p className="text-slate-400">Eficiencia</p><p className="text-cyan-300 font-bold">{carr.eficiencia.toFixed(1)}%</p></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* TOP MOROSOS */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
            <h4 className="text-sm font-bold text-white mb-3">📍 Top Morosos</h4>
            {milagros.topMorosos.length > 0 ? (
              <div className="space-y-2">
                {milagros.topMorosos.slice(0, 5).map((moroso, idx) => (
                  <div key={idx} className="flex justify-between text-xs p-2 bg-slate-900/50 rounded">
                    <div>
                      <p className="text-slate-200 font-semibold">{idx + 1}. {moroso.nombre}</p>
                      <p className="text-slate-500">{moroso.carrera}</p>
                    </div>
                    <p className="text-red-300 font-bold">{formatoMoneda(moroso.deuda)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs">Sin morosos</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportesEjecutivos
