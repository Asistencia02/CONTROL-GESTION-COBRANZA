import React, { useState, useEffect, useMemo } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useGastos } from '@renderer/hooks/useGastos'
import { useAuth } from '@renderer/hooks/useAuth'
import { formatoMoneda } from '@renderer/lib/helpers'
import { TrendingDown, Plus, AlertCircle, PieChart, RefreshCw } from 'lucide-react'
import { Pagination } from '@renderer/components/Pagination'
import { AdvancedSearch } from '@renderer/components/AdvancedSearch'
import { ExportButton } from '@renderer/components/ExportButton'
import { SkeletonTable } from '@renderer/components/SkeletonLoader'

type TabGasto = 'registro' | 'historial' | 'resumen'

export const GastosModerno: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { gastos, cargarGastos, agregarGasto, loading, totalPorCategoria } = useGastos()
  const { usuarioActual } = useAuth()

  const [formData, setFormData] = useState({
    categoria: 'Servicios' as string,
    descripcion: '',
    monto: '',
    metodo_pago: 'EFECTIVO' as 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'CHEQUE',
  })

  const [registrando, setRegistrando] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [tabActiva, setTabActiva] = useState<TabGasto>('registro')
  const [searchText, setSearchText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const cargarDatos = async () => {
    await cargarGastos(institucionActiva.id)
  }

  useEffect(() => {
    cargarDatos()
  }, [institucionActiva.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.descripcion || !formData.monto) {
      alert('Por favor completa todos los campos')
      return
    }

    setRegistrando(true)
    try {
      const usuarioNombre = usuarioActual?.nombre_completo || 'SISTEMA'
      const notasConUsuario = `[${usuarioNombre}]`
      
      await agregarGasto({
        institucion_id: institucionActiva.id,
        categoria: formData.categoria,
        descripcion: formData.descripcion,
        monto: parseFloat(formData.monto),
        metodo_pago: formData.metodo_pago,
        comprobante_numero: null,
        fecha_gasto: new Date().toISOString().split('T')[0],
        notas: notasConUsuario
      })

      setSuccessMessage(`Gasto registrado: ${formData.descripcion}`)
      setFormData({ categoria: 'Servicios', descripcion: '', monto: '', metodo_pago: 'EFECTIVO' })
      await cargarDatos()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error registrando gasto:', error)
      alert('Error al registrar gasto')
    } finally {
      setRegistrando(false)
    }
  }

  const getCategoryIcon = (categoria: string): string => {
    const iconos: Record<string, string> = {
      Limpieza: '🧹',
      Libreria: '📚',
      Servicios: '🔧',
      Otros: '📦'
    }
    return iconos[categoria] || '📦'
  }

  const extractUserFromGasto = (gasto: any): string => {
    if (!gasto.notas) return 'DESCONOCIDO'
    const match = gasto.notas.match(/\[([^\]]+)\]/)
    return match ? match[1] : 'DESCONOCIDO'
  }

  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      const searchLower = searchText.toLowerCase()
      const matchSearch = g.descripcion.toLowerCase().includes(searchLower) ||
                         g.categoria.toLowerCase().includes(searchLower) ||
                         extractUserFromGasto(g).toLowerCase().includes(searchLower)
      return matchSearch
    })
  }, [gastos, searchText])

  const startIdx = (currentPage - 1) * pageSize
  const gastosPaginados = gastosFiltrados.slice(startIdx, startIdx + pageSize)

  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0)
  const gastosCategoria = totalPorCategoria()
  const categorias = ['Limpieza', 'Libreria', 'Servicios', 'Otros']

  if (loading && gastos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl mb-4 border border-blue-500/50">
            <TrendingDown size={32} className="text-blue-400 animate-spin" />
          </div>
          <p className="text-slate-400 font-semibold">Cargando gastos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-3 md:p-4 lg:p-8 space-y-4 sm:space-y-5 md:space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
          <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/50 flex-shrink-0">
            <TrendingDown size={24} className="text-white sm:w-6 sm:h-6 md:w-8 md:h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent truncate">
              Gestion de Gastos
            </h1>
            <p className="text-slate-400 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate">Controla egresos</p>
          </div>
        </div>
        <button
          onClick={cargarDatos}
          disabled={loading}
          className="p-2 sm:p-2.5 md:p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-slate-400 hover:text-blue-400 transition-all flex-shrink-0"
        >
          <RefreshCw size={20} className={`sm:w-6 sm:h-6 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {successMessage && (
        <div className={`p-2 sm:p-3 md:p-4 rounded-lg border-l-4 mb-4 sm:mb-5 md:mb-6 font-semibold flex items-center gap-2 text-xs sm:text-sm bg-green-500/20 border-green-500/50 text-green-400`}>
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
          <span className="truncate">{successMessage}</span>
        </div>
      )}

      {/* KPIs EN GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
        <div className="p-2 sm:p-3 md:p-4 lg:p-5 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl hover:border-blue-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Total Gastos</p>
          <p className="text-base sm:text-lg md:text-2xl font-black text-blue-400 truncate">{formatoMoneda(totalGastos)}</p>
        </div>
        <div className="p-2 sm:p-3 md:p-4 lg:p-5 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl hover:border-cyan-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Registros</p>
          <p className="text-base sm:text-lg md:text-2xl font-black text-cyan-400 truncate">{gastos.length}</p>
        </div>
        <div className="p-2 sm:p-3 md:p-4 lg:p-5 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl hover:border-sky-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Promedio</p>
          <p className="text-base sm:text-lg md:text-2xl font-black text-sky-400 truncate">{gastos.length > 0 ? formatoMoneda(totalGastos / gastos.length) : '$0'}</p>
        </div>
        <div className="p-2 sm:p-3 md:p-4 lg:p-5 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl hover:border-indigo-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Categorias</p>
          <p className="text-base sm:text-lg md:text-2xl font-black text-indigo-400 truncate">{categorias.length}</p>
        </div>
      </div>

      {/* TABS */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex gap-1 sm:gap-2 p-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl overflow-x-auto">
          <button
            onClick={() => setTabActiva('registro')}
            className={`px-2 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0 ${
              tabActiva === 'registro'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Registrar</span>
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`px-2 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0 ${
              tabActiva === 'historial'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingDown size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Historial</span>
            <span className="text-xs font-bold">({gastos.length})</span>
          </button>
          <button
            onClick={() => setTabActiva('resumen')}
            className={`px-2 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0 ${
              tabActiva === 'resumen'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieChart size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Resumen</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO DINAMICO */}
      <div className="transition-all duration-500 space-y-4 sm:space-y-5 md:space-y-6">
        {/* TAB: REGISTRO */}
        {tabActiva === 'registro' && (
          <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 bg-blue-500/20 rounded-lg flex-shrink-0">
                <Plus size={20} className="text-blue-400 sm:w-6 sm:h-6" />
              </div>
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-white truncate">Registrar Nuevo Gasto</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-1.5 sm:mb-2">Categoria</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs sm:text-sm text-white focus:border-blue-500/50 focus:outline-none transition"
                  >
                    <option value="Limpieza">Limpieza</option>
                    <option value="Libreria">Libreria</option>
                    <option value="Servicios">Servicios</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-1.5 sm:mb-2">Monto ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 sm:top-2.5 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monto}
                      onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                      className="w-full pl-7 px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:border-blue-500/50 focus:outline-none transition"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-1.5 sm:mb-2">Descripcion</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:border-blue-500/50 focus:outline-none transition resize-none"
                  placeholder="Detalle del gasto..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-2 sm:mb-3">Metodo de Pago</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2">
                  {[
                    { value: 'EFECTIVO', label: 'EFECTIVO' },
                    { value: 'TRANSFERENCIA', label: 'TRANSFERENCIA' },
                    { value: 'TARJETA', label: 'TARJETA' },
                    { value: 'CHEQUE', label: 'CHEQUE' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`px-2 sm:px-4 py-2 sm:py-3 rounded-lg border-2 cursor-pointer font-semibold transition text-center text-xs ${
                        formData.metodo_pago === opt.value
                          ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                          : 'border-slate-600/50 bg-slate-700/50 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        checked={formData.metodo_pago === opt.value}
                        onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value as any })}
                        className="hidden"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={registrando}
                className={`w-full py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-bold text-white text-sm sm:text-base flex items-center justify-center gap-2 transition ${
                  registrando
                    ? 'bg-slate-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/50'
                }`}
              >
                <Plus size={18} className="sm:w-5 sm:h-5" />
                {registrando ? 'Registrando...' : 'Registrar Gasto'}
              </button>
            </form>
          </div>
        )}

        {/* TAB: HISTORIAL */}
        {tabActiva === 'historial' && (
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <AdvancedSearch
              onSearch={setSearchText}
              placeholder="Buscar por descripcion, categoria o usuario..."
              debounceMs={300}
            />

            <div className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl">
              <div className="flex items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">Historial ({gastosFiltrados.length})</h2>
                <ExportButton
                  filename="gastos"
                  data={gastosFiltrados.map(g => ({
                    categoria: g.categoria,
                    descripcion: g.descripcion,
                    monto: g.monto,
                    metodo: g.metodo_pago,
                    usuario: extractUserFromGasto(g),
                    fecha: g.fecha_gasto
                  }))}
                  columns={[
                    { key: 'categoria', label: 'Categoria' },
                    { key: 'descripcion', label: 'Descripcion' },
                    { key: 'monto', label: 'Monto' },
                    { key: 'metodo', label: 'Metodo' },
                    { key: 'usuario', label: 'Usuario' },
                    { key: 'fecha', label: 'Fecha' },
                  ]}
                />
              </div>

              {loading ? (
                <SkeletonTable rows={5} cols={6} />
              ) : gastos.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <AlertCircle size={28} className="text-slate-500 mx-auto mb-2 sm:mb-3 sm:w-8 sm:h-8" />
                  <p className="text-slate-400 font-semibold text-sm">Sin gastos registrados</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-slate-900/50">
                        <tr>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-slate-300 font-bold">Categoria</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-slate-300 font-bold">Descripcion</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-slate-300 font-bold">Monto</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-slate-300 font-bold">Metodo</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-slate-300 font-bold hidden sm:table-cell">Usuario</th>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-slate-300 font-bold hidden md:table-cell">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {gastosPaginados.map(gasto => (
                          <tr key={gasto.id} className="hover:bg-slate-700/30 transition">
                            <td className="px-2 sm:px-4 py-2 sm:py-3">
                              <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-bold">
                                {getCategoryIcon(gasto.categoria)} {gasto.categoria}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 font-semibold truncate">{gasto.descripcion}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-blue-400 font-semibold truncate">{formatoMoneda(gasto.monto)}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs">{gasto.metodo_pago}</td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 hidden sm:table-cell">
                              <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-semibold">
                                {extractUserFromGasto(gasto)}
                              </span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-400 text-xs hidden md:table-cell">{gasto.fecha_gasto}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {gastosFiltrados.length > 0 && (
                    <div className="mt-4 sm:mt-6">
                      <Pagination
                        total={gastosFiltrados.length}
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
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB: RESUMEN */}
        {tabActiva === 'resumen' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {categorias.map(cat => (
              <div key={cat} className="p-3 sm:p-4 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-lg sm:rounded-xl">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <span className="text-2xl sm:text-3xl">{getCategoryIcon(cat)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-slate-400 font-bold truncate">{cat}</p>
                    <p className="text-base sm:text-xl md:text-2xl font-black text-blue-400 truncate">{formatoMoneda(gastosCategoria[cat] || 0)}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{gastos.filter(g => g.categoria === cat).length} gasto(s)</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default GastosModerno
