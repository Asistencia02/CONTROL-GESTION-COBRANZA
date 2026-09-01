import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { usePagos } from '@renderer/hooks/usePagos'
import { useReporteConceptos, type ReporteConcepto } from '@renderer/hooks/useReporteConceptos'
import { useResumenPagos, type ResumenPorMetodo } from '@renderer/hooks/useResumenPagos'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda, formatoFecha } from '@renderer/lib/helpers'
import { Calendar, TrendingUp, Users, AlertCircle, Download, Layers, BarChart3, PieChart, CreditCard } from 'lucide-react'
import { useExcelExport } from '@renderer/hooks/useExcelExport'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler } from 'chart.js'
import { Bar, Pie, Line } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler)

interface ResumenDiario {
  fecha: string
  total_pagos: number
  cantidad_pagos: number
  total_ventas: number
  cantidad_ventas: number
}

interface DeudasPorCarrera {
  carrera: string
  total_estudiantes: number
  estudiantes_con_deuda: number
  porcentaje_deudores: number
  monto_total_deuda: number
  monto_promedio_deuda: number
  porcentaje_no_pago_por_mes: Map<number, number>
  porcentaje_no_pago_inscripcion: number
  porcentaje_no_pago_seguro: number
  [key: string]: any
}

interface ResumenGlobal {
  totalDeudasVencidas: number
  totalPagosRegistrados: number
  porcentajeCobro: number
  estudiantesActivos: number
  estudiantesEnMora: number
  promedioDeudasEstudiante: number
}

