import React, { useState, useEffect, useMemo } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useDeudas, type Deuda, type DeudaDetallada, type DeudaCritica } from '@renderer/hooks/useDeudas'
import { TablaDeudas } from '@renderer/components/TablaDeudas'
import { formatoMoneda, formatoFecha } from '@renderer/lib/helpers'
import { AlertCircle, TrendingDown, X } from 'lucide-react'

export const Deudas: React.FC = () => {
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
  const [mostrarCriticas, setMostrarCriticas] = useState(false)

  // Cargar datos al cambiar institución
  useEffect(() => {
    const cargarTodo = async () => {
      await cargarDeudas(institucionActiva.id)
      await cargarDeudasCriticas(institucionActiva.id)
      const resumenData = await obtenerResumenDeudas(institucionActiva.id)
      setResumen(resumenData)
    }
    cargarTodo()
  }, [institucionActiva.id])

  // Cargar deudas detalladas cuando se selecciona un estudiante
  useEffect(() => {
    if (estudianteSeleccionado) {
      cargarDeudasDetalladas(estudianteSeleccionado.estudiante_id, institucionActiva.id)
    }
  }, [estudianteSeleccionado, institucionActiva.id])

  // Mostrar TODOS los conceptos (vencidos y futuros)
  const deudasDetalladasVencidas = useMemo(() => {
    return deudasDetalladas
  }, [deudasDetalladas])

  const handleSeleccionarEstudiante = (estudiante_id: number) => {
    const deuda = deudas.find((d) => d.estudiante_id === estudiante_id)
    if (deuda) {
      setEstudianteSeleccionado(deuda)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Gestión de Deudas - {institucionActiva.nombreCorto}</h1>

      {/* INDICADORES PRINCIPALES */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {/* Total Deuda General */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={20} className="text-red-600" />
            <p className="text-sm font-medium text-red-700">Total Deuda General</p>
          </div>
          <p className="text-3xl font-bold text-red-900">{formatoMoneda(resumen.totalDeudaGeneral)}</p>
          <p className="text-xs text-red-600 mt-2">En toda la institución</p>
        </div>

        {/* Estudiantes Deudores */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={20} className="text-orange-600" />
            <p className="text-sm font-medium text-orange-700">Son Deudores</p>
          </div>
          <p className="text-3xl font-bold text-orange-900">{resumen.estudiantesEnMora}</p>
          <p className="text-xs text-orange-600 mt-2">Según criterios de mora</p>
        </div>

        {/* Porcentaje */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
          <p className="text-sm font-medium text-blue-700 mb-2">% Deudores</p>
          <p className="text-3xl font-bold text-blue-900">{resumen.porcentajeMora}%</p>
          <p className="text-xs text-blue-600 mt-2">Del total de estudiantes</p>
        </div>

        {/* Deuda Crítica */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
          <p className="text-sm font-medium text-purple-700 mb-2">Deuda Crítica</p>
          <p className="text-3xl font-bold text-purple-900">{deudasCriticas.length}</p>
          <p className="text-xs text-purple-600 mt-2">Estudiantes (50%+ deuda)</p>
          <button
            onClick={() => setMostrarCriticas(!mostrarCriticas)}
            className="mt-2 text-xs underline text-purple-700 hover:text-purple-900"
          >
            {mostrarCriticas ? 'Ocultar' : 'Ver lista'}
          </button>
        </div>
      </div>

      {/* LISTA DE DEUDA CRÍTICA (si se abre) */}
      {mostrarCriticas && deudasCriticas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-red-900 flex items-center gap-2">
              <AlertCircle size={24} />
              Estudiantes con Deuda Crítica (50%+ sin pagar)
            </h2>
            <button
              onClick={() => setMostrarCriticas(false)}
              className="text-red-600 hover:text-red-900"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {deudasCriticas.map((deuda) => (
              <div
                key={deuda.id}
                className="bg-white p-3 rounded border border-red-200 hover:bg-red-50 cursor-pointer transition"
                onClick={() => {
                  const deudaCompleta = deudas.find((d) => d.estudiante_id === deuda.id)
                  if (deudaCompleta) {
                    setEstudianteSeleccionado(deudaCompleta)
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{deuda.nombre_completo}</p>
                    <p className="text-xs text-gray-600">DNI: {deuda.dni} | {deuda.carrera}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-700">{formatoMoneda(deuda.total_adeudado)}</p>
                    <p className="text-xs text-red-600">{deuda.porcentaje_deuda}% sin pagar</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABLA PRINCIPAL DE DEUDAS */}
      <TablaDeudas
        deudas={deudas}
        loading={loading}
        onSeleccionar={handleSeleccionarEstudiante}
      />

      {/* MODAL DE DETALLES */}
      {estudianteSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-96 overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{estudianteSeleccionado.nombre_completo}</h2>
                <p className="text-sm text-gray-600">DNI: {estudianteSeleccionado.dni}</p>
                <p className="text-sm text-gray-600">Carrera: {estudianteSeleccionado.carrera}</p>
              </div>
              <button
                onClick={() => {
                  setEstudianteSeleccionado(null)
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs text-blue-700 font-medium">Total Adeudado</p>
                <p className="text-lg font-bold text-blue-900">{formatoMoneda(estudianteSeleccionado.total_adeudado)}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-xs text-green-700 font-medium">Total Pagado</p>
                <p className="text-lg font-bold text-green-900">{formatoMoneda(estudianteSeleccionado.total_pagado)}</p>
              </div>
              <div className={`p-3 rounded ${estudianteSeleccionado.saldo_adeudado > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className={`text-xs font-medium ${estudianteSeleccionado.saldo_adeudado > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  Saldo Adeudado
                </p>
                <p className={`text-lg font-bold ${estudianteSeleccionado.saldo_adeudado > 0 ? 'text-red-900' : 'text-green-900'}`}>
                  {formatoMoneda(estudianteSeleccionado.saldo_adeudado)}
                </p>
              </div>
            </div>

            {/* Detalles por concepto - SOLO VENCIDOS */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-800 mb-3">Detalles por Concepto</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {deudasDetalladasVencidas.length > 0 ? (
                  deudasDetalladasVencidas.map((deuda, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded border ${
                        deuda.pendiente ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{deuda.concepto}</p>
                          <p className="text-xs text-gray-600">
                            {deuda.tipo_concepto} | Monto: {formatoMoneda(deuda.monto_original)}
                          </p>
                        </div>
                        <div className="text-right">
                          {deuda.pendiente ? (
                            <p className="font-bold text-red-700">{formatoMoneda(deuda.monto_adeudado)}</p>
                          ) : (
                            <div>
                              {deuda.fecha_pago && (
                                <p className="text-xs text-green-600">Pagado el {formatoFecha(deuda.fecha_pago)}</p>
                              )}
                              <p className="font-semibold text-green-700">{formatoMoneda(deuda.monto_pagado)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No hay conceptos vencidos</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
