import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useInsumos } from '@renderer/hooks/useInsumos'
import { useVentasInsumos } from '@renderer/hooks/useVentasInsumos'
import { formatoMoneda } from '@renderer/lib/helpers'
import { ShoppingCart, Plus, TrendingUp, Package, DollarSign, RefreshCw, X } from 'lucide-react'

interface Venta {
  id?: number
  insumo_id: number
  cantidad: number
  precio_unitario: number
  subtotal: number
  metodo_pago?: string
  numero_talonario?: string
  fecha_venta: string
  estado?: 'VENDIDO' | 'ANULADO'
}

type TabVenta = 'registro' | 'historial' | 'resumen'

export const VentasModerno: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { insumos } = useInsumos()
  const { ventas, cargarVentasInsumos, agregarVentaInsumo, anularVentaInsumo, loading } = useVentasInsumos()
  
  const [selectedInsumo, setSelectedInsumo] = useState<number | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [registrando, setRegistrando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [tabActiva, setTabActiva] = useState<TabVenta>('registro')

  // Cargar ventas al montar y cuando cambia la institución
  useEffect(() => {
    cargarVentasInsumos(institucionActiva.id)
  }, [institucionActiva.id, cargarVentasInsumos])

  const totalVentasHoy = ventas
    .filter(v => v.fecha_venta === new Date().toISOString().split('T')[0] && v.estado === 'VENDIDO')
    .reduce((sum, v) => sum + v.subtotal, 0)
  const totalVentasTotal = ventas
    .filter(v => v.estado === 'VENDIDO')
    .reduce((sum, v) => sum + v.subtotal, 0)
  const cantidadProductosVendidos = ventas
    .filter(v => v.estado === 'VENDIDO')
    .reduce((sum, v) => sum + v.cantidad, 0)
  const stockTotal = insumos.reduce((sum, i) => sum + i.cantidad_stock, 0)

  const handleRegistrarVenta = async () => {
    if (!selectedInsumo || cantidad <= 0) {
      setMensaje('❌ Selecciona insumo y cantidad válida')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setRegistrando(true)
    try {
      const insumo = insumos.find(i => i.id === selectedInsumo)
      if (!insumo) {
        setMensaje('❌ Insumo no encontrado')
        return
      }

      if (insumo.cantidad_stock < cantidad) {
        setMensaje('❌ Stock insuficiente')
        return
      }

      const subtotal = insumo.precio_unitario * cantidad

      // Guardar en Supabase
      const resultado = await agregarVentaInsumo({
        institucion_id: institucionActiva.id,
        insumo_id: selectedInsumo,
        cantidad,
        precio_unitario: insumo.precio_unitario,
        subtotal: subtotal,
        metodo_pago: metodoPago as 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'CHEQUE',
        fecha_venta: new Date().toISOString().split('T')[0],
        estado: 'VENDIDO'
      })

      if (resultado) {
        setMensaje(`✓ Venta registrada: ${insumo.nombre}`)
        setSelectedInsumo(null)
        setCantidad(1)
        setMetodoPago('EFECTIVO')
        await cargarVentasInsumos(institucionActiva.id)
      } else {
        setMensaje('❌ Error al registrar venta')
      }
      
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('❌ Error al registrar venta')
    } finally {
      setRegistrando(false)
    }
  }

  const handleAnularVenta = async (venta_id: number) => {
    if (!window.confirm('¿Deseas anular esta venta?')) return

    setRegistrando(true)
    try {
      const resultado = await anularVentaInsumo(venta_id, 'Anulación manual', 'Usuario')
      if (resultado) {
        setMensaje('✓ Venta anulada')
        await cargarVentasInsumos(institucionActiva.id)
      } else {
        setMensaje('❌ Error al anular venta')
      }
      setTimeout(() => setMensaje(''), 3000)
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4 md:p-8">
      {/* HEADER */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/50">
              <ShoppingCart size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Gestión de Ventas
              </h1>
              <p className="text-slate-400 mt-1">Registra y controla venta de insumos</p>
            </div>
          </div>
          <button
            onClick={() => cargarVentasInsumos(institucionActiva.id)}
            disabled={loading}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-green-400 transition-all duration-300"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {mensaje && (
          <div className={`p-4 rounded-lg border-l-4 mb-6 font-semibold flex items-center gap-2 ${
            mensaje.includes('✓') 
              ? 'bg-green-500/20 border-green-500/50 text-green-400' 
              : 'bg-red-500/20 border-red-500/50 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${mensaje.includes('✓') ? 'bg-green-400' : 'bg-red-400'}`}></div>
            {mensaje}
          </div>
        )}
      </div>

      {/* KPIs EN GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
        <div className="p-2 sm:p-3 md:p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-green-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Vendido Hoy</p>
          <p className="text-2xl font-black text-green-400">{formatoMoneda(totalVentasHoy)}</p>
        </div>
        <div className="p-2 sm:p-3 md:p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-emerald-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Total Vendido</p>
          <p className="text-2xl font-black text-emerald-400">{formatoMoneda(totalVentasTotal)}</p>
        </div>
        <div className="p-2 sm:p-3 md:p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-teal-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Unidades Vendidas</p>
          <p className="text-2xl font-black text-teal-400">{cantidadProductosVendidos}</p>
        </div>
        <div className="p-2 sm:p-3 md:p-4 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl hover:border-cyan-500/50 transition-all">
          <p className="text-xs text-slate-400 font-bold mb-1">Stock Total</p>
          <p className="text-2xl font-black text-cyan-400">{stockTotal}</p>
        </div>
      </div>

      {/* TABS */}
      <div className="mb-12">
        <div className="flex gap-2 p-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl w-fit">
          <button
            onClick={() => setTabActiva('registro')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'registro'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50'
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
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart size={20} />
            Historial ({ventas.filter(v => v.estado === 'VENDIDO').length})
          </button>
          <button
            onClick={() => setTabActiva('resumen')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              tabActiva === 'resumen'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/50'
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
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Plus size={24} className="text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Registrar Venta</h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Insumo */}
                  <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">Insumo</label>
                    <select
                      value={selectedInsumo || ''}
                      onChange={(e) => setSelectedInsumo(parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-green-500/50 focus:outline-none transition"
                    >
                      <option value="">Seleccionar insumo</option>
                      {insumos.map(i => (
                        <option key={i.id} value={i.id}>
                          {i.nombre} (Stock: {i.cantidad_stock})
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
                      value={cantidad}
                      onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-green-500/50 focus:outline-none transition"
                    />
                  </div>
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
                          metodoPago === opt.value
                            ? 'border-green-500 bg-green-500/20 text-green-300'
                            : 'border-slate-600/50 bg-slate-700/50 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        <input
                          type="radio"
                          value={opt.value}
                          checked={metodoPago === opt.value}
                          onChange={(e) => setMetodoPago(e.target.value)}
                          className="hidden"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRegistrarVenta}
                  disabled={registrando}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition ${
                    registrando
                      ? 'bg-slate-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/50'
                  }`}
                >
                  <ShoppingCart size={20} />
                  {registrando ? 'Registrando...' : 'Registrar Venta'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: HISTORIAL */}
        {tabActiva === 'historial' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-4">Historial de Ventas ({ventas.filter(v => v.estado === 'VENDIDO').length})</h2>

              {ventas.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart size={32} className="text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400 font-semibold">No hay ventas registradas</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-slate-300 font-bold">Insumo</th>
                        <th className="px-4 py-3 text-center text-slate-300 font-bold">Cantidad</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-bold">P. Unitario</th>
                        <th className="px-4 py-3 text-right text-slate-300 font-bold">Subtotal</th>
                        <th className="px-4 py-3 text-center text-slate-300 font-bold">Método</th>
                        <th className="px-4 py-3 text-left text-slate-300 font-bold">Fecha</th>
                        <th className="px-4 py-3 text-left text-slate-300 font-bold">Estado</th>
                        <th className="px-4 py-3 text-center text-slate-300 font-bold">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {ventas.map(venta => {
                        const insumo = insumos.find(i => i.id === venta.insumo_id)
                        return (
                          <tr key={venta.id} className={`hover:bg-slate-700/30 transition ${venta.estado === 'ANULADO' ? 'bg-red-500/10' : ''}`}>
                            <td className="px-4 py-3 text-slate-300 font-semibold">{insumo?.nombre}</td>
                            <td className="px-4 py-3 text-center text-slate-400">{venta.cantidad}</td>
                            <td className="px-4 py-3 text-right text-slate-400">{formatoMoneda(venta.precio_unitario)}</td>
                            <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatoMoneda(venta.subtotal)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-lg">
                                {venta.metodo_pago === 'EFECTIVO' && '💵'}
                                {venta.metodo_pago === 'TRANSFERENCIA' && '🏦'}
                                {venta.metodo_pago === 'TARJETA' && '💳'}
                                {venta.metodo_pago === 'CHEQUE' && '✓'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400">{venta.fecha_venta}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                venta.estado === 'ANULADO'
                                  ? 'bg-red-500/30 text-red-300'
                                  : 'bg-green-500/30 text-green-300'
                              }`}>
                                {venta.estado || 'VENDIDO'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {venta.estado === 'VENDIDO' ? (
                                <button
                                  onClick={() => handleAnularVenta(venta.id!)}
                                  disabled={registrando}
                                  className="text-xs px-2 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded transition disabled:opacity-50"
                                >
                                  <X size={14} className="inline mr-1" /> Anular
                                </button>
                              ) : (
                                <span className="text-xs text-slate-500">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
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
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <TrendingUp size={24} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-bold">Vendido Hoy</p>
                    <p className="text-2xl font-black text-green-400">{formatoMoneda(totalVentasHoy)}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{ventas.filter(v => v.fecha_venta === new Date().toISOString().split('T')[0] && v.estado === 'VENDIDO').length} venta(s)</p>
              </div>

              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-emerald-500/20 rounded-lg">
                    <DollarSign size={24} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-bold">Total Período</p>
                    <p className="text-2xl font-black text-emerald-400">{formatoMoneda(totalVentasTotal)}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{ventas.filter(v => v.estado === 'VENDIDO').length} transacción(es)</p>
              </div>

              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-teal-500/20 rounded-lg">
                    <Package size={24} className="text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-bold">Unidades Vendidas</p>
                    <p className="text-2xl font-black text-teal-400">{cantidadProductosVendidos}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">productos vendidos</p>
              </div>

              <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-cyan-500/20 rounded-lg">
                    <Package size={24} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 font-bold">Stock Total</p>
                    <p className="text-2xl font-black text-cyan-400">{stockTotal}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400">unidades en stock</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
