import React, { useState } from 'react'
import { useAuth } from '@renderer/hooks/useAuth'
import { LogIn, AlertCircle } from 'lucide-react'

export const LoginModerno: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const { login, loading, error } = useAuth()
  
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [contraseña, setContraseña] = useState('')
  const [mensaje, setMensaje] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensaje('')

    if (!nombreCompleto.trim() || !contraseña.trim()) {
      setMensaje('Por favor completa todos los campos')
      return
    }

    const exitoso = await login(nombreCompleto, contraseña)
    if (exitoso) {
      setMensaje('✓ Ingreso exitoso')
      setTimeout(() => onLoginSuccess(), 500)
    } else {
      setMensaje('❌ Usuario o contraseña incorrectos')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* TARJETA LOGIN */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-8">
          {/* HEADER */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/50">
                <LogIn size={32} className="text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Gestión de Cobranzas
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Sistema de Control Institucional</p>
          </div>

          {/* MENSAJES */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          
          {mensaje && (
            <div className={`mb-6 p-3 rounded-lg text-sm flex items-center gap-2 ${
              mensaje.includes('✓')
                ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                : 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400'
            }`}>
              {mensaje}
            </div>
          )}

          {/* FORMULARIO */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Usuario */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Usuario</label>
              <input
                type="text"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                placeholder="Selecciona tu usuario"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none transition"
                disabled={loading}
              />
              <div className="mt-2 text-xs text-slate-400">
                <p className="font-semibold mb-1">Usuarios disponibles:</p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    'FATIMA MEDINA',
                    'HUGO DUARTE',
                    'ALCIDES JARA',
                    'YOLI MEDINA',
                    'PROVEDURIA',
                    'KIOSCO',
                    'ADMIN'
                  ].map(user => (
                    <button
                      key={user}
                      type="button"
                      onClick={() => setNombreCompleto(user)}
                      className="text-left px-2 py-1 bg-slate-600/30 hover:bg-slate-600/50 rounded text-slate-300 hover:text-slate-100 transition text-xs"
                    >
                      {user}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Contraseña</label>
              <input
                type="password"
                value={contraseña}
                onChange={(e) => setContraseña(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none transition"
                disabled={loading}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin(e as any)}
              />
              <p className="text-xs text-slate-500 mt-1">Por favor ingresa tu contraseña</p>
            </div>

            {/* BOTÓN */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition ${
                loading
                  ? 'bg-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/50'
              }`}
            >
              <LogIn size={20} />
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          {/* FOOTER */}
          <p className="text-center text-xs text-slate-500 mt-6 border-t border-slate-700/50 pt-6">
            Sistema protegido. Todos los accesos son registrados.
          </p>
        </div>
      </div>
    </div>
  )
}
