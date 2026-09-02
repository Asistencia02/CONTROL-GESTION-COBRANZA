import React, { useState, useEffect } from 'react'
import { useAuth } from '@renderer/hooks/useAuth'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { Settings, Save, RefreshCw, AlertCircle, Lock } from 'lucide-react'

interface UsuarioConPermisos {
  id: number
  nombre_completo: string
  rol: string
  puede_cambiar_institucion: boolean
  permisos: { [key: string]: boolean }
  contrasenia: string
}

const MODULOS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'cobranzas', label: 'Cobranzas', icon: '💰' },
  { id: 'deudas', label: 'Deudas', icon: '⚠️' },
  { id: 'ventas', label: 'Ventas Insumos', icon: '🛍️' },
  { id: 'ventakiosco', label: 'Venta Kiosco', icon: '🛒' },
  { id: 'gastos', label: 'Gastos', icon: '📉' },
  { id: 'reportes', label: 'Reportes', icon: '📈' },
  { id: 'cierre', label: 'Cierre', icon: '🔒' },
  { id: 'kioscoconfig', label: 'Config. Kiosco', icon: '??' },
  { id: 'configuracion', label: 'Configuración', icon: '⚙️' },
  { id: 'sincronizacion', label: 'Sincronización', icon: '🔄' },
]

