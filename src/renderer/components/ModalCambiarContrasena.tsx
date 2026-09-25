import React, { useState } from 'react'
import { X, Lock, Eye, EyeOff } from 'lucide-react'

interface ModalCambiarContrasenaProps {
  isOpen: boolean
  onClose: () => void
  onCambiar: (contraseniaActual: string, contrasenianueva: string) => Promise<boolean>
  loading?: boolean
  error?: string
}

export const ModalCambiarContrasena: React.FC<ModalCambiarContrasenaProps> = ({
  isOpen,
  onClose,
  onCambiar,
  loading = false,
  error = ''
}) => {
  const [contraseniaActual, setContraseniaActual] = useState('')
  const [contrasenianueva, setContrasenianueva] = useState('')
  const [confirmarContrasenia, setConfirmarContrasenia] = useState('')
  const [errorLocal, setErrorLocal] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [mostrarContrasenias, setMostrarContrasenias] = useState({
    actual: false,
    nueva: false,
    confirmar: false
  })

  const handleCambiar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorLocal('')

    // Validaciones
    if (!contraseniaActual.trim()) {
      setErrorLocal('Ingresa tu contraseña actual')
      return
    }

    if (!contrasenianueva.trim()) {
      setErrorLocal('Ingresa una nueva contraseña')
      return
    }

    if (!confirmarContrasenia.trim()) {
      setErrorLocal('Confirma tu nueva contraseña')
      return
    }

    if (contrasenianueva !== confirmarContrasenia) {
      setErrorLocal('Las contraseñas no coinciden')
      return
    }

    if (contrasenianueva.length < 6) {
      setErrorLocal('La contraseña debe tener mínimo 6 caracteres')
      return
    }

    if (contraseniaActual === contrasenianueva) {
      setErrorLocal('La nueva contraseña debe ser diferente a la actual')
      return
    }

    setProcesando(true)
    try {
      const resultado = await onCambiar(contraseniaActual, contrasenianueva)
      if (resultado) {
        setContraseniaActual('')
        setContrasenianueva('')
        setConfirmarContrasenia('')
        setErrorLocal('')
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } finally {
      setProcesando(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Lock size={24} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Cambiar Contraseña</h2>
          </div>
          <button
            onClick={onClose}
            disabled={procesando}
            className="text-gray-500 hover:text-gray-700 transition disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Errores */}
        {(errorLocal || error) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {errorLocal || error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleCambiar} className="space-y-4">
          {/* Contraseña Actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña Actual <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={mostrarContrasenias.actual ? 'text' : 'password'}
                value={contraseniaActual}
                onChange={(e) => {
                  setContraseniaActual(e.target.value)
                  setErrorLocal('')
                }}
                disabled={procesando}
                placeholder="Ingresa tu contraseña actual"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={() => setMostrarContrasenias({ ...mostrarContrasenias, actual: !mostrarContrasenias.actual })}
                disabled={procesando}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {mostrarContrasenias.actual ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={mostrarContrasenias.nueva ? 'text' : 'password'}
                value={contrasenianueva}
                onChange={(e) => {
                  setContrasenianueva(e.target.value)
                  setErrorLocal('')
                }}
                disabled={procesando}
                placeholder="Crea una nueva contraseña"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={() => setMostrarContrasenias({ ...mostrarContrasenias, nueva: !mostrarContrasenias.nueva })}
                disabled={procesando}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {mostrarContrasenias.nueva ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Nueva Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={mostrarContrasenias.confirmar ? 'text' : 'password'}
                value={confirmarContrasenia}
                onChange={(e) => {
                  setConfirmarContrasenia(e.target.value)
                  setErrorLocal('')
                }}
                disabled={procesando}
                placeholder="Confirma tu nueva contraseña"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <button
                type="button"
                onClick={() => setMostrarContrasenias({ ...mostrarContrasenias, confirmar: !mostrarContrasenias.confirmar })}
                disabled={procesando}
                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {mostrarContrasenias.confirmar ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={procesando}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:bg-gray-100 disabled:text-gray-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:bg-gray-400"
            >
              <Lock size={18} />
              {procesando ? 'Procesando...' : 'Cambiar Contraseña'}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700">
            💡 Tu contraseña será encriptada de forma segura en la base de datos.
          </p>
        </div>
      </div>
    </div>
  )
}
