import React, { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { EstadoEstudiante } from '@renderer/lib/database.types'
import { supabase } from '@renderer/lib/supabase'

interface ModalAgregarEstudianteProps {
  isOpen: boolean
  onClose: () => void
  onAgregar: (estudiante: {
    dni: string
    nombre: string
    apellido: string
    carrera_id: number
    email: string | null
    telefono: string | null
    estado: string
    institucion_id: number
  }) => Promise<void>
  carreras: Array<{ id: number; nombre: string }>
  institucion_id: number
}

export const ModalAgregarEstudiante: React.FC<ModalAgregarEstudianteProps> = ({
  isOpen,
  onClose,
  onAgregar,
  carreras,
  institucion_id,
}) => {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    dni: '',
    nombre: '',
    apellido: '',
    carrera_id: '',
    email: '',
    telefono: '',
    estado: 'ACTIVO' as keyof typeof EstadoEstudiante,
  })

  const [mostrarOpcionesBeca, setMostrarOpcionesBeca] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError('')
  }

  const handleSelectEstado = (estado: keyof typeof EstadoEstudiante) => {
    setFormData((prev) => ({
      ...prev,
      estado,
    }))
    setMostrarOpcionesBeca(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!formData.dni.trim()) {
      setError('DNI es requerido')
      return
    }

    if (!formData.nombre.trim()) {
      setError('Nombre es requerido')
      return
    }

    if (!formData.apellido.trim()) {
      setError('Apellido es requerido')
      return
    }

    if (!formData.carrera_id) {
      setError('Carrera/Nivel es requerido')
      return
    }

    setCargando(true)
    try {
      await onAgregar({
        dni: formData.dni.trim(),
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        carrera_id: parseInt(formData.carrera_id),
        email: formData.email.trim() || null,
        telefono: formData.telefono.trim() || null,
        estado: formData.estado,
        institucion_id,
      })

      // Limpiar formulario
      setFormData({
        dni: '',
        nombre: '',
        apellido: '',
        carrera_id: '',
        email: '',
        telefono: '',
        estado: 'ACTIVO',
      })

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar estudiante')
    } finally {
      setCargando(false)
    }
  }

  if (!isOpen) return null

  const getEstadoLabel = (estado: keyof typeof EstadoEstudiante): string => {
    const labels: Record<keyof typeof EstadoEstudiante, string> = {
      ACTIVO: 'Activo',
      BECADO_100: 'Becado 100%',
      BECADO_50: 'Becado 50%',
      NO_VIENE_MAS: 'No viene más',
    }
    return labels[estado]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Agregar Estudiante</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
            disabled={cargando}
          >
            <X size={24} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* DNI */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DNI <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="dni"
              value={formData.dni}
              onChange={handleChange}
              placeholder="Ej: 12345678"
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
              placeholder="Ej: Juan"
              disabled={cargando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Apellido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Apellido <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              placeholder="Ej: Pérez"
              disabled={cargando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Carrera */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carrera/Nivel <span className="text-red-500">*</span>
            </label>
            <select
              name="carrera_id"
              value={formData.carrera_id}
              onChange={handleChange}
              disabled={cargando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Seleccionar carrera/nivel</option>
              {carreras.map((carrera) => (
                <option key={carrera.id} value={carrera.id}>
                  {carrera.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Ej: juan@mail.com"
              disabled={cargando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="Ej: 3624123456"
              disabled={cargando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMostrarOpcionesBeca(!mostrarOpcionesBeca)}
                disabled={cargando}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex justify-between items-center hover:bg-gray-50 disabled:bg-gray-100"
              >
                <span>{getEstadoLabel(formData.estado)}</span>
                <span className="text-gray-400">▼</span>
              </button>

              {mostrarOpcionesBeca && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  <button
                    type="button"
                    onClick={() => handleSelectEstado('ACTIVO')}
                    className="w-full px-4 py-2 text-left hover:bg-blue-50 text-sm border-b border-gray-200 last:border-b-0"
                  >
                    ✓ Activo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectEstado('BECADO_50')}
                    className="w-full px-4 py-2 text-left hover:bg-blue-50 text-sm border-b border-gray-200 last:border-b-0"
                  >
                    🎓 Becado 50%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectEstado('BECADO_100')}
                    className="w-full px-4 py-2 text-left hover:bg-blue-50 text-sm border-b border-gray-200 last:border-b-0"
                  >
                    🎓 Becado 100%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectEstado('NO_VIENE_MAS')}
                    className="w-full px-4 py-2 text-left hover:bg-blue-50 text-sm"
                  >
                    ✗ No viene más
                  </button>
                </div>
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