export const AdminPermisosModerno: React.FC = () => {
  const { usuarioActual, obtenerTodosLosUsuarios, obtenerPermisosUsuario, actualizarPermisosUsuario, obtenerInstitucionesUsuario, actualizarInstitucionesUsuario, actualizarPuedeCambiarInstitucion, actualizarContraseniaUsuario } = useAuth()
  const { instituciones } = useInstitucion()
  
  const [usuarios, setUsuarios] = useState<UsuarioConPermisos[]>([])
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UsuarioConPermisos | null>(null)
  const [institucionesSeleccionadas, setInstitucionesSeleccionadas] = useState<number[]>([])
  const [contraseniaTemp, setContraseniaTemp] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [cambios, setCambios] = useState<{ [key: string]: boolean }>({})
  const [cambiosInstituciones, setCambiosInstituciones] = useState(false)
  const [cambiosPuedeModificar, setCambiosPuedeModificar] = useState(false)
  const [cambiosContrasenia, setCambiosContrasenia] = useState(false)

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const cargarUsuarios = async () => {
    setLoading(true)
    try {
      const usuariosData = await obtenerTodosLosUsuarios()
      
      const usuariosConPermisos: UsuarioConPermisos[] = await Promise.all(
        usuariosData.map(async (u) => {
          if (u.rol === 'ADMIN') {
            const permisos: { [key: string]: boolean } = {}
            MODULOS.forEach(m => {
              permisos[m.id] = true
            })
            return { ...u, permisos, contrasenia: '' }
          } else {
            const permisosData = await obtenerPermisosUsuario(u.id)
            const permisos: { [key: string]: boolean } = {}
            MODULOS.forEach(m => {
              const p = permisosData.find(perm => perm.modulo === m.id)
              permisos[m.id] = p?.permitido || false
            })
            return { ...u, permisos, contrasenia: '' }
          }
        })
      )

      setUsuarios(usuariosConPermisos)
      if (usuariosConPermisos.length > 0) {
        setUsuarioSeleccionado(usuariosConPermisos[0])
        setCambios({})
        setContraseniaTemp('')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePermiso = (moduloId: string) => {
    if (!usuarioSeleccionado || usuarioSeleccionado.rol === 'ADMIN') return

    setCambios({
      ...cambios,
      [moduloId]: !usuarioSeleccionado.permisos[moduloId]
    })

    setUsuarioSeleccionado({
      ...usuarioSeleccionado,
      permisos: {
        ...usuarioSeleccionado.permisos,
        [moduloId]: !usuarioSeleccionado.permisos[moduloId]
      }
    })
  }

  const handleGuardarPuedeModificar = async () => {
    if (!usuarioSeleccionado || usuarioSeleccionado.rol === 'ADMIN') return

    setLoading(true)
    setMensaje('')
    try {
      const puede = usuarioSeleccionado.puede_cambiar_institucion || false
      console.log('Actualizando permiso de cambio para usuario:', usuarioSeleccionado.id, puede)
      
      const resultado = await actualizarPuedeCambiarInstitucion(usuarioSeleccionado.id, puede)
      
      if (resultado) {
        setMensaje('✓ Permiso actualizado correctamente')
        setCambiosPuedeModificar(false)
        
        setTimeout(async () => {
          await cargarUsuarios()
          setMensaje('')
        }, 1500)
      } else {
        setMensaje('❌ Error al guardar permiso')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGuardarInstituciones = async () => {
    if (!usuarioSeleccionado || usuarioSeleccionado.rol === 'ADMIN') return

    setLoading(true)
    setMensaje('')
    try {
      console.log('Guardando instituciones para usuario:', usuarioSeleccionado.id, institucionesSeleccionadas)
      
      const resultado = await actualizarInstitucionesUsuario(usuarioSeleccionado.id, institucionesSeleccionadas)
      
      if (resultado) {
        setMensaje('✓ Instituciones actualizadas correctamente')
        setCambiosInstituciones(false)
        
        setTimeout(async () => {
          await cargarUsuarios()
          setMensaje('')
        }, 1500)
      } else {
        setMensaje('❌ Error al guardar instituciones')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGuardarContrasenia = async () => {
    if (!usuarioSeleccionado) return
    if (!contraseniaTemp || contraseniaTemp.trim().length === 0) {
      setMensaje('❌ La contraseña no puede estar vacía')
      return
    }

    setLoading(true)
    setMensaje('')
    try {
      console.log('Actualizando contraseña para usuario:', usuarioSeleccionado.id)
      
      const resultado = await actualizarContraseniaUsuario(usuarioSeleccionado.id, contraseniaTemp)
      
      if (resultado) {
        setMensaje('✓ Contraseña actualizada correctamente')
        setCambiosContrasenia(false)
        setContraseniaTemp('')
        
        setTimeout(async () => {
          await cargarUsuarios()
          setMensaje('')
        }, 1500)
      } else {
        setMensaje('❌ Error al guardar contraseña')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGuardarPermisos = async () => {
    if (!usuarioSeleccionado || usuarioSeleccionado.rol === 'ADMIN') return

    setLoading(true)
    setMensaje('')
    try {
      const modulos = MODULOS.map(m => ({
        modulo: m.id,
        permitido: usuarioSeleccionado.permisos[m.id]
      }))

      console.log('Guardando permisos para usuario:', usuarioSeleccionado.id, modulos)
      
      const resultado = await actualizarPermisosUsuario(usuarioSeleccionado.id, modulos)
      
      if (resultado) {
        setMensaje('✓ Permisos actualizados correctamente')
        setCambios({})
        
        setTimeout(async () => {
          await cargarUsuarios()
          setMensaje('')
        }, 1500)
      } else {
        setMensaje('❌ Error al guardar permisos')
      }
    } finally {
      setLoading(false)
    }
  }

  if (usuarioActual?.rol !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h2>
          <p className="text-slate-400">Solo administradores pueden acceder a esta sección</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg shadow-purple-500/50">
              <Settings size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Gestión de Permisos
              </h1>
              <p className="text-slate-400 mt-1">Administra módulos, instituciones, permisos y contraseñas</p>
            </div>
          </div>
          <button
            onClick={cargarUsuarios}
            disabled={loading}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-purple-400 transition-all"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {mensaje && (
        <div className={`mb-6 p-4 rounded-lg border-l-4 ${
          mensaje.includes('✓')
            ? 'bg-green-500/20 border-green-500/50 text-green-400'
            : 'bg-red-500/20 border-red-500/50 text-red-400'
        }`}>
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
          <h2 className="text-lg font-bold text-white mb-4">Usuarios</h2>
          <div className="space-y-2">
            {usuarios.map(usuario => (
              <button
                key={usuario.id}
                onClick={async () => {
                  setUsuarioSeleccionado(usuario)
                  setCambios({})
                  const instits = await obtenerInstitucionesUsuario(usuario.id)
                  setInstitucionesSeleccionadas(instits)
                  setCambiosInstituciones(false)
                  setCambiosPuedeModificar(false)
                  setCambiosContrasenia(false)
                  setContraseniaTemp('')
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition ${
                  usuarioSeleccionado?.id === usuario.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{usuario.nombre_completo}</span>
                  <span className="text-xs px-2 py-1 bg-slate-600/50 rounded">
                    {usuario.rol === 'ADMIN' ? '👑' : '👤'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {usuarioSeleccionado ? (
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl space-y-6 max-h-[85vh] overflow-y-auto">
              <div>
                <h2 className="text-lg font-bold text-white mb-2">
                  {usuarioSeleccionado.nombre_completo}
                  {usuarioSeleccionado.rol === 'ADMIN' && <span className="ml-2 text-xs text-purple-400">(ADMINISTRADOR)</span>}
                </h2>
                {usuarioSeleccionado.rol === 'ADMIN' && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded text-purple-300 text-sm">
                    Los administradores tienen acceso a todos los módulos automáticamente.
                  </div>
                )}
              </div>

              {usuarioSeleccionado.rol !== 'ADMIN' && (
                <div className="p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usuarioSeleccionado.puede_cambiar_institucion || false}
                      onChange={() => {
                        setUsuarioSeleccionado({
                          ...usuarioSeleccionado,
                          puede_cambiar_institucion: !usuarioSeleccionado.puede_cambiar_institucion
                        })
                        setCambiosPuedeModificar(true)
                      }}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-white">Puede cambiar de institución</span>
                  </label>
                  <p className="text-xs text-slate-400 mt-2 ml-8">
                    Si está marcado, el usuario puede cambiar entre instituciones asignadas
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-white mb-3">Contraseña</h3>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={contraseniaTemp}
                    onChange={(e) => {
                      setContraseniaTemp(e.target.value)
                      setCambiosContrasenia(e.target.value !== '')
                    }}
                    placeholder="Nueva contraseña"
                    className="flex-1 px-4 py-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleGuardarContrasenia}
                    disabled={loading || !cambiosContrasenia}
                    className={`px-4 py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition ${
                      loading || !cambiosContrasenia
                        ? 'bg-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg shadow-red-500/50'
                    }`}
                  >
                    <Lock size={18} />
                    Guardar
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-3">Módulos Permitidos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {MODULOS.map(modulo => (
                    <button
                      key={modulo.id}
                      onClick={() => handleTogglePermiso(modulo.id)}
                      disabled={usuarioSeleccionado.rol === 'ADMIN' || loading}
                      className={`p-4 rounded-lg border-2 font-semibold transition ${
                        usuarioSeleccionado.permisos[modulo.id]
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-slate-600/50 bg-slate-700/30 text-slate-400 hover:border-slate-500'
                      } ${usuarioSeleccionado.rol === 'ADMIN' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                    >
                      <div className="text-2xl mb-1">{modulo.icon}</div>
                      <div className="text-xs">{modulo.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {usuarioSeleccionado.rol !== 'ADMIN' && (
                <div>
                  <h3 className="text-sm font-bold text-white mb-3">Instituciones Asignadas</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {instituciones && instituciones.length > 0 ? (
                      instituciones.map(inst => (
                        <label
                          key={inst.id}
                          className="flex items-center gap-2 p-3 bg-slate-700/30 border border-slate-600/50 rounded-lg hover:bg-slate-700/50 cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={institucionesSeleccionadas.includes(inst.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInstitucionesSeleccionadas([...institucionesSeleccionadas, inst.id])
                              } else {
                                setInstitucionesSeleccionadas(institucionesSeleccionadas.filter(id => id !== inst.id))
                              }
                              setCambiosInstituciones(true)
                            }}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm text-slate-300">{inst.nombre}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 col-span-2">Cargando instituciones...</p>
                    )}
                  </div>
                </div>
              )}

              {usuarioSeleccionado.rol !== 'ADMIN' && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleGuardarPuedeModificar}
                    disabled={loading || !cambiosPuedeModificar}
                    className={`flex-1 min-w-[200px] py-3 px-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition ${
                      loading || !cambiosPuedeModificar
                        ? 'bg-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg shadow-amber-500/50'
                    }`}
                  >
                    <Save size={20} />
                    Guardar Permiso
                  </button>

                  <button
                    onClick={handleGuardarPermisos}
                    disabled={loading || Object.keys(cambios).length === 0}
                    className={`flex-1 min-w-[200px] py-3 px-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition ${
                      loading || Object.keys(cambios).length === 0
                        ? 'bg-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/50'
                    }`}
                  >
                    <Save size={20} />
                    Guardar Módulos
                  </button>

                  <button
                    onClick={handleGuardarInstituciones}
                    disabled={loading || !cambiosInstituciones}
                    className={`flex-1 min-w-[200px] py-3 px-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition ${
                      loading || !cambiosInstituciones
                        ? 'bg-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/50'
                    }`}
                  >
                    <Save size={20} />
                    Guardar Instituciones
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl text-center">
              <p className="text-slate-400">Selecciona un usuario para ver sus permisos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



