import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useGastos } from '@renderer/hooks/useGastos'
import { formatoMoneda } from '@renderer/lib/helpers'
import { Trash2, Plus } from 'lucide-react'

export const Gastos: React.FC = () => {
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

  useEffect(() => {
    cargarGastos(institucionActiva.id)
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
      setFormData({
        categoria: 'Servicios',
        descripcion: '',
        monto: '',
        metodo_pago: 'EFECTIVO'
      })

      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error registrando gasto:', error)
      alert('Error al registrar gasto')
    } finally {
      setRegistrando(false)
    }
  }

  const getCategoryColor = (categoria: string): string => {
    const colores: Record<string, string> = {
      Limpieza: 'bg-blue-100 text-blue-800',
      Librería: 'bg-purple-100 text-purple-800',
      Servicios: 'bg-yellow-100 text-yellow-800',
      Otros: 'bg-gray-100 text-gray-800'
    }
    return colores[categoria] || 'bg-gray-100 text-gray-800'
  }

  const getCategoryBgColor = (categoria: string): string => {
    const colores: Record<string, string> = {
      Limpieza: 'from-blue-50 to-blue-100',
      Librería: 'from-purple-50 to-purple-100',
      Servicios: 'from-yellow-50 to-yellow-100',
      Otros: 'from-gray-50 to-gray-100'
    }
    return colores[categoria] || 'from-gray-50 to-gray-100'
  }

  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0)
  const gastosCategoria = totalPorCategoria()

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Módulo de Gastos</h1>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Total General */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <p className="text-red-700 text-sm font-medium">Total Gastos</p>
          <p className="text-2xl font-bold text-red-900 mt-1">{formatoMoneda(totalGastos)}</p>
        </div>

        {/* Por Categoría */}
        {['Limpieza', 'Librería', 'Servicios', 'Otros'].map(cat => (
          <div
            key={cat}
            className={`bg-gradient-to-br ${getCategoryBgColor(cat)} p-4 rounded-lg border border-gray-200`}
          >
            <p className="text-gray-700 text-sm font-medium">{cat}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {formatoMoneda(gastosCategoria[cat] || 0)}
            </p>
          </div>
        ))}
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Registrar Gasto</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Limpieza">🧹 Limpieza</option>
                <option value="Librería">📚 Librería</option>
                <option value="Servicios">🔧 Servicios</option>
                <option value="Otros">📦 Otros</option>
              </select>
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input
                type="number"
                step="0.01"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Detalle del gasto"
              rows={3}
            />
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
            <select
              value={formData.metodo_pago}
              onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="EFECTIVO">💵 Efectivo</option>
              <option value="TRANSFERENCIA">🏦 Transferencia</option>
              <option value="TARJETA">💳 Tarjeta</option>
              <option value="CHEQUE">✓ Cheque</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={registrando}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2 disabled:bg-gray-400"
          >
            <Plus size={20} />
            {registrando ? 'Registrando...' : 'Registrar Gasto'}
          </button>
        </form>
      </div>

      {/* Tabla de Gastos */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Historial de Gastos ({gastos.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Categoría</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Descripción</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Monto</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Método</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Cargando gastos...
                  </td>
                </tr>
              ) : gastos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No hay gastos registrados
                  </td>
                </tr>
              ) : (
                gastos.map(gasto => (
                  <tr key={gasto.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getCategoryColor(gasto.categoria)}`}>
                        {gasto.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{gasto.descripcion}</td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      {formatoMoneda(gasto.monto)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {gasto.metodo_pago === 'EFECTIVO' && '💵'}
                      {gasto.metodo_pago === 'TRANSFERENCIA' && '🏦'}
                      {gasto.metodo_pago === 'TARJETA' && '💳'}
                      {gasto.metodo_pago === 'CHEQUE' && '✓'}
                      {' '}{gasto.metodo_pago || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">{gasto.fecha_gasto}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
