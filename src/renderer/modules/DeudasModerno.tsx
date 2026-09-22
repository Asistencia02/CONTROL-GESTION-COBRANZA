import React, { useState, useEffect, useMemo } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useDeudas, type Deuda, type DeudaDetallada, type DeudaCritica } from '@renderer/hooks/useDeudas'
import { TablaDeudas } from '@renderer/components/TablaDeudas'
import { ModalFinanciamientoDeuda } from '@renderer/components/ModalFinanciamientoDeuda'
import { formatoMoneda, formatoFecha } from '@renderer/lib/helpers'
import { AlertCircle, TrendingDown, X, BarChart3, Users, Percent, RefreshCw, Zap, Download } from 'lucide-react'
import { Pagination } from '@renderer/components/Pagination'
import { AdvancedSearch } from '@renderer/components/AdvancedSearch'
import { ExportButton } from '@renderer/components/ExportButton'
import { SkeletonTable } from '@renderer/components/SkeletonLoader'

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
  const [modalFinanciamiento, setModalFinanciamiento] = useState(false)
  const [deudaSeleccionadaFinanciar, setDeudaSeleccionadaFinanciar] = useState<{ concepto: string; monto: number } | null>(null)
  const [searchText, setSearchText] = useState('')
  const [filters, setFilters] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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

  const deudasPorAño = useMemo(() => {
    const agrupadas = new Map<number, DeudaDetallada[]>()
    
    deudasDetalladas.forEach(deuda => {
      const año = new Date().getFullYear()
      if (!agrupadas.has(año)) {
        agrupadas.set(año, [])
      }
      agrupadas.get(año)!.push(deuda)
    })

    return Array.from(agrupadas.entries())
      .sort((a, b) => b[0] - a[0])
  }, [deudasDetalladas])

  const handleSeleccionarEstudiante = (estudiante_id: number) => {
    const deuda = deudas.find((d) => d.estudiante_id === estudiante_id)
    if (deuda) {
      setEstudianteSeleccionado(deuda)
      setTabActiva('detalle')
    }
  }

  const handleAbrirFinanciamiento = (deuda: DeudaDetallada) => {
    if (deuda.monto_adeudado > 0) {
      setDeudaSeleccionadaFinanciar({
        concepto: deuda.concepto,
        monto: deuda.monto_adeudado
      })
      setModalFinanciamiento(true)
    }
  }

  // Filtrar deudas por busqueda
  const deudasFiltradas = useMemo(() => {
    return deudas.filter(deuda => {
      const searchLower = searchText.toLowerCase()
      const matchSearch = deuda.nombre_completo.toLowerCase().includes(searchLower) ||
                         deuda.dni.toLowerCase().includes(searchLower)
      return matchSearch
    })
  }, [deudas, searchText])

  // Paginar
  const startIdx = (currentPage - 1) * pageSize
  const deudasPaginadas = deudasFiltradas.slice(startIdx, startIdx + pageSize)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-2 sm:p-4">
        <div className="text-center">
          <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg sm:rounded-xl mb-3 sm:mb-4 border border-red-500/50">
            <AlertCircle size={28} className="text-red-400 animate-spin sm:w-8 sm:h-8" />
          </div>
          <p className="text-slate-400 font-semibold text-sm sm:text-base">Cargando deudas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-3 md:p-4 lg:p-8 space-y-4 sm:space-y-5 md:space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
          <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg sm:rounded-xl shadow-lg shadow-red-500/50 flex-shrink-0">
            <AlertCircle size={24} className="text-white sm:w-6 sm:h-6 md:w-8 md:h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent truncate">
              Gestion de Deudas
            </h1>
            <p className="text-slate-400 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate">Monitorea deudas</p>
          </div>
        </div>
        <button
          onClick={cargarTodo}
          disabled={loading}
          className="p-2 sm:p-2.5 md:p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-slate-400 hover:text-red-400 transition-all duration-300 flex-shrink-0"
        >
          <RefreshCw size={20} className={`sm:w-6 sm:h-6 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPIs EN GRID RESPONSIVE */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
        <div className="p-2 sm:p-3 md:p-4 lg:p-5 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl hover:border-red-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Total Adeudado</p>
          <p className="text-lg sm:text-xl md:text-2xl font-black text-red-400 truncate">{formatoMoneda(resumen.totalDeudaGeneral)}</p>
        </div>
        <div className="p-2 sm:p-3 md:p-4 lg:p-5 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl hover:border-orange-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Deudores</p>
          <p className="text-lg sm:text-xl md:text-2xl font-black text-orange-400 truncate">{resumen.estudiantesEnMora}</p>
        </div>
        <div className="p-2 sm:p-3 md:p-4 lg:p-5 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl hover:border-amber-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">% Deudores</p>
          <p className="text-lg sm:text-xl md:text-2xl font-black text-amber-400 truncate">{resumen.porcentajeMora}%</p>
        </div>
        <div className="p-2 sm:p-3 md:p-4 lg:p-5 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl hover:border-rose-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Critica</p>
          <p className="text-lg sm:text-xl md:text-2xl font-black text-rose-400 truncate">{deudasCriticas.length}</p>
        </div>
      </div>

      {/* TABS RESPONSIVE */}
      <div className="mb-4 sm:mb-5 md:mb-6 lg:mb-8">
        <div className="flex gap-1 sm:gap-2 p-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl overflow-x-auto">
          <button
            onClick={() => setTabActiva('general')}
            className={`px-2 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0 ${
              tabActiva === 'general'
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Todas</span>
          </button>
          <button
            onClick={() => setTabActiva('critica')}
            className={`px-2 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0 ${
              tabActiva === 'critica'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertCircle size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Criticas</span>
            <span className="text-xs font-bold">({deudasCriticas.length})</span>
          </button>
          {estudianteSeleccionado && (
            <button
              onClick={() => setTabActiva('detalle')}
              className={`px-2 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0 truncate ${
                tabActiva === 'detalle'
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-500/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users size={16} className="sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">{estudianteSeleccionado.nombre_completo.split(' ')[0]}</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTENIDO DINAMICO */}
      <div className="transition-all duration-500 space-y-4 sm:space-y-5 md:space-y-6">
        {/* TAB: GENERAL CON BUSQUEDA, PAGINACION Y EXPORTACION */}
        {tabActiva === 'general' && (
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <AdvancedSearch
              onSearch={setSearchText}
              placeholder="Buscar por nombre o DNI..."
              debounceMs={300}
            />

            <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl">
              <div className="flex items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 bg-red-500/20 rounded-lg flex-shrink-0">
                    <BarChart3 size={20} className="text-red-400 sm:w-6 sm:h-6" />
                  </div>
                  <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">Listado ({deudasFiltradas.length})</h2>
                </div>
                <ExportButton
                  filename="deudas"
                  data={deudasFiltradas}
                  columns={[
                    { key: 'nombre_completo', label: 'Nombre' },
                    { key: 'dni', label: 'DNI' },
                    { key: 'carrera', label: 'Carrera' },
                    { key: 'total_adeudado', label: 'Adeudado' },
                    { key: 'total_pagado', label: 'Pagado' },
                  ]}
                />
              </div>

              {loading ? (
                <SkeletonTable rows={5} cols={5} />
              ) : (
                <div className="overflow-x-auto">
                  <TablaDeudas
                    deudas={deudasPaginadas}
                    loading={loading}
                    onSeleccionar={handleSeleccionarEstudiante}
                  />
                </div>
              )}

              {deudasFiltradas.length > 0 && (
                <div className="mt-4 sm:mt-6">
                  <Pagination
                    total={deudasFiltradas.length}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize)
                      setCurrentPage(1)
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CRITICA */}
        {tabActiva === 'critica' && (
          <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 bg-rose-500/20 rounded-lg flex-shrink-0">
                <AlertCircle size={20} className="text-rose-400 sm:w-6 sm:h-6" />
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">Deudas Criticas (50%+)</h2>
            </div>

            {deudasCriticas.length > 0 ? (
              <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
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
                    className="p-3 sm:p-4 bg-gradient-to-r from-slate-700/50 to-slate-600/50 hover:from-red-600/30 hover:to-orange-600/30 border border-red-500/30 hover:border-red-400/50 rounded-lg sm:rounded-lg cursor-pointer transition-all group"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-white text-sm sm:text-base truncate">{deuda.nombre_completo}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">DNI: {deuda.dni} • {deuda.carrera}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-red-400 text-lg sm:text-xl truncate">{formatoMoneda(deuda.total_adeudado)}</p>
                        <p className="text-xs text-rose-400 font-bold mt-0.5">🔴 {deuda.porcentaje_deuda}%</p>
                      </div>
                    </div>
                    <div className="flex gap-2 sm:gap-4 text-xs pt-2 border-t border-slate-600/30 flex-wrap">
                      <div className="min-w-0">
                        <span className="text-slate-400 text-xs">Total:</span>
                        <span className="text-white font-bold ml-1 truncate">{formatoMoneda(deuda.total_adeudado + deuda.total_pagado)}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-400 text-xs">Pagado:</span>
                        <span className="text-green-400 font-bold ml-1 truncate">{formatoMoneda(deuda.total_pagado)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <AlertCircle size={28} className="text-green-400 mx-auto mb-2 sm:mb-3 sm:w-8 sm:h-8" />
                <p className="text-slate-400 font-semibold text-sm">No hay deudas criticas</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: DETALLE */}
        {tabActiva === 'detalle' && estudianteSeleccionado && (
          <>
            <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl">
              <div className="flex justify-between items-start gap-2 mb-4 sm:mb-6">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white truncate">{estudianteSeleccionado.nombre_completo}</h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-1">DNI: {estudianteSeleccionado.dni} • {estudianteSeleccionado.carrera}</p>
                </div>
                <button
                  onClick={() => {
                    setEstudianteSeleccionado(null)
                    setTabActiva('general')
                  }}
                  className="p-1.5 sm:p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-slate-200 transition-all flex-shrink-0"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                <div className="p-2 sm:p-3 md:p-4 bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/50 rounded-lg">
                  <p className="text-xs text-red-300 font-bold mb-0.5 sm:mb-1">Adeudado</p>
                  <p className="text-base sm:text-lg md:text-2xl font-black text-red-400 truncate">{formatoMoneda(estudianteSeleccionado.total_adeudado)}</p>
                </div>
                <div className="p-2 sm:p-3 md:p-4 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/50 rounded-lg">
                  <p className="text-xs text-green-300 font-bold mb-0.5 sm:mb-1">Pagado</p>
                  <p className="text-base sm:text-lg md:text-2xl font-black text-green-400 truncate">{formatoMoneda(estudianteSeleccionado.total_pagado)}</p>
                </div>
                <div className="p-2 sm:p-3 md:p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/50 rounded-lg">
                  <p className="text-xs text-blue-300 font-bold mb-0.5 sm:mb-1">Conceptos</p>
                  <p className="text-base sm:text-lg md:text-2xl font-black text-blue-400 truncate">{estudianteSeleccionado.conceptos_pagados}/{estudianteSeleccionado.conceptos_totales}</p>
                </div>
                <div className={`p-2 sm:p-3 md:p-4 bg-gradient-to-br ${
                  estudianteSeleccionado.saldo_adeudado > 0
                    ? 'from-orange-500/20 to-orange-600/20 border border-orange-500/50'
                    : 'from-green-500/20 to-green-600/20 border border-green-500/50'
                } rounded-lg`}>
                  <p className={`text-xs font-bold mb-0.5 sm:mb-1 ${
                    estudianteSeleccionado.saldo_adeudado > 0 ? 'text-orange-300' : 'text-green-300'
                  }`}>Saldo</p>
                  <p className={`text-base sm:text-lg md:text-2xl font-black truncate ${
                    estudianteSeleccionado.saldo_adeudado > 0 ? 'text-orange-400' : 'text-green-400'
                  }`}>{formatoMoneda(estudianteSeleccionado.saldo_adeudado)}</p>
                </div>
              </div>
            </div>

            {deudasPorAño.length > 0 ? (
              deudasPorAño.map(([año, deudas]) => (
                <div key={año} className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl">
                  <h3 className="font-bold text-white mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-amber-400 rounded-full flex-shrink-0"></div>
                    <span className="truncate">Deuda {año}</span>
                  </h3>

                  <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
                    {deudas.map((deuda, idx) => (
                      <div
                        key={idx}
                        className={`p-2 sm:p-3 rounded-lg border transition-all ${
                          deuda.pendiente 
                            ? 'border-red-500/30 bg-red-500/10 hover:bg-red-500/20' 
                            : 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm truncate">{deuda.concepto}</p>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                              {deuda.tipo_concepto} • {formatoMoneda(deuda.monto_original)}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {deuda.pendiente ? (
                              <div>
                                <p className="font-bold text-red-400 text-sm truncate">{formatoMoneda(deuda.monto_adeudado)}</p>
                                <button
                                  onClick={() => handleAbrirFinanciamiento(deuda)}
                                  className="text-xs mt-1 px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded transition flex items-center gap-1 whitespace-nowrap"
                                >
                                  <Zap size={11} />
                                  Financiar
                                </button>
                              </div>
                            ) : (
                              <div>
                                {deuda.fecha_pago && (
                                  <p className="text-xs text-green-400 truncate">Pago: {formatoFecha(deuda.fecha_pago)}</p>
                                )}
                                <p className="font-bold text-green-400 mt-0.5 text-sm truncate">{formatoMoneda(deuda.monto_pagado)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 sm:py-12 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl">
                <p className="text-slate-400 font-semibold text-sm">No hay conceptos pendientes</p>
              </div>
            )}
          </>
        )}
      </div>

      {deudaSeleccionadaFinanciar && estudianteSeleccionado && (
        <ModalFinanciamientoDeuda
          isOpen={modalFinanciamiento}
          onClose={() => {
            setModalFinanciamiento(false)
            setDeudaSeleccionadaFinanciar(null)
          }}
          onConfirm={async () => {
            setModalFinanciamiento(false)
          }}
          deuda={deudaSeleccionadaFinanciar.monto}
          cuotaBase={0}
          estudiante_nombre={estudianteSeleccionado.nombre_completo}
        />
      )}
    </div>
  )
}
