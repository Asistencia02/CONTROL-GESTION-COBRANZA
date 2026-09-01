import React, { useState, useEffect, useMemo } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useDeudas, type Deuda, type DeudaDetallada, type DeudaCritica } from '@renderer/hooks/useDeudas'
import { TablaDeudas } from '@renderer/components/TablaDeudas'
import { formatoMoneda, formatoFecha } from '@renderer/lib/helpers'
import { AlertCircle, TrendingDown, X, BarChart3, Users, Percent, RefreshCw } from 'lucide-react'

type TabDeuda = 'general' | 'critica' | 'detalle'

export const DeudasModerno: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const {
    deudas,
    deudasDetalladas,
    deudasCriticas,
    loading,
    cargarDeudas,
    cargarDeudasDetalladas,
    cargarDeudasCriticas,
    obtenerResumenDeudas,
  } = useDeudas()

  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<Deuda | null>(null)
  const [resumen, setResumen] = useState({ totalDeudaGeneral: 0, estudiantesEnMora: 0, porcentajeMora: 0 })
  const [tabActiva, setTabActiva] = useState<TabDeuda>('general')

  const cargarTodo = async () => {
    await cargarDeudas(institucionActiva.id)
    await cargarDeudasCriticas(institucionActiva.id)
    const resumenData = await obtenerResumenDeudas(institucionActiva.id)
    setResumen(resumenData)
  }

  useEffect(() => {
    cargarTodo()
  }, [institucionActiva.id])

  useEffect(() => {
    if (estudianteSeleccionado) {
      cargarDeudasDetalladas(estudianteSeleccionado.estudiante_id, institucionActiva.id)
    }
  }, [estudianteSeleccionado, institucionActiva.id])

  const deudasDetalladasVencidas = useMemo(() => {
    return deudasDetalladas
  }, [deudasDetalladas])

  const handleSeleccionarEstudiante = (estudiante_id: number) => {
    const deuda = deudas.find((d) => d.estudiante_id === estudiante_id)
    if (deuda) {
      setEstudianteSeleccionado(deuda)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl mb-4 border border-red-500/50">
            <AlertCircle size={32} className="text-red-400 animate-spin" />
          </div>
          <p className="text-slate-400 font-semibold">Cargando deudas...</p>
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
            <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg shadow-red-500/50">
              <AlertCircle size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Gestión de Deudas
              </h1>
              <p className="text-slate-400 mt-1">Monitorea y controla las deudas de estudiantes</p>
            </div>
          </div>
          <button
            onClick={cargarTodo}
            disabled={loading}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-red-400 transition-all duration-300"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPIs EN GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-red-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Total Adeudado</p>
          <p className="text-2xl font-black text-red-400">{formatoMoneda(resumen.totalDeudaGeneral)}</p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-orange-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Estudiantes Deudores</p>
          <p className="text-2xl font-black text-orange-400">{resumen.estudiantesEnMora}</p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-amber-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">% Deudores</p>
          <p className="text-2xl font-black text-amber-400">{resumen.porcentajeMora}%</p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-rose-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Deuda Crítica</p>
          <p className="text-2xl font-black text-rose-400">{deudasCriticas.length}</p>
        </div>
      </div>

      {/* TABS */}
      <div className="mb-12">
        <div className="flex gap-2 p-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl w-fit">
          <button
            onClick={() => setTabActiva('general')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'general'
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 size={20} />
            Todas las Deudas
          </button>
          <button
            onClick={() => setTabActiva('critica')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'critica'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertCircle size={20} />
            Críticas ({deudasCriticas.length})
          </button>
          {estudianteSeleccionado && (
            <button
              onClick={() => setTabActiva('detalle')}
              className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
                tabActiva === 'detalle'
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users size={20} />
              Detalle: {estudianteSeleccionado.nombre_completo.split(' ')[0]}
            </button>
          )}
        </div>
      </div>

      {/* CONTENIDO DINÁMICO */}
      <div className="transition-all duration-500">
        {/* TAB: GENERAL */}
        {tabActiva === 'general' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <BarChart3 size={24} className="text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Listado de Deudas ({deudas.length})</h2>
              </div>
              <TablaDeudas
                deudas={deudas}
                loading={loading}
                onSeleccionar={handleSeleccionarEstudiante}
              />
            </div>
          </div>
        )}

        {/* TAB: CRÍTICA */}
        {tabActiva === 'critica' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-rose-500/20 rounded-lg">
                  <AlertCircle size={24} className="text-rose-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Deudas Críticas (50%+)</h2>
              </div>

              {deudasCriticas.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {deudasCriticas.map((deuda) => (
                    <div
                      key={deuda.id}
                      onClick={() => {
                        const deudaCompleta = deudas.find((d) => d.estudiante_id === deuda.id)
                        if (deudaCompleta) {
                          setEstudianteSeleccionado(deudaCompleta)
                          setTabActiva('detalle')
                        }
                      }}
                      className="p-4 bg-gradient-to-r from-slate-700/50 to-slate-600/50 hover:from-red-600/30 hover:to-orange-600/30 border border-red-500/30 hover:border-red-400/50 rounded-lg cursor-pointer transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-white">{deuda.nombre_completo}</p>
                          <p className="text-xs text-slate-400 mt-1">DNI: {deuda.dni} • {deuda.carrera}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-red-400 text-lg">{formatoMoneda(deuda.total_adeudado)}</p>
                          <p className="text-xs text-rose-400 font-bold mt-1">⚠️ {deuda.porcentaje_deuda}% sin pagar</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle size={32} className="text-green-400 mx-auto mb-2" />
                  <p className="text-slate-400 font-semibold">No hay deudas críticas</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: DETALLE */}
        {tabActiva === 'detalle' && estudianteSeleccionado && (
          <div className="space-y-6">
            {/* Header del estudiante */}
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white">{estudianteSeleccionado.nombre_completo}</h2>
                  <p className="text-sm text-slate-400 mt-2">DNI: {estudianteSeleccionado.dni} • Carrera: {estudianteSeleccionado.carrera}</p>
                </div>
                <button
                  onClick={() => {
                    setEstudianteSeleccionado(null)
                    setTabActiva('general')
                  }}
                  className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-slate-200 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tarjetas de resumen */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/50 rounded-lg">
                  <p className="text-xs text-red-300 font-bold mb-1">Total Adeudado</p>
                  <p className="text-2xl font-black text-red-400">{formatoMoneda(estudianteSeleccionado.total_adeudado)}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/50 rounded-lg">
                  <p className="text-xs text-green-300 font-bold mb-1">Total Pagado</p>
                  <p className="text-2xl font-black text-green-400">{formatoMoneda(estudianteSeleccionado.total_pagado)}</p>
                </div>
                <div className={`p-4 bg-gradient-to-br ${
                  estudianteSeleccionado.saldo_adeudado > 0
                    ? 'from-orange-500/20 to-orange-600/20 border border-orange-500/50'
                    : 'from-green-500/20 to-green-600/20 border border-green-500/50'
                } rounded-lg`}>
                  <p className={`text-xs font-bold mb-1 ${
                    estudianteSeleccionado.saldo_adeudado > 0 ? 'text-orange-300' : 'text-green-300'
                  }`}>Saldo Actual</p>
                  <p className={`text-2xl font-black ${
                    estudianteSeleccionado.saldo_adeudado > 0 ? 'text-orange-400' : 'text-green-400'
                  }`}>{formatoMoneda(estudianteSeleccionado.saldo_adeudado)}</p>
                </div>
              </div>
            </div>

            {/* Tabla de conceptos */}
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                Detalles por Concepto
              </h3>

              {deudasDetalladasVencidas.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {deudasDetalladasVencidas.map((deuda, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border transition-all ${
                        deuda.pendiente 
                          ? 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20' 
                          : 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-white">{deuda.concepto}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {deuda.tipo_concepto} • {formatoMoneda(deuda.monto_original)}
                          </p>
                        </div>
                        <div className="text-right">
                          {deuda.pendiente ? (
                            <p className="font-bold text-red-400">{formatoMoneda(deuda.monto_adeudado)}</p>
                          ) : (
                            <div>
                              {deuda.fecha_pago && (
                                <p className="text-xs text-green-400">Pago: {formatoFecha(deuda.fecha_pago)}</p>
                              )}
                              <p className="font-bold text-green-400">{formatoMoneda(deuda.monto_pagado)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400 font-semibold">No hay conceptos pendientes</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}