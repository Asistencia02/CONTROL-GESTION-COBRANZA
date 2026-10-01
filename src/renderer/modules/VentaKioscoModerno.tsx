import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useVentaKiosco } from '@renderer/hooks/useVentaKiosco'
import { useProductosKiosco } from '@renderer/hooks/useProductosKiosco'
import { useFiados } from '@renderer/hooks/useFiados'
import { formatoMoneda } from '@renderer/lib/helpers'
import { ShoppingBag, Plus, TrendingUp, DollarSign, RefreshCw, AlertCircle, Lock, Unlock, History, Vault, Users, CreditCard, Trash2, ShoppingCart } from 'lucide-react'
import { supabase } from '@renderer/lib/supabase'

type TabVentaKiosco = 'registro' | 'historial' | 'caja' | 'cierres' | 'cajagrande' | 'resumen' | 'fiados'

interface ItemCarrito {
  id: string
  producto_id: number
  nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export const VentaKioscoModerno: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { ventasKiosco, cajaChica, cierresCaja, cajaGrande, cargarVentasKiosco, cargarCajaChicaActiva, cargarCierresCaja, cargarCajaGrande, abrirCajaChica, cerrarCajaChica, agregarVentaKiosco, totalVentasKiosco, totalEfectivo, totalCajaGrande, loading } = useVentaKiosco(institucionActiva.id)

  const { productos, cargarProductos, actualizarStock } = useProductosKiosco(institucionActiva.id)
  const { fiados, cargarFiados, agregarCompraFiada, pagarFiado, obtenerOCrearFiado } = useFiados(institucionActiva.id)

  const [formData, setFormData] = useState({
    producto_id: 0,
    cantidad: 1,
    metodo_pago: 'EFECTIVO' as 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'CHEQUE' | 'A_CUENTA',
    monto_entregado: 0,
    fiado_id: 0 as number | null,
    nuevo_fiado_nombre: '',
    nuevo_fiado_apellido: '',
  })

  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [saldoMinimoCaja, setSaldoMinimoCaja] = useState(5000)
  const [cajaAbriendo, setCajaAbriendo] = useState(false)
  const [cajaCerrando, setCajaCerrando] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [tabActiva, setTabActiva] = useState<TabVentaKiosco>('registro')
  const [fiadoSeleccionado, setFiadoSeleccionado] = useState<number | null>(null)
  const [pagandoFiado, setPagandoFiado] = useState(false)
  const [montoPago, setMontoPago] = useState(0)

  const productoSeleccionado = productos.find(p => p.id === formData.producto_id)
  const subtotalProducto = formData.cantidad * (productoSeleccionado?.precio_unitario || 0)
  const cambio = Math.max(0, formData.monto_entregado - subtotalProducto)
  const saldoActualCaja = cajaChica ? cajaChica.saldo_inicial + totalEfectivo : 0