export const Reportes: React.FC = () => {
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
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargarReportes = async () => {
      setLoading(true)
      try {
        await cargarEstudiantes(institucionActiva.id)
        await cargarPagos(institucionActiva.id)
        await cargarReporteConceptos(institucionActiva.id)
        await cargarResumenPorMetodo(institucionActiva.id)

        const { data: ventasData } = await supabase
          .from('ventas_insumos')
          .select('fecha_venta, subtotal')
          .eq('institucion_id', institucionActiva.id)
          .gte('fecha_venta', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

        const diarioMap = new Map<string, ResumenDiario>()
        const hace30Dias = new Date()
        hace30Dias.setDate(hace30Dias.getDate() - 30)
        const pagos30 = pagos.filter(p => new Date(p.fecha_pago) >= hace30Dias)

        pagos30.forEach(pago => {
          const fecha = pago.fecha_pago
          if (!diarioMap.has(fecha)) {
            diarioMap.set(fecha, {
              fecha,
              total_pagos: 0,
              cantidad_pagos: 0,
              total_ventas: 0,
              cantidad_ventas: 0
            })
          }
          const dia = diarioMap.get(fecha)!
          dia.total_pagos += pago.monto_pagado
          dia.cantidad_pagos += 1
        })

        if (ventasData) {
          ventasData.forEach(venta => {
            const fecha = venta.fecha_venta
            if (!diarioMap.has(fecha)) {
              diarioMap.set(fecha, {
                fecha,
                total_pagos: 0,
                cantidad_pagos: 0,
                total_ventas: 0,
                cantidad_ventas: 0
              })
            }
            const dia = diarioMap.get(fecha)!
            dia.total_ventas += venta.subtotal
            dia.cantidad_ventas += 1
          })
        }

        const diario = Array.from(diarioMap.values())
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

        setResumenDiario(diario)

        const { data: conceptos } = await supabase
          .from('conceptos_pago')
          .select('*')
          .eq('institucion_id', institucionActiva.id)
          .eq('activo', true)

        const deudaMap = new Map<number, DeudasPorCarrera>()
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const pagosMap = new Map<string, boolean>()
        pagos.forEach(pago => {
          pagosMap.set(`${pago.estudiante_id}-${pago.concepto_id}`, true)
        })

        const today2 = new Date()
        const mesActual = today2.getMonth() + 1
        const anioActual = today2.getFullYear()
        const diaActual = today2.getDate()

        let totalDeudaVencida = 0
        let estudiantesConDeuda = 0

        estudiantes.forEach(est => {
          if (est.estado === 'NO_VIENE_MAS') return

          const carreraId = est.carrera_id
          if (!deudaMap.has(carreraId)) {
            deudaMap.set(carreraId, {
              carrera: (est as any).carreras?.nombre || 'Sin carrera',
              total_estudiantes: 0,
              estudiantes_con_deuda: 0,
              porcentaje_deudores: 0,
              monto_total_deuda: 0,
              monto_promedio_deuda: 0,
              porcentaje_no_pago_inscripcion: 0,
              porcentaje_no_pago_seguro: 0,
              porcentaje_no_pago_enero: 0,
              porcentaje_no_pago_febrero: 0,
              porcentaje_no_pago_marzo: 0,
              porcentaje_no_pago_abril: 0,
              porcentaje_no_pago_mayo: 0,
              porcentaje_no_pago_junio: 0,
              porcentaje_no_pago_julio: 0,
              porcentaje_no_pago_agosto: 0,
              porcentaje_no_pago_septiembre: 0,
              porcentaje_no_pago_octubre: 0,
              porcentaje_no_pago_noviembre: 0,
              porcentaje_no_pago_diciembre: 0,
              porcentaje_no_pago_por_mes: new Map(),
            })
          }

          const carrera = deudaMap.get(carreraId)!
          carrera.total_estudiantes += 1

          let deudaEstudiante = 0
          conceptos?.forEach(concepto => {
            let esVencido = false
            
            if (concepto.mes && concepto.año) {
              if (concepto.año < anioActual) {
                esVencido = true
              } else if (concepto.año === anioActual) {
                if (concepto.mes < mesActual) {
                  esVencido = true
                } else if (concepto.mes === mesActual && diaActual > 10) {
                  esVencido = true
                }
              }
            } else {
              esVencido = true
            }
            
            if (esVencido) {
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
          .map(carrera => {
            return {
              ...carrera,
              porcentaje_deudores: carrera.total_estudiantes > 0 
                ? (carrera.estudiantes_con_deuda / carrera.total_estudiantes) * 100 
                : 0,
              monto_promedio_deuda: carrera.estudiantes_con_deuda > 0 
                ? carrera.monto_total_deuda / carrera.estudiantes_con_deuda 
                : 0,
            }
          })
          .sort((a, b) => b.porcentaje_deudores - a.porcentaje_deudores)
          .filter(c => c.total_estudiantes > 0)

        setDeudasCarrera(deudasArray)

        const totalPagosRegistrados = pagos.reduce((sum, p) => sum + p.monto_pagado, 0)
        const porcentajeCobro = totalDeudaVencida + totalPagosRegistrados > 0
          ? (totalPagosRegistrados / (totalDeudaVencida + totalPagosRegistrados)) * 100
          : 0

        setResumenGlobal({
          totalDeudasVencidas: totalDeudaVencida,
          totalPagosRegistrados: totalPagosRegistrados,
          porcentajeCobro: parseFloat(porcentajeCobro.toFixed(1)),
          estudiantesActivos: estudiantes.filter(e => e.estado !== 'NO_VIENE_MAS').length,
          estudiantesEnMora: estudiantesConDeuda,
          promedioDeudasEstudiante: estudiantesConDeuda > 0 ? totalDeudaVencida / estudiantesConDeuda : 0,
        })
      } catch (error) {
        console.error('Error cargando reportes:', error)
      } finally {
        setLoading(false)
      }
    }

    cargarReportes()
  }, [institucionActiva.id])

  const chartDeudasConceptos = {
    labels: reporteConceptos.map(c => c.concepto),
    datasets: [
      {
        label: 'Monto Adeudado',
        data: reporteConceptos.map(c => c.monto_adeudado),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
      },
      {
        label: 'Monto Pagado',
        data: reporteConceptos.map(c => c.monto_total_pagado),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
      },
    ],
  }

  const chartPagosCarrera = {
    labels: deudasCarrera.map(c => c.carrera),
    datasets: [
      {
        label: 'Deuda Total ($)',
        data: deudasCarrera.map(c => c.monto_total_deuda),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
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
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
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

    // Agregar total
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

  if (loading || loadingConceptos) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-600">Cargando reportes...</div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">Reportes y Análisis Integral</h1>
      <p className="text-gray-600 mb-8">{institucionActiva.nombre}</p>

      {/* INDICADORES CLAVE */}
      <div className="grid grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">Deudas Vencidas</p>
          <p className="text-2xl font-bold text-red-700">{formatoMoneda(resumenGlobal.totalDeudasVencidas)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">Pagos Registrados</p>
          <p className="text-2xl font-bold text-green-700">{formatoMoneda(resumenGlobal.totalPagosRegistrados)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">% Cobro</p>
          <p className="text-2xl font-bold text-blue-700">{resumenGlobal.porcentajeCobro}%</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">Estudiantes Activos</p>
          <p className="text-2xl font-bold text-purple-700">{resumenGlobal.estudiantesActivos}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">En Mora</p>
          <p className="text-2xl font-bold text-orange-700">{resumenGlobal.estudiantesEnMora}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-xs text-gray-600 mb-1">Promedio Deuda</p>
          <p className="text-2xl font-bold text-indigo-700">{formatoMoneda(resumenGlobal.promedioDeudasEstudiante)}</p>
        </div>
      </div>

      {/* GRÁFICO LÍNEA PAGOS */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={24} className="text-green-600" />
            <h2 className="text-xl font-semibold text-gray-800">Pagos Diarios (Últimos 14 días)</h2>
          </div>
          <div style={{ height: '300px' }}>
            <Line data={chartPagosLínea} options={{
              maintainAspectRatio: false,
              responsive: true,
              plugins: {
                legend: { display: true, position: 'top' },
              },
              scales: {
                y: { beginAtZero: true, ticks: { callback: (v) => `$${v.toLocaleString()}` } },
              },
            }} />
          </div>
        </div>
      </div>

      {/* GRÁFICOS EN FILA - DEUDAS Y MÉTODOS */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Deudas vs Pagos por Concepto */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={24} className="text-red-600" />
            <h2 className="text-xl font-semibold text-gray-800">Deuda vs Pagos por Concepto</h2>
          </div>
          <div style={{ height: '350px' }}>
            <Bar data={chartDeudasConceptos} options={{
              maintainAspectRatio: false,
              responsive: true,
              indexAxis: 'y',
              plugins: { legend: { display: true, position: 'top' } },
              scales: { x: { ticks: { callback: (v) => `$${(v / 1000).toFixed(0)}K` } } },
            }} />
          </div>
          <button
            onClick={handleExportarConceptos}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
          >
            <Download size={18} />
            Exportar
          </button>
        </div>

        {/* Recaudación por Método de Pago */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={24} className="text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-800">Recaudación por Método</h2>
          </div>
          <div style={{ height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: '300px' }}>
              <Pie data={chartMetodosPago} options={{
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                  legend: { display: true, position: 'bottom' },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatoMoneda(ctx.parsed)}` } },
                },
              }} />
            </div>
          </div>
          <button
            onClick={handleExportarMetodosPago}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
          >
            <Download size={18} />
            Exportar
          </button>
        </div>
      </div>

      {/* TABLA RECAUDACIÓN POR MÉTODO DE PAGO */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={24} className="text-green-600" />
          <h2 className="text-xl font-semibold text-gray-800">Detalle de Recaudación por Método de Pago</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Método de Pago</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Cantidad de Pagos</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Monto Recaudado</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">% del Total</th>
              </tr>
            </thead>
            <tbody>
              {resumenMetodos.map((metodo, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{metodo.metodo_pago}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{metodo.cantidad_pagos}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{formatoMoneda(metodo.total_recaudado)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-3 py-1 rounded font-semibold text-sm bg-blue-100 text-blue-800">
                      {metodo.porcentaje.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                <td className="px-4 py-3 text-gray-900">TOTAL</td>
                <td className="px-4 py-3 text-center text-gray-900">
                  {resumenMetodos.reduce((sum, m) => sum + m.cantidad_pagos, 0)}
                </td>
                <td className="px-4 py-3 text-right text-green-900">
                  {formatoMoneda(resumenMetodos.reduce((sum, m) => sum + m.total_recaudado, 0))}
                </td>
                <td className="px-4 py-3 text-center text-gray-900">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* GRÁFICOS EN FILA - DEUDAS Y CARRERA */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Deuda por Carrera */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={24} className="text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Deuda Total por Nivel/Carrera</h2>
          </div>
          <div style={{ height: '350px' }}>
            <Bar data={chartPagosCarrera} options={{
              maintainAspectRatio: false,
              responsive: true,
              plugins: { legend: { display: true, position: 'top' } },
              scales: { y: { ticks: { callback: (v) => `$${(v / 1000000).toFixed(1)}M` } } },
            }} />
          </div>
        </div>

        {/* Distribución de Estudiantes en Mora */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={24} className="text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-800">Distribución de Estudiantes en Mora</h2>
          </div>
          <div style={{ height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: '100%', maxWidth: '300px' }}>
              <Pie data={chartDistribucionCarrera} options={{
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                  legend: { display: true, position: 'bottom' },
                  tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} estudiantes` } },
                },
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DEUDAS POR CONCEPTO */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers size={24} className="text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-800">Detalles por Concepto</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Concepto</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Estudiantes</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">No Pagaron</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Requerido</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Pagado</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Adeudado</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">% No Pago</th>
              </tr>
            </thead>
            <tbody>
              {reporteConceptos.map((c, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.concepto}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c.total_estudiantes}</td>
                  <td className="px-4 py-3 text-center font-semibold text-red-700">{c.estudiantes_no_pagaron}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatoMoneda(c.monto_total_requerido)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{formatoMoneda(c.monto_total_pagado)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-700">{formatoMoneda(c.monto_adeudado)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded font-semibold text-sm ${
                      c.porcentaje_no_pago > 50 ? 'bg-red-100 text-red-800' :
                      c.porcentaje_no_pago > 25 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {c.porcentaje_no_pago.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA DEUDAS POR CARRERA */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={24} className="text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-800">Deuda por Nivel/Carrera</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Nivel/Carrera</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Total Est.</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">En Mora</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">% Deudores</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Deuda Total</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Promedio/Est.</th>
              </tr>
            </thead>
            <tbody>
              {deudasCarrera.map((c, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.carrera}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c.total_estudiantes}</td>
                  <td className="px-4 py-3 text-center font-semibold text-red-700">{c.estudiantes_con_deuda}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-3 py-1 rounded font-semibold text-sm bg-red-100 text-red-800">
                      {c.porcentaje_deudores.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-700">{formatoMoneda(c.monto_total_deuda)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatoMoneda(c.monto_promedio_deuda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
