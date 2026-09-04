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

// ========== CONSTANTES ==========
const PRIMER_MES_ACADEMICO = 3  // Marzo
const ULTIMO_MES_ACADEMICO = 8  // Agosto
const PRIMER_DIA_VENCIMIENTO = 10

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
  const [fechaVencidos, setFechaVencidos] = useState('')
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

  // ========== PROCESAR INSTITUCIÓN (LÓGICA EXACTA DE useDeudas) ==========
  const procesarInstitucion = async (institucionId: number) => {
    try {
      console.log(`[EXEC] ========== Procesando institución ${institucionId} ==========`)

      const today = new Date()
      const diaActual = today.getDate()
      const mesActual = today.getMonth() + 1
      const anioActual = today.getFullYear()

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

      // 2. OBTENER CONCEPTOS
      const { data: conceptos, error: errConc } = await supabase
        .from('conceptos_pago')
        .select('id, nombre, tipo, monto, mes, año, carrera_id')
        .eq('institucion_id', institucionId)
        .eq('activo', true)

      if (errConc) throw errConc

      // FILTRAR EXACTAMENTE COMO useDeudas
      const conceptosFiltrados = (conceptos || []).filter(c => {
        if (c.mes && c.año) {
          if (c.año < anioActual) return true
          if (c.año === anioActual) {
            if (c.mes < mesActual) return true
            if (c.mes === mesActual && diaActual > 10) return true
          }
          return false
        } else {
          return true
        }
      })

      console.log(`[EXEC] ${conceptosFiltrados.length} conceptos filtrados`)

      // 3. OBTENER PAGOS INDIVIDUALES CON PAGINACIÓN (EXACTO useDeudas)
      let todosPagos: any[] = []
      let pagina = 0
      let tieneRangoMas = true

      while (tieneRangoMas) {
        const desde = pagina * 1000
        const hasta = desde + 999
        
        const { data: pagosBloques, error: errorPagos } = await supabase
          .from('pagos')
          .select('estudiante_id, concepto_id, monto_pagado, estado')
          .eq('institucion_id', institucionId)
          .neq('estado', 'ANULADO')
          .range(desde, hasta)

        if (errorPagos) throw errorPagos
        
        if (!pagosBloques || pagosBloques.length === 0) {
          tieneRangoMas = false
        } else {
          todosPagos = [...todosPagos, ...pagosBloques]
          pagina++
        }
      }

      console.log(`[EXEC] Pagos individuales: ${todosPagos.length}`)

      // 4. OBTENER PAGOS MÚLTIPLES (EXACTO useDeudas)
      const { data: pagosMultiplesData } = await supabase
        .from('pagos_multiples')
        .select(`
          id,
          estudiante_id,
          estado,
          pagos_multiples_detalle(
            concepto_id,
            monto_pagado
          )
        `)
        .eq('institucion_id', institucionId)
        .neq('estado', 'ANULADO')

      if (pagosMultiplesData) {
        pagosMultiplesData.forEach((pm: any) => {
          if (pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
            pm.pagos_multiples_detalle.forEach((detalle: any) => {
              todosPagos.push({
                estudiante_id: pm.estudiante_id,
                concepto_id: detalle.concepto_id,
                monto_pagado: detalle.monto_pagado,
                estado: 'COMPLETADO'
              })
            })
          }
        })
      }

      // 5. CREAR MAPEO DE PAGOS - EXACTAMENTE COMO useDeudas (.set SIN SUMAR)
      const pagosMap = new Map<string, number>()
      todosPagos.forEach(p => {
        const key = `${p.estudiante_id}-${p.concepto_id}`
        pagosMap.set(key, p.monto_pagado)  // ⚠️ SOBRESCRIBE - última entrada gana
      })

      console.log(`[EXEC] ${todosPagos.length} pagos, ${pagosMap.size} pares únicos`)

      // 6. PROCESAR ESTUDIANTES - EXACTO useDeudas
      let totalRecaudable = 0
      let totalRecaudado = 0
      let estudiantesEnMora = 0
      const morosos: MorosoData[] = []
      const carreras = new Map<number, CarreraData>()

      // Inicializar carreras
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

      // PROCESAR CADA ESTUDIANTE - EXACTO useDeudas
      estudiantesActivos.forEach(est => {
        let pagadoTotal = 0
        let adeudadoTotal = 0

        // Filtrar conceptos POR CARRERA
        const conceptosDelEstudiante = conceptosFiltrados.filter(c => c.carrera_id === est.carrera_id)

        if (conceptosDelEstudiante.length === 0) return

        // EXACTO useDeudas
        conceptosDelEstudiante.forEach(concepto => {
          const montoPago = pagosMap.get(`${est.id}-${concepto.id}`) || 0
          const montoOriginal = concepto.monto

          pagadoTotal += montoPago

          const deudaDelConcepto = montoOriginal - montoPago
          if (deudaDelConcepto > 0) {
            adeudadoTotal += deudaDelConcepto
          }
        })

        // AL DÍA si sin deuda
        const esDeudor = adeudadoTotal > 0

        // Actualizar totales
        totalRecaudable += conceptosDelEstudiante.reduce((sum, c) => sum + c.monto, 0)
        totalRecaudado += pagadoTotal

        if (esDeudor) {
          estudiantesEnMora++
          morosos.push({
            dni: est.dni || '',
            nombre: `${est.nombre || ''} ${est.apellido || ''}`,
            carrera: (est as any).carreras?.nombre || 'Sin carrera',
            deuda: adeudadoTotal,
          })

          const carr = carreras.get(est.carrera_id)
          if (carr) {
            carr.enMora++
            carr.recaudable += conceptosDelEstudiante.reduce((sum, c) => sum + c.monto, 0)
            carr.recaudado += pagadoTotal
            carr.deuda += adeudadoTotal
          }
        } else {
          const carr = carreras.get(est.carrera_id)
          if (carr) {
            carr.alDia++
            carr.recaudable += conceptosDelEstudiante.reduce((sum, c) => sum + c.monto, 0)
            carr.recaudado += pagadoTotal
          }
        }
      })

      morosos.sort((a, b) => b.deuda - a.deuda)

      // CALCULAR MÉTRICAS
      const eficiencia = totalRecaudable > 0 ? (totalRecaudado / totalRecaudable) * 100 : 0
      const moraPercentage = totalEstudiantes > 0 ? (estudiantesEnMora / totalEstudiantes) * 100 : 0
      const estudiantesAlDia = totalEstudiantes - estudiantesEnMora

      const resultado = {
        kpi: {
          estudiantes: totalEstudiantes,
          estudiantesAlDia: estudiantesAlDia,
          estudiantesEnMora: estudiantesEnMora,
          recaudable: totalRecaudable,
          recaudado: totalRecaudado,
          deuda: Math.max(0, totalRecaudable - totalRecaudado),
          eficiencia: parseFloat(eficiencia.toFixed(1)),
          moraPercentage: parseFloat(moraPercentage.toFixed(1)),
        },
        carreras: Array.from(carreras.values()).sort((a, b) => b.estudiantes - a.estudiantes),
        morosos: morosos.slice(0, 10),
      }

      console.log(`[EXEC] ✅ Institución ${institucionId}:`, {
        estudiantes: totalEstudiantes,
        alDia: estudiantesAlDia,
        enMora: estudiantesEnMora,
        recaudable: formatoMoneda(totalRecaudable),
        recaudado: formatoMoneda(totalRecaudado),
        deuda: formatoMoneda(Math.max(0, totalRecaudable - totalRecaudado)),
        eficiencia: `${eficiencia.toFixed(1)}%`,
      })

      return resultado
    } catch (err) {
      console.error(`[EXEC] ERROR institución ${institucionId}:`, err)
      throw err
    }
  }

  // ========== CALCULAR FECHA VENCIDOS ==========
  const calcularFechaVencidos = () => {
    const today = new Date()
    const diaActual = today.getDate()
    const mesActual = today.getMonth() + 1
    const anioActual = today.getFullYear()

    let mesVencido = diaActual <= 10 ? mesActual - 1 : mesActual
    let anioVencido = anioActual

    if (mesVencido === 0) {
      mesVencido = 12
      anioVencido = anioActual - 1
    }

    const meses = ['', 'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
    const fechaStr = `Vencidos desde: ${meses[mesVencido]}/${anioVencido}`
    setFechaVencidos(fechaStr)
  }

  // ========== CARGAR DATOS ==========
  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      calcularFechaVencidos()

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
        recaudable: isippRes.kpi.recaudable + milagrosRes.kpi.recaudable,
        recaudado: isippRes.kpi.recaudado + milagrosRes.kpi.recaudado,
        deuda: isippRes.kpi.deuda + milagrosRes.kpi.deuda,
        eficiencia:
          isippRes.kpi.recaudable + milagrosRes.kpi.recaudable > 0
            ? ((isippRes.kpi.recaudado + milagrosRes.kpi.recaudado) /
                (isippRes.kpi.recaudable + milagrosRes.kpi.recaudable)) *
              100
            : 0,
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
        recaudable: formatoMoneda(globalData.recaudable),
        recaudado: formatoMoneda(globalData.recaudado),
        deuda: formatoMoneda(globalData.deuda),
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
          <p className="text-slate-400 text-sm">{fechaVencidos}</p>
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
              subtext={`${global.moraPercentage.toFixed(1)}% en mora`}
            />
            <KPICard
              label="⚠️ EN MORA"
              value={global.estudiantesEnMora}
              icon={<AlertCircle size={24} />}
              color="red"
            />
            <KPICard
              label="📊 EFICIENCIA"
              value={`${global.eficiencia.toFixed(1)}%`}
              icon={<BarChart3 size={24} />}
              color="purple"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KPICard
              label="💰 RECAUDABLE"
              value={formatoMoneda(global.recaudable)}
              icon={<DollarSign size={24} />}
              color="orange"
            />
            <KPICard
              label="✅ RECAUDADO"
              value={formatoMoneda(global.recaudado)}
              icon={<DollarSign size={24} />}
              color="green"
            />
            <KPICard
              label="📌 DEUDA"
              value={formatoMoneda(global.deuda)}
              icon={<DollarSign size={24} />}
              color="red"
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
                  <th className="px-3 py-2 text-right text-orange-400">Recaudable</th>
                  <th className="px-3 py-2 text-right text-green-400">Recaudado</th>
                  <th className="px-3 py-2 text-right text-red-400">Deuda</th>
                  <th className="px-3 py-2 text-right text-purple-400">Eficiencia</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-700/30 hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-bold text-cyan-400">ISIPP</td>
                  <td className="px-3 py-2 text-right text-blue-300">{isipp.kpi.estudiantes}</td>
                  <td className="px-3 py-2 text-right text-green-300">{isipp.kpi.estudiantesAlDia}</td>
                  <td className="px-3 py-2 text-right text-red-300">{isipp.kpi.estudiantesEnMora}</td>
                  <td className="px-3 py-2 text-right text-orange-300">{formatoMoneda(isipp.kpi.recaudable)}</td>
                  <td className="px-3 py-2 text-right text-green-300 font-bold">{formatoMoneda(isipp.kpi.recaudado)}</td>
                  <td className="px-3 py-2 text-right text-red-300">{formatoMoneda(isipp.kpi.deuda)}</td>
                  <td className="px-3 py-2 text-right text-purple-300 font-bold">{isipp.kpi.eficiencia.toFixed(1)}%</td>
                </tr>
                <tr className="border-b border-slate-700/30 hover:bg-slate-900/50">
                  <td className="px-3 py-2 font-bold text-orange-400">MILAGROS</td>
                  <td className="px-3 py-2 text-right text-blue-300">{milagros.kpi.estudiantes}</td>
                  <td className="px-3 py-2 text-right text-green-300">{milagros.kpi.estudiantesAlDia}</td>
                  <td className="px-3 py-2 text-right text-red-300">{milagros.kpi.estudiantesEnMora}</td>
                  <td className="px-3 py-2 text-right text-orange-300">{formatoMoneda(milagros.kpi.recaudable)}</td>
                  <td className="px-3 py-2 text-right text-green-300 font-bold">{formatoMoneda(milagros.kpi.recaudado)}</td>
                  <td className="px-3 py-2 text-right text-red-300">{formatoMoneda(milagros.kpi.deuda)}</td>
                  <td className="px-3 py-2 text-right text-purple-300 font-bold">{milagros.kpi.eficiencia.toFixed(1)}%</td>
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
              label="📊 Eficiencia"
              value={`${isipp.kpi.eficiencia.toFixed(1)}%`}
              icon={<BarChart3 size={20} />}
              color="purple"
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
                  <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400">Recaudable</p>
                      <p className="text-orange-300 font-bold">{formatoMoneda(carr.recaudable)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Recaudado</p>
                      <p className="text-green-300 font-bold">{formatoMoneda(carr.recaudado)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Deuda</p>
                      <p className="text-red-300 font-bold">{formatoMoneda(carr.deuda)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* TOP MOROSOS */}
          {isipp.morosos.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white mb-3">📍 Top 10 Deudores</h3>
              <div className="space-y-2">
                {isipp.morosos.map((m, idx) => (
                  <div key={idx} className="flex justify-between text-xs p-2 bg-slate-900/50 rounded">
                    <div>
                      <p className="text-slate-200 font-semibold">#{idx + 1} {m.nombre}</p>
                      <p className="text-slate-500">{m.carrera}</p>
                    </div>
                    <p className="text-red-300 font-bold">{formatoMoneda(m.deuda)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
              label="📊 Eficiencia"
              value={`${milagros.kpi.eficiencia.toFixed(1)}%`}
              icon={<BarChart3 size={20} />}
              color="purple"
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
                  <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-slate-400">Recaudable</p>
                      <p className="text-orange-300 font-bold">{formatoMoneda(carr.recaudable)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Recaudado</p>
                      <p className="text-green-300 font-bold">{formatoMoneda(carr.recaudado)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Deuda</p>
                      <p className="text-red-300 font-bold">{formatoMoneda(carr.deuda)}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* TOP MOROSOS */}
          {milagros.morosos.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white mb-3">📍 Top 10 Deudores</h3>
              <div className="space-y-2">
                {milagros.morosos.map((m, idx) => (
                  <div key={idx} className="flex justify-between text-xs p-2 bg-slate-900/50 rounded">
                    <div>
                      <p className="text-slate-200 font-semibold">#{idx + 1} {m.nombre}</p>
                      <p className="text-slate-500">{m.carrera}</p>
                    </div>
                    <p className="text-red-300 font-bold">{formatoMoneda(m.deuda)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ReportesEjecutivos