  const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0)
  const cambioCarrito = Math.max(0, formData.monto_entregado - totalCarrito)
  const totalFiadosPendientes = fiados.filter(f => f.estado === 'activo').reduce((sum, f) => sum + f.monto_total_fiado, 0)

  useEffect(() => {
    cargarFiados()
  }, [institucionActiva.id])

  const handleAbrirCaja = async () => {
    setCajaAbriendo(true)
    try {
      await abrirCajaChica(institucionActiva.id, saldoMinimoCaja)
      await cargarCajaChicaActiva(institucionActiva.id)
      setSuccessMessage('✓ Caja abierta')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error abriendo caja')
    } finally {
      setCajaAbriendo(false)
    }
  }

  const handleCerrarCaja = async () => {
    if (!cajaChica) return
    setCajaCerrando(true)
    try {
      await cerrarCajaChica(cajaChica.id, saldoActualCaja, saldoMinimoCaja)
      await cargarCajaChicaActiva(institucionActiva.id)
      setSuccessMessage('✓ Caja cerrada y transferencia a caja grande registrada')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error cerrando caja')
    } finally {
      setCajaCerrando(false)
    }
  }

  const agregarAlCarrito = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!formData.producto_id || formData.cantidad <= 0) {
      setErrorMessage('Por favor selecciona un producto y cantidad válida')
      return
    }

    if (!productoSeleccionado) {
      setErrorMessage('Producto no encontrado')
      return
    }

    if (formData.cantidad > productoSeleccionado.stock_actual) {
      setErrorMessage(`Stock insuficiente. Disponible: ${productoSeleccionado.stock_actual}`)
      return
    }

    // Verificar si el producto ya está en el carrito
    const itemExistente = carrito.find(item => item.producto_id === formData.producto_id)
    
    if (itemExistente) {
      const cantidadTotal = itemExistente.cantidad + formData.cantidad
      if (cantidadTotal > productoSeleccionado.stock_actual) {
        setErrorMessage(`Cantidad total excede el stock disponible (${productoSeleccionado.stock_actual})`)
        return
      }
      
      // Actualizar cantidad si ya existe
      setCarrito(carrito.map(item =>
        item.producto_id === formData.producto_id
          ? {
              ...item,
              cantidad: cantidadTotal,
              subtotal: cantidadTotal * item.precio_unitario,
            }
          : item
      ))
    } else {
      // Agregar nuevo producto al carrito
      setCarrito([
        ...carrito,
        {
          id: Math.random().toString(),
          producto_id: formData.producto_id,
          nombre: productoSeleccionado.nombre,
          cantidad: formData.cantidad,
          precio_unitario: productoSeleccionado.precio_unitario,
          subtotal: subtotalProducto,
        },
      ])
    }

    setSuccessMessage(`✓ ${productoSeleccionado.nombre} agregado al carrito`)
    setFormData({
      producto_id: 0,
      cantidad: 1,
      metodo_pago: 'EFECTIVO',
      monto_entregado: 0,
      fiado_id: 0,
      nuevo_fiado_nombre: '',
      nuevo_fiado_apellido: '',
    })
    setTimeout(() => setSuccessMessage(''), 2000)
  }

  const eliminarDelCarrito = (id: string) => {
    setCarrito(carrito.filter(item => item.id !== id))
  }

  const limpiarCarrito = () => {
    setCarrito([])
    setFormData({
      producto_id: 0,
      cantidad: 1,
      metodo_pago: 'EFECTIVO',
      monto_entregado: 0,
      fiado_id: 0,
      nuevo_fiado_nombre: '',
      nuevo_fiado_apellido: '',
    })
  }

  const registrarVentaCarrito = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (carrito.length === 0) {
      setErrorMessage('El carrito está vacío')
      return
    }

    if (formData.metodo_pago === 'EFECTIVO' && formData.monto_entregado < totalCarrito) {
      setErrorMessage('El monto entregado debe ser mayor o igual al total')
      return
    }

    if (formData.metodo_pago === 'A_CUENTA') {
      if (!formData.fiado_id && (!formData.nuevo_fiado_nombre || !formData.nuevo_fiado_apellido)) {
        setErrorMessage('Selecciona un cliente o ingresa nombre y apellido')
        return
      }
    }

    setRegistrando(true)
    try {
      let fiadoIdParaUsar: number | null = null

      if (formData.metodo_pago === 'A_CUENTA') {
        fiadoIdParaUsar = formData.fiado_id
        if (!fiadoIdParaUsar) {
          const nuevoFiado = await obtenerOCrearFiado(formData.nuevo_fiado_nombre, formData.nuevo_fiado_apellido)
          fiadoIdParaUsar = nuevoFiado.id
        }
      }

      // Registrar cada producto del carrito como venta individual
      for (const item of carrito) {
        if (formData.metodo_pago === 'A_CUENTA' && fiadoIdParaUsar) {
          await agregarCompraFiada(fiadoIdParaUsar, item.subtotal, `${item.nombre} x${item.cantidad}`)
        }

        await agregarVentaKiosco({
          institucion_id: institucionActiva.id,
          producto: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
          metodo_pago: formData.metodo_pago === 'A_CUENTA' ? 'EFECTIVO' : formData.metodo_pago,
          monto_entregado: formData.metodo_pago === 'EFECTIVO' ? formData.monto_entregado : undefined,
          cambio: formData.metodo_pago === 'EFECTIVO' ? cambioCarrito : undefined,
          caja_chica_id: cajaChica?.id,
          fecha_venta: new Date().toISOString().split('T')[0],
        })

        // Actualizar stock
        const nuevoStock = (productoSeleccionado?.stock_actual || 0) - item.cantidad
        await actualizarStock(item.producto_id, nuevoStock)
      }

      await cargarProductos(institucionActiva.id)
      setSuccessMessage(`✓ Venta registrada: ${carrito.length} producto(s)`)
      limpiarCarrito()
      await cargarVentasKiosco(institucionActiva.id)
      await cargarFiados()
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error registrando venta:', error)
      setErrorMessage('Error al registrar venta')
    } finally {
      setRegistrando(false)
    }
  }

  const handlePagarFiado = async () => {
    if (!fiadoSeleccionado || montoPago <= 0) {
      setErrorMessage('Ingresa un monto válido')
      return
    }

    const fiado = fiados.find(f => f.id === fiadoSeleccionado)
    if (!fiado || montoPago > fiado.monto_total_fiado) {
      setErrorMessage('El monto no puede ser mayor a lo adeudado')
      return
    }

    setPagandoFiado(true)
    try {
      await pagarFiado(fiadoSeleccionado, montoPago)
      setSuccessMessage(`✓ Pago registrado: ${formatoMoneda(montoPago)}`)
      setMontoPago(0)
      setFiadoSeleccionado(null)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al registrar pago')
    } finally {
      setPagandoFiado(false)
    }
  }

  const totalVentasHoy = ventasKiosco
    .filter(v => v.fecha_venta === new Date().toISOString().split('T')[0])
    .reduce((sum, v) => sum + v.subtotal, 0)

  const cantidadProductosVendidos = ventasKiosco.reduce((sum, v) => sum + v.cantidad, 0)

  if (loading && ventasKiosco.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl mb-4 border border-orange-500/50">
            <ShoppingBag size={32} className="text-orange-400 animate-spin" />
          </div>
          <p className="text-slate-400 font-semibold">Cargando ventas de kiosco...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4 md:p-8">
      {/* HEADER */}
      <div className="mb-4 sm:mb-8 md:mb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg shadow-orange-500/50">
              <ShoppingBag size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                Venta Kiosco
              </h1>
              <p className="text-slate-400 mt-1">Registra ventas del kiosco escolar con control de caja</p>
            </div>
          </div>
          <button
            onClick={() => cargarVentasKiosco(institucionActiva.id)}
            disabled={loading}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-orange-400 transition-all duration-300"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* ESTADO CAJA CHICA */}
        <div className={`p-4 rounded-lg mb-6 border ${cajaChica ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {cajaChica ? <Unlock size={20} className="text-green-400" /> : <Lock size={20} className="text-red-400" />}
              <div>
                <p className="font-bold text-white">
                  {cajaChica ? '✓ Caja Abierta' : '✗ Caja Cerrada'}
                </p>
                {cajaChica && <p className="text-sm text-slate-300">Saldo actual: {formatoMoneda(saldoActualCaja)}</p>}
              </div>
            </div>
            <div className="flex gap-2">
              {!cajaChica ? (
                <button
                  onClick={handleAbrirCaja}
                  disabled={cajaAbriendo}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
                >
                  {cajaAbriendo ? 'Abriendo...' : 'Abrir Caja'}
                </button>
              ) : (
                <button
                  onClick={handleCerrarCaja}
                  disabled={cajaCerrando}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
                >
                  {cajaCerrando ? 'Cerrando...' : 'Cerrar Caja'}
                </button>
              )}
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg text-green-400 font-semibold flex items-center gap-2 mb-6">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-500/50 rounded-lg text-red-400 font-semibold flex items-center gap-2 mb-6">
            <AlertCircle size={20} />
            {errorMessage}
          </div>
        )}
      </div>

      {/* KPIs EN GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4 sm:mb-8 md:mb-12">
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-orange-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Vendido Hoy</p>
          <p className="text-2xl font-black text-orange-400">{formatoMoneda(totalVentasHoy)}</p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-amber-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Total Vendido</p>
          <p className="text-2xl font-black text-amber-400">{formatoMoneda(totalVentasKiosco)}</p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-yellow-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Unidades Vendidas</p>
          <p className="text-2xl font-black text-yellow-400">{cantidadProductosVendidos}</p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-blue-600/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">En Carrito</p>
          <p className="text-2xl font-black text-blue-400">{formatoMoneda(totalCarrito)}</p>
        </div>
      </div>

      {/* TABS */}
      <div className="mb-4 sm:mb-8 md:mb-12">
        <div className="flex gap-2 p-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl overflow-x-auto">
          <button
            onClick={() => setTabActiva('registro')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              tabActiva === 'registro'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus size={20} />
            Registrar
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              tabActiva === 'historial'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag size={20} />
            Historial ({ventasKiosco.length})
          </button>
          <button
            onClick={() => setTabActiva('fiados')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              tabActiva === 'fiados'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard size={20} />
            Fiados ({fiados.filter(f => f.estado === 'activo').length})
          </button>
          <button
            onClick={() => setTabActiva('caja')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              tabActiva === 'caja'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock size={20} />
            Caja
          </button>
          <button
            onClick={() => setTabActiva('cierres')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              tabActiva === 'cierres'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History size={20} />
            Cierres ({cierresCaja?.length || 0})
          </button>
          <button
            onClick={() => setTabActiva('cajagrande')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              tabActiva === 'cajagrande'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Vault size={20} />
            Caja Grande
          </button>
          <button
            onClick={() => setTabActiva('resumen')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              tabActiva === 'resumen'
      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp size={20} />
            Resumen
          </button>
        </div>
      </div>

      {/* CONTENIDO DINÁMICO */}
      <div className="transition-all duration-500">
        {/* TAB: REGISTRO */}
        {tabActiva === 'registro' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* FORMULARIO */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-orange-500/20 rounded-lg">
                    <Plus size={24} className="text-orange-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Agregar Productos</h2>
                </div>

                <form onSubmit={agregarAlCarrito} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Producto */}
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Producto</label>
                      <select
                        value={formData.producto_id}
                        onChange={(e) => setFormData({ ...formData, producto_id: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:border-orange-500/50 focus:outline-none transition"
                      >
                        <option value="0">Selecciona un producto...</option>
                        {productos.map(prod => (
                          <option key={prod.id} value={prod.id}>
                            {prod.nombre} - Stock: {prod.stock_actual}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cantidad */}
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        max={productoSeleccionado?.stock_actual || 1}
                        value={formData.cantidad}
                        onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-orange-500/50 focus:outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Información del Producto */}
                  {productoSeleccionado && (
                    <div className="p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Precio Unitario</p>
                          <p className="text-xl font-black text-orange-400">{formatoMoneda(productoSeleccionado.precio_unitario)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Categoría</p>
                          <p className="text-lg font-bold text-slate-300">{productoSeleccionado.categoria}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Subtotal</p>
                          <p className="text-xl font-black text-amber-400">{formatoMoneda(subtotalProducto)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Stock</p>
                          <p className={`text-lg font-bold ${productoSeleccionado.stock_actual <= productoSeleccionado.stock_minimo ? 'text-red-400' : 'text-green-400'}`}>
                            {productoSeleccionado.stock_actual}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!formData.producto_id || !productoSeleccionado || !cajaChica}
                    className={`w-full py-4 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition ${
                      !formData.producto_id || !productoSeleccionado || !cajaChica
                        ? 'bg-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/50'
                    }`}
                  >
                    <Plus size={20} />
                    {!cajaChica ? 'Abre caja' : 'Agregar al Carrito'}
                  </button>
                </form>
              </div>
            </div>

            {/* CARRITO */}
            <div className="space-y-6">
              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <ShoppingCart size={24} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Carrito</h2>
                    <p className="text-sm text-slate-400">{carrito.length} producto(s)</p>
                  </div>
                </div>

                {carrito.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart size={32} className="text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 font-semibold">Carrito vacío</p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    {carrito.map(item => (
                      <div key={item.id} className="p-3 bg-slate-700/30 border border-slate-600/50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-bold text-white text-sm">{item.nombre}</p>
                            <p className="text-xs text-slate-400">x{item.cantidad} @ {formatoMoneda(item.precio_unitario)}</p>
                          </div>
                          <button
                            onClick={() => eliminarDelCarrito(item.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-right font-bold text-amber-400">{formatoMoneda(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-slate-600/50 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-slate-400 font-bold">Total:</p>
                    <p className="text-2xl font-black text-amber-400">{formatoMoneda(totalCarrito)}</p>
                  </div>

                  {carrito.length > 0 && (
                    <button
                      onClick={limpiarCarrito}
                      className="w-full px-4 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg font-semibold transition border border-red-500/30"
                    >
                      Limpiar Carrito
                    </button>
                  )}
                </div>
              </div>

              {/* PAGO */}
              {carrito.length > 0 && (
                <form onSubmit={registrarVentaCarrito} className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl space-y-4">
                  <h3 className="text-lg font-bold text-white">Método de Pago</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { value: 'EFECTIVO', label: '💵 Efectivo' },
                      { value: 'TRANSFERENCIA', label: '🏦 Transf.' },
                      { value: 'TARJETA', label: '💳 Tarjeta' },
                      { value: 'CHEQUE', label: '✓ Cheque' },
                      { value: 'A_CUENTA', label: '📝 A Cuenta' },
                    ].map(opt => (
                      <label
                        key={opt.value}
                        className={`px-4 py-3 rounded-lg border-2 cursor-pointer font-semibold transition text-center ${
                          formData.metodo_pago === opt.value
                            ? 'border-orange-500 bg-orange-500/20 text-orange-300'
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

                  {/* CAMPOS DE A CUENTA */}
                  {formData.metodo_pago === 'A_CUENTA' && (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg space-y-3">
                      <select
                        value={formData.fiado_id || ''}
                        onChange={(e) => setFormData({ ...formData, fiado_id: e.target.value ? parseInt(e.target.value) : 0 })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-red-500/50 rounded-lg text-white focus:border-red-400/50 focus:outline-none transition text-sm"
                      >
                        <option value="">-- Seleccionar Cliente --</option>
                        {fiados.map(fiado => (
                          <option key={fiado.id} value={fiado.id}>
                            {fiado.apellido}, {fiado.nombre}
                          </option>
                        ))}
                      </select>

                      {!formData.fiado_id && (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Nombre"
                            value={formData.nuevo_fiado_nombre}
                            onChange={(e) => setFormData({ ...formData, nuevo_fiado_nombre: e.target.value })}
                            className="px-3 py-2 bg-slate-700/50 border border-red-500/50 rounded-lg text-white placeholder-slate-400 focus:border-red-400/50 focus:outline-none text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Apellido"
                            value={formData.nuevo_fiado_apellido}
                            onChange={(e) => setFormData({ ...formData, nuevo_fiado_apellido: e.target.value })}
                            className="px-3 py-2 bg-slate-700/50 border border-red-500/50 rounded-lg text-white placeholder-slate-400 focus:border-red-400/50 focus:outline-none text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* CAMPOS DE EFECTIVO */}
                  {formData.metodo_pago === 'EFECTIVO' && (
                    <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Total</p>
                          <p className="text-lg font-black text-amber-400">{formatoMoneda(totalCarrito)}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">Monto</label>
                          <input
                            type="number"
                            min={totalCarrito}
                            value={formData.monto_entregado || ''}
                            onChange={(e) => setFormData({ ...formData, monto_entregado: parseInt(e.target.value) || 0 })}
                            className="w-full px-2 py-1 bg-slate-700/50 border border-green-500/50 rounded-lg text-white text-center font-bold focus:outline-none text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Cambio</p>
                        <p className="text-lg font-black text-green-400">{formatoMoneda(cambioCarrito)}</p>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={registrando || !cajaChica}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition ${
                      registrando || !cajaChica
                        ? 'bg-slate-600 cursor-not-allowed opacity-50'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/50'
                    }`}
                  >
                    <ShoppingCart size={20} />
                    {registrando ? 'Registrando...' : 'Confirmar Venta'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB: HISTORIAL */}
        {tabActiva === 'historial' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-4">Historial de Ventas ({ventasKiosco.length})</h2>

              {ventasKiosco.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle size={32} className="text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400 font-semibold">No hay ventas registradas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-slate-300 font-bold">Producto</th>
                        <th className="px-4 py-3 text-center text-slate-300 font-bold">Cantidad</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-bold">P. Unitario</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-bold">Subtotal</th>
                        <th className="px-4 py-3 text-center text-slate-300 font-bold">Método</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-bold">Cambio</th>
                        <th className="px-4 py-3 text-left text-slate-300 font-bold">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {ventasKiosco.map(venta => (
                        <tr key={venta.id} className="hover:bg-slate-700/30 transition">
                          <td className="px-4 py-3 text-slate-300 font-semibold">{venta.producto}</td>
                          <td className="px-4 py-3 text-center text-slate-400">{venta.cantidad}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{formatoMoneda(venta.precio_unitario)}</td>
                          <td className="px-4 py-3 text-right text-orange-400 font-semibold">{formatoMoneda(venta.subtotal)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-lg">
                              {venta.metodo_pago === 'EFECTIVO' && '💵'}
                              {venta.metodo_pago === 'TRANSFERENCIA' && '🏦'}
                              {venta.metodo_pago === 'TARJETA' && '💳'}
                              {venta.metodo_pago === 'CHEQUE' && '✓'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-green-400 font-semibold">{venta.cambio ? formatoMoneda(venta.cambio) : '-'}</td>
                          <td className="px-4 py-3 text-slate-400">{venta.fecha_venta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: FIADOS */}
        {tabActiva === 'fiados' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <CreditCard size={24} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Gestión de Cuentas Fiadas</h2>
                  <p className="text-sm text-slate-400">Total pendiente: {formatoMoneda(totalFiadosPendientes)}</p>
                </div>
              </div>

              {fiados.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={32} className="text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400 font-semibold">No hay cuentas fiadas registradas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fiados.map(fiado => (
                    <div key={fiado.id} className={`p-4 rounded-lg border ${fiado.estado === 'activo' ? 'bg-red-500/10 border-red-500/50' : 'bg-green-500/10 border-green-500/50'}`}>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1">
                          <p className="font-bold text-white text-lg">{fiado.apellido}, {fiado.nombre}</p>
                          <p className="text-xs text-slate-400 mt-1">Desde: {fiado.fecha_inicio} • Última compra: {fiado.ultima_compra}</p>
                          <p className={`text-sm font-bold mt-2 ${fiado.estado === 'activo' ? 'text-red-400' : 'text-green-400'}`}>
                            {fiado.estado === 'activo' ? '🔴 Pendiente de pago' : '✓ Pagado'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 mb-1">Total Fiado</p>
                          <p className="text-2xl font-black text-red-400">{formatoMoneda(fiado.monto_total_fiado)}</p>
                        </div>
                      </div>

                      {fiado.estado === 'activo' && fiado.id === fiadoSeleccionado && (
                        <div className="mt-4 pt-4 border-t border-red-500/30 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-300 mb-2">Monto a Pagar</label>
                              <input
                                type="number"
                                max={fiado.monto_total_fiado}
                                value={montoPago || ''}
                                onChange={(e) => setMontoPago(parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 bg-slate-700/50 border border-red-500/50 rounded-lg text-white text-center font-bold focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-300 mb-2">Saldo Después</label>
                              <p className="text-2xl font-black text-green-400">{formatoMoneda(Math.max(0, fiado.monto_total_fiado - montoPago))}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setFiadoSeleccionado(null)}
                              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handlePagarFiado}
                              disabled={pagandoFiado || montoPago <= 0}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg font-semibold transition"
                            >
                              {pagandoFiado ? 'Registrando...' : 'Registrar Pago'}
                            </button>
                          </div>
                        </div>
                      )}

                      {fiado.estado === 'activo' && fiado.id !== fiadoSeleccionado && (
                        <button
                          onClick={() => {
                            setFiadoSeleccionado(fiado.id)
                            setMontoPago(0)
                          }}
                          className="mt-3 w-full px-4 py-2 bg-green-600/30 hover:bg-green-600/50 text-green-300 rounded-lg font-semibold transition border border-green-500/30"
                        >
                          💰 Registrar Pago
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CAJA CHICA - Simplificado */}
        {tabActiva === 'caja' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-6">Control de Caja Chica</h2>

              {cajaChica ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg">
                      <p className="text-xs text-slate-400 mb-2">Saldo Inicial</p>
                      <p className="text-3xl font-black text-blue-400">{formatoMoneda(cajaChica.saldo_inicial)}</p>
                    </div>
                    <div className="p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg">
                      <p className="text-xs text-slate-400 mb-2">Ventas en Efectivo</p>
                      <p className="text-3xl font-black text-orange-400">{formatoMoneda(totalEfectivo)}</p>
                    </div>
                    <div className="p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg">
                      <p className="text-xs text-slate-400 mb-2">Saldo Actual</p>
                      <p className="text-3xl font-black text-green-400">{formatoMoneda(saldoActualCaja)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/50 rounded-lg">
                      <p className="text-xs text-slate-400 mb-2">Saldo Mínimo a Dejar</p>
                      <input
                        type="number"
                        value={saldoMinimoCaja}
                        onChange={(e) => setSaldoMinimoCaja(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-amber-500/50 rounded-lg text-white text-center font-bold"
                      />
                    </div>
                    <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                      <p className="text-xs text-slate-400 mb-2">A Transferir a Caja Grande</p>
                      <p className="text-3xl font-black text-green-400">{formatoMoneda(Math.max(0, saldoActualCaja - saldoMinimoCaja))}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleCerrarCaja}
                    disabled={cajaCerrando}
                    className="w-full py-4 px-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-red-500/50"
                  >
                    {cajaCerrando ? 'Cerrando...' : '🔒 Cerrar Caja y Transferir'}
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Lock size={32} className="text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400 font-semibold mb-6">No hay caja abierta</p>
                  <button
                    onClick={handleAbrirCaja}
                    disabled={cajaAbriendo}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold transition"
                  >
                    {cajaAbriendo ? 'Abriendo...' : 'Abrir Caja'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CIERRES - Simplificado */}
        {tabActiva === 'cierres' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-4">Historial de Cierres ({cierresCaja?.length || 0})</h2>

              {!cierresCaja || cierresCaja.length === 0 ? (
                <div className="text-center py-12">
                  <History size={32} className="text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400 font-semibold">No hay cierres de caja registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-slate-300 font-bold">Fecha Apertura</th>
                        <th className="px-4 py-3 text-left text-slate-300 font-bold">Fecha Cierre</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-bold">Saldo Inicial</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-bold">Saldo Final</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-bold">Transferido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {cierresCaja.map(cierre => (
                        <tr key={cierre.id} className="hover:bg-slate-700/30 transition">
                          <td className="px-4 py-3 text-slate-300 font-semibold">{cierre.fecha_apertura}</td>
                          <td className="px-4 py-3 text-slate-300">{cierre.fecha_cierre || '-'}</td>
                          <td className="px-4 py-3 text-right text-blue-400 font-semibold">{formatoMoneda(cierre.saldo_inicial)}</td>
                          <td className="px-4 py-3 text-right text-orange-400 font-semibold">{cierre.saldo_final ? formatoMoneda(cierre.saldo_final) : '-'}</td>
                          <td className="px-4 py-3 text-right text-green-400 font-semibold">{cierre.monto_transferido ? formatoMoneda(cierre.monto_transferido) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CAJA GRANDE - Simplificado */}
        {tabActiva === 'cajagrande' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Vault size={24} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-bold">Total en Caja Grande</p>
                    <p className="text-3xl font-black text-purple-400">{formatoMoneda(totalCajaGrande || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <DollarSign size={24} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-bold">Promedio por Transferencia</p>
                    <p className="text-3xl font-black text-green-400">{cajaGrande && cajaGrande.length > 0 ? formatoMoneda((totalCajaGrande || 0) / cajaGrande.length) : '$0'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-4">Transferencias ({cajaGrande?.length || 0})</h2>

              {!cajaGrande || cajaGrande.length === 0 ? (
                <div className="text-center py-12">
                  <Vault size={32} className="text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400 font-semibold">No hay transferencias</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-slate-300 font-bold">Fecha</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-bold">Monto</th>
                        <th className="px-4 py-3 text-center text-slate-300 font-bold">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {cajaGrande.map(transfer => (
                        <tr key={transfer.id} className="hover:bg-slate-700/30 transition">
                          <td className="px-4 py-3 text-slate-300 font-semibold">{transfer.fecha_transferencia}</td>
                          <td className="px-4 py-3 text-right text-green-400 font-black text-lg">{formatoMoneda(transfer.monto)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-3 py-1 rounded bg-green-500/30 text-green-300 font-bold text-xs">
                              {transfer.estado}
                            </span>
                          </td>
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
              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-orange-500/20 rounded-lg">
                    <TrendingUp size={24} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-bold">Vendido Hoy</p>
                    <p className="text-2xl font-black text-orange-400">{formatoMoneda(totalVentasHoy)}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-amber-500/20 rounded-lg">
                    <DollarSign size={24} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-bold">Total Período</p>
                    <p className="text-2xl font-black text-amber-400">{formatoMoneda(totalVentasKiosco)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VentaKioscoModerno
