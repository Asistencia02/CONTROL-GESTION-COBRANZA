import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useProductosKiosco } from '@renderer/hooks/useProductosKiosco'
import { formatoMoneda } from '@renderer/lib/helpers'
import { supabase } from '@renderer/lib/supabase'
import { Plus, Edit2, Trash2, AlertCircle, Package, DollarSign, TrendingUp, Lock, Settings, RefreshCw } from 'lucide-react'

interface FormData {
  nombre: string
  descripcion: string
  precio_unitario: string
  stock_actual: string
  stock_minimo: string
  categoria: string
}

interface ConfigCajaChica {
  saldo_minimo_caja_chica: number
}

type TabKioscoConfig = 'productos' | 'caja'

export const KioscoConfiguracionModerno: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { productos, agregarProducto, actualizarProducto, eliminarProducto, actualizarStock, totalStockValor, productosConStockBajo, loading } = useProductosKiosco(institucionActiva.id)

  const [tabActiva, setTabActiva] = useState<TabKioscoConfig>('productos')
  const [mostrando, setMostrando] = useState<'lista' | 'agregar' | 'editar'>('lista')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    descripcion: '',
    precio_unitario: '',
    stock_actual: '',
    stock_minimo: '5',
    categoria: 'Otros',
  })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const [configCaja, setConfigCaja] = useState<ConfigCajaChica>({ saldo_minimo_caja_chica: 5000 })
  const [cargandoCaja, setCargandoCaja] = useState(false)
  const [guardandoCaja, setGuardandoCaja] = useState(false)
  const [mensajeCaja, setMensajeCaja] = useState('')

  const categorias = ['Bebidas', 'Alimentos', 'Snacks', 'Postres', 'Otros']

  // Cargar configuración de caja chica
  useEffect(() => {
    cargarConfigCaja()
  }, [institucionActiva.id])

  const cargarConfigCaja = async () => {
    try {
      setCargandoCaja(true)
      const { data, error } = await supabase
        .from('instituciones')
        .select('saldo_minimo_caja_chica')
        .eq('id', institucionActiva.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) {
        setConfigCaja({ saldo_minimo_caja_chica: data.saldo_minimo_caja_chica || 5000 })
      }
    } catch (err) {
      console.error('Error cargando config caja:', err)
    } finally {
      setCargandoCaja(false)
    }
  }

  const guardarConfigCaja = async () => {
    try {
      setGuardandoCaja(true)
      const { error } = await supabase
        .from('instituciones')
        .update({ saldo_minimo_caja_chica: configCaja.saldo_minimo_caja_chica })
        .eq('id', institucionActiva.id)

      if (error) throw error
      setMensajeCaja('✓ Configuración de Caja Chica guardada')
      setTimeout(() => setMensajeCaja(''), 3000)
    } catch (err) {
      setMensajeCaja('❌ Error guardando configuración')
    } finally {
      setGuardandoCaja(false)
    }
  }

  const handleAgregar = async () => {
    if (!formData.nombre || !formData.precio_unitario || !formData.stock_actual) {
      setMensaje('❌ Completa los campos requeridos')
      return
    }

    setGuardando(true)
    try {
      await agregarProducto({
        institucion_id: institucionActiva.id,
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        precio_unitario: parseFloat(formData.precio_unitario),
        stock_actual: parseInt(formData.stock_actual),
        stock_minimo: parseInt(formData.stock_minimo),
        categoria: formData.categoria,
        activo: true,
      })
      setMensaje(`✓ Producto agregado`)
      setFormData({ nombre: '', descripcion: '', precio_unitario: '', stock_actual: '', stock_minimo: '5', categoria: 'Otros' })
      setMostrando('lista')
      setTimeout(() => setMensaje(''), 3000)
    } catch (err) {
      setMensaje('❌ Error al agregar producto')
    } finally {
      setGuardando(false)
    }
  }

  const handleActualizar = async () => {
    if (!editandoId) return

    setGuardando(true)
    try {
      await actualizarProducto(editandoId, {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        precio_unitario: parseFloat(formData.precio_unitario),
        stock_actual: parseInt(formData.stock_actual),
        stock_minimo: parseInt(formData.stock_minimo),
        categoria: formData.categoria,
      })
      setMensaje(`✓ Producto actualizado`)
      setFormData({ nombre: '', descripcion: '', precio_unitario: '', stock_actual: '', stock_minimo: '5', categoria: 'Otros' })
      setMostrando('lista')
      setEditandoId(null)
      setTimeout(() => setMensaje(''), 3000)
    } catch (err) {
      setMensaje('❌ Error al actualizar producto')
    } finally {
      setGuardando(false)
    }
  }

  const iniciarEdicion = (producto: any) => {
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio_unitario: producto.precio_unitario.toString(),
      stock_actual: producto.stock_actual.toString(),
      stock_minimo: producto.stock_minimo.toString(),
      categoria: producto.categoria,
    })
    setEditandoId(producto.id)
    setMostrando('editar')
  }

  if (loading && productos.length === 0 && tabActiva === 'productos') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Package size={32} className="text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4 md:p-8">
      {/* HEADER */}
      <div className="mb-4 sm:mb-8 md:mb-12">
        <div className="flex items-center justify-between mb-8 flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg shadow-orange-500/50">
              <Settings size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                Configuración Kiosco
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">Productos y control de caja</p>
            </div>
          </div>
          <button
            onClick={() => {
              cargarConfigCaja()
              setMensaje('✓ Recargado')
              setTimeout(() => setMensaje(''), 2000)
            }}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-orange-400 transition-all"
          >
            <RefreshCw size={24} />
          </button>
        </div>

        {(mensaje || mensajeCaja) && (
          <div className={`p-4 rounded-lg border-l-4 mb-6 font-semibold flex items-center gap-2 text-xs sm:text-sm ${
            (mensaje.includes('✓') || mensajeCaja.includes('✓'))
              ? 'bg-green-500/20 border-green-500/50 text-green-400'
              : 'bg-red-500/20 border-red-500/50 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${(mensaje.includes('✓') || mensajeCaja.includes('✓')) ? 'bg-green-400' : 'bg-red-400'}`}></div>
            {mensaje || mensajeCaja}
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="mb-4 sm:mb-8 md:mb-12 -mx-2 sm:-mx-4 md:mx-0 px-2 sm:px-4 md:px-0">
        <div className="flex gap-2 p-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-x-auto scrollbar-hide">
          <button
            onClick={() => {
              setTabActiva('productos')
              setMostrando('lista')
            }}
            className={`px-4 sm:px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              tabActiva === 'productos'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package size={20} />
            Productos
          </button>
          <button
            onClick={() => setTabActiva('caja')}
            className={`px-4 sm:px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              tabActiva === 'caja'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock size={20} />
            Caja Chica
          </button>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* CONTENIDO */}
      <div className="transition-all duration-500">
        {/* TAB: PRODUCTOS */}
        {tabActiva === 'productos' && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-8 md:mb-12">
              <div className="p-3 sm:p-4 md:p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-orange-500/50 transition-all">
                <p className="text-xs text-slate-400 font-bold mb-1">Productos Activos</p>
                <p className="text-lg sm:text-xl md:text-2xl font-black text-orange-400">{productos.length}</p>
              </div>
              <div className="p-3 sm:p-4 md:p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-red-500/50 transition-all">
                <p className="text-xs text-slate-400 font-bold mb-1">Stock Bajo</p>
                <p className="text-lg sm:text-xl md:text-2xl font-black text-red-400">{productosConStockBajo.length}</p>
              </div>
              <div className="p-3 sm:p-4 md:p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-green-500/50 transition-all">
                <p className="text-xs text-slate-400 font-bold mb-1">Valor Total Stock</p>
                <p className="text-lg sm:text-xl md:text-2xl font-black text-green-400">{formatoMoneda(totalStockValor)}</p>
              </div>
            </div>

            {mostrando === 'lista' && (
              <>
                <button
                  onClick={() => {
                    setFormData({ nombre: '', descripcion: '', precio_unitario: '', stock_actual: '', stock_minimo: '5', categoria: 'Otros' })
                    setMostrando('agregar')
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg font-bold flex items-center gap-2 hover:from-orange-700 hover:to-amber-700 transition"
                >
                  <Plus size={20} />
                  Agregar Producto
                </button>

                <div className="p-4 sm:p-6 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-x-auto">
                  <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Productos Disponibles</h2>
                  {productos.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Package size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs sm:text-sm">No hay productos registrados</p>
                    </div>
                  ) : (
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-slate-900/50">
                        <tr>
                          <th className="px-2 sm:px-4 py-3 text-left text-slate-300 font-bold">Producto</th>
                          <th className="px-2 sm:px-4 py-3 text-left text-slate-300 font-bold hidden sm:table-cell">Categoría</th>
                          <th className="px-2 sm:px-4 py-3 text-right text-slate-300 font-bold">Precio</th>
                          <th className="px-2 sm:px-4 py-3 text-center text-slate-300 font-bold">Stock</th>
                          <th className="px-2 sm:px-4 py-3 text-center text-slate-300 font-bold hidden md:table-cell">Valor</th>
                          <th className="px-2 sm:px-4 py-3 text-center text-slate-300 font-bold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                        {productos.map(producto => {
                          const valor = producto.stock_actual * producto.precio_unitario
                          const alerta = producto.stock_actual <= producto.stock_minimo
                          return (
                            <tr key={producto.id} className={`hover:bg-slate-700/20 transition ${alerta ? 'bg-red-500/10' : ''}`}>
                              <td className="px-2 sm:px-4 py-3">
                                <div>
                                  <p className="font-bold text-white">{producto.nombre}</p>
                                  {producto.descripcion && <p className="text-xs text-slate-400">{producto.descripcion}</p>}
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-3 text-slate-400 hidden sm:table-cell">{producto.categoria}</td>
                              <td className="px-2 sm:px-4 py-3 text-right text-orange-400 font-bold">{formatoMoneda(producto.precio_unitario)}</td>
                              <td className="px-2 sm:px-4 py-3 text-center">
                                <span className={`px-2 sm:px-3 py-1 rounded font-bold text-xs ${
                                  alerta
                                    ? 'bg-red-500/30 text-red-300'
                                    : 'bg-green-500/30 text-green-300'
                                }`}>
                                  {producto.stock_actual}
                                  {alerta && ' ⚠️'}
                                </span>
                              </td>
                              <td className="px-2 sm:px-4 py-3 text-right text-green-400 font-bold hidden md:table-cell">{formatoMoneda(valor)}</td>
                              <td className="px-2 sm:px-4 py-3 text-center flex justify-center gap-1 sm:gap-2">
                                <button
                                  onClick={() => iniciarEdicion(producto)}
                                  className="p-1 hover:bg-blue-500/20 rounded text-blue-400 transition"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => eliminarProducto(producto.id)}
                                  className="p-1 hover:bg-red-500/20 rounded text-red-400 transition"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {(mostrando === 'agregar' || mostrando === 'editar') && (
              <div className="p-4 sm:p-6 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <h2 className="text-lg sm:text-xl font-bold text-white mb-4">{mostrando === 'agregar' ? 'Nuevo Producto' : 'Editar Producto'}</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Nombre *</label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Ej: Gaseosa 2L"
                        className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:border-orange-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Categoría</label>
                      <select
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white focus:border-orange-500/50 focus:outline-none"
                      >
                        {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Precio Unitario *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-2 text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.precio_unitario}
                          onChange={(e) => setFormData({ ...formData, precio_unitario: e.target.value })}
                          placeholder="0.00"
                          className="w-full pl-8 px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:border-orange-500/50 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Stock Actual *</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stock_actual}
                        onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                        placeholder="0"
                        className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:border-orange-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Stock Mínimo</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stock_minimo}
                        onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                        placeholder="5"
                        className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:border-orange-500/50 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Descripción</label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Detalles del producto..."
                      rows={2}
                      className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:border-orange-500/50 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={mostrando === 'agregar' ? handleAgregar : handleActualizar}
                      disabled={guardando}
                      className={`px-6 py-2 rounded font-bold text-white flex items-center gap-2 ${
                        guardando
                          ? 'bg-slate-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
                      }`}
                    >
                      {guardando ? 'Guardando...' : mostrando === 'agregar' ? 'Agregar' : 'Actualizar'}
                    </button>
                    <button
                      onClick={() => setMostrando('lista')}
                      className="px-6 py-2 bg-slate-700 text-white rounded font-bold hover:bg-slate-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: CAJA CHICA */}
        {tabActiva === 'caja' && (
          <div className="space-y-6">
            <div className="p-4 sm:p-6 md:p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Lock size={24} className="text-green-400" />
                </div>
                <h2 className="text-xl sm:text-xl sm:text-2xl font-bold text-white">Configuración de Caja Chica</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                <div className="p-4 sm:p-6 md:p-6 bg-slate-700/30 border border-green-500/50 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-3">Saldo Mínimo a Dejar en Caja</label>
                    <p className="text-xs text-slate-400 mb-3">
                      Este es el monto que permanecerá en la caja chica al cerrar. El resto se transferirá a caja grande.
                    </p>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={configCaja.saldo_minimo_caja_chica}
                        onChange={(e) => setConfigCaja({ saldo_minimo_caja_chica: parseInt(e.target.value) || 0 })}
                        className="w-full pl-8 px-4 py-3 bg-slate-700/50 border border-green-500/50 rounded-lg text-white text-lg font-bold focus:border-green-400 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  <button
                    onClick={guardarConfigCaja}
                    disabled={guardandoCaja}
                    className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 text-white transition ${
                      guardandoCaja
                        ? 'bg-slate-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/50'
                    }`}
                  >
                    <Settings size={20} />
                    {guardandoCaja ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>

                <div className="p-4 sm:p-6 md:p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h3 className="text-lg font-bold text-green-400 mb-4">ℹ️ Cómo funciona</h3>
                  <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-300">
                    <li className="flex gap-2">
                      <span className="text-green-400 font-bold flex-shrink-0">1.</span>
                      <span>Al abrir caja, estableces el saldo inicial</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-400 font-bold flex-shrink-0">2.</span>
                      <span>Registras ventas en efectivo durante el día</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-400 font-bold flex-shrink-0">3.</span>
                      <span>Al cerrar, se calcula: <strong>Monto a transferir = Saldo Final - Saldo Mínimo</strong></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-400 font-bold flex-shrink-0">4.</span>
                      <span>Se transfiere el monto a caja grande</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-400 font-bold flex-shrink-0">5.</span>
                      <span>Mañana abre caja con el saldo residual</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-amber-300">
                  <p className="font-bold mb-1">💡 Ejemplo:</p>
                  <p>Si configuras $5000 como saldo mínimo y cierras caja con $12000:</p>
                  <p className="font-bold mt-1">→ Se transfieren $7000 a caja grande</p>
                  <p>→ Mañana abre con saldo inicial de $5000</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default KioscoConfiguracionModerno



