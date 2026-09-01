import React, { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, Upload, Search, AlertCircle } from 'lucide-react'
import { formatoMoneda } from '@renderer/lib/helpers'
import type { Insumo } from '@renderer/lib/database.types'

interface TablaInsumosProps {
  insumos: Insumo[]
  loading?: boolean
  onAgregar?: () => void
  onEditar?: (insumo: Insumo) => void
  onEliminar?: (insumo_id: number) => Promise<void>
  onActualizarStock?: (insumo_id: number, nuevaCantidad: number) => Promise<void>
  onAgregarCategoria?: (nombre: string) => Promise<void>
}

export const TablaInsumos: React.FC<TablaInsumosProps> = ({
  insumos,
  loading = false,
  onAgregar,
  onEditar,
  onEliminar,
  onActualizarStock,
  onAgregarCategoria,
}) => {
  const [busqueda, setBusqueda] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [editandoStock, setEditandoStock] = useState<{ id: number; valor: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [agregandonuevaCat, setAgregandonuevaCat] = useState(false)

  // Extraer categorías únicas
  const categorias = useMemo(() => {
    return [...new Set(insumos.map((i) => i.categoria).filter(Boolean))].sort()
  }, [insumos])

  // Filtrar insumos
  const insumosFiltrados = useMemo(() => {
    return insumos.filter((insumo) => {
      const coincideBusqueda = insumo.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        insumo.codigo_sku.toLowerCase().includes(busqueda.toLowerCase())

      const coincideCategoria = !filtroCategoria || insumo.categoria === filtroCategoria

      return coincideBusqueda && coincideCategoria
    })
  }, [insumos, busqueda, filtroCategoria])

  // Cálculos
  const resumen = useMemo(() => {
    const total = insumosFiltrados.reduce((sum, i) => sum + i.precio_unitario * i.cantidad_stock, 0)
    const bajoStock = insumosFiltrados.filter((i) => i.cantidad_stock < i.cantidad_minima).length

    return { total, bajoStock }
  }, [insumosFiltrados])

  const handleActualizarStock = async (insumo_id: number, nuevaCantidad: number) => {
    if (!onActualizarStock) return

    setGuardando(true)
    try {
      await onActualizarStock(insumo_id, nuevaCantidad)
      setEditandoStock(null)
    } catch (err) {
      console.error('Error actualizando stock:', err)
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (insumo_id: number) => {
    if (!onEliminar) return
    if (!confirm('¿Eliminar este insumo?')) return

    try {
      await onEliminar(insumo_id)
    } catch (err) {
      console.error('Error eliminando insumo:', err)
    }
  }

  const handleAgregarCategoria = async () => {
    if (!nuevaCategoria.trim() || !onAgregarCategoria) return
    
    setAgregandonuevaCat(true)
    try {
      await onAgregarCategoria(nuevaCategoria.trim())
      setNuevaCategoria('')
    } catch (err) {
      console.error('Error agregando categoría:', err)
    } finally {
      setAgregandonuevaCat(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* RESUMEN */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">Total Insumos</p>
          <p className="text-2xl font-bold text-blue-900">{insumosFiltrados.length}</p>
          <p className="text-xs text-blue-600 mt-1">productos</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-700">Valor Total Stock</p>
          <p className="text-2xl font-bold text-purple-900">{formatoMoneda(resumen.total)}</p>
          <p className="text-xs text-purple-600 mt-1">en inventario</p>
        </div>
        <div className={`rounded-lg p-4 border ${
          resumen.bajoStock > 0
            ? 'bg-orange-50 border-orange-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <p className={`text-sm ${resumen.bajoStock > 0 ? 'text-orange-700' : 'text-green-700'}`}>
            Stock Bajo
          </p>
          <p className={`text-2xl font-bold ${resumen.bajoStock > 0 ? 'text-orange-900' : 'text-green-900'}`}>
            {resumen.bajoStock}
          </p>
          <p className={`text-xs ${resumen.bajoStock > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            productos
          </p>
        </div>
      </div>

      {/* Input para nueva categoría */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Crear Nueva Categoría</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nombre de la categoría..."
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAgregarCategoria()
              }
            }}
            disabled={agregandonuevaCat}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
          />
          <button
            onClick={handleAgregarCategoria}
            disabled={!nuevaCategoria.trim() || agregandonuevaCat}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-semibold flex items-center gap-2 transition"
          >
            <Plus size={18} />
            {agregandonuevaCat ? 'Agregando...' : 'Agregar'}
          </button>
        </div>
      </div>

      {/* FILTROS Y BOTÓN */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Nombre o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onAgregar}
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold flex items-center gap-2 transition"
        >
          <Plus size={18} />
          Agregar Insumo
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Código SKU</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Nombre</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Categoría</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Precio Unit.</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Stock</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Mínimo</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Valor Stock</th>
                <th className="px-6 py-3 text-center font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Cargando insumos...
                  </td>
                </tr>
              ) : insumosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No hay insumos registrados
                  </td>
                </tr>
              ) : (
                insumosFiltrados.map((insumo) => {
                  const bajoStock = insumo.cantidad_stock < insumo.cantidad_minima
                  const editando = editandoStock?.id === insumo.id

                  return (
                    <tr
                      key={insumo.id}
                      className={`border-b border-gray-200 hover:bg-gray-50 ${bajoStock ? 'bg-orange-50' : ''}`}
                    >
                      <td className="px-6 py-3 font-mono text-gray-700">{insumo.codigo_sku}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{insumo.nombre}</td>
                      <td className="px-6 py-3 text-gray-600">{insumo.categoria || '-'}</td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-900">
                        {formatoMoneda(insumo.precio_unitario)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {editando ? (
                          <input
                            type="number"
                            value={editandoStock.valor}
                            onChange={(e) =>
                              setEditandoStock({ id: insumo.id, valor: e.target.value })
                            }
                            disabled={guardando}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm disabled:bg-gray-100"
                          />
                        ) : (
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer ${
                              bajoStock
                                ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                            onClick={() =>
                              setEditandoStock({ id: insumo.id, valor: insumo.cantidad_stock.toString() })
                            }
                          >
                            {insumo.cantidad_stock}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center font-medium text-gray-700">
                        {insumo.cantidad_minima}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-gray-900">
                        {formatoMoneda(insumo.precio_unitario * insumo.cantidad_stock)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {editando ? (
                            <>
                              <button
                                onClick={() =>
                                  handleActualizarStock(insumo.id, parseInt(editandoStock.valor))
                                }
                                disabled={guardando}
                                className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-semibold disabled:bg-gray-100 transition"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={() => setEditandoStock(null)}
                                disabled={guardando}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold disabled:bg-gray-100 transition"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => onEditar?.(insumo)}
                                className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold transition"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleEliminar(insumo.id)}
                                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
