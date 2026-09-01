import React, { useState } from 'react'
import { X, Plus } from 'lucide-react'

interface ModalAgregarInsumoProps {
  isOpen: boolean
  onClose: () => void
  onAgregar: (insumo: {
    codigo_sku: string
    nombre: string
    descripcion?: string
    precio_unitario: number
    cantidad_stock: number
    cantidad_minima: number
    categoria?: string
  }) => Promise<void>
  categorias?: string[]
}

export const ModalAgregarInsumo: React.FC<ModalAgregarInsumoProps> = ({
  isOpen,
  onClose,
  onAgregar,
  categorias = [],
}) => {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    codigo_sku: '',
    nombre: '',
    descripcion: '',
    precio_unitario: '',
    cantidad_stock: '',
    cantidad_minima: '',
    categoria: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.codigo_sku.trim()) {
      setError('Código SKU es requerido')
      return
    }

    if (!formData.nombre.trim()) {
      setError('Nombre es requerido')
      return
    }

    if (!formData.precio_unitario || parseFloat(formData.precio_unitario) <= 0) {
      setError('Precio unitario debe ser mayor a 0')
      return
    }

    if (!formData.cantidad_stock || parseInt(formData.cantidad_stock) < 0) {
      setError('Cantidad de stock no puede ser negativa')
      return
    }

    if (!formData.cantidad_minima || parseInt(formData.cantidad_minima) < 0) {
      setError('Cantidad mínima no puede ser negativa')
      return
    }

    setCargando(true)
    try {
      await onAgregar({
        codigo_sku: formData.codigo_sku.trim(),
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        precio_unitario: parseFloat(formData.precio_unitario),
        cantidad_stock: parseInt(formData.cantidad_stock),
        cantidad_minima: parseInt(formData.cantidad_minima),
        categoria: formData.categoria.trim() || undefined,
      })

      setFormData({
        codigo_sku: '',
        nombre: '',
        descripcion: '',
        precio_unitario: '',
        cantidad_stock: '',
        cantidad_minima: '',
        categoria: '',
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar insumo')
    } finally {
      setCargando(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Agregar Insumo/Producto</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
            disabled={cargando}
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código SKU <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="codigo_sku"
              value={formData.codigo_sku}
              onChange={handleChange}
              placeholder="Ej: REM-001"
              disabled={cargando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Remera Institución"
              disabled={cargando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Descripción del producto (opcional)"
              rows={2}
              disabled={cargando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-none"
            />
          </div>

          {/* Precio y Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Unit. <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="precio_unitario"
                value={formData.precio_unitario}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={cargando}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Inicial <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="cantidad_stock"
                value={formData.cantidad_stock}
                onChange={handleChange}
                placeholder="0"
                min="0"
                disabled={cargando}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Cantidad Mínima y Categoría */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Mínimo <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="cantidad_minima"
                value={formData.cantidad_minima}
                onChange={handleChange}
                placeholder="10"
                min="0"
                disabled={cargando}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              {categorias.length > 0 ? (
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  disabled={cargando}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Nueva categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  placeholder="Ej: Remeras"
                  disabled={cargando}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:bg-gray-400"
            >
              <Plus size={18} />
              {cargando ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
