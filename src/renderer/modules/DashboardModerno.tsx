import React, { useEffect, useState, useMemo } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useAuth } from '@renderer/hooks/useAuth'
import { usePagos } from '@renderer/hooks/usePagos'
import { useGastos } from '@renderer/hooks/useGastos'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { useReporteConceptos } from '@renderer/hooks/useReporteConceptos'
import { DollarSign, TrendingUp, Users, CheckCircle, AlertCircle, Activity, PieChart, Calendar, Zap, RefreshCw, ArrowUp, ArrowDown, Lock } from 'lucide-react'
import { formatoMoneda } from '@renderer/lib/helpers'
import { InteractiveChart } from '@renderer/components/InteractiveChart'
import { ModalCambiarContrasena } from '@renderer/components/ModalCambiarContrasena'

export const DashboardModerno: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { cambiarContrasenia, error: errorContrasenia, loading: loadingContrasenia } = useAuth()
  const { pagos, cargarPagos, loading: pagosLoading, error: pagosError } = usePagos()
  const { gastos, cargarGastos, loading: gastosLoading } = useGastos()
  const { estudiantes, cargarEstudiantes, loading: estudiantesLoading } = useEstudiantes()
  const { reporteConceptos, cargarReporteConceptos } = useReporteConceptos()
  const [modalCambiarContrasenaAbierto, setModalCambiarContrasenaAbierto] = useState(false)

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-3 md:p-4 lg:p-8 space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 w-full sm:w-auto">
          <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/50 animate-pulse flex-shrink-0">
            <Activity size={24} className="text-white sm:w-6 sm:h-6 md:w-8 md:h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent truncate">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 truncate">{institucionActiva.nombre}</p>
          </div>
        </div>
        <button onClick={() => setModalContrasenaAbierto(true)} className="p-2 sm:p-2.5 md:p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-slate-400 hover:text-blue-400 transition-all duration-300 flex-shrink-0 flex items-center gap-2">
          <Lock size={18} className="sm:w-5 sm:h-5" />
          <span className="hidden lg:inline text-xs font-bold">Cambiar Contrase�a</span>
        </button>
        <button className="p-2 sm:p-2.5 md:p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-slate-400 hover:text-blue-400 transition-all duration-300 flex-shrink-0">
          <RefreshCw size={20} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
        </button>
      </div>

      {/* Error State */}
      {pagosError && (
        <div className="p-3 sm:p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-2 sm:gap-3">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5 sm:mt-1" />
          <div className="min-w-0">
            <p className="font-bold text-red-300 text-xs sm:text-sm truncate">Error al cargar pagos</p>
            <p className="text-xs text-red-200 mt-1 line-clamp-2">{pagosError}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 sm:py-16 md:py-20">
          <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg sm:rounded-xl border border-blue-500/50">
            <Activity size={28} className="text-blue-400 animate-spin sm:w-8 sm:h-8" />
          </div>
          <span className="ml-3 sm:ml-4 text-slate-400 font-semibold text-sm sm:text-base">Cargando datos...</span>
        </div>
      ) : (
        <>
          {/* KPIs PRINCIPALES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {/* Cobrado Hoy */}
            <div className="p-3 sm:p-4 md:p-5 lg:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl hover:border-green-500/50 transition-all group">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 md:p-3 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition flex-shrink-0">
                  <DollarSign size={18} className="text-green-400 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-green-400">
                  <ArrowUp size={12} />
                  +5%
                </div>
              </div>
              <p className="text-xs text-slate-400 font-bold mb-1 sm:mb-2">Cobrado Hoy</p>
              <p className="text-lg sm:text-xl md:text-2xl font-black text-green-400 truncate">{formatoMoneda(pagosHoy)}</p>
              <p className="text-xs text-slate-500 mt-1 sm:mt-2">{cantidadPagosHoy} transacción(es)</p>
            </div>

            {/* Total Recaudado */}
            <div className="p-3 sm:p-4 md:p-5 lg:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl hover:border-blue-500/50 transition-all group">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 md:p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition flex-shrink-0">
                  <TrendingUp size={18} className="text-blue-400 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
              <p className="text-xs text-slate-400 font-bold mb-1 sm:mb-2">Total Recaudado</p>
              <p className="text-lg sm:text-xl md:text-2xl font-black text-blue-400 truncate">{formatoMoneda(totalRecaudado)}</p>
              <p className="text-xs text-slate-500 mt-1 sm:mt-2">{pagos.filter(p => !esAnulado(p)).length} pagos</p>
            </div>

            {/* Gastos */}
            <div className="p-3 sm:p-4 md:p-5 lg:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl hover:border-orange-500/50 transition-all group">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 md:p-3 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition flex-shrink-0">
                  <TrendingUp size={18} className="text-orange-400 rotate-180 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
              <p className="text-xs text-slate-400 font-bold mb-1 sm:mb-2">Gastos Totales</p>
              <p className="text-lg sm:text-xl md:text-2xl font-black text-orange-400 truncate">{formatoMoneda(totalGastos)}</p>
              <p className="text-xs text-slate-500 mt-1 sm:mt-2">{gastos.length} gastos</p>
            </div>

            {/* Neto */}
            <div className={`p-3 sm:p-4 md:p-5 lg:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl hover:border-${neto >= 0 ? 'purple' : 'red'}-500/50 transition-all group`}>
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className={`p-2 sm:p-2.5 md:p-3 rounded-lg group-hover:brightness-110 transition flex-shrink-0 ${neto >= 0 ? 'bg-purple-500/20' : 'bg-red-500/20'}`}>
                  <Zap size={18} className={neto >= 0 ? 'text-purple-400' : 'text-red-400' + ' sm:w-5 sm:h-5 md:w-6 md:h-6'} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${neto >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                  {neto >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {Math.abs(neto / totalRecaudado * 100).toFixed(1)}%
                </div>
              </div>
              <p className="text-xs text-slate-400 font-bold mb-1 sm:mb-2">Neto</p>
              <p className={`text-lg sm:text-xl md:text-2xl font-black truncate ${neto >= 0 ? 'text-purple-400' : 'text-red-400'}`}>{formatoMoneda(neto)}</p>
              <p className="text-xs text-slate-500 mt-1 sm:mt-2">{neto >= 0 ? '✓ Positivo' : '⚠️ Negativo'}</p>
            </div>
          </div>

          {/* GRÁFICOS CON RECHARTS */}
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {/* Pagos Últimas 7 días */}
            <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl col-span-1 md:col-span-2">
              <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Pagos - Ultimos 7 Dias</h2>
              <InteractiveChart
                type="line"
                data={Object.entries(ultimosPagos).map(([fecha, monto]) => ({
                  name: new Date(fecha).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit' }),
                  value: monto,
                }))}
                dataKey="value"
                lineColor="#3b82f6"
                height={300}
              />
            </div>

            {/* Estados de Estudiantes */}
            <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl">
              <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Estudiantes</h2>
              <InteractiveChart
                type="pie"
                data={[
                  { name: 'Activos', value: activos },
                  { name: 'Becado 50%', value: becados50 },
                  { name: 'Becado 100%', value: becados100 },
                ]}
                height={280}
              />
            </div>
          </div>

          {/* CONTENIDO INFERIOR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {/* Deuda vs Pagos por Concepto */}
            <div className="lg:col-span-2 p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl">
              <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Top Conceptos</h2>
              <InteractiveChart
                type="bar"
                data={reporteConceptos.slice(0, 5).map(c => ({
                  name: c.concepto,
                  Adeudado: c.monto_adeudado,
                  Pagado: c.monto_total_pagado,
                }))}
                dataKeys={['Adeudado', 'Pagado']}
                colors={['#ef4444', '#22c55e']}
                height={300}
              />
            </div>

            {/* Información de Institución */}
            <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl space-y-3 sm:space-y-4">
              <div>
                <p className="text-xs text-slate-400 font-bold mb-1">Institución</p>
                <p className="text-sm font-bold text-white truncate">{institucionActiva.nombre}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold mb-1">CUIT</p>
                <p className="text-sm font-bold text-white truncate">{institucionActiva.cuit}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold mb-1">Punto de Venta</p>
                <p className="text-sm font-bold text-white truncate">{institucionActiva.punto_venta}</p>
              </div>
              <div className="pt-3 sm:pt-4 border-t border-slate-700/50">
                <div className="flex items-center gap-2 text-green-400 text-xs sm:text-sm font-bold">
                  <CheckCircle size={14} />
                  Conectado
                </div>
              </div>
            </div>
          </div>

          {/* TARJETAS RESUMEN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {/* Total Estudiantes */}
            <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 md:p-3 bg-purple-500/20 rounded-lg flex-shrink-0">
                  <Users size={18} className="text-purple-400 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-300">Total Estudiantes</h3>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-purple-400">{estudiantes.length}</p>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-700/50 space-y-1.5 sm:space-y-2">
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
            <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 md:p-3 bg-blue-500/20 rounded-lg flex-shrink-0">
                  <Calendar size={18} className="text-blue-400 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-300">Pagos Registrados</h3>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-blue-400">{pagos.filter(p => !p.anulado).length}</p>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-700/50">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Hoy</span>
                  <span className="text-green-400 font-bold">{cantidadPagosHoy}</span>
                </div>
              </div>
            </div>

            {/* Gastos */}
            <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 md:p-3 bg-orange-500/20 rounded-lg flex-shrink-0">
                  <PieChart size={18} className="text-orange-400 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-300">Gastos</h3>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-orange-400">{gastos.length}</p>
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-700/50">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total</span>
                  <span className="text-orange-400 font-bold">{formatoMoneda(totalGastos)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL CAMBIAR CONTRASEÑA */}
      <ModalCambiarContrasena
        isOpen={modalCambiarContrasenaAbierto}
        onClose={() => setModalCambiarContrasenaAbierto(false)}
        onCambiar={cambiarContrasenia}
        error={errorContrasenia}
        loading={loadingContrasenia}
      />
    </div>
  )
}


