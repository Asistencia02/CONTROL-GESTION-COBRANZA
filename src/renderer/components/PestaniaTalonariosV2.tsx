import React, { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp, DollarSign, Receipt, Search, Trash2, Plus, RefreshCw, X, Gift, CreditCard, Split, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@renderer/lib/supabase'
import { useCobranzasMultiples, ConceptoSeleccionable } from '@renderer/hooks/useCobranzasMultiples'
import { ModalExcepcionesPago } from './ModalExcepcionesPago'
import { ModalConfirmacionCobro } from './ModalConfirmacionCobro'
import { formatoMoneda } from '@renderer/lib/helpers'
import { FiltrosCobranzasModernos } from './FiltrosCobranzasModernos'

interface Estudiante {
  id: number
  nombre: string
  apellido: string
  dni: string
  estado: string
  carrera_id: number
}

interface ConceptoPago {
  id: number
  nombre: string
  tipo: string
  monto: number
  mes?: number
}

interface PagoDividido {
  id: string
  metodo: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO'
  monto: number
  tipoTarjeta?: 'CREDITO' | 'DEBITO'
}

interface PestaniaTalonariosV2Props {
  institucionId: number
  carreras: any[]
}

export const PestaniaTalonariosV2: React.FC<PestaniaTalonariosV2Props> = ({ institucionId, carreras }) => {
  const {
    registrando,
    error: errorGlobal,
    obtenerConceptosPendientes,
    actualizarSeleccion,
    calcularTotales,
    registrarCobranzaMultiple,
  } = useCobranzasMultiples()

  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [estudiantesFiltrados, setEstudiantesFiltrados] = useState<Estudiante[]>([])
  const [conceptos, setConceptos] = useState<ConceptoPago[]>([])
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<number | null>(null)
  const [conceptosPendientes, setConceptosPendientes] = useState<ConceptoSeleccionable[]>([])
  const [cargandoConceptos, setCargandoConceptos] = useState(false)

  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO'>('EFECTIVO')
  const [tipoTarjeta, setTipoTarjeta] = useState<'CREDITO' | 'DEBITO'>('CREDITO')
  
  const [pagoDividido, setPagoDividido] = useState(false)
  const [pagosMultiples, setPagosMultiples] = useState<PagoDividido[]>([])
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)
  const [cargandoEstudiantes, setCargandoEstudiantes] = useState(true)
  const [recargandoConceptos, setRecargandoConceptos] = useState(false)
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false)
  const [mostrarExcepciones, setMostrarExcepciones] = useState<{ show: boolean; concepto?: ConceptoSeleccionable } | null>(null)
  const [expandirConceptos, setExpandirConceptos] = useState(true)
  const [mostrarModalDeuda, setMostrarModalDeuda] = useState(false)
  const [deudaEstudiante, setDeudaEstudiante] = useState(0)
  const [procesandoDeuda, setProcesandoDeuda] = useState(false)

  const recargarConceptosDelServidor = async () => {
    try {
      setRecargandoConceptos(true)
      const { data: conceptosData } = await supabase
        .from('conceptos_pago')
        .select('*')
        .eq('institucion_id', institucionId)
        .eq('activo', true)
        .order('tipo', { ascending: false })
        .order('mes', { ascending: true })

      const nuevosConceptos = conceptosData || []
      setConceptos(nuevosConceptos)
      
      if (estudianteSeleccionado) {
        const pendientes = await obtenerConceptosPendientes(institucionId, estudianteSeleccionado, nuevosConceptos)
        setConceptosPendientes(pendientes)
        setMensaje({ tipo: 'success', texto: 'Montos actualizados' })
        setTimeout(() => setMensaje(null), 3000)
      }
    } catch (err) {
      console.error('Error recargando conceptos:', err)
    } finally {
      setRecargandoConceptos(false)
    }
  }

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await supabase
          .from('estudiantes')
          .select('*')
          .eq('institucion_id', institucionId)
          .neq('estado', 'NO_VIENE_MAS')
          .order('nombre')

        setEstudiantes(data || [])
        setEstudiantesFiltrados(data || [])

        const { data: conceptosData } = await supabase
          .from('conceptos_pago')
          .select('*')
          .eq('institucion_id', institucionId)
          .eq('activo', true)
          .order('tipo', { ascending: false })
          .order('mes', { ascending: true })

        setConceptos(conceptosData || [])
      } catch (err) {
        console.error('Error cargando datos:', err)
      } finally {
        setCargandoEstudiantes(false)
      }
    }

    cargar()
  }, [institucionId])

  useEffect(() => {
    if (estudianteSeleccionado && conceptos.length > 0) {
      setCargandoConceptos(true)
      obtenerConceptosPendientes(institucionId, estudianteSeleccionado, conceptos)
        .then(pendientes => setConceptosPendientes(pendientes))
        .catch(err => console.error('Error:', err))
        .finally(() => setCargandoConceptos(false))
    }
  }, [conceptos, estudianteSeleccionado, institucionId, obtenerConceptosPendientes])

  const handleSeleccionarConcepto = (conceptoId: number) => {
    setConceptosPendientes(actualizarSeleccion(conceptosPendientes, conceptoId, true))
  }

  const handleDeseleccionarConcepto = (conceptoId: number) => {
    setConceptosPendientes(actualizarSeleccion(conceptosPendientes, conceptoId, false))
  }

  const handleAgregarPagoDividido = () => {
    setPagosMultiples([...pagosMultiples, { id: `pago-${Date.now()}`, metodo: 'EFECTIVO', monto: 0 }])
  }

  const handleEliminarPagoDividido = (id: string) => {
    setPagosMultiples(pagosMultiples.filter(p => p.id !== id))
  }

  const handleActualizarPagoDividido = (id: string, campo: keyof PagoDividido, valor: any) => {
    setPagosMultiples(pagosMultiples.map(p => 
      p.id === id ? { ...p, [campo]: valor } : p
    ))
  }

  const calcularSumaPagosMultiples = () => {
    return pagosMultiples.reduce((sum, p) => sum + (p.monto || 0), 0)
  }

  const totales = calcularTotales(conceptosPendientes)
  const estudiante = estudiantes.find((e) => e.id === estudianteSeleccionado)
  const sumaPagosMultiples = calcularSumaPagosMultiples()
  const pagoDivididoValido = !pagoDividido || Math.abs(sumaPagosMultiples - totales.totalConMora) < 0.01

  const verificarDeudaParaInscripcion = async (): Promise<boolean> => {
    if (!estudianteSeleccionado) return true

    const conceptosSeleccionados = conceptosPendientes.filter(c => c.seleccionado)
    
    const tieneInscripcion2027 = conceptosSeleccionados.some(c => 
      c.nombre?.includes('INSCRIPCIÓN') && c.año === 2027
    )

    if (!tieneInscripcion2027) {
      return true
    }

    try {
      const deuda = await obtenerDeudaEstudiante(
        estudianteSeleccionado,
        institucionId as any
      )

      if (deuda > 0) {
        setDeudaEstudiante(deuda)
        setMostrarModalDeuda(true)
        return false
      }

      return true
    } catch (err) {
      console.error('Error verificando deuda:', err)
      return true
    }
  }

  const handleConfirmarFinanciamiento = async (
    opcion: 'pagar_ahora' | 'financiar_todo' | 'pago_inicial',
    monto_inicial?: number,
    cuotas?: number
  ) => {
    setProcesandoDeuda(true)
    try {
      if (!estudianteSeleccionado) throw new Error('Estudiante no definido')

      if (opcion === 'pagar_ahora') {
        setMensaje({ tipo: 'success', texto: `Deuda de $${deudaEstudiante.toLocaleString('es-AR')} pendiente de pago` })
        
      } else if (opcion === 'financiar_todo') {
        const resultado = await registrarFinanciamientoDeuda({
          estudiante_id: estudianteSeleccionado,
          institucion_id: institucionId,
          deuda_original: deudaEstudiante,
          pago_inicial: 0,
          cuotas: cuotas || 10,
          año_deuda: 2026,
          año_financiamiento: 2027,
          metodo_pago: metodoPago
        })

        if (!resultado.success) {
          throw new Error(resultado.error || 'Error al crear financiamiento')
        }

        setMensaje({ tipo: 'success', texto: resultado.mensaje })

      } else if (opcion === 'pago_inicial') {
        const resultado = await registrarFinanciamientoDeuda({
          estudiante_id: estudianteSeleccionado,
          institucion_id: institucionId,
          deuda_original: deudaEstudiante,
          pago_inicial: monto_inicial || 0,
          cuotas: cuotas || 10,
          año_deuda: 2026,
          año_financiamiento: 2027,
          metodo_pago: metodoPago
        })

        if (!resultado.success) {
          throw new Error(resultado.error || 'Error al crear financiamiento')
        }

        setMensaje({ tipo: 'success', texto: resultado.mensaje })
      }

      setMostrarModalDeuda(false)

      setTimeout(() => {
        setMostrarModalConfirmacion(true)
      }, 500)

    } catch (err) {
      console.error('Error al confirmar financiamiento:', err)
      setMensaje({ 
        tipo: 'error', 
        texto: 'Error: ' + (err instanceof Error ? err.message : 'Desconocido') 
      })
    } finally {
      setProcesandoDeuda(false)
    }
  }

 const handleAbrirModalConfirmacion = async () => {
    if (!estudianteSeleccionado) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un estudiante' })
      return
    }

    if (totales.cantidad === 0) {
      setMensaje({ tipo: 'error', texto: 'Selecciona al menos un concepto' })
      return
    }

    if (pagoDividido && !pagoDivididoValido) {
      setMensaje({ tipo: 'error', texto: `La suma de pagos no coincide con el total` })
      return
    }

    // NUEVO: Verificar deuda para inscripción 2027
    const puedeContinuar = await verificarDeudaParaInscripcion()
    
    if (!puedeContinuar) {
      return
    }

    setMostrarModalConfirmacion(true)
  }

  const handleConfirmarRegistro = async (opciones?: { perdonarMora?: boolean; montoParcial?: number }) => {
    const resultado = await registrarCobranzaMultiple(
      institucionId,
      estudianteSeleccionado || 0,
      totales.seleccionados,
      pagoDividido ? pagosMultiples : undefined,
      metodoPago,
      metodoPago.includes('TARJETA') ? tipoTarjeta : undefined,
      opciones
    )

    if (resultado.success) {
      setMostrarModalConfirmacion(false)
      setMensaje({ tipo: 'success', texto: resultado.mensaje })

      // Reset
      setEstudianteSeleccionado(null)
      setConceptosPendientes([])
      setMetodoPago('EFECTIVO')
      setTipoTarjeta('CREDITO')
      setPagoDividido(false)
      setPagosMultiples([])

      setTimeout(() => setMensaje(null), 5000)
    } else {
      setMensaje({ tipo: 'error', texto: resultado.mensaje })
    }
  }

  if (cargandoEstudiantes) {
    return <div className="text-center py-8 text-gray-500">Cargando datos...</div>
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg shadow-lg">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 mb-1">
            <Receipt size={28} />
            Cobranza Múltiple por Talonario
          </h2>
          <p className="text-blue-100">Registra pagos de múltiples conceptos en un único talonario</p>
        </div>
        <button
          onClick={recargarConceptosDelServidor}
          disabled={recargandoConceptos}
          className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg font-semibold disabled:bg-gray-300 disabled:text-gray-500 transition"
        >
          <RefreshCw size={18} className={recargandoConceptos ? 'animate-spin' : ''} />
          {recargandoConceptos ? 'Recargando...' : 'Actualizar'}
        </button>
      </div>

      {/* MENSAJES */}
      {mensaje && (
        <div
          className={`p-4 rounded-lg border-l-4 ${
            mensaje.tipo === 'success'
              ? 'bg-green-50 border-green-500 text-green-700'
              : 'bg-red-50 border-red-500 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensaje.tipo === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span>{mensaje.texto}</span>
          </div>
        </div>
      )}

      {errorGlobal && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 flex items-start gap-2">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <span>{errorGlobal}</span>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* FILTROS MEJORADOS */}
          <FiltrosCobranzasModernos
            estudiantes={estudiantes}
            carreras={carreras}
            onFiltrosChange={setEstudiantesFiltrados}
            onEstudianteSeleccionado={setEstudianteSeleccionado}
            estudianteSeleccionado={estudianteSeleccionado}
          />

          {/* SELECTOR ESTUDIANTE */}
          {estudiantesFiltrados.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <label className="block text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
                Selecciona Estudiante
              </label>
              <select
                value={estudianteSeleccionado || ''}
                onChange={(e) => setEstudianteSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base font-medium"
              >
                <option value="">-- Selecciona un estudiante --</option>
                {estudiantesFiltrados.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.nombre} {est.apellido} • {est.dni}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* CONCEPTOS PENDIENTES */}
          {estudianteSeleccionado && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandirConceptos(!expandirConceptos)}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200 flex items-center justify-between hover:from-blue-100 hover:to-cyan-100 transition"
              >
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-blue-600" />
                  Conceptos Pendientes ({conceptosPendientes.length})
                </h3>
                {expandirConceptos ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {expandirConceptos && (
                <div className="p-6">
                  {cargandoConceptos ? (
                    <div className="text-center py-8 text-gray-500">Cargando conceptos...</div>
                  ) : conceptosPendientes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No hay conceptos pendientes</div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {conceptosPendientes.map((concepto) => (
                        <div
                          key={concepto.id}
                          className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition group"
                        >
                          <input
                            type="checkbox"
                            checked={concepto.seleccionado}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleSeleccionarConcepto(concepto.id)
                              } else {
                                handleDeseleccionarConcepto(concepto.id)
                              }
                            }}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{concepto.nombre}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {concepto.tipo} {concepto.mes ? `• Mes ${concepto.mes}` : ''}
                            </p>
                            {concepto.mora?.estaVencida && (
                              <p className="text-xs text-red-600 font-semibold mt-1">
                                ⚠ Vencida: +{formatoMoneda(concepto.mora.montoRecargo)} mora
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-gray-900 text-sm">{formatoMoneda(concepto.montoFinal)}</p>
                            <button
                              onClick={() => setMostrarExcepciones({ show: true, concepto })}
                              className="text-xs text-orange-600 hover:text-orange-700 font-semibold mt-1 opacity-0 group-hover:opacity-100 transition"
                            >
                              Excepción
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MÉTODO DE PAGO */}
          {totales.cantidad > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Método de Pago</h3>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-3">Tipo</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'EFECTIVO', label: '💵 Efectivo' },
                    { value: 'TRANSFERENCIA', label: '🏦 Transferencia' },
                    { value: 'TARJETA_CREDITO', label: '💳 T. Crédito' },
                    { value: 'TARJETA_DEBITO', label: '💳 T. Débito' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`px-4 py-3 rounded-lg border-2 cursor-pointer font-semibold transition text-sm ${
                        metodoPago === opt.value
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        value={opt.value}
                        checked={metodoPago === opt.value}
                        onChange={(e) => setMetodoPago(e.target.value as any)}
                        className="mr-2"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {(metodoPago === 'TARJETA_CREDITO' || metodoPago === 'TARJETA_DEBITO') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Tipo de Tarjeta</label>
                  <div className="flex gap-2">
                    <label className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition font-semibold text-sm">
                      <input
                        type="radio"
                        value="CREDITO"
                        checked={tipoTarjeta === 'CREDITO'}
                        onChange={(e) => setTipoTarjeta(e.target.value as any)}
                        className="mr-2"
                      />
                      Crédito
                    </label>
                    <label className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition font-semibold text-sm">
                      <input
                        type="radio"
                        value="DEBITO"
                        checked={tipoTarjeta === 'DEBITO'}
                        onChange={(e) => setTipoTarjeta(e.target.value as any)}
                        className="mr-2"
                      />
                      Débito
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PAGO DIVIDIDO */}
          {totales.cantidad > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pagoDividido}
                    onChange={(e) => {
                      setPagoDividido(e.target.checked)
                      if (!e.target.checked) {
                        setPagosMultiples([])
                      } else {
                        setPagosMultiples([{ id: `pago-1`, metodo: 'EFECTIVO', monto: 0 }])
                      }
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600"
                  />
                  <span className="font-semibold text-gray-800 flex items-center gap-2">
                    <Split size={18} className="text-blue-600" />
                    Dividir en múltiples métodos
                  </span>
                </label>
              </div>

              {pagoDividido && (
                <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  {pagosMultiples.map((pago, idx) => (
                    <div key={pago.id} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Método {idx + 1}</label>
                        <select
                          value={pago.metodo}
                          onChange={(e) => handleActualizarPagoDividido(pago.id, 'metodo', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="EFECTIVO">💵 Efectivo</option>
                          <option value="TRANSFERENCIA">🏦 Transferencia</option>
                          <option value="TARJETA_CREDITO">💳 T. Crédito</option>
                          <option value="TARJETA_DEBITO">💳 T. Débito</option>
                        </select>
                      </div>

                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Monto</label>
                        <div className="relative">
                          <span className="absolute left-2 top-2 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            value={pago.monto}
                            onChange={(e) => handleActualizarPagoDividido(pago.id, 'monto', parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleEliminarPagoDividido(pago.id)}
                        className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded font-semibold transition"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleAgregarPagoDividido}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Agregar otro método
                  </button>

                  <div className="text-sm font-semibold text-blue-900 bg-white p-3 rounded border border-blue-300">
                    Total a Dividir: <span className="text-lg">{formatoMoneda(totales.totalConMora)}</span>
                    <br />
                    Suma de pagos: <span className={sumaPagosMultiples === totales.totalConMora ? 'text-green-600' : 'text-orange-600'}>{formatoMoneda(sumaPagosMultiples)}</span>
                    {!pagoDivididoValido && (
                      <p className="text-red-600 text-xs mt-2">⚠ La suma no coincide</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA - RESUMEN */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-6 sticky top-8 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign size={24} className="text-blue-600" />
              Resumen
            </h3>

            {estudiante && (
              <div className="mb-6 p-4 bg-white border-2 border-blue-300 rounded-lg">
                <p className="font-bold text-gray-900 text-sm">{estudiante.nombre} {estudiante.apellido}</p>
                <p className="text-xs text-gray-600 mt-1">DNI: {estudiante.dni}</p>
                <p className="text-xs text-gray-600 mt-1">Estado: <span className="font-semibold">{estudiante.estado === 'BECADO_100' ? 'Becado 100%' : estudiante.estado === 'BECADO_50' ? 'Becado 50%' : 'Activo'}</span></p>
              </div>
            )}

            {totales.cantidad > 0 && (
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-white rounded-lg border border-gray-300">
                  <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Conceptos ({totales.cantidad})</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{totales.desglose}</p>
                </div>

                <div className="space-y-2 text-sm bg-white p-4 rounded-lg border border-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Subtotal:</span>
                    <span className="font-semibold text-gray-900">{formatoMoneda(totales.totalSinMora)}</span>
                  </div>

                  {totales.totalMora > 0 && (
                    <div className="flex justify-between py-2 border-t border-gray-200 text-red-600 font-semibold">
                      <span>Mora (+):</span>
                      <span>{formatoMoneda(totales.totalMora)}</span>
                    </div>
                  )}

                  <div className="border-t-2 border-blue-300 pt-2 flex justify-between text-lg font-bold text-blue-600">
                    <span>TOTAL:</span>
                    <span>{formatoMoneda(totales.totalConMora)}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleAbrirModalConfirmacion}
              disabled={registrando || totales.cantidad === 0 || (pagoDividido && !pagoDivididoValido)}
              className={`w-full py-3 px-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition text-base ${
                registrando || totales.cantidad === 0 || (pagoDividido && !pagoDivididoValido)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 cursor-pointer shadow-lg'
              }`}
            >
              <Receipt size={20} />
              {registrando ? 'Registrando...' : 'Registrar Cobro'}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CONFIRMACIÓN */}
      <ModalConfirmacionCobro
        isOpen={mostrarModalConfirmacion}
        onClose={() => setMostrarModalConfirmacion(false)}
        estudiante={estudiante}
        conceptos={totales.seleccionados}
        totalSinMora={totales.totalSinMora}
        totalMora={totales.totalMora}
        totalConMora={totales.totalConMora}
        registrando={registrando}
        onConfirmar={handleConfirmarRegistro}
        metodoPago={metodoPago}
        tipoTarjeta={tipoTarjeta}
        pagoDividido={pagoDividido}
        pagosMultiples={pagosMultiples}
      />

      {/* MODAL EXCEPCIONES */}
      {mostrarExcepciones?.show && mostrarExcepciones.concepto && (
        <ModalExcepcionesPago
          isOpen={true}
          onClose={() => setMostrarExcepciones(null)}
          estudiante_id={estudianteSeleccionado || 0}
          concepto_id={mostrarExcepciones.concepto.id}
          concepto_nombre={mostrarExcepciones.concepto.nombre}
          monto_original={mostrarExcepciones.concepto.monto}
          monto_pagado={mostrarExcepciones.concepto.montoPagado || 0}
          monto_adeudado={mostrarExcepciones.concepto.monto}
          onExcepcionAplicada={() => {
            setMostrarExcepciones(null)
            recargarConceptosDelServidor()
          }}
        />
      )}
      {/* MODAL DE FINANCIAMIENTO DE DEUDA */}
      {estudianteSeleccionado && (
        <ModalFinanciamientoDeuda
          isOpen={mostrarModalDeuda}
          onClose={() => {
            setMostrarModalDeuda(false)
            setDeudaEstudiante(0)
          }}
          onConfirm={handleConfirmarFinanciamiento}
          deuda={deudaEstudiante}
          cuotaBase={20000}
          estudiante_nombre={estudiante ? `${estudiante.nombre} ${estudiante.apellido}` : ''}
          loading={procesandoDeuda}
        />
      )}
    </div>
  )
}
