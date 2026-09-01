import React, { useState, useEffect } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Receipt,
  Search,
  Trash2,
  Plus,
  RefreshCw,
  X,
  Gift,
  CreditCard,
  Split,
  Eye,
  EyeOff,
  Zap,
  User,
  Calendar,
  Tag,
} from 'lucide-react'
import { supabase } from '@renderer/lib/supabase'
import { useCobranzasMultiples, ConceptoSeleccionable } from '@renderer/hooks/useCobranzasMultiples'
import { ModalExcepcionesPago } from './ModalExcepcionesPago'
import { ModalConfirmacionCobro } from './ModalConfirmacionCobro'
import { formatoMoneda } from '@renderer/lib/helpers'
import { FiltrosCobranzasModernos } from './FiltrosCobranzasModernos'
import { ModalFinanciamientoDeuda } from './ModalFinanciamientoDeuda'
import { obtenerDeudaEstudiante, registrarFinanciamientoDeuda } from '@renderer/lib/deudaFinanciamientoUtils'

interface DeudaContextType {
  deuda: number
  añoAnterior: number
  añoInscripcion: number
  cuotaBase: number
}

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
  año?: number
  carrera_id?: number
}

interface PagoDividido {
  id: string
  metodo: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO'
  monto: number
  tipoTarjeta?: 'CREDITO' | 'DEBITO'
}

interface PestaniaTalonariosModernaProps {
  institucionId: number
  carreras: any[]
}

export const PestaniaTalonariosModerna: React.FC<PestaniaTalonariosModernaProps> = ({
  institucionId,
  carreras,
}) => {
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
  const [deudaContext, setDeudaContext] = useState<DeudaContextType | null>(null)

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
      // Obtener carrera del estudiante directamente del array
      const estud = estudiantes.find(e => e.id === estudianteSeleccionado)
      const carreraDelEstudiante = estud?.carrera_id
      obtenerConceptosPendientes(institucionId, estudianteSeleccionado, conceptos, carreraDelEstudiante)
        .then((pendientes) => setConceptosPendientes(pendientes))
        .catch((err) => console.error('Error:', err))
        .finally(() => setCargandoConceptos(false))
    }
  }, [conceptos, estudianteSeleccionado, institucionId, obtenerConceptosPendientes, estudiantes])

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
    setPagosMultiples(pagosMultiples.filter((p) => p.id !== id))
  }

  const handleActualizarPagoDividido = (id: string, campo: keyof PagoDividido, valor: any) => {
    setPagosMultiples(pagosMultiples.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)))
  }

  const calcularSumaPagosMultiples = () => {
    return pagosMultiples.reduce((sum, p) => sum + (p.monto || 0), 0)
  }

  const obtenerCuotaBase = (): number => {
    if (!estudiante) return 20000
    const carreraEstudiante = carreras.find((c: any) => c.id === estudiante.carrera_id)
    if (carreraEstudiante?.monto_cuota) {
      console.log(`💰 Cuota base: $${carreraEstudiante.monto_cuota}`)
      return carreraEstudiante.monto_cuota
    }
    return 20000
  }

  const totales = calcularTotales(conceptosPendientes)
  const estudiante = estudiantes.find((e) => e.id === estudianteSeleccionado)
  const sumaPagosMultiples = calcularSumaPagosMultiples()
  const pagoDivididoValido = !pagoDividido || Math.abs(sumaPagosMultiples - totales.totalConMora) < 0.01

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

    const conceptosSeleccionados = conceptosPendientes.filter(c => c.seleccionado)
    const tieneInscripcion = conceptosSeleccionados.some(c => c.tipo === 'INSCRIPCION')

    if (tieneInscripcion) {
      const conceptoInscripcion = conceptosSeleccionados.find(c => c.tipo === 'INSCRIPCION')
      const añoInscripcion = conceptoInscripcion?.año || new Date().getFullYear()
      const añoAnterior = añoInscripcion - 1
      const cuotaBase = obtenerCuotaBase()

      try {
        console.log(`🔍 Verificando deuda...`)
        const deuda = await obtenerDeudaEstudiante(estudianteSeleccionado, institucionId as any)
        
        if (deuda > 0) {
          console.log(`⚠️ Deuda detectada: $${deuda}`)
          setDeudaEstudiante(deuda)
          setDeudaContext({ deuda, añoAnterior, añoInscripcion, cuotaBase })
          setMostrarModalDeuda(true)
          return
        }
      } catch (err) {
        console.error('Error verificando deuda:', err)
      }
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

  const handleConfirmarFinanciamiento = async (
    opcion: 'pagar_ahora' | 'financiar_todo' | 'pago_inicial',
    monto_inicial?: number,
    cuotas?: number
  ) => {
    setProcesandoDeuda(true)
    try {
      if (!estudianteSeleccionado || !deudaContext) throw new Error('Datos incompletos')
      
      const { deuda, añoAnterior, añoInscripcion, cuotaBase } = deudaContext
      
      if (opcion === 'financiar_todo' || opcion === 'pago_inicial') {
        const resultado = await registrarFinanciamientoDeuda({
          estudiante_id: estudianteSeleccionado,
          institucion_id: institucionId,
          deuda_original: deuda,
          pago_inicial: opcion === 'pago_inicial' ? (monto_inicial || 0) : 0,
          cuotas: cuotas || 10,
          año_deuda: añoAnterior,
          año_financiamiento: añoInscripcion,
          metodo_pago: metodoPago
        })

        if (!resultado.success) throw new Error(resultado.error)
        setMensaje({ tipo: 'success', texto: resultado.mensaje })
      }

      setMostrarModalDeuda(false)
      setDeudaContext(null)
      setTimeout(() => { setMostrarModalConfirmacion(true) }, 500)
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + (err instanceof Error ? err.message : 'Desconocido') })
    } finally {
      setProcesandoDeuda(false)
    }
  }

  if (cargandoEstudiantes) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl mb-4 border border-blue-500/50">
            <Zap size={32} className="text-blue-400 animate-spin" />
          </div>
          <p className="text-slate-400 font-semibold">Cargando datos de cobranza...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER PREMIUM */}
      <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 border border-blue-400/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="relative p-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                <Receipt size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black">Cobranza Múltiple</h1>
                <p className="text-blue-100 text-sm mt-1">Gestiona pagos de múltiples conceptos</p>
              </div>
            </div>
            <button
              onClick={recargarConceptosDelServidor}
              disabled={recargandoConceptos}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold disabled:opacity-50 transition backdrop-blur"
            >
              <RefreshCw size={18} className={recargandoConceptos ? 'animate-spin' : ''} />
              {recargandoConceptos ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* MENSAJES */}
      {mensaje && (
        <div
          className={`p-4 rounded-xl border-l-4 backdrop-blur flex items-start gap-3 animate-in ${
            mensaje.tipo === 'success'
              ? 'bg-green-500/20 border-green-500 text-green-300'
              : 'bg-red-500/20 border-red-500 text-red-300'
          }`}
        >
          {mensaje.tipo === 'success' ? (
            <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{mensaje.texto}</p>
          </div>
        </div>
      )}

      {errorGlobal && (
        <div className="p-4 bg-red-500/20 border-l-4 border-red-500 rounded-xl text-red-300 flex items-start gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <span className="font-semibold">{errorGlobal}</span>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PANEL IZQUIERDO - BÚSQUEDA Y CONCEPTOS */}
        <div className="lg:col-span-2 space-y-6">
          {/* FILTROS MODERNOS */}
          <FiltrosCobranzasModernos
            estudiantes={estudiantes}
            carreras={carreras}
            onFiltrosChange={setEstudiantesFiltrados}
            onEstudianteSeleccionado={setEstudianteSeleccionado}
            estudianteSeleccionado={estudianteSeleccionado}
          />

          {/* SELECTOR ESTUDIANTE */}
          {estudiantesFiltrados.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl">
              <label className="block text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                <User size={18} className="text-blue-400" />
                Selecciona un Estudiante
              </label>
              <select
                value={estudianteSeleccionado || ''}
                onChange={(e) => setEstudianteSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none text-base font-semibold transition"
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
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandirConceptos(!expandirConceptos)}
                className="w-full px-6 py-4 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border-b border-slate-700/50 flex items-center justify-between hover:from-slate-700 hover:to-slate-600 transition"
              >
                <h3 className="text-sm font-bold text-white flex items-center gap-3">
                  <Tag size={18} className="text-blue-400" />
                  Conceptos Pendientes ({conceptosPendientes.length})
                </h3>
                {expandirConceptos ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>

              {expandirConceptos && (
                <div className="p-6">
                  {cargandoConceptos ? (
                    <div className="text-center py-12 text-slate-400">
                      <Zap className="mx-auto mb-3 animate-spin" size={24} />
                      Cargando conceptos...
                    </div>
                  ) : conceptosPendientes.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <CheckCircle2 className="mx-auto mb-3 text-green-400" size={32} />
                      <p className="font-semibold">Sin conceptos pendientes</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {conceptosPendientes.map((concepto) => (
                        <div
                          key={concepto.id}
                          className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-700/30 to-slate-600/30 rounded-xl border border-slate-600/50 hover:border-blue-500/50 hover:bg-slate-700/50 transition group"
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
                            className="w-6 h-6 rounded-lg border-2 border-slate-500 text-blue-600 cursor-pointer accent-blue-600"
                          />
                          <div className="flex-1">
                            <p className="font-bold text-white">{concepto.nombre}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {concepto.tipo} {concepto.mes ? `• Mes ${concepto.mes}` : ''}
                            </p>
                            {concepto.mora?.estaVencida && (
                              <p className="text-xs text-red-400 font-bold mt-1">
                                ⚠️ Vencida: +{formatoMoneda(concepto.mora.montoRecargo)} mora
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-black text-white text-lg">{formatoMoneda(concepto.montoFinal)}</p>
                            <button
                              onClick={() => setMostrarExcepciones({ show: true, concepto })}
                              className="text-xs text-orange-400 hover:text-orange-300 font-bold mt-2 opacity-0 group-hover:opacity-100 transition"
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
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-3">
                <CreditCard size={18} className="text-blue-400" />
                Método de Pago
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'EFECTIVO', label: '💵 Efectivo', icon: '💵' },
                  { value: 'TRANSFERENCIA', label: '🏦 Transferencia', icon: '🏦' },
                  { value: 'TARJETA_CREDITO', label: '💳 Crédito', icon: '💳' },
                  { value: 'TARJETA_DEBITO', label: '💳 Débito', icon: '💳' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`px-4 py-4 rounded-xl border-2 cursor-pointer font-semibold transition text-center ${
                      metodoPago === opt.value
                        ? 'border-blue-500 bg-blue-600/30 text-blue-300 shadow-lg'
                        : 'border-slate-600/50 bg-slate-700/30 text-slate-400 hover:border-slate-500/50 hover:bg-slate-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      checked={metodoPago === opt.value}
                      onChange={(e) => setMetodoPago(e.target.value as any)}
                      className="hidden"
                    />
                    <span className="text-lg">{opt.icon}</span>
                    <p className="text-xs mt-1">{opt.label}</p>
                  </label>
                ))}
              </div>

              {(metodoPago === 'TARJETA_CREDITO' || metodoPago === 'TARJETA_DEBITO') && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <label className="block text-xs font-bold text-slate-300 mb-3">Tipo de Tarjeta</label>
                  <div className="flex gap-3">
                    <label className="flex-1 px-3 py-3 border-2 border-slate-600/50 bg-slate-700/30 rounded-lg cursor-pointer hover:border-blue-500/50 transition font-semibold text-sm text-center text-slate-400">
                      <input
                        type="radio"
                        value="CREDITO"
                        checked={tipoTarjeta === 'CREDITO'}
                        onChange={(e) => setTipoTarjeta(e.target.value as any)}
                        className="hidden"
                      />
                      Crédito
                    </label>
                    <label className="flex-1 px-3 py-3 border-2 border-slate-600/50 bg-slate-700/30 rounded-lg cursor-pointer hover:border-blue-500/50 transition font-semibold text-sm text-center text-slate-400">
                      <input
                        type="radio"
                        value="DEBITO"
                        checked={tipoTarjeta === 'DEBITO'}
                        onChange={(e) => setTipoTarjeta(e.target.value as any)}
                        className="hidden"
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
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl">
              <label className="flex items-center gap-3 cursor-pointer mb-4">
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
                  className="w-5 h-5 rounded-lg border-2 border-slate-500 text-blue-600 accent-blue-600"
                />
                <span className="font-bold text-white flex items-center gap-2">
                  <Split size={18} className="text-blue-400" />
                  Dividir en múltiples métodos
                </span>
              </label>

              {pagoDividido && (
                <div className="space-y-4 bg-blue-500/10 p-4 rounded-xl border border-blue-500/50">
                  {pagosMultiples.map((pago, idx) => (
                    <div key={pago.id} className="flex gap-3 items-end p-4 bg-slate-700/50 rounded-xl border border-slate-600/50">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-300 mb-2">Método {idx + 1}</label>
                        <select
                          value={pago.metodo}
                          onChange={(e) => handleActualizarPagoDividido(pago.id, 'metodo', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm font-semibold focus:border-blue-500/50 focus:outline-none transition"
                        >
                          <option value="EFECTIVO">💵 Efectivo</option>
                          <option value="TRANSFERENCIA">🏦 Transferencia</option>
                          <option value="TARJETA_CREDITO">💳 T. Crédito</option>
                          <option value="TARJETA_DEBITO">💳 T. Débito</option>
                        </select>
                      </div>

                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-300 mb-2">Monto</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            value={pago.monto}
                            onChange={(e) => handleActualizarPagoDividido(pago.id, 'monto', parseFloat(e.target.value) || 0)}
                            className="w-full pl-7 pr-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm font-semibold focus:border-blue-500/50 focus:outline-none transition"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleEliminarPagoDividido(pago.id)}
                        className="px-4 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/50 rounded-lg font-bold transition"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleAgregarPagoDividido}
                    className="w-full px-3 py-3 bg-blue-600/50 hover:bg-blue-600 text-blue-300 rounded-lg font-bold transition flex items-center justify-center gap-2 border border-blue-500/50"
                  >
                    <Plus size={18} />
                    Agregar otro método
                  </button>

                  <div className="text-sm font-bold text-blue-300 bg-slate-700/50 p-4 rounded-lg border border-blue-500/30">
                    <div className="flex justify-between mb-2">
                      <span>Total a Dividir:</span>
                      <span className="text-lg text-white">{formatoMoneda(totales.totalConMora)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Suma de pagos:</span>
                      <span className={sumaPagosMultiples === totales.totalConMora ? 'text-green-400 text-lg' : 'text-orange-400 text-lg'}>
                        {formatoMoneda(sumaPagosMultiples)}
                      </span>
                    </div>
                    {!pagoDivididoValido && <p className="text-red-400 text-xs mt-3">⚠️ La suma no coincide con el total</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PANEL DERECHO - RESUMEN */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/50 rounded-2xl p-6 sticky top-8 backdrop-blur-xl">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
              <DollarSign size={28} className="text-blue-400" />
              Resumen
            </h3>

            {estudiante && (
              <div className="mb-6 p-4 bg-slate-700/50 border border-blue-500/50 rounded-xl">
                <p className="font-black text-white text-base">{estudiante.nombre} {estudiante.apellido}</p>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <span className="font-bold">DNI:</span> {estudiante.dni}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  <span className="font-bold">Estado:</span>{' '}
                  <span className="font-semibold text-blue-400">
                    {estudiante.estado === 'BECADO_100' ? 'Becado 100%' : estudiante.estado === 'BECADO_50' ? 'Becado 50%' : 'Activo'}
                  </span>
                </p>
              </div>
            )}

            {totales.cantidad > 0 && (
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-slate-700/50 rounded-xl border border-slate-600/50">
                  <p className="text-xs font-bold text-slate-300 mb-2 uppercase">Conceptos ({totales.cantidad})</p>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{totales.desglose}</p>
                </div>

                <div className="space-y-3 text-sm bg-slate-700/30 p-4 rounded-xl border border-slate-600/50">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-semibold">Subtotal:</span>
                    <span className="font-bold text-white">{formatoMoneda(totales.totalSinMora)}</span>
                  </div>

                  {totales.totalMora > 0 && (
                    <div className="flex justify-between py-3 border-t border-slate-600/50 text-red-400 font-bold">
                      <span>Mora (+):</span>
                      <span>{formatoMoneda(totales.totalMora)}</span>
                    </div>
                  )}

                  <div className="border-t border-blue-500/50 pt-3 flex justify-between text-lg font-black text-blue-400 bg-blue-500/10 -m-4 mt-3 px-4 py-3 rounded-lg">
                    <span>TOTAL:</span>
                    <span>{formatoMoneda(totales.totalConMora)}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleAbrirModalConfirmacion}
              disabled={registrando || totales.cantidad === 0 || (pagoDividido && !pagoDivididoValido)}
              className={`w-full py-4 px-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition text-base ${
                registrando || totales.cantidad === 0 || (pagoDividido && !pagoDivididoValido)
                  ? 'bg-slate-600 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 cursor-pointer shadow-lg hover:shadow-xl'
              }`}
            >
              <Receipt size={22} />
              {registrando ? 'Registrando Cobro...' : 'Registrar Cobro'}
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
      {estudianteSeleccionado && deudaContext && (
        <ModalFinanciamientoDeuda
          isOpen={mostrarModalDeuda}
          onClose={() => {
            setMostrarModalDeuda(false)
            setDeudaEstudiante(0)
            setDeudaContext(null)
          }}
          onConfirm={handleConfirmarFinanciamiento}
          deuda={deudaEstudiante}
          cuotaBase={deudaContext.cuotaBase}
          estudiante_nombre={estudiante ? `${estudiante.nombre} ${estudiante.apellido}` : ''}
          loading={procesandoDeuda}
        />
      )}
    </div>
  )
}