import React, { useState, useEffect } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda } from '@renderer/lib/helpers'
import { BarChart3, TrendingUp, AlertCircle, Users, RefreshCw, DollarSign, Gauge, Activity, ChevronDown, ChevronUp } from 'lucide-react'
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

// ========== TIPOS ==========
interface DatosCarrera {
  carreraId: number
  carrera: string
  estudiantes: number
  estudiantesAlDia: number
  estudiantesEnMora: number
  recaudable: number
  recaudado: number
  deuda: number
  eficiencia: number
  moraCarrera: number
}

interface DatosInstitucion {
  totalEstudiantes: number
  estudiantesAlDia: number
  estudiantesMora: number
  recaudable: number
  recaudado: number
  deuda: number
  eficiencia: number
  mora: number
  gastosAnual: number
  netoAnual: number
  porCarrera: DatosCarrera[]
  topMorosos: Array<{ dni: string; nombre: string; carrera: string; deuda: number }>
}

// ========== MAIN COMPONENT ==========
export const ReportesEjecutivos: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabActiva, setTabActiva] = useState('global')
  const [expandidosISIPP, setExpandidosISIPP] = useState<Record<string, boolean>>({})
  const [expandidosMilagros, setExpandidosMilagros] = useState<Record<string, boolean>>({})
  const [fechaVencidos, setFechaVencidos] = useState<string>('')

  // DATA STATES
  const [consolidado, setConsolidado] = useState({
    totalEstudiantes: 0,
    estudiantesAlDia: 0,
    estudiantesMora: 0,
    recaudoTotal: 0,
    adeudadoTotal: 0,
    gastosTotal: 0,
    netoTotal: 0,
  })

  const [isipp, setISIPP] = useState<DatosInstitucion>({
    totalEstudiantes: 0,
    estudiantesAlDia: 0,
    estudiantesMora: 0,
    recaudable: 0,
    recaudado: 0,
    deuda: 0,
    eficiencia: 0,
    mora: 0,
    gastosAnual: 0,
    netoAnual: 0,
    porCarrera: [],
    topMorosos: [],
  })

  const [milagros, setMilagros] = useState<DatosInstitucion>({
    totalEstudiantes: 0,
    estudiantesAlDia: 0,
    estudiantesMora: 0,
    recaudable: 0,
    recaudado: 0,
    deuda: 0,
    eficiencia: 0,
    mora: 0,
    gastosAnual: 0,
    netoAnual: 0,
    porCarrera: [],
    topMorosos: [],
  })

  // ========== CALCULAR FECHA DE VENCIDOS ==========
  const calcularFechaVencidos = () => {
    const today = new Date()
    const diaActual = today.getDate()
    const mesActual = today.getMonth() + 1
    const anioActual = today.getFullYear()

    // Regla: si día <= 10, vencido = mes_anterior; si día > 10, vencido = mes_actual
    let mesVencido = diaActual <= 10 ? mesActual - 1 : mesActual
    let anioVencido = anioActual

    if (mesVencido === 0) {
      mesVencido = 12
      anioVencido = anioActual - 1
    }

    const meses = ['', 'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
    const fechaStr = `Hoy: ${diaActual}/${mesActual}/${anioActual} → Vencidos desde: ${meses[mesVencido]}/${anioVencido}`
    setFechaVencidos(fechaStr)

    return { diaActual, mesActual, anioActual, mesVencido, anioVencido }
  }

  // ========== CARGAR REPORTES ==========
  const cargarReportes = async () => {
    try {
      setLoading(true)
      setError(null)

      const fechas = calcularFechaVencidos()

      const [isippData, milagrosData] = await Promise.all([
        procesarInstitucion(1, fechas),
        procesarInstitucion(2, fechas),
      ])

      setISIPP(isippData)
      setMilagros(milagrosData)

      // CONSOLIDAR
      setConsolidado({
        totalEstudiantes: isippData.totalEstudiantes + milagrosData.totalEstudiantes,
        estudiantesAlDia: isippData.estudiantesAlDia + milagrosData.estudiantesAlDia,
        estudiantesMora: isippData.estudiantesMora + milagrosData.estudiantesMora,
        recaudoTotal: isippData.recaudado + milagrosData.recaudado,
        adeudadoTotal: isippData.deuda + milagrosData.deuda,
        gastosTotal: isippData.gastosAnual + milagrosData.gastosAnual,
        netoTotal: (isippData.recaudado - isippData.gastosAnual) + (milagrosData.recaudado - milagrosData.gastosAnual),
      })
    } catch (err) {
      console.error('[PANEL] Error:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // ========== PROCESAR INSTITUCIÓN ==========
  const procesarInstitucion = async (
    institucionId: number,
    fechas: { diaActual: number; mesActual: number; anioActual: number; mesVencido: number; anioVencido: number }
  ): Promise<DatosInstitucion> => {
    try {
      const { mesVencido, anioVencido } = fechas

      console.log(`[PANEL] Institución ${institucionId}: Buscando vencidos desde mes ${mesVencido}/${anioVencido}`)

      // 1. OBTENER TODOS LOS ESTUDIANTES ACTIVOS
      const { data: estudiantes, error: errEst } = await supabase
        .from('estudiantes')
        .select('id, dni, nombre, apellido, carrera_id, estado, carreras(id, nombre)')
        .eq('institucion_id', institucionId)
        .eq('estado', 'ACTIVO')

      if (errEst) throw errEst
      const estudiantesActivos = estudiantes || []
      const totalEstudiantes = estudiantesActivos.length

      console.log(`[PANEL] Institución ${institucionId}: ${totalEstudiantes} estudiantes`)

      // 2. OBTENER TODOS LOS CONCEPTOS (sin filtrar, filtramos después)
      const { data: todosConceptos, error: errCon } = await supabase
        .from('conceptos_pago')
        .select('id, tipo, monto, mes, año, carrera_id, nombre')
        .eq('institucion_id', institucionId)
        .eq('activo', true)

      if (errCon) throw errCon

      // 3. FILTRAR CONCEPTOS VENCIDOS según la regla
      const conceptosArr = (todosConceptos || []).filter(c => {
        // INSCRIPCION sin fecha: siempre vencido
        if (c.tipo?.toUpperCase() === 'INSCRIPCION' && (!c.mes || !c.año)) {
          return true
        }
        // Conceptos con fecha: validar si están vencidos
        if (c.mes && c.año) {
          // Vencido si: año anterior O (mismo año y mes <= mesVencido)
          if (c.año < anioVencido) return true
          if (c.año === anioVencido && c.mes <= mesVencido) return true
        }
        return false
      })

      console.log(`[PANEL] Institución ${institucionId}: ${conceptosArr.length} conceptos vencidos`)

      // 4. OBTENER PAGOS SIMPLES
      const { data: pagosSimples, error: errPS } = await supabase
        .from('pagos')
        .select('estudiante_id, concepto_id, monto_pagado')
        .eq('institucion_id', institucionId)
        .neq('estado', 'ANULADO')

      if (errPS) throw errPS

      // 5. OBTENER PAGOS MÚLTIPLES CON DETALLES
      const { data: pagosMultiples, error: errPM } = await supabase
        .from('pagos_multiples_detalle')
        .select('concepto_id, monto_pagado, pagos_multiples(estudiante_id, institucion_id)')
        .eq('pagos_multiples.institucion_id', institucionId)
        .neq('pagos_multiples.estado', 'ANULADO')

      if (errPM) throw errPM

      // 6. UNIFICAR PAGOS
      const pagosUnificados = new Map<string, number>()

      // Agregar pagos simples
      ;(pagosSimples || []).forEach((p: any) => {
        const key = `${p.estudiante_id}-${p.concepto_id}`
        pagosUnificados.set(key, (pagosUnificados.get(key) || 0) + (p.monto_pagado || 0))
      })

      // Agregar pagos múltiples
      ;(pagosMultiples || []).forEach((p: any) => {
        const estId = p.pagos_multiples?.estudiante_id
        const key = `${estId}-${p.concepto_id}`
        pagosUnificados.set(key, (pagosUnificados.get(key) || 0) + (p.monto_pagado || 0))
      })

      // 7. CALCULAR POR ESTUDIANTE
      let recaudoTotalInst = 0
      let recaudableTotalInst = 0
      let deudaTotalInst = 0
      let estudiantesAlDiaCount = 0
      let estudiantesMoraCount = 0
      const topMorosos: Array<{ dni: string; nombre: string; carrera: string; deuda: number }> = []

      const dataCarreras = new Map<number, {
        estudiantes: number
        estudiantesAlDia: number
        estudiantesEnMora: number
        recaudable: number
        recaudado: number
        deuda: number
      }>()

      // Inicializar carreras
      estudiantesActivos.forEach(est => {
        if (!dataCarreras.has(est.carrera_id)) {
          dataCarreras.set(est.carrera_id, {
            estudiantes: 0,
            estudiantesAlDia: 0,
            estudiantesEnMora: 0,
            recaudable: 0,
            recaudado: 0,
            deuda: 0,
          })
        }
        const carr = dataCarreras.get(est.carrera_id)!
        carr.estudiantes++
      })

      // Procesar cada estudiante
      estudiantesActivos.forEach(est => {
        const conceptosEstudiante = conceptosArr.filter(c => c.carrera_id === est.carrera_id)

        if (conceptosEstudiante.length === 0) return

        let recaudoEstudiante = 0
        let recaudableEstudiante = 0
        let deudaEstudiante = 0
        let conceptosPagados = 0

        conceptosEstudiante.forEach(concepto => {
          recaudableEstudiante += concepto.monto
          const montoPagado = pagosUnificados.get(`${est.id}-${concepto.id}`) || 0
          recaudoEstudiante += montoPagado

          if (montoPagado >= concepto.monto) {
            conceptosPagados++
          } else {
            deudaEstudiante += concepto.monto - montoPagado
          }
        })

        // Actualizar totales institución
        recaudoTotalInst += recaudoEstudiante
        recaudableTotalInst += recaudableEstudiante
        deudaTotalInst += deudaEstudiante

        // Determinar estado
        const alDia = conceptosPagados === conceptosEstudiante.length
        if (alDia) {
          estudiantesAlDiaCount++
        } else {
          estudiantesMoraCount++
          if (deudaEstudiante > 0) {
            topMorosos.push({
              dni: est.dni || '',
              nombre: `${est.nombre} ${est.apellido}`,
              carrera: (est as any).carreras?.nombre || 'Sin carrera',
              deuda: deudaEstudiante,
            })
          }
        }

        // Actualizar carrera
        const carrData = dataCarreras.get(est.carrera_id)!
        carrData.recaudable += recaudableEstudiante
        carrData.recaudado += recaudoEstudiante
        carrData.deuda += deudaEstudiante
        if (alDia) {
          carrData.estudiantesAlDia++
        } else {
          carrData.estudiantesEnMora++
        }
      })

      topMorosos.sort((a, b) => b.deuda - a.deuda)

      // 8. OBTENER GASTOS
      const { data: gastosData } = await supabase
        .from('gastos')
        .select('monto')
        .eq('institucion_id', institucionId)

      const gastosAnual = (gastosData || []).reduce((sum, g) => sum + (g.monto || 0), 0)

      // 9. CONSTRUIR DATOS POR CARRERA
      const porCarrera: DatosCarrera[] = Array.from(dataCarreras.entries()).map(([carreraId, data]) => {
        const carreraNombre = conceptosArr.find(c => c.carrera_id === carreraId)?.nombre || `Carrera ${carreraId}`
        const eficiencia = data.recaudable > 0 ? (data.recaudado / data.recaudable) * 100 : 0
        const moraCarrera = data.estudiantes > 0 ? (data.estudiantesEnMora / data.estudiantes) * 100 : 0

        return {
          carreraId,
          carrera: carreraNombre,
          estudiantes: data.estudiantes,
          estudiantesAlDia: data.estudiantesAlDia,
          estudiantesEnMora: data.estudiantesEnMora,
          recaudable: data.recaudable,
          recaudado: data.recaudado,
          deuda: data.deuda,
          eficiencia: parseFloat(eficiencia.toFixed(1)),
          moraCarrera: parseFloat(moraCarrera.toFixed(1)),
        }
      })

      // 10. CALCULAR MÉTRICAS FINALES
      const eficienciaInst = recaudableTotalInst > 0 ? (recaudoTotalInst / recaudableTotalInst) * 100 : 0
      const moraInst = totalEstudiantes > 0 ? (estudiantesMoraCount / totalEstudiantes) * 100 : 0
      const netoAnual = recaudoTotalInst - gastosAnual

      const resultado: DatosInstitucion = {
        totalEstudiantes,
        estudiantesAlDia: estudiantesAlDiaCount,
        estudiantesMora: estudiantesMoraCount,
        recaudable: recaudableTotalInst,
        recaudado: recaudoTotalInst,
        deuda: deudaTotalInst,
        eficiencia: parseFloat(eficienciaInst.toFixed(1)),
        mora: parseFloat(moraInst.toFixed(1)),
        gastosAnual,
        netoAnual,
        porCarrera,
        topMorosos: topMorosos.slice(0, 10),
      }

      console.log(`[PANEL] Institución ${institucionId}:`, resultado)
      return resultado
    } catch (err) {
      console.error(`[PANEL] Error institución ${institucionId}:`, err)
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
          <p className="text-slate-400 text-sm font-bold">⏳ Cargando reportes ejecutivos...</p>
          <p className="text-slate-500 text-xs mt-2">Procesando datos de ambas instituciones...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 max-w-sm">
          <p className="text-red-400 font-bold text-sm mb-2">❌ Error:</p>
          <p className="text-red-300 text-xs mb-3">{error}</p>
          <button onClick={cargarReportes} className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const porcentajeMora = consolidado.totalEstudiantes > 0
    ? ((consolidado.estudiantesMora / consolidado.totalEstudiantes) * 100).toFixed(1)
    : '0'

  const porcentajeAlDia = consolidado.totalEstudiantes > 0
    ? ((consolidado.estudiantesAlDia / consolidado.totalEstudiantes) * 100).toFixed(1)
    : '0'

  const eficienciaGlobal = consolidado.recaudoTotal > 0
    ? ((consolidado.recaudoTotal / (consolidado.recaudoTotal + consolidado.adeudadoTotal)) * 100).toFixed(1)
    : '0'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text mb-1">
            📊 PANEL EJECUTIVO
          </h1>
          <p className="text-slate-400 text-xs md:text-sm">Consolidado financiero de ambas instituciones</p>
          {fechaVencidos && <p className="text-slate-500 text-xs mt-1">📅 {fechaVencidos}</p>}
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
          {/* KPI ESTUDIANTES DESTACADO */}
          <div className="bg-gradient-to-br from-blue-600/30 to-blue-900/20 border-2 border-blue-500/50 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-300 text-sm font-semibold mb-1">✅ ESTUDIANTES ACTIVOS EN EL SISTEMA</p>
                <p className="text-5xl font-black text-blue-300">{consolidado.totalEstudiantes}</p>
                <p className="text-slate-400 text-xs mt-1">Sincronizados desde Google Sheets v2.26</p>
              </div>
              <Users className="text-blue-400" size={48} />
            </div>
          </div>

          {/* KPIs FINANCIEROS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <KPICard
              title="💰 RECAUDADO"
              value={formatoMoneda(consolidado.recaudoTotal)}
              subtitle="Total del año"
              icon={<DollarSign className="text-green-400" size={20} />}
              bgColor="bg-gradient-to-br from-green-600/25 to-green-900/15 border border-green-500/30"
              textColor="text-green-300"
            />
            <KPICard
              title="📌 ADEUDADO"
              value={formatoMoneda(consolidado.adeudadoTotal)}
              subtitle={`${porcentajeMora}% en mora`}
              icon={<AlertCircle className="text-red-400" size={20} />}
              bgColor="bg-gradient-to-br from-red-600/25 to-red-900/15 border border-red-500/30"
              textColor="text-red-300"
            />
            <KPICard
              title="✅ AL DÍA"
              value={consolidado.estudiantesAlDia.toString()}
              subtitle={`${porcentajeAlDia}% de estudiantes`}
              icon={<TrendingUp className="text-purple-400" size={20} />}
              bgColor="bg-gradient-to-br from-purple-600/25 to-purple-900/15 border border-purple-500/30"
              textColor="text-purple-300"
            />
          </div>

          {/* TABLA COMPARATIVA INSTITUCIONES */}
          <div className="p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/40 border border-slate-700/50 rounded-lg shadow-lg overflow-x-auto">
            <h3 className="text-sm font-bold text-white mb-3">📋 Comparativa Instituciones</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-900/50">
                  <th className="px-3 py-2 text-left font-bold text-slate-300">Institución</th>
                  <th className="px-3 py-2 text-right text-yellow-400">Estudiantes</th>
                  <th className="px-3 py-2 text-right text-green-400">Recaudado</th>
                  <th className="px-3 py-2 text-right text-orange-400">Recaudable</th>
                  <th className="px-3 py-2 text-right text-red-400">Deuda</th>
                  <th className="px-3 py-2 text-right text-blue-400">Al Día</th>
                  <th className="px-3 py-2 text-right text-purple-400">Eficiencia</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-700/30 hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-bold text-cyan-300">ISIPP</td>
                  <td className="px-3 py-2 text-right text-yellow-300">{isipp.totalEstudiantes}</td>
                  <td className="px-3 py-2 text-right text-green-300 font-semibold">{formatoMoneda(isipp.recaudado)}</td>
                  <td className="px-3 py-2 text-right text-orange-300">{formatoMoneda(isipp.recaudable)}</td>
                  <td className="px-3 py-2 text-right text-red-300">{formatoMoneda(isipp.deuda)}</td>
                  <td className="px-3 py-2 text-right text-blue-300">{isipp.estudiantesAlDia}</td>
                  <td className="px-3 py-2 text-right text-purple-300 font-bold">{isipp.eficiencia.toFixed(1)}%</td>
                </tr>
                <tr className="border-b border-slate-700/30 hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-bold text-orange-300">MILAGROS</td>
                  <td className="px-3 py-2 text-right text-yellow-300">{milagros.totalEstudiantes}</td>
                  <td className="px-3 py-2 text-right text-green-300 font-semibold">{formatoMoneda(milagros.recaudado)}</td>
                  <td className="px-3 py-2 text-right text-orange-300">{formatoMoneda(milagros.recaudable)}</td>
                  <td className="px-3 py-2 text-right text-red-300">{formatoMoneda(milagros.deuda)}</td>
                  <td className="px-3 py-2 text-right text-blue-300">{milagros.estudiantesAlDia}</td>
                  <td className="px-3 py-2 text-right text-purple-300 font-bold">{milagros.eficiencia.toFixed(1)}%</td>
                </tr>
                <tr className="border-t-2 border-cyan-500/50 bg-slate-900/70 hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-bold text-cyan-300">TOTAL</td>
                  <td className="px-3 py-2 text-right text-yellow-300 font-bold">{consolidado.totalEstudiantes}</td>
                  <td className="px-3 py-2 text-right text-green-300 font-bold text-base">{formatoMoneda(consolidado.recaudoTotal)}</td>
                  <td className="px-3 py-2 text-right text-orange-300 font-bold text-base">{formatoMoneda(consolidado.recaudoTotal + consolidado.adeudadoTotal)}</td>
                  <td className="px-3 py-2 text-right text-red-300 font-bold text-base">{formatoMoneda(consolidado.adeudadoTotal)}</td>
                  <td className="px-3 py-2 text-right text-blue-300 font-bold">{consolidado.estudiantesAlDia}</td>
                  <td className="px-3 py-2 text-right text-purple-300 font-bold text-base">{eficienciaGlobal}%</td>
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
            <KPICard title="👥 Estudiantes" value={isipp.totalEstudiantes.toString()} subtitle={`${isipp.estudiantesAlDia} al día`} icon={<Users size={18} className="text-blue-400" />} bgColor="bg-blue-900/30 border border-blue-700/50" textColor="text-blue-300" size="sm" />
            <KPICard title="💰 Recaudado" value={formatoMoneda(isipp.recaudado)} icon={<DollarSign size={18} className="text-green-400" />} bgColor="bg-green-900/30 border border-green-700/50" textColor="text-green-300" size="sm" />
            <KPICard title="💾 Recaudable" value={formatoMoneda(isipp.recaudable)} icon={<DollarSign size={18} className="text-orange-400" />} bgColor="bg-orange-900/30 border border-orange-700/50" textColor="text-orange-300" size="sm" />
            <KPICard title="📌 Deuda" value={formatoMoneda(isipp.deuda)} icon={<AlertCircle size={18} className="text-red-400" />} bgColor="bg-red-900/30 border border-red-700/50" textColor="text-red-300" size="sm" />
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
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-bold text-slate-200">{carr.carrera}</span>
                    <span className="text-xs text-slate-400">({carr.estudiantes} est.) | {carr.estudiantesAlDia} ✅ | {carr.estudiantesEnMora} ⚠️</span>
                  </div>
                  {expandidosISIPP[idx] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandidosISIPP[idx] && (
                  <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 grid grid-cols-6 gap-2 text-xs">
                    <div><p className="text-slate-400">Recaudable</p><p className="text-orange-300 font-bold">{formatoMoneda(carr.recaudable)}</p></div>
                    <div><p className="text-slate-400">Recaudado</p><p className="text-green-300 font-bold">{formatoMoneda(carr.recaudado)}</p></div>
                    <div><p className="text-slate-400">Deuda</p><p className="text-red-300 font-bold">{formatoMoneda(carr.deuda)}</p></div>
                    <div><p className="text-slate-400">Al Día</p><p className="text-blue-300 font-bold">{carr.estudiantesAlDia}</p></div>
                    <div><p className="text-slate-400">En Mora</p><p className="text-red-300 font-bold">{carr.estudiantesEnMora}</p></div>
                    <div><p className="text-slate-400">Eficiencia</p><p className="text-cyan-300 font-bold">{carr.eficiencia.toFixed(1)}%</p></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* TOP MOROSOS */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
            <h4 className="text-sm font-bold text-white mb-3">📍 Top Morosos ({isipp.topMorosos.length})</h4>
            {isipp.topMorosos.length > 0 ? (
              <div className="space-y-2">
                {isipp.topMorosos.slice(0, 10).map((moroso, idx) => (
                  <div key={idx} className="flex justify-between text-xs p-2 bg-slate-900/50 rounded">
                    <div>
                      <p className="text-slate-200 font-semibold">{idx + 1}. {moroso.nombre}</p>
                      <p className="text-slate-500 text-xs">{moroso.carrera}</p>
                    </div>
                    <p className="text-red-300 font-bold">{formatoMoneda(moroso.deuda)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs">✅ Sin morosos</p>
            )}
          </div>
        </div>
      )}

      {/* TAB: MILAGROS */}
      {tabActiva === 'milagros' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard title="👥 Estudiantes" value={milagros.totalEstudiantes.toString()} subtitle={`${milagros.estudiantesAlDia} al día`} icon={<Users size={18} className="text-blue-400" />} bgColor="bg-blue-900/30 border border-blue-700/50" textColor="text-blue-300" size="sm" />
            <KPICard title="💰 Recaudado" value={formatoMoneda(milagros.recaudado)} icon={<DollarSign size={18} className="text-green-400" />} bgColor="bg-green-900/30 border border-green-700/50" textColor="text-green-300" size="sm" />
            <KPICard title="💾 Recaudable" value={formatoMoneda(milagros.recaudable)} icon={<DollarSign size={18} className="text-orange-400" />} bgColor="bg-orange-900/30 border border-orange-700/50" textColor="text-orange-300" size="sm" />
            <KPICard title="📌 Deuda" value={formatoMoneda(milagros.deuda)} icon={<AlertCircle size={18} className="text-red-400" />} bgColor="bg-red-900/30 border border-red-700/50" textColor="text-red-300" size="sm" />
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
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-bold text-slate-200">{carr.carrera}</span>
                    <span className="text-xs text-slate-400">({carr.estudiantes} est.) | {carr.estudiantesAlDia} ✅ | {carr.estudiantesEnMora} ⚠️</span>
                  </div>
                  {expandidosMilagros[idx] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandidosMilagros[idx] && (
                  <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 grid grid-cols-6 gap-2 text-xs">
                    <div><p className="text-slate-400">Recaudable</p><p className="text-orange-300 font-bold">{formatoMoneda(carr.recaudable)}</p></div>
                    <div><p className="text-slate-400">Recaudado</p><p className="text-green-300 font-bold">{formatoMoneda(carr.recaudado)}</p></div>
                    <div><p className="text-slate-400">Deuda</p><p className="text-red-300 font-bold">{formatoMoneda(carr.deuda)}</p></div>
                    <div><p className="text-slate-400">Al Día</p><p className="text-blue-300 font-bold">{carr.estudiantesAlDia}</p></div>
                    <div><p className="text-slate-400">En Mora</p><p className="text-red-300 font-bold">{carr.estudiantesEnMora}</p></div>
                    <div><p className="text-slate-400">Eficiencia</p><p className="text-cyan-300 font-bold">{carr.eficiencia.toFixed(1)}%</p></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* TOP MOROSOS */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-lg">
            <h4 className="text-sm font-bold text-white mb-3">📍 Top Morosos ({milagros.topMorosos.length})</h4>
            {milagros.topMorosos.length > 0 ? (
              <div className="space-y-2">
                {milagros.topMorosos.slice(0, 10).map((moroso, idx) => (
                  <div key={idx} className="flex justify-between text-xs p-2 bg-slate-900/50 rounded">
                    <div>
                      <p className="text-slate-200 font-semibold">{idx + 1}. {moroso.nombre}</p>
                      <p className="text-slate-500 text-xs">{moroso.carrera}</p>
                    </div>
                    <p className="text-red-300 font-bold">{formatoMoneda(moroso.deuda)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs">✅ Sin morosos</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportesEjecutivos
