import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { usePagos } from '@renderer/hooks/usePagos'
import { useReporteConceptos, type ReporteConcepto } from '@renderer/hooks/useReporteConceptos'
import { useResumenPagos, type ResumenPorMetodo } from '@renderer/hooks/useResumenPagos'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda, formatoFecha } from '@renderer/lib/helpers'
import { BarChart3, TrendingUp, AlertCircle, PieChart, CreditCard, Users, Download, RefreshCw, CheckCircle, Clock } from 'lucide-react'
import { KPIsReportes } from '@renderer/components/KPIsReportes'
import { useExcelExport } from '@renderer/hooks/useExcelExport'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler } from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler)

interface ResumenDiario {
  fecha: string
  total_pagos: number
  cantidad_pagos: number
}

interface DeudasPorCarrera {
  carrera: string
  total_estudiantes: number
  estudiantes_con_deuda: number
  porcentaje_deudores: number
  monto_total_deuda: number
  monto_promedio_deuda: number
}

interface ResumenGlobal {
  totalDeudasVencidas: number
  totalPagosRegistrados: number
  porcentajeCobro: number
  estudiantesActivos: number
  estudiantesEnMora: number
  promedioDeudasEstudiante: number
  totalRecaudable: number
}

type TabReporte = 'flujo-caja' | 'deudas' | 'metodos' | 'carrera'

export const ReportesModerno: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { estudiantes, cargarEstudiantes } = useEstudiantes()
  const { pagos, cargarPagos } = usePagos()
  const { reporteConceptos, cargarReporteConceptos, loading: loadingConceptos } = useReporteConceptos()
  const { resumenMetodos, cargarResumenPorMetodo } = useResumenPagos()
  const { exportarReporte } = useExcelExport()

  const [resumenDiario, setResumenDiario] = useState<ResumenDiario[]>([])
  const [deudasCarrera, setDeudasCarrera] = useState<DeudasPorCarrera[]>([])
  const [resumenGlobal, setResumenGlobal] = useState<ResumenGlobal>({
    totalDeudasVencidas: 0,
    totalPagosRegistrados: 0,
    porcentajeCobro: 0,
    estudiantesActivos: 0,
    estudiantesEnMora: 0,
    promedioDeudasEstudiante: 0,
    totalRecaudable: 0,
  })
  const [loading, setLoading] = useState(true)
  const [tabActiva, setTabActiva] = useState<TabReporte>('flujo-caja')

  const cargarReportes = async () => {
    setLoading(true)
    try {
      await cargarEstudiantes(institucionActiva.id)
      await cargarPagos(institucionActiva.id)
      await cargarReporteConceptos(institucionActiva.id)
      await cargarResumenPorMetodo(institucionActiva.id)

      const esAnulado = (pago: any): boolean => pago.estado === 'ANULADO'

      // FLUJO DIARIO - Últimos 30 días
      const hace30Dias = new Date()
      hace30Dias.setDate(hace30Dias.getDate() - 30)
      const pagos30 = pagos.filter(p => !esAnulado(p) && new Date(p.fecha_pago) >= hace30Dias)

      const diarioMap = new Map<string, ResumenDiario>()
      pagos30.forEach(pago => {
        const fecha = pago.fecha_pago
        if (!diarioMap.has(fecha)) {
          diarioMap.set(fecha, { fecha, total_pagos: 0, cantidad_pagos: 0 })
        }
        const dia = diarioMap.get(fecha)!
        dia.total_pagos += pago.monto_pagado
        dia.cantidad_pagos += 1
      })

      const diario = Array.from(diarioMap.values())
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      setResumenDiario(diario)

      // CONCEPTOS Y DEUDAS VENCIDAS
      const { data: conceptos } = await supabase
        .from('conceptos_pago')
        .select('*')
        .eq('institucion_id', institucionActiva.id)
        .eq('activo', true)

      // CARRERAS CON ESTUDIANTES
      const { data: carrerasConEstudiantes } = await supabase
        .from('carreras')
        .select('id')
        .eq('institucion_id', institucionActiva.id)

      const carrerasActivas = new Set(carrerasConEstudiantes?.map(c => c.id) || [])

      const deudaMap = new Map<number, DeudasPorCarrera>()
      const pagosMap = new Map<string, boolean>()
      pagos.filter(p => !esAnulado(p)).forEach(pago => {
        pagosMap.set(`${pago.estudiante_id}-${pago.concepto_id}`, true)
      })

      const today = new Date()
      const mesActual = today.getMonth() + 1
      const anioActual = today.getFullYear()
      const diaActual = today.getDate()

      let totalDeudaVencida = 0
      let estudiantesConDeuda = 0
      const estudiantesActivos = estudiantes.filter(e => e.estado !== 'NO_VIENE_MAS').length

      // CALCULAR DEUDA POR CARRERA
      estudiantes.forEach(est => {
        if (est.estado === 'NO_VIENE_MAS') return

        const carreraId = est.carrera_id
        if (!carrerasActivas.has(carreraId)) return

        if (!deudaMap.has(carreraId)) {
          deudaMap.set(carreraId, {
            carrera: (est as any).carreras?.nombre || 'Sin carrera',
            total_estudiantes: 0,
            estudiantes_con_deuda: 0,
            porcentaje_deudores: 0,
            monto_total_deuda: 0,
            monto_promedio_deuda: 0,
          })
        }

        const carrera = deudaMap.get(carreraId)!
        carrera.total_estudiantes += 1

        let deudaEstudiante = 0
        conceptos?.forEach(concepto => {
          let debeIncluir = false
          if (concepto.mes && concepto.año) {
            if (concepto.año < anioActual) {
              debeIncluir = true
            } else if (concepto.año === anioActual) {
              if (concepto.mes <= mesActual) {
                debeIncluir = true
              }
            }
          } else {
            debeIncluir = true
          }
          
          if (debeIncluir) {
            const tienePago = pagosMap.has(`${est.id}-${concepto.id}`)
            if (!tienePago) {
              deudaEstudiante += concepto.monto
            }
          }
        })

        if (deudaEstudiante > 0) {
          carrera.estudiantes_con_deuda += 1
          carrera.monto_total_deuda += deudaEstudiante
          totalDeudaVencida += deudaEstudiante
          estudiantesConDeuda += 1
        }
      })

      const deudasArray = Array.from(deudaMap.values())
        .map(carrera => ({
          ...carrera,
          porcentaje_deudores: carrera.total_estudiantes > 0 
            ? (carrera.estudiantes_con_deuda / carrera.total_estudiantes) * 100 
            : 0,
          monto_promedio_deuda: carrera.estudiantes_con_deuda > 0 
            ? carrera.monto_total_deuda / carrera.estudiantes_con_deuda 
            : 0,
        }))
        .sort((a, b) => b.porcentaje_deudores - a.porcentaje_deudores)
        .filter(c => c.total_estudiantes > 0)

      setDeudasCarrera(deudasArray)

      const totalPagosRegistrados = pagos.filter(p => !esAnulado(p)).reduce((sum, p) => sum + p.monto_pagado, 0)
      const totalRecaudable = totalDeudaVencida + totalPagosRegistrados
      const porcentajeCobro = totalRecaudable > 0
        ? (totalPagosRegistrados / totalRecaudable) * 100
        : 0

      const promedioDeudasPorEstudianteActivo = estudiantesActivos > 0 ? totalDeudaVencida / estudiantesActivos : 0

      setResumenGlobal({
        totalDeudasVencidas: totalDeudaVencida,
        totalPagosRegistrados: totalPagosRegistrados,
        porcentajeCobro: parseFloat(porcentajeCobro.toFixed(1)),
        estudiantesActivos: estudiantesActivos,
        estudiantesEnMora: estudiantesConDeuda,
        promedioDeudasEstudiante: promedioDeudasPorEstudianteActivo,
        totalRecaudable: totalRecaudable,
      })
    } catch (error) {
      console.error('Error cargando reportes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarReportes()
  }, [institucionActiva.id])

  // GRÁFICOS SEGUROS CON VALIDACIÓN
  const chartPagosLínea = {
    labels: resumenDiario.slice(-14).map(d => formatoFecha(d.fecha).substring(0, 5)),
    datasets: [
      {
        label: 'Pagos Diarios ($)',
        data: resumenDiario.slice(-14).map(d => d.total_pagos),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        pointRadius: 5,
      },
    ],
  }

  const chartDeudasConceptos = {
    labels: reporteConceptos.map(c => c.concepto),
    datasets: [
      {
        label: 'Monto Adeudado',
        data: reporteConceptos.map(c => c.monto_adeudado),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
      },
      {
        label: 'Monto Pagado',
        data: reporteConceptos.map(c => c.monto_total_pagado),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
      },
    ],
  }

  const chartMetodosPago = {
    labels: resumenMetodos.map(m => m.metodo_pago),
    datasets: [
      {
        data: resumenMetodos.map(m => m.total_recaudado),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(250, 204, 21, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(236, 72, 153, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(250, 204, 21, 1)',
        ],
        borderWidth: 2,
      },
    ],
  }

  const chartDistribucionCarrera = {
    labels: deudasCarrera.map(c => c.carrera),
    datasets: [
      {
        data: deudasCarrera.map(c => c.estudiantes_con_deuda),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(251, 146, 60, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
        ],
        borderWidth: 2,
      },
    ],
  }

  const handleExportarConceptos = () => {
    const datos = reporteConceptos.map(concepto => [
      concepto.concepto,
      concepto.tipo_concepto,
      concepto.total_estudiantes,
      concepto.estudiantes_no_pagaron,
      `${concepto.porcentaje_no_pago.toFixed(1)}%`,
      concepto.monto_total_requerido,
      concepto.monto_total_pagado,
      concepto.monto_adeudado,
      concepto.monto_promedio_adeudado
    ])

    exportarReporte(
      {
        nombreArchivo: `Reporte_Deudas_Conceptos_${new Date().toISOString().split('T')[0]}`,
        titulo: 'Deudas por Concepto',
        fechaReporte: new Date().toLocaleDateString('es-AR')
      },
      [
        {
          nombre: 'Deudas por Concepto',
          encabezados: [
            'Concepto', 'Tipo', 'Total Estudiantes', 'No Pagaron', '% No Pago',
            'Monto Requerido', 'Monto Pagado', 'Monto Adeudado', 'Promedio Adeudado'
          ],
          datos,
          esMoneda: [false, false, false, false, false, true, true, true, true]
        }
      ],
      institucionActiva.nombre
    )
  }

  const handleExportarMetodosPago = () => {
    const datos = resumenMetodos.map(metodo => [
      metodo.metodo_pago,
      metodo.cantidad_pagos,
      metodo.total_recaudado,
      `${metodo.porcentaje.toFixed(1)}%`
    ])

    const totalCantidad = resumenMetodos.reduce((sum, m) => sum + m.cantidad_pagos, 0)
    const totalMonto = resumenMetodos.reduce((sum, m) => sum + m.total_recaudado, 0)
    datos.push(['TOTAL', totalCantidad, totalMonto, '100%'])

    exportarReporte(
      {
        nombreArchivo: `Reporte_Recaudacion_Metodos_${new Date().toISOString().split('T')[0]}`,
        titulo: 'Recaudación por Medio de Pago',
        fechaReporte: new Date().toLocaleDateString('es-AR')
      },
      [
        {
          nombre: 'Recaudación por Método',
          encabezados: ['Método de Pago', 'Cantidad de Pagos', 'Monto Recaudado', '% del Total'],
          datos,
          esMoneda: [false, false, true, false]
        }
      ],
      institucionActiva.nombre
    )
  }

  const handleExportarCarreras = () => {
    const datos = deudasCarrera.map(carrera => [
      carrera.carrera,
      carrera.total_estudiantes,
      carrera.estudiantes_con_deuda,
      `${carrera.porcentaje_deudores.toFixed(1)}%`,
      carrera.monto_total_deuda,
      carrera.monto_promedio_deuda,
    ])

    exportarReporte(
      {
        nombreArchivo: `Reporte_Deuda_Carreras_${new Date().toISOString().split('T')[0]}`,
        titulo: 'Deuda por Carrera',
        fechaReporte: new Date().toLocaleDateString('es-AR')
      },
      [
        {
          nombre: 'Deuda por Carrera',
          encabezados: ['Carrera', 'Total Est.', 'En Mora', '% Deudores', 'Deuda Total', 'Prom. Deuda'],
          datos,
          esMoneda: [false, false, false, false, true, true]
        }
      ],
      institucionActiva.nombre
    )
  }

  if (loading || loadingConceptos) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl mb-4 border border-blue-500/50">
            <BarChart3 size={32} className="text-cyan-400 animate-spin" />
          </div>
          <p className="text-slate-400 font-semibold">Generando reportes ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      {/* HEADER */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/50">
              <BarChart3 size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Reportes Financieros
              </h1>
              <p className="text-slate-400 mt-1">Control integral de la situación financiera</p>
            </div>
          </div>
          <button
            onClick={cargarReportes}
            disabled={loading}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-cyan-400 transition-all duration-300"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPIs MEJORADAS - COMPONENTE SEPARADO */}
      <KPIsReportes
        totalRecaudable={resumenGlobal.totalRecaudable}
        totalPagosRegistrados={resumenGlobal.totalPagosRegistrados}
        totalDeudasVencidas={resumenGlobal.totalDeudasVencidas}
        porcentajeCobro={resumenGlobal.porcentajeCobro}
        estudiantesActivos={resumenGlobal.estudiantesActivos}
        estudiantesEnMora={resumenGlobal.estudiantesEnMora}
        promedioDeudasEstudiante={resumenGlobal.promedioDeudasEstudiante}
      />

      {/* TABS */}
      <div className="mb-12">
        <div className="flex gap-2 p-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl w-fit">
          <button
            onClick={() => setTabActiva('flujo-caja')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'flujo-caja'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp size={20} />
            Flujo Caja
          </button>
          <button
            onClick={() => setTabActiva('deudas')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'deudas'
                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertCircle size={20} />
            Deudas
          </button>
          <button
            onClick={() => setTabActiva('metodos')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'metodos'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard size={20} />
            Métodos Pago
          </button>
          <button
            onClick={() => setTabActiva('carrera')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'carrera'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={20} />
            Por Carrera
          </button>
        </div>
      </div>

      {/* CONTENIDO DINÁMICO */}
      <div className="transition-all duration-500">
        {/* TAB: FLUJO DE CAJA */}
        {tabActiva === 'flujo-caja' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <TrendingUp size={24} className="text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Flujo de Caja - Últimos 14 días</h2>
                </div>
                <span className="text-sm text-slate-400">
                  Total: {formatoMoneda(resumenDiario.reduce((sum, d) => sum + d.total_pagos, 0))}
                </span>
              </div>
              <div style={{ height: '350px' }} className="rounded-lg overflow-hidden">
                {resumenDiario.length === 0 ? (
                  <div className="h-full flex items-center justify-center bg-slate-700/30 rounded-lg">
                    <p className="text-slate-400 italic">Sin pagos registrados en los últimos 14 días</p>
                  </div>
                ) : (
                  <Line data={chartPagosLínea} options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                      legend: { display: true, position: 'top', labels: { color: '#cbd5e1', font: { size: 12 } } },
                    },
                    scales: {
                      y: { 
                        grid: { color: 'rgba(100, 116, 139, 0.1)' },
                        ticks: { color: '#cbd5e1', callback: (v) => `$${(v / 1000).toFixed(0)}K` } 
                      },
                      x: { 
                        grid: { color: 'rgba(100, 116, 139, 0.1)' },
                        ticks: { color: '#cbd5e1' }
                      }
                    },
                  }} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: DEUDAS - CONCEPTOS UNIFICADOS A NIVEL INSTITUCIÓN */}
        {tabActiva === 'deudas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico Deuda vs Pagos */}
              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <AlertCircle size={24} className="text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Deuda vs Pagos por Concepto</h2>
                </div>
                <div style={{ height: '350px' }} className="rounded-lg overflow-hidden">
                  {reporteConceptos.length === 0 ? (
                    <div className="h-full flex items-center justify-center bg-slate-700/30 rounded-lg">
                      <p className="text-slate-400 italic">Sin conceptos vencidos</p>
                    </div>
                  ) : (
                    <Bar data={chartDeudasConceptos} options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      indexAxis: 'y',
                      plugins: { legend: { display: true, position: 'top', labels: { color: '#cbd5e1', font: { size: 12 } } } },
                      scales: { 
                        x: { 
                          grid: { color: 'rgba(100, 116, 139, 0.1)' },
                          ticks: { color: '#cbd5e1', callback: (v) => `$${(v / 1000).toFixed(0)}K` } 
                        },
                        y: { 
                          grid: { color: 'rgba(100, 116, 139, 0.1)' },
                          ticks: { color: '#cbd5e1' }
                        }
                      },
                    }} />
                  )}
                </div>
                <button
                  onClick={handleExportarConceptos}
                  disabled={reporteConceptos.length === 0}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} />
                  Exportar Conceptos
                </button>
              </div>

              {/* Tabla Conceptos */}
              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-hidden">
                <h2 className="text-xl font-bold text-white mb-4">Detalles por Concepto (Institución)</h2>
                <div className="overflow-y-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-300 font-bold">Concepto</th>
                        <th className="px-3 py-2 text-center text-slate-300 font-bold">Est.</th>
                        <th className="px-3 py-2 text-right text-slate-300 font-bold">Adeudado</th>
                        <th className="px-3 py-2 text-center text-slate-300 font-bold">% Mora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {reporteConceptos.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-slate-400 italic">Sin conceptos vencidos</td>
                        </tr>
                      ) : (
                        reporteConceptos.map((c, idx) => (
                          <tr key={idx} className="hover:bg-slate-700/30 transition">
                            <td className="px-3 py-2 text-slate-300 font-semibold">{c.concepto}</td>
                            <td className="px-3 py-2 text-center text-slate-400">{c.total_estudiantes}</td>
                            <td className="px-3 py-2 text-right text-red-400 font-semibold">{formatoMoneda(c.monto_adeudado)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                c.porcentaje_no_pago > 50 ? 'bg-red-500/30 text-red-300' :
                                c.porcentaje_no_pago > 25 ? 'bg-yellow-500/30 text-yellow-300' :
                                'bg-green-500/30 text-green-300'
                              }`}>
                                {c.porcentaje_no_pago.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: MÉTODOS DE PAGO */}
        {tabActiva === 'metodos' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico Pie */}
              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <PieChart size={24} className="text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Recaudación por Método</h2>
                </div>
                <div style={{ height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} className="rounded-lg overflow-hidden">
                  {resumenMetodos.length === 0 ? (
                    <p className="text-slate-400 italic">Sin pagos registrados</p>
                  ) : (
                    <div style={{ width: '100%', maxWidth: '300px' }}>
                      <Pie data={chartMetodosPago} options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        plugins: {
                          legend: { display: true, position: 'bottom', labels: { color: '#cbd5e1', font: { size: 12 } } },
                          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatoMoneda(ctx.parsed)}` } },
                        },
                      }} />
                    </div>
                  )}
                </div>
                <button
                  onClick={handleExportarMetodosPago}
                  disabled={resumenMetodos.length === 0}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} />
                  Exportar Métodos
                </button>
              </div>

              {/* Tabla Métodos */}
              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <h2 className="text-xl font-bold text-white mb-4">Detalle por Método de Pago</h2>
                <div className="overflow-y-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-slate-300 font-bold">Método</th>
                        <th className="px-3 py-2 text-center text-slate-300 font-bold">Trans.</th>
                        <th className="px-3 py-2 text-right text-slate-300 font-bold">Monto</th>
                        <th className="px-3 py-2 text-center text-slate-300 font-bold">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {resumenMetodos.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-4 text-center text-slate-400 italic">Sin pagos registrados</td>
                        </tr>
                      ) : (
                        <>
                          {resumenMetodos.map((metodo, idx) => (
                            <tr key={idx} className="hover:bg-slate-700/30 transition">
                              <td className="px-3 py-2 text-slate-300 font-semibold">{metodo.metodo_pago}</td>
                              <td className="px-3 py-2 text-center text-slate-400">{metodo.cantidad_pagos}</td>
                              <td className="px-3 py-2 text-right text-green-400 font-semibold">{formatoMoneda(metodo.total_recaudado)}</td>
                              <td className="px-3 py-2 text-center">
                                <span className="px-2 py-1 bg-blue-500/30 text-blue-300 rounded text-xs font-bold">
                                  {metodo.porcentaje.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-900/50 border-t-2 border-slate-600">
                            <td className="px-3 py-2 text-slate-200 font-bold">TOTAL</td>
                            <td className="px-3 py-2 text-center text-slate-200 font-bold">
                              {resumenMetodos.reduce((sum, m) => sum + m.cantidad_pagos, 0)}
                            </td>
                            <td className="px-3 py-2 text-right text-green-300 font-bold">
                              {formatoMoneda(resumenMetodos.reduce((sum, m) => sum + m.total_recaudado, 0))}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-200 font-bold">100%</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: POR CARRERA - DATOS DETALLADOS POR CARRERA */}
        {tabActiva === 'carrera' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico Deuda por Carrera */}
              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Users size={24} className="text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Deuda Total por Carrera</h2>
                </div>
                <div style={{ height: '350px' }} className="rounded-lg overflow-hidden">
                  {deudasCarrera.length === 0 ? (
                    <div className="h-full flex items-center justify-center bg-slate-700/30 rounded-lg">
                      <p className="text-slate-400 italic">Sin carreras con deuda</p>
                    </div>
                  ) : (
                    <Bar data={{
                      labels: deudasCarrera.map(c => c.carrera),
                      datasets: [{
                        label: 'Deuda Total ($)',
                        data: deudasCarrera.map(c => c.monto_total_deuda),
                        backgroundColor: 'rgba(168, 85, 247, 0.8)',
                        borderColor: 'rgba(168, 85, 247, 1)',
                        borderRadius: 8,
                      }],
                    }} options={{
                      maintainAspectRatio: false,
                      responsive: true,
                      plugins: { legend: { display: true, position: 'top', labels: { color: '#cbd5e1', font: { size: 12 } } } },
                      scales: { 
                        y: { 
                          grid: { color: 'rgba(100, 116, 139, 0.1)' },
                          ticks: { color: '#cbd5e1', callback: (v) => `$${(v / 1000000).toFixed(1)}M` } 
                        },
                        x: { 
                          grid: { color: 'rgba(100, 116, 139, 0.1)' },
                          ticks: { color: '#cbd5e1' }
                        }
                      },
                    }} />
                  )}
                </div>
              </div>

              {/* Gráfico Estudiantes en Mora */}
              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-pink-500/20 rounded-lg">
                    <AlertCircle size={24} className="text-pink-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Estudiantes en Mora por Carrera</h2>
                </div>
                <div style={{ height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} className="rounded-lg overflow-hidden">
                  {deudasCarrera.length === 0 ? (
                    <p className="text-slate-400 italic">Sin datos</p>
                  ) : (
                    <div style={{ width: '100%', maxWidth: '300px' }}>
                      <Pie data={chartDistribucionCarrera} options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        plugins: {
                          legend: { display: true, position: 'bottom', labels: { color: '#cbd5e1', font: { size: 12 } } },
                          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} est.` } },
                        },
                      }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla Deuda por Carrera - DETALLADO */}
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Deuda Detallada por Carrera</h2>
                <button
                  onClick={handleExportarCarreras}
                  disabled={deudasCarrera.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={16} className="inline mr-2" />
                  Exportar
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-300 font-bold">Carrera</th>
                      <th className="px-4 py-3 text-center text-slate-300 font-bold">Total Est.</th>
                      <th className="px-4 py-3 text-center text-slate-300 font-bold">En Mora</th>
                      <th className="px-4 py-3 text-center text-slate-300 font-bold">% Mora</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-bold">Deuda Total</th>
                      <th className="px-4 py-3 text-right text-slate-300 font-bold">Prom. Deuda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {deudasCarrera.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center text-slate-400 italic">Sin carreras con estudiantes</td>
                      </tr>
                    ) : (
                      deudasCarrera.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-700/30 transition">
                          <td className="px-4 py-3 text-slate-300 font-semibold">{c.carrera}</td>
                          <td className="px-4 py-3 text-center text-slate-400">{c.total_estudiantes}</td>
                          <td className="px-4 py-3 text-center text-red-400 font-semibold">{c.estudiantes_con_deuda}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 bg-red-500/30 text-red-300 rounded text-xs font-bold">
                              {c.porcentaje_deudores.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-red-400 font-semibold">{formatoMoneda(c.monto_total_deuda)}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{formatoMoneda(c.monto_promedio_deuda)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}




