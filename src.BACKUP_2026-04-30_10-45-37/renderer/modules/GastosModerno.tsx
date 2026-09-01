import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useGastos } from '@renderer/hooks/useGastos'
import { formatoMoneda } from '@renderer/lib/helpers'
import { TrendingDown, Plus, AlertCircle, PieChart, RefreshCw } from 'lucide-react'

type TabGasto = 'registro' | 'historial' | 'resumen'

export const GastosModerno: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { gastos, cargarGastos, agregarGasto, loading, totalPorCategoria } = useGastos()

  const [formData, setFormData] = useState({
    categoria: 'Servicios' as string,
    descripcion: '',
    monto: '',
    metodo_pago: 'EFECTIVO' as 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'CHEQUE',
  })

  const [registrando, setRegistrando] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [tabActiva, setTabActiva] = useState<TabGasto>('registro')

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
      await agregarGasto({
        institucion_id: institucionActiva.id,
        categoria: formData.categoria,
        descripcion: formData.descripcion,
        monto: parseFloat(formData.monto),
        metodo_pago: formData.metodo_pago,
        comprobante_numero: null,
        fecha_gasto: new Date().toISOString().split('T')[0],
        notas: null
      })

      setSuccessMessage(`✓ Gasto registrado: ${formData.descripcion}`)
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
      Librería: '📚',
      Servicios: '🔧',
      Otros: '📦'
    }
    return iconos[categoria] || '📦'
  }

  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0)
  const gastosCategoria = totalPorCategoria()
  const categorías = ['Limpieza', 'Librería', 'Servicios', 'Otros']

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      {/* HEADER */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/50">
              <TrendingDown size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Gestión de Gastos
              </h1>
              <p className="text-slate-400 mt-1">Registra y controla todos los egresos</p>
            </div>
          </div>
          <button
            onClick={cargarDatos}
            disabled={loading}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-cyan-400 transition-all duration-300"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {successMessage && (
          <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg text-green-400 font-semibold flex items-center gap-2 mb-6">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            {successMessage}
          </div>
        )}
      </div>

      {/* KPIs EN GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-blue-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Total Gastos</p>
          <p className="text-2xl font-black text-blue-400">{formatoMoneda(totalGastos)}</p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-cyan-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Total Registros</p>
          <p className="text-2xl font-black text-cyan-400">{gastos.length}</p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-sky-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Promedio</p>
          <p className="text-2xl font-black text-sky-400">{gastos.length > 0 ? formatoMoneda(totalGastos / gastos.length) : '$0'}</p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-indigo-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Categorías</p>
          <p className="text-2xl font-black text-indigo-400">{categorías.length}</p>
        </div>
      </div>

      {/* TABS */}
      <div className="mb-12">
        <div className="flex gap-2 p-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl w-fit">
          <button
            onClick={() => setTabActiva('registro')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'registro'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus size={20} />
            Registrar
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'historial'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingDown size={20} />
            Historial ({gastos.length})
          </button>
          <button
            onClick={() => setTabActiva('resumen')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'resumen'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieChart size={20} />
            Resumen
          </button>
        </div>
      </div>

      {/* CONTENIDO DINÁMICO */}
      <div className="transition-all duration-500">
        {/* TAB: REGISTRO */}
        {tabActiva === 'registro' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Plus size={24} className="text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Registrar Nuevo Gasto</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Categoría */}
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Categoría</label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-blue-500/50 focus:outline-none transition"
                    >
                      <option value="Limpieza">🧹 Limpieza</option>
                      <option value="Librería">📚 Librería</option>
                      <option value="Servicios">🔧 Servicios</option>
                      <option value="Otros">📦 Otros</option>
                    </select>
                  </div>

                  {/* Monto */}
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Monto ($)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.monto}
                        onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                        className="w-full pl-8 px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-blue-500/50 focus:outline-none transition"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-blue-500/50 focus:outline-none transition resize-none"
                    placeholder="Detalle del gasto..."
                    rows={3}
                  />
                </div>

                {/* Método de Pago */}
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">Método de Pago</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { value: 'EFECTIVO', label: '💵 Efectivo' },
                      { value: 'TRANSFERENCIA', label: '🏦 Transf.' },
                      { value: 'TARJETA', label: '💳 Tarjeta' },
                      { value: 'CHEQUE', label: '✓ Cheque' },
                    ].map(opt => (
                      <label
                        key={opt.value}
                        className={`px-4 py-3 rounded-lg border-2 cursor-pointer font-semibold transition text-center ${
                          formData.metodo_pago === opt.value
                            ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                            : 'border-slate-600/50 bg-slate-700/50 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        <input type="radio" value={opt.value} checked={formData.metodo_pago === opt.value} onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value as any })} className="hidden" />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={registrando}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition ${
                    registrando
                      ? 'bg-slate-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/50'
                  }`}
                >
                  <Plus size={20} />
                  {registrando ? 'Registrando...' : 'Registrar Gasto'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB: HISTORIAL */}
        {tabActiva === 'historial' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-4">Historial de Gastos ({gastos.length})</h2>

              {gastos.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle size={32} className="text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400 font-semibold">No hay gastos registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-slate-300 font-bold">Categoría</th>
                        <th className="px-4 py-3 text-left text-slate-300 font-bold">Descripción</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-bold">Monto</th>
                        <th className="px-4 py-3 text-center text-slate-300 font-bold">Método</th>
                        <th className="px-4 py-3 text-left text-slate-300 font-bold">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {gastos.map(gasto => (
                        <tr key={gasto.id} className="hover:bg-slate-700/30 transition">
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs font-bold">
                              {getCategoryIcon(gasto.categoria)} {gasto.categoria}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300 font-semibold">{gasto.descripcion}</td>
                          <td className="px-4 py-3 text-right text-blue-400 font-semibold">{formatoMoneda(gasto.monto)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-lg">
                              {gasto.metodo_pago === 'EFECTIVO' && '💵'}
                              {gasto.metodo_pago === 'TRANSFERENCIA' && '🏦'}
                              {gasto.metodo_pago === 'TARJETA' && '💳'}
                              {gasto.metodo_pago === 'CHEQUE' && '✓'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{gasto.fecha_gasto}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: RESUMEN */}
        {tabActiva === 'resumen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categorías.map(cat => (
                <div key={cat} className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{getCategoryIcon(cat)}</span>
                    <div>
                      <p className="text-sm text-slate-400 font-bold">{cat}</p>
                      <p className="text-2xl font-black text-blue-400">{formatoMoneda(gastosCategoria[cat] || 0)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{gastos.filter(g => g.categoria === cat).length} gasto(s)</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}