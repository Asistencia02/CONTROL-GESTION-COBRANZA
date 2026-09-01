import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useInsumos } from '@renderer/hooks/useInsumos'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { supabase } from '@renderer/lib/supabase'
import { formatoMoneda } from '@renderer/lib/helpers'
import { Search, Plus, Trash2, AlertCircle, Edit2, FileText, X } from 'lucide-react'
import { useTalonarioManager } from '@renderer/hooks/useTalonarioManager'

interface CarritoItem {
  insumo_id: number
  nombre: string
  cantidad: number
  precio_unitario: number
}

export const Ventas: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { insumos, cargarInsumos, loading: insumosLoading, decrementarStock } = useInsumos()
  const { estudiantes, cargarEstudiantes } = useEstudiantes()
  const { obtenerProximoTalonario, anularVenta } = useTalonarioManager()

  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [registrando, setRegistrando] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [metodo_pago, setMetodo_pago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO'>('EFECTIVO')
  const [tipo_tarjeta, setTipo_tarjeta] = useState<'CREDITO' | 'DEBITO'>('CREDITO')
  const [ventas, setVentas] = useState<any[]>([])
  const [modalTalonario, setModalTalonario] = useState<{ ventaId: number; numeroActual?: string } | null>(null)
  const [numeroTalonarioInput, setNumeroTalonarioInput] = useState('')
  const [guardandoTalonario, setGuardandoTalonario] = useState(false)

  useEffect(() => {
    const cargarDatos = async () => {
      await cargarInsumos(institucionActiva.id)
      await cargarEstudiantes(institucionActiva.id)
      const { data } = await supabase
        .from('ventas_insumos')
        .select('*, insumos(nombre)')
        .eq('institucion_id', institucionActiva.id)
        .order('fecha_venta', { ascending: false })
      if (data) setVentas(data)
    }
    cargarDatos()
  }, [institucionActiva.id])

  const productosFiltrados = insumos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  const agregarAlCarro = (insumo: any) => {
    // FIXED: Validate stock before AND after adding to cart
    if (insumo.cantidad_stock <= 0) {
      alert('Stock insuficiente')
      return
    }
    
    const existe = carrito.find(item => item.insumo_id === insumo.id)
    const cantidadActualEnCarro = existe ? existe.cantidad : 0
    
    // FIXED: Check if total quantity (cart + new item) exceeds available stock
    if (cantidadActualEnCarro + 1 > insumo.cantidad_stock) {
      alert(`Stock insuficiente. Disponible: ${insumo.cantidad_stock}, En carrito: ${cantidadActualEnCarro}`)
      return
    }
    
    if (existe) {
      setCarrito(carrito.map(item => item.insumo_id === insumo.id ? { ...item, cantidad: item.cantidad + 1 } : item))
    } else {
      setCarrito([...carrito, { insumo_id: insumo.id, nombre: insumo.nombre, cantidad: 1, precio_unitario: insumo.precio_unitario }])
    }
  }

  const confirmarVentas = async () => {
    if (carrito.length === 0) {
      alert('Carrito vacío')
      return
    }
    setRegistrando(true)
    try {
      // FIXED: Get single talonario number ONCE before loop instead of per item
      const { numero: numeroTalonario } = await obtenerProximoTalonario(institucionActiva.id, 'VENTAS')
      
      for (const item of carrito) {
        const { error } = await supabase.from('ventas_insumos').insert([{
          institucion_id: institucionActiva.id,
          insumo_id: item.insumo_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.cantidad * item.precio_unitario,
          metodo_pago,
          tipo_tarjeta: (metodo_pago === 'TARJETA_CREDITO' || metodo_pago === 'TARJETA_DEBITO') ? tipo_tarjeta : null,
          numero_talonario: numeroTalonario,
          estado: 'VENDIDO',
          fecha_venta: new Date().toISOString().split('T')[0]
        }])
        if (error) throw error
        await decrementarStock(item.insumo_id, item.cantidad)
      }
      const { data } = await supabase.from('ventas_insumos').select('*, insumos(nombre)').eq('institucion_id', institucionActiva.id).order('fecha_venta', { ascending: false })
      if (data) setVentas(data)
      setSuccessMessage(`✓ ${carrito.length} venta(s) registrada(s) con talonario: ${numeroTalonario}`)
      setCarrito([])
      setMetodo_pago('EFECTIVO')
      setTipo_tarjeta('CREDITO')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Error registrando ventas:', error)
      alert('Error al registrar ventas')
    } finally {
      setRegistrando(false)
    }
  }

  const handleAbrirModalTalonario = (ventaId: number, numeroActual?: string) => {
    setModalTalonario({ ventaId, numeroActual })
    setNumeroTalonarioInput(numeroActual || '')
  }

  const handleGuardarTalonario = async () => {
    if (!modalTalonario) return
    if (!numeroTalonarioInput.trim()) {
      alert('Número de talonario requerido')
      return
    }
    setGuardandoTalonario(true)
    try {
      // FIXED: Validate talonario doesn't already exist (excluding current venta)
      const { data: existente } = await supabase
        .from('ventas_insumos')
        .select('id')
        .eq('numero_talonario', numeroTalonarioInput.trim())
        .neq('id', modalTalonario.ventaId)
        .limit(1)
      
      if (existente && existente.length > 0) {
        alert('Este número de talonario ya existe')
        setGuardandoTalonario(false)
        return
      }
      
      const { error } = await supabase.from('ventas_insumos').update({ numero_talonario: numeroTalonarioInput.trim() }).eq('id', modalTalonario.ventaId)
      if (error) throw error
      const { data } = await supabase.from('ventas_insumos').select('*, insumos(nombre)').eq('institucion_id', institucionActiva.id).order('fecha_venta', { ascending: false })
      if (data) setVentas(data)
      setSuccessMessage('✓ Talonario guardado')
      setModalTalonario(null)
      setNumeroTalonarioInput('')
      setTimeout(() => setSuccessMessage(''), 2000)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar talonario')
    } finally {
      setGuardandoTalonario(false)
    }
  }

  const handleAnularVenta = async (ventaId: number) => {
    const motivo = window.prompt('Motivo de la anulación:', 'Venta duplicada')
    if (!motivo) return
    try {
      const resultado = await anularVenta(ventaId, motivo, 'Usuario')
      if (resultado.success) {
        setSuccessMessage(`✓ ${resultado.mensaje}`)
        const { data } = await supabase.from('ventas_insumos').select('*, insumos(nombre)').eq('institucion_id', institucionActiva.id).order('fecha_venta', { ascending: false })
        if (data) setVentas(data)
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        alert(`Error: ${resultado.mensaje}`)
      }
    } catch (error) {
      console.error('Error anulando venta:', error)
      alert('Error al anular venta')
    }
  }

  const totalCarro = carrito.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0)
  const bajosStock = insumos.filter(i => i.cantidad_stock < i.cantidad_minima)

  const getMetodoPagoLabel = (metodo: string, tipo?: string) => {
    if (metodo === 'TARJETA_CREDITO' && tipo) return `💳 Tarjeta ${tipo === 'CREDITO' ? 'Crédito' : 'Débito'}`
    switch(metodo) {
      case 'EFECTIVO': return '💵 Efectivo'
      case 'TRANSFERENCIA': return '🏦 Transferencia'
      case 'TARJETA_CREDITO': return '💳 Tarjeta Crédito'
      case 'TARJETA_DEBITO': return '💳 Tarjeta Débito'
      default: return metodo
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Módulo de Ventas/Inventario</h1>

      {successMessage && (<div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{successMessage}</div>)}

      {bajosStock.length > 0 && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="text-orange-600 mt-0.5" size={20} />
          <div>
            <p className="text-orange-700 font-semibold">Productos con stock bajo:</p>
            <p className="text-orange-600 text-sm">{bajosStock.map(p => `${p.nombre} (${p.cantidad_stock})`).join(', ')}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Stock Disponible</h2>
            <div className="flex items-center gap-2 mb-4">
              <Search size={20} className="text-gray-400" />
              <input type="text" placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            {insumosLoading ? (<div className="text-center py-8 text-gray-500">Cargando insumos...</div>) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Producto</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Stock</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Precio</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.map(producto => (
                      <tr key={producto.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">{producto.nombre}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${producto.cantidad_stock > producto.cantidad_minima ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>{producto.cantidad_stock}</span></td>
                        <td className="px-4 py-3 font-semibold">{formatoMoneda(producto.precio_unitario)}</td>
                        <td className="px-4 py-3 text-center"><button onClick={() => agregarAlCarro(producto)} disabled={producto.cantidad_stock === 0} className={`px-3 py-1 rounded text-sm font-semibold transition ${producto.cantidad_stock === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}><Plus size={16} className="inline" /> Agregar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Ventas Registradas ({ventas.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Producto</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Cantidad</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Subtotal</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Método</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Talonario</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Estado</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700">Fecha</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.length === 0 ? (<tr><td colSpan={8} className="px-4 py-3 text-center text-gray-500">No hay ventas registradas</td></tr>) : (
                    ventas.map(venta => (
                      <tr key={venta.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">{venta.insumos?.nombre || 'N/A'}</td>
                        <td className="px-4 py-3">{venta.cantidad}</td>
                        <td className="px-4 py-3 font-semibold">{formatoMoneda(venta.subtotal)}</td>
                        <td className="px-4 py-3">{getMetodoPagoLabel(venta.metodo_pago || '')}</td>
                        <td className="px-4 py-3">{venta.numero_talonario ? (<span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold"><FileText size={14} />{venta.numero_talonario}</span>) : (<span className="text-gray-400 text-xs">Sin talonario</span>)}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-semibold ${venta.estado === 'ANULADO' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{venta.estado === 'ANULADO' ? '❌ Anulada' : '✓ Vendida'}</span></td>
                        <td className="px-4 py-3">{venta.fecha_venta}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => handleAbrirModalTalonario(venta.id, venta.numero_talonario)} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold transition"><Edit2 size={14} />Tal.</button>
                            {venta.estado !== 'ANULADO' && (<button onClick={() => handleAnularVenta(venta.id)} className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold transition"><Trash2 size={14} />Anu.</button>)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Carrito</h2>
            {carrito.length === 0 ? (<p className="text-gray-500 text-center py-8">Carrito vacío</p>) : (
              <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
                {carrito.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{item.nombre}</p>
                      <p className="text-xs text-gray-600">{item.cantidad} x {formatoMoneda(item.precio_unitario)}</p>
                      <p className="text-xs font-semibold text-gray-900 mt-1">{formatoMoneda(item.cantidad * item.precio_unitario)}</p>
                    </div>
                    <button onClick={() => setCarrito(carrito.filter((_, i) => i !== idx))} className="text-red-600 hover:text-red-800 ml-2"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
            {carrito.length > 0 && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                  <select value={metodo_pago} onChange={(e) => setMetodo_pago(e.target.value as any)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="EFECTIVO">💵 Efectivo</option>
                    <option value="TRANSFERENCIA">🏦 Transferencia</option>
                    <option value="TARJETA_CREDITO">💳 Tarjeta Crédito</option>
                    <option value="TARJETA_DEBITO">💳 Tarjeta Débito</option>
                  </select>
                </div>
                {(metodo_pago === 'TARJETA_CREDITO' || metodo_pago === 'TARJETA_DEBITO') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Tarjeta</label>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 flex-1" style={{ backgroundColor: tipo_tarjeta === 'CREDITO' ? '#DBEAFE' : 'transparent', borderColor: tipo_tarjeta === 'CREDITO' ? '#3B82F6' : '#D1D5DB' }}>
                        <input type="radio" value="CREDITO" checked={tipo_tarjeta === 'CREDITO'} onChange={(e) => setTipo_tarjeta(e.target.value as any)} className="w-4 h-4" />
                        <span className="text-sm font-medium text-gray-700">💳 Crédito</span>
                      </label>
                      <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 flex-1" style={{ backgroundColor: tipo_tarjeta === 'DEBITO' ? '#DBEAFE' : 'transparent', borderColor: tipo_tarjeta === 'DEBITO' ? '#3B82F6' : '#D1D5DB' }}>
                        <input type="radio" value="DEBITO" checked={tipo_tarjeta === 'DEBITO'} onChange={(e) => setTipo_tarjeta(e.target.value as any)} className="w-4 h-4" />
                        <span className="text-sm font-medium text-gray-700">💳 Débito</span>
                      </label>
                    </div>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-gray-800">Total:</span>
                    <span className="text-2xl font-bold text-blue-600">{formatoMoneda(totalCarro)}</span>
                  </div>
                  <button onClick={confirmarVentas} disabled={registrando} className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2 disabled:bg-gray-400"><Plus size={20} />{registrando ? 'Registrando...' : 'Confirmar Ventas'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {modalTalonario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText size={24} />Número de Talonario</h3>
              <button onClick={() => setModalTalonario(null)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Número de Talonario<span className="text-red-500">*</span></label>
              <input type="text" value={numeroTalonarioInput} onChange={(e) => setNumeroTalonarioInput(e.target.value)} placeholder="Ej: 0001" disabled={guardandoTalonario} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalTalonario(null)} disabled={guardandoTalonario} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:bg-gray-100">Cancelar</button>
              <button onClick={handleGuardarTalonario} disabled={guardandoTalonario} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:bg-gray-400"><Plus size={18} />{guardandoTalonario ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
