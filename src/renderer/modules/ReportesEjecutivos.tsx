import React, { useState, useEffect } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda } from '@renderer/lib/helpers'
import { BarChart3, RefreshCw, Users, DollarSign, AlertCircle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'

// ========== TIPOS ==========
interface KPIData {
  estudiantes: number
  estudiantesAlDia: number
  estudiantesEnMora: number
  recaudable: number
  recaudado: number
  deuda: number
  eficiencia: number
  moraPercentage: number
}

interface CarreraData {
  id: number
  nombre: string
  estudiantes: number
  alDia: number
  enMora: number
  recaudable: number
  recaudado: number
  deuda: number
}

interface MorosoData {
  dni: string
  nombre: string
  carrera: string
  deuda: number
}

// ========== KPI CARD COMPONENT ==========
const KPICard: React.FC<{
  label: string
  value: string | number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple'
  subtext?: string
}> = ({ label, value, icon, color, subtext }) => {
  const colorMap = {
    blue: 'bg-blue-950/50 border-blue-700/30',
    green: 'bg-green-950/50 border-green-700/30',
    orange: 'bg-orange-950/50 border-orange-700/30',
    red: 'bg-red-950/50 border-red-700/30',
    purple: 'bg-purple-950/50 border-purple-700/30',
  }

  const textColorMap = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  }

  return (
    <div className={`${colorMap[color]} border p-4 rounded-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-semibold mb-2">{label}</p>
          <p className={`text-2xl font-black ${textColorMap[color]}`}>{value}</p>
          {subtext && <p className="text-slate-500 text-xs mt-1">{subtext}</p>}
        </div>
        <div className={`${textColorMap[color]}`}>{icon}</div>
      </div>
    </div>
  )
}

// ========== MAIN COMPONENT ==========
export const ReportesEjecutivos: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabActiva, setTabActiva] = useState('global')
  const [expandedCarreras, setExpandedCarreras] = useState<Record<string, boolean>>({})

  // DATA
  const [global, setGlobal] = useState<KPIData>({
    estudiantes: 0,
    estudiantesAlDia: 0,
    estudiantesEnMora: 0,
    recaudable: 0,
    recaudado: 0,
    deuda: 0,
    eficiencia: 0,
    moraPercentage: 0,
  })

  const [isipp, setISIPP] = useState<{
    kpi: KPIData
    carreras: CarreraData[]
    morosos: MorosoData[]
  }>({
    kpi: { ...global },
    carreras: [],
    morosos: [],
  })

  const [milagros, setMilagros] = useState<{
    kpi: KPIData
    carreras: CarreraData[]
    morosos: MorosoData[]
  }>({
    kpi: { ...global },
    carreras: [],
    morosos: [],
  })

  // ========== PROCESAR INSTITUCIÓN ==========
  const procesarInstitucion = async (institucionId: number) => {
    try {
      console.log(`[EXEC] ========== Procesando institución ${institucionId} ==========`)

      // 1. OBTENER ESTUDIANTES
      const { data: estudiantes, error: errEst } = await supabase
        .from('estudiantes')
        .select('id, dni, nombre, apellido, carrera_id, estado, carreras(nombre)')
        .eq('institucion_id', institucionId)
        .neq('estado', 'NO_VIENE_MAS')

      if (errEst) throw errEst
      if (!estudiantes) throw new Error('No se pudieron cargar estudiantes')

      const estudiantesActivos = estudiantes
      const totalEstudiantes = estudiantesActivos.length

      console.log(`[EXEC] ${totalEstudiantes} estudiantes`)

      if (totalEstudiantes === 0) {
        return {
          kpi: {
            estudiantes: 0,
            estudiantesAlDia: 0,
            estudiantesEnMora: 0,
            recaudable: 0,
            recaudado: 0,
            deuda: 0,
            eficiencia: 0,
            moraPercentage: 0,
          },
          carreras: [],
          morosos: [],
        }
      }

      // 2. OBTENER DATOS DE PAGOS REALES DESDE pagos_multiples_detalle
      const { data: pagosRealData, error: errPagosReal } = await supabase
        .from('pagos_multiples_detalle')
        .select(`
          id,
          pago_multiple_id,
          concepto_id,
          monto_pagado,
          conceptos_pago(
            id,
            carrera_id,
            tipo,
            mes,
            institucion_id
          )
        `)

      if (errPagosReal) throw errPagosReal

      // Filtrar solo datos de esta institución
      const pagosFiltered = pagosRealData?.filter(p => p.conceptos_pago?.institucion_id === institucionId) || []

      console.log(`[EXEC] ${pagosFiltered.length} detalles de pago cargados para institución ${institucionId}`)

      // 3. INICIALIZAR CARRERAS
      const carreras = new Map<number, CarreraData>()
      estudiantesActivos.forEach(est => {
        if (!carreras.has(est.carrera_id)) {
          carreras.set(est.carrera_id, {
            id: est.carrera_id,
            nombre: (est as any).carreras?.nombre || `Carrera ${est.carrera_id}`,
            estudiantes: 0,
            alDia: 0,
            enMora: 0,
            recaudable: 0,
            recaudado: 0,
            deuda: 0,
          })
        }
        carreras.get(est.carrera_id)!.estudiantes++
      })

      // 4. PROCESAR PAGOS REALES
      let totalRecaudado = 0
      const estudiantesConPago = new Set<number>()

      pagosFiltered.forEach((detalle: any) => {
        if (detalle.conceptos_pago) {
          const carreraId = detalle.conceptos_pago.carrera_id
          const carr = carreras.get(carreraId)
          if (carr) {
            totalRecaudado += detalle.monto_pagado
            carr.recaudado += detalle.monto_pagado
          }
        }
      })

      // 5. OBTENER ESTUDIANTES CON PAGO DESDE pagos_multiples
      const { data: pagosMultiplesData } = await supabase
        .from('pagos_multiples')
        .select('estudiante_id, estudiantes(carrera_id)')
        .eq('institucion_id', institucionId)
        .neq('estado', 'ANULADO')

      let estudiantesAlDia = 0
      if (pagosMultiplesData) {
        pagosMultiplesData.forEach(pm => {
          estudiantesConPago.add(pm.estudiante_id)
        })
        estudiantesAlDia = estudiantesConPago.size
      }

      const estudiantesEnMora = Math.max(0, totalEstudiantes - estudiantesAlDia)

      // 6. ACTUALIZAR CARRERAS CON ESTUDIANTES AL DÍA/EN MORA
      carreras.forEach(carr => {
        const estudiantesCarrera = estudiantesActivos.filter(e => e.carrera_id === carr.id)
        const conPago = estudiantesCarrera.filter(e => estudiantesConPago.has(e.id))
        
        carr.alDia = conPago.length
        carr.enMora = estudiantesCarrera.length - conPago.length
        carr.recaudable = carr.recaudado // No mostramos recaudable, solo lo pagado
        carr.deuda = 0
      })

      // CALCULAR MÉTRICAS
      const eficiencia = totalRecaudado > 0 ? 100 : 0 // Si hay recaudación, eficiencia es 100%
      const moraPercentage = totalEstudiantes > 0 ? (estudiantesEnMora / totalEstudiantes) * 100 : 0

      const resultado = {
        kpi: {
          estudiantes: totalEstudiantes,
          estudiantesAlDia: estudiantesAlDia,
          estudiantesEnMora: estudiantesEnMora,
          recaudable: totalRecaudado,
          recaudado: totalRecaudado,
          deuda: 0,
          eficiencia: 100,
          moraPercentage: parseFloat(moraPercentage.toFixed(1)),
        },
        carreras: Array.from(carreras.values()).sort((a, b) => b.estudiantes - a.estudiantes),
        morosos: [],
      }

      console.log(`[EXEC] ✅ Institución ${institucionId}:`, {
        estudiantes: totalEstudiantes,
        alDia: estudiantesAlDia,
        enMora: estudiantesEnMora,
        recaudado: formatoMoneda(totalRecaudado),
      })

      return resultado
    } catch (err) {
      console.error(`[EXEC] ERROR institución ${institucionId}:`, err)
      throw err
    }
  }

  // ========== CARGAR DATOS ==========
  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('[EXEC] ==================== INICIANDO CARGA ====================')

      const [isippRes, milagrosRes] = await Promise.all([
        procesarInstitucion(1),
        procesarInstitucion(2),
      ])

      setISIPP(isippRes)
      setMilagros(milagrosRes)

      // CONSOLIDAR GLOBAL
      const globalData = {
        estudiantes: isippRes.kpi.estudiantes + milagrosRes.kpi.estudiantes,
        estudiantesAlDia: isippRes.kpi.estudiantesAlDia + milagrosRes.kpi.estudiantesAlDia,
        estudiantesEnMora: isippRes.kpi.estudiantesEnMora + milagrosRes.kpi.estudiantesEnMora,
        recaudable: isippRes.kpi.recaudado + milagrosRes.kpi.recaudado,
        recaudado: isippRes.kpi.recaudado + milagrosRes.kpi.recaudado,
        deuda: 0,
        eficiencia: 100,
        moraPercentage:
          isippRes.kpi.estudiantes + milagrosRes.kpi.estudiantes > 0
            ? ((isippRes.kpi.estudiantesEnMora + milagrosRes.kpi.estudiantesEnMora) /
                (isippRes.kpi.estudiantes + milagrosRes.kpi.estudiantes)) *
              100
            : 0,
      }

      setGlobal(globalData)

      console.log('[EXEC] ✅ CARGA COMPLETADA:', {
        total: globalData.estudiantes,
        alDia: globalData.estudiantesAlDia,
        enMora: globalData.estudiantesEnMora,
        recaudado: formatoMoneda(globalData.recaudado),
      })
    } catch (err) {
      console.error('[EXEC] ERROR FATAL:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 size={48} className="text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-bold">⏳ Cargando reportes...</p>
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
          <button
            onClick={cargarDatos}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-1">
            📊 REPORTES EJECUTIVOS
          </h1>
          <p className="text-slate-400 text-sm">Datos en tiempo real desde BD</p>
        </div>
        <button
          onClick={cargarDatos}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"
          title="Actualizar"
        >
          <RefreshCw size={20} className="text-cyan-400" />
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6 border-b border-slate-700/50 pb-2">
        {[
          { id: 'global', label: '🌍 Global' },
          { id: 'isipp', label: '🏫 ISIPP' },
          { id: 'milagros', label: '📚 Milagros' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTabActiva(id)}
            className={`px-4 py-2 rounded text-sm font-bold transition-all ${
              tabActiva === id
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'bg-slate-700/30 text-slate-400 hover:bg-slate-600/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* GLOBAL TAB */}
      {tabActiva === 'global' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard
              label="👥 ESTUDIANTES"
              value={global.estudiantes}
              icon={<Users size={24} />}
              color="blue"
              subtext={`${global.estudiantesAlDia} al día`}
            />
            <KPICard
              label="✅ AL DÍA"
              value={global.estudiantesAlDia}
              icon={<TrendingUp size={24} />}
              color="green"
            />
            <KPICard
              label="⚠️ EN MORA"
              value={global.estudiantesEnMora}
              icon={<AlertCircle size={24} />}
              color="red"
            />
            <KPICard
              label="💰 RECAUDADO"
              value={formatoMoneda(global.recaudado)}
              icon={<DollarSign size={24} />}
              color="green"
            />
          </div>

          {/* COMPARATIVA */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 overflow-x-auto">
            <h3 className="text-sm font-bold text-white mb-3">📋 Comparativa por Institución</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-3 py-2 text-left text-slate-300">Institución</th>
                  <th className="px-3 py-2 text-right text-blue-400">Estudiantes</th>
                  <th className="px-3 py-2 text-right text-green-400">Al Día</th>
                  <th className="px-3 py-2 text-right text-red-400">En Mora</th>
                  <th className="px-3 py-2 text-right text-green-400">Recaudado</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-700/30 hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-bold text-cyan-400">ISIPP</td>
                  <td className="px-3 py-2 text-right text-blue-300">{isipp.kpi.estudiantes}</td>
                  <td className="px-3 py-2 text-right text-green-300">{isipp.kpi.estudiantesAlDia}</td>
                  <td className="px-3 py-2 text-right text-red-300">{isipp.kpi.estudiantesEnMora}</td>
                  <td className="px-3 py-2 text-right text-green-300 font-bold">{formatoMoneda(isipp.kpi.recaudado)}</td>
                </tr>
                <tr className="border-b border-slate-700/30 hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-bold text-orange-400">MILAGROS</td>
                  <td className="px-3 py-2 text-right text-blue-300">{milagros.kpi.estudiantes}</td>
                  <td className="px-3 py-2 text-right text-green-300">{milagros.kpi.estudiantesAlDia}</td>
                  <td className="px-3 py-2 text-right text-red-300">{milagros.kpi.estudiantesEnMora}</td>
                  <td className="px-3 py-2 text-right text-green-300 font-bold">{formatoMoneda(milagros.kpi.recaudado)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ISIPP TAB */}
      {tabActiva === 'isipp' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <KPICard
              label="👥 Estudiantes"
              value={isipp.kpi.estudiantes}
              icon={<Users size={20} />}
              color="blue"
            />
            <KPICard
              label="✅ Al Día"
              value={isipp.kpi.estudiantesAlDia}
              icon={<TrendingUp size={20} />}
              color="green"
            />
            <KPICard
              label="⚠️ En Mora"
              value={isipp.kpi.estudiantesEnMora}
              icon={<AlertCircle size={20} />}
              color="red"
            />
            <KPICard
              label="💰 Recaudado"
              value={formatoMoneda(isipp.kpi.recaudado)}
              icon={<DollarSign size={20} />}
              color="green"
            />
          </div>

          {/* CARRERAS */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white">📚 Carreras</h3>
            {isipp.carreras.map((carr, idx) => (
              <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-lg">
                <button
                  onClick={() =>
                    setExpandedCarreras({
                      ...expandedCarreras,
                      [`isipp-${idx}`]: !expandedCarreras[`isipp-${idx}`],
                    })
                  }
                  className="w-full flex justify-between items-center p-3 hover:bg-slate-700/30 transition-all"
                >
                  <div>
                    <p className="font-bold text-slate-200">{carr.nombre}</p>
                    <p className="text-xs text-slate-400">
                      {carr.estudiantes} est. | {carr.alDia} ✅ | {carr.enMora} ⚠️
                    </p>
                  </div>
                  {expandedCarreras[`isipp-${idx}`] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandedCarreras[`isipp-${idx}`] && (
                  <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400">Recaudado</p>
                      <p className="text-green-300 font-bold">{formatoMoneda(carr.recaudado)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MILAGROS TAB */}
      {tabActiva === 'milagros' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <KPICard
              label="👥 Estudiantes"
              value={milagros.kpi.estudiantes}
              icon={<Users size={20} />}
              color="blue"
            />
            <KPICard
              label="✅ Al Día"
              value={milagros.kpi.estudiantesAlDia}
              icon={<TrendingUp size={20} />}
              color="green"
            />
            <KPICard
              label="⚠️ En Mora"
              value={milagros.kpi.estudiantesEnMora}
              icon={<AlertCircle size={20} />}
              color="red"
            />
            <KPICard
              label="💰 Recaudado"
              value={formatoMoneda(milagros.kpi.recaudado)}
              icon={<DollarSign size={20} />}
              color="green"
            />
          </div>

          {/* CARRERAS */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white">📚 Carreras</h3>
            {milagros.carreras.map((carr, idx) => (
              <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-lg">
                <button
                  onClick={() =>
                    setExpandedCarreras({
                      ...expandedCarreras,
                      [`milagros-${idx}`]: !expandedCarreras[`milagros-${idx}`],
                    })
                  }
                  className="w-full flex justify-between items-center p-3 hover:bg-slate-700/30 transition-all"
                >
                  <div>
                    <p className="font-bold text-slate-200">{carr.nombre}</p>
                    <p className="text-xs text-slate-400">
                      {carr.estudiantes} est. | {carr.alDia} ✅ | {carr.enMora} ⚠️
                    </p>
                  </div>
                  {expandedCarreras[`milagros-${idx}`] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {expandedCarreras[`milagros-${idx}`] && (
                  <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400">Recaudado</p>
                      <p className="text-green-300 font-bold">{formatoMoneda(carr.recaudado)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportesEjecutivos
