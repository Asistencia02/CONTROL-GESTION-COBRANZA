import React, { useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { usePagos } from '@renderer/hooks/usePagos'
import { useGastos } from '@renderer/hooks/useGastos'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { DollarSign, TrendingUp, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { formatoMoneda } from '@renderer/lib/helpers'

export const Dashboard: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { pagos, cargarPagos, loading: pagosLoading, error: pagosError } = usePagos()
  const { gastos, cargarGastos, loading: gastosLoading } = useGastos()
  const { estudiantes, cargarEstudiantes, loading: estudiantesLoading } = useEstudiantes()

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        await cargarEstudiantes(institucionActiva.id)
        await cargarPagos(institucionActiva.id)
        await cargarGastos(institucionActiva.id)
      } catch (error) {
        console.error('Error cargando dashboard:', error)
      }
    }

    cargarDatos()
  }, [institucionActiva.id])

  // Debug: mostrar estado de pagos
  useEffect(() => {
    console.log('Dashboard - Estado actual:')
    console.log('  Total pagos cargados:', pagos.length)
    console.log('  Pagos cargados?:', pagos.length > 0)
    
    if (pagos.length > 0) {
      const hoy = new Date().toISOString().split('T')[0]
      console.log('  Fecha hoy:', hoy)
      
      const pagosDeHoy = pagos.filter(p => {
        if (p.anulado) return false
        const pagoFecha = new Date(p.fecha_pago).toISOString().split('T')[0]
        return hoy === pagoFecha
      })
      
      console.log('  Pagos de hoy (no anulados):', pagosDeHoy.length)
      console.log('  Primeros 3 pagos:')
      pagos.slice(0, 3).forEach(p => {
        console.log(`    - ${p.fecha_pago} | $${p.monto_pagado} | Anulado: ${p.anulado}`)
      })
    }
  }, [pagos])

  // Helper: Comparar fechas sin hora (ISO format YYYY-MM-DD)
  const esHoy = (fecha: string): boolean => {
    const hoy = new Date().toISOString().split('T')[0]
    const pagoFecha = new Date(fecha).toISOString().split('T')[0]
    return hoy === pagoFecha
  }

  // Cálculos
  const pagosHoy = pagos.filter(p => !p.anulado && esHoy(p.fecha_pago)).reduce((sum, p) => sum + p.monto_pagado, 0)
  const cantidadPagosHoy = pagos.filter(p => !p.anulado && esHoy(p.fecha_pago)).length

  const totalRecaudado = pagos.filter(p => !p.anulado).reduce((sum, p) => sum + p.monto_pagado, 0)
  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0)
  const neto = totalRecaudado - totalGastos
  const gastosCategoria = {} // TODO: implementar

  const isLoading = pagosLoading || gastosLoading || estudiantesLoading

  return (
    <div className="p-8">
      {/* Encabezado */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          {institucionActiva.nombre} - {institucionActiva.cuit}
        </p>
      </div>

      {/* Error State */}
      {pagosError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Error al cargar pagos</p>
            <p className="text-sm text-red-700">{pagosError}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin">
            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
          <span className="ml-3 text-gray-600">Cargando datos...</span>
        </div>
      ) : (
        <>
          {/* Métricas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Cobrado Hoy */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-green-700 text-sm font-medium">Cobrado Hoy</p>
                  <p className="text-2xl font-bold text-green-900 mt-2">
                    {formatoMoneda(pagosHoy)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {cantidadPagosHoy} pago(s)
                  </p>
                </div>
                <DollarSign className="text-green-600" size={32} />
              </div>
            </div>

            {/* Total General */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-blue-700 text-sm font-medium">Total Recaudado</p>
                  <p className="text-2xl font-bold text-blue-900 mt-2">
                    {formatoMoneda(totalRecaudado)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {pagos.filter(p => !p.anulado).length} pago(s)
                  </p>
                </div>
                <TrendingUp className="text-blue-600" size={32} />
              </div>
            </div>

            {/* Gastos */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-red-700 text-sm font-medium">Gastos Totales</p>
                  <p className="text-2xl font-bold text-red-900 mt-2">
                    {formatoMoneda(totalGastos)}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {gastos.length} gasto(s)
                  </p>
                </div>
                <TrendingUp className="text-red-600 rotate-180" size={32} />
              </div>
            </div>

            {/* Neto */}
            <div className={`bg-gradient-to-br p-6 rounded-lg border ${
              neto >= 0 
                ? 'from-purple-50 to-purple-100 border-purple-200' 
                : 'from-orange-50 to-orange-100 border-orange-200'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm font-medium ${neto >= 0 ? 'text-purple-700' : 'text-orange-700'}`}>
                    Neto
                  </p>
                  <p className={`text-2xl font-bold mt-2 ${neto >= 0 ? 'text-purple-900' : 'text-orange-900'}`}>
                    {formatoMoneda(neto)}
                  </p>
                </div>
                <Users className={neto >= 0 ? 'text-purple-600' : 'text-orange-600'} size={32} />
              </div>
            </div>
          </div>

          {/* Info Institución */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Datos Institución */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Información</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-500 text-sm">Institución</p>
                  <p className="text-gray-900 font-semibold">{institucionActiva.nombre}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">CUIT</p>
                  <p className="text-gray-900 font-semibold">{institucionActiva.cuit}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Punto de Venta</p>
                  <p className="text-gray-900 font-semibold">{institucionActiva.ptoVentaActivo}</p>
                </div>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Estadísticas</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-500 text-sm">Estudiantes</p>
                  <p className="text-gray-900 font-semibold text-xl">{estudiantes.length}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Pagos Registrados</p>
                  <p className="text-gray-900 font-semibold text-xl">{pagos.length}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Gastos Registrados</p>
                  <p className="text-gray-900 font-semibold text-xl">{gastos.length}</p>
                </div>
              </div>
            </div>

            {/* Gastos por Categoría */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Gastos por Categoría</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {Object.entries(gastosCategoria).length === 0 ? (
                  <p className="text-gray-500 text-sm">Sin gastos registrados</p>
                ) : (
                  Object.entries(gastosCategoria).map(([categoria, monto]) => (
                    <div key={categoria} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{categoria}</span>
                      <span className="font-semibold text-gray-900">{formatoMoneda(monto as number)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Conexión Supabase */}
          <div className="mt-8 text-center text-green-600 text-sm flex items-center justify-center gap-2">
            <CheckCircle size={18} />
            <p>✓ Conectado a Supabase</p>
          </div>
        </>
      )}
    </div>
  )
}
