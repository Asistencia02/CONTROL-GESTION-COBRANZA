import React, { useState, useMemo } from 'react'
import { Edit2, FileText, Filter, X, Plus, Trash2, Gift, BarChart3, CreditCard, AlertCircle, TrendingUp, Search } from 'lucide-react'
import { formatoMoneda, formatoFecha } from '@renderer/lib/helpers'
import { calcularMora } from '@renderer/lib/moraCalculator'
import { useExcepcionesCobro } from '@renderer/hooks/useExcepcionesCobro'
import { usePagoValidation } from '@renderer/hooks/usePagoValidation'
import { ModalExcepcionesPago } from './ModalExcepcionesPago'
import { ModalAnulacionPago } from './ModalAnulacionPago'

interface Estudiante {
  id: number
  nombre: string
  apellido: string
  dni: string
  estado: string
}

interface ConceptoPago {
  id: number
  nombre: string
  tipo: string
  monto: number
  mes?: number
}

interface Pago {
  id: number | string
  estudiante_id: number
  concepto_id: number
  monto_pagado: number
  monto_original: number
  metodo_pago: string
  tipo_tarjeta?: string | null
  fecha_pago: string
  numero_talonario?: string | null
  cae?: string | null
  anulado?: boolean
  estado?: string
  fecha_anulacion?: string | null
  razon_anulacion?: string | null
  estudiantes?: { nombre: string; apellido: string; dni: string }
  conceptos_pago?: { nombre: string; tipo: string; monto: number; mes?: number }
}

interface RegistroPagosProps {
  estudiantes: Estudiante[]
  pagos: Pago[]
  conceptos: ConceptoPago[]
  onAgregarTalonario: (pagoId: number | string, numeroTalonario: string) => Promise<void>
  onAnularPago?: (pagoId: number | string) => Promise<void>
  onRecargarPagos?: () => Promise<void>
  loading?: boolean
}

export const RegistroPagos: React.FC<RegistroPagosProps> = ({
  estudiantes,
  pagos,
  conceptos,
  onAgregarTalonario,
  onAnularPago,
  onRecargarPagos,
  loading = false,
}) => {
  const { crearPerdonMora, registrarPagoParcial } = useExcepcionesCobro()
  const { anularPago, reactivarPago } = usePagoValidation()

  const [filtroEstudiante, setFiltroEstudiante] = useState<string>('')
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [modalTalonario, setModalTalonario] = useState<{ pagoId: number | string; numeroActual?: string } | null>(null)
  const [numeroTalonarioInput, setNumeroTalonarioInput] = useState('')
  const [guardandoTalonario, setGuardandoTalonario] = useState(false)
  const [errorTalonario, setErrorTalonario] = useState('')
  const [mostrarExcepciones, setMostrarExcepciones] = useState<{
    show: boolean
    pagoId?: number | string
    estudianteId?: number
    conceptoId?: number
    conceptoNombre?: string
    montoOriginal?: number
    montoPagado?: number
  } | null>(null)
  const [modalAnulacion, setModalAnulacion] = useState<{ pagoId: number | string; pago: Pago } | null>(null)
  const [anulando, setAnulando] = useState(false)

  // Función para detectar si un pago está anulado
  const esAnulado = (pago: Pago): boolean => {
    return pago.estado === 'ANULADO'
  }

  const creditosPorEstudiante = useMemo(() => {
    const mapa: Record<number, number> = {}
    
    pagos.forEach(pago => {
      if (!esAnulado(pago) && pago.monto_pagado > pago.monto_original) {
        const credito = pago.monto_pagado - pago.monto_original
        mapa[pago.estudiante_id] = (mapa[pago.estudiante_id] || 0) + credito
      }
    })

    return mapa
  }, [pagos])

  const pagosFiltrados = useMemo(() => {
    return pagos.filter((pago) => {
      if (filtroEstudiante && pago.estudiante_id !== parseInt(filtroEstudiante)) {
        return false
      }

      if (filtroTipo && pago.conceptos_pago?.tipo !== filtroTipo) {
        return false
      }

      if (filtroEstado === 'pagado' && !pago.numero_talonario) {
        return false
      }
      if (filtroEstado === 'pendiente' && pago.numero_talonario) {
        return false
      }

      return true
    }).sort((a, b) => {
      const fechaA = new Date(a.fecha_pago).getTime()
      const fechaB = new Date(b.fecha_pago).getTime()
      return fechaB - fechaA
    })
  }, [pagos, filtroEstudiante, filtroTipo, filtroEstado])

  const pagosSinTalonario = useMemo(() => {
    return pagos.filter((pago) => !esAnulado(pago) && !pago.numero_talonario).sort((a, b) => {
      const fechaA = new Date(a.fecha_pago).getTime()
      const fechaB = new Date(b.fecha_pago).getTime()
      return fechaB - fechaA
    })
  }, [pagos])

  // Estadísticas
  const stats = useMemo(() => {
    const pagosActivos = pagos.filter(p => !esAnulado(p))
    const totalRecaudado = pagosActivos.reduce((sum, p) => sum + p.monto_pagado, 0)
    const totalConTalonario = pagosActivos.filter(p => p.numero_talonario).reduce((sum, p) => sum + p.monto_pagado, 0)
    const totalSinTalonario = pagosActivos.filter(p => !p.numero_talonario).reduce((sum, p) => sum + p.monto_pagado, 0)
    
    return {
      totalRecaudado,
      totalConTalonario,
      totalSinTalonario,
      cantidadPagos: pagosActivos.length,
      cantidadSinTalonario: pagosSinTalonario.length
    }
  }, [pagos, pagosSinTalonario])

  const handleAbrirModalTalonario = (pagoId: number | string, numeroActual?: string) => {
    setModalTalonario({ pagoId, numeroActual })
    setNumeroTalonarioInput(numeroActual || '')
    setErrorTalonario('')
  }

  const handleGuardarTalonario = async () => {
    if (!modalTalonario) return

    if (!numeroTalonarioInput.trim()) {
      setErrorTalonario('Número de talonario es requerido')
      return
    }

    setGuardandoTalonario(true)
    setErrorTalonario('')
    try {
      await onAgregarTalonario(modalTalonario.pagoId, numeroTalonarioInput.trim())
      setModalTalonario(null)
      setNumeroTalonarioInput('')
    } catch (err) {
      setErrorTalonario(err instanceof Error ? err.message : 'Error al guardar talonario')
    } finally {
      setGuardandoTalonario(false)
    }
  }

  const handleAbrirExcepciones = (pago: Pago) => {
    setMostrarExcepciones({
      show: true,
      pagoId: pago.id,
      estudianteId: pago.estudiante_id,
      conceptoId: pago.concepto_id,
      conceptoNombre: pago.conceptos_pago?.nombre || '',
      montoOriginal: pago.monto_original,
      montoPagado: pago.monto_pagado,
    })
  }

  const handleExcepcionAplicada = async () => {
    setMostrarExcepciones(null)
    if (onRecargarPagos) {
      await onRecargarPagos()
    }
  }

  const handleAbrirAnulacion = (pago: Pago) => {
    if (!pago.id) {
      alert('Error: No se pudo obtener el ID del pago')
      return
    }
    setModalAnulacion({ pagoId: pago.id, pago })
  }

  const handleConfirmarAnulacion = async (motivo: string) => {
    if (!modalAnulacion) return

    setAnulando(true)
    try {
      const resultado = await anularPago(modalAnulacion.pagoId, motivo, 'Usuario')
      if (resultado.success) {
        alert(resultado.mensaje)
        setModalAnulacion(null)
        if (onRecargarPagos) {
          await onRecargarPagos()
        }
      } else {
        alert(`Error: ${resultado.mensaje}`)
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Error desconocido'}`)
    } finally {
      setAnulando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER CON ESTADÍSTICAS */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-2xl shadow-lg border border-green-500/50">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <TrendingUp size={28} />
          Registro de Pagos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:border-white/40 transition">
            <p className="text-xs font-semibold opacity-90 uppercase">Total Recaudado</p>
            <p className="text-2xl font-bold mt-2">{formatoMoneda(stats.totalRecaudado)}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:border-white/40 transition">
            <p className="text-xs font-semibold opacity-90 uppercase">Con Talonario</p>
            <p className="text-2xl font-bold mt-2">{formatoMoneda(stats.totalConTalonario)}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:border-white/40 transition">
            <p className="text-xs font-semibold opacity-90 uppercase">Sin Talonario</p>
            <p className="text-2xl font-bold mt-2 text-orange-200">{formatoMoneda(stats.totalSinTalonario)}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:border-white/40 transition">
            <p className="text-xs font-semibold opacity-90 uppercase">Total Pagos</p>
            <p className="text-2xl font-bold mt-2">{stats.cantidadPagos}</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:border-white/40 transition">
            <p className="text-xs font-semibold opacity-90 uppercase">Pendientes</p>
            <p className="text-2xl font-bold mt-2 text-orange-200">{stats.cantidadSinTalonario}</p>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-blue-400" />
          <h3 className="font-bold text-white">Filtros</h3>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Estudiante</label>
            <select
              value={filtroEstudiante}
              onChange={(e) => setFiltroEstudiante(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none transition text-sm"
            >
              <option value="">Todos</option>
              {estudiantes.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.nombre} {est.apellido}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Concepto</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none transition text-sm"
            >
              <option value="">Todos</option>
              <option value="INSCRIPCION">Inscripción</option>
              <option value="CUOTA">Cuota</option>
              <option value="SEGURO">Seguro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none transition text-sm"
            >
              <option value="">Todos</option>
              <option value="pagado">✓ Con Talonario</option>
              <option value="pendiente">⏳ Sin Talonario</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA DE PAGOS */}
      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border-b border-slate-700/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-3">
            <BarChart3 size={22} className="text-blue-400" />
            Pagos Registrados ({pagosFiltrados.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-700/30 border-b border-slate-700/50">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-300">Estudiante</th>
                <th className="px-6 py-4 text-left font-bold text-slate-300">DNI</th>
                <th className="px-6 py-4 text-left font-bold text-slate-300">Concepto</th>
                <th className="px-6 py-4 text-center font-bold text-slate-300">Tipo</th>
                <th className="px-6 py-4 text-right font-bold text-slate-300">Original</th>
                <th className="px-6 py-4 text-right font-bold text-slate-300">Pagado</th>
                <th className="px-6 py-4 text-center font-bold text-slate-300">Método</th>
                <th className="px-6 py-4 text-left font-bold text-slate-300">Fecha</th>
                <th className="px-6 py-4 text-center font-bold text-slate-300">Talonario</th>
                <th className="px-6 py-4 text-center font-bold text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {pagosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-slate-400 font-medium">
                    No hay pagos con los filtros aplicados
                  </td>
                </tr>
              ) : (
                pagosFiltrados.map((pago) => {
                  const montoAdeudado = pago.monto_original - pago.monto_pagado

                  return (
                    <tr key={pago.id} className={`hover:bg-slate-700/20 transition border-slate-700/30 ${esAnulado(pago) ? 'bg-red-900/20' : ''}`}>
                      <td className="px-6 py-4 font-semibold text-white">
                        {pago.estudiantes?.nombre} {pago.estudiantes?.apellido}
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-sm">{pago.estudiantes?.dni}</td>
                      <td className="px-6 py-4 text-slate-300">{pago.conceptos_pago?.nombre}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/50 rounded-full text-xs font-bold">
                          {pago.conceptos_pago?.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-300">
                        {formatoMoneda(pago.monto_original)}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${esAnulado(pago) ? 'text-red-400 line-through' : 'text-green-400'}`}>
                        {formatoMoneda(pago.monto_pagado)}
                      </td>
                      <td className="px-6 py-4 text-center text-lg">
                        {pago.metodo_pago === 'EFECTIVO' && '💵'}
                        {pago.metodo_pago === 'TRANSFERENCIA' && '🏦'}
                        {pago.metodo_pago === 'TARJETA_CREDITO' && '💳'}
                        {pago.metodo_pago === 'TARJETA_DEBITO' && '💳'}
                      </td>
                      <td className="px-6 py-4 text-slate-400">{formatoFecha(pago.fecha_pago)}</td>
                      <td className="px-6 py-4 text-center">
                        {esAnulado(pago) ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-600/30 text-red-300 border border-red-500/50 rounded-full text-xs font-bold">
                            <X size={14} />
                            ANULADO
                          </span>
                        ) : pago.numero_talonario ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-300 border border-green-500/50 rounded-full text-xs font-bold">
                            <FileText size={14} />
                            {pago.numero_talonario}
                          </span>
                        ) : (
                          <span className="text-orange-400 font-bold text-xs px-2 py-1 bg-orange-500/20 border border-orange-500/50 rounded-full">SIN TALÓN</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center flex-wrap">
                          {!esAnulado(pago) && (
                            <>
                              <button
                                onClick={() => handleAbrirModalTalonario(pago.id, pago.numero_talonario || '')}
                                className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/50 rounded-lg font-bold text-xs transition flex items-center gap-1"
                                title="Asignar talonario"
                              >
                                <Edit2 size={12} />
                                Talón
                              </button>

                              {montoAdeudado > 0 && (
                                <button
                                  onClick={() => handleAbrirExcepciones(pago)}
                                  className="px-3 py-1 bg-orange-600/30 hover:bg-orange-600/50 text-orange-300 border border-orange-500/50 rounded-lg font-bold text-xs transition flex items-center gap-1"
                                  title="Excepción o pago parcial"
                                >
                                  <Gift size={12} />
                                  Excep
                                </button>
                              )}

                              <button
                                onClick={() => handleAbrirAnulacion(pago)}
                                className="px-3 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/50 rounded-lg font-bold text-xs transition flex items-center gap-1"
                                title="Anular pago"
                              >
                                <Trash2 size={12} />
                                Anular
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGOS SIN TALONARIO */}
      {pagosSinTalonario.length > 0 && (
        <div className="bg-gradient-to-br from-orange-900/30 to-red-900/20 border-2 border-orange-500/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600">
            <h2 className="text-lg font-bold text-white flex items-center gap-3">
              <AlertCircle size={22} className="text-orange-200" />
              Pagos Pendientes de Talonario ({pagosSinTalonario.length})
            </h2>
            <p className="text-xs text-orange-100 mt-2">Registrados pero sin número de talonario asignado</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-orange-800/30 border-b border-orange-500/30">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-orange-200">Estudiante</th>
                  <th className="px-6 py-3 text-left font-bold text-orange-200">DNI</th>
                  <th className="px-6 py-3 text-left font-bold text-orange-200">Concepto</th>
                  <th className="px-6 py-3 text-right font-bold text-orange-200">Monto</th>
                  <th className="px-6 py-3 text-left font-bold text-orange-200">Fecha</th>
                  <th className="px-6 py-3 text-center font-bold text-orange-200">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-500/30">
                {pagosSinTalonario.map((pago) => (
                  <tr key={pago.id} className="hover:bg-orange-500/10 transition">
                    <td className="px-6 py-4 font-semibold text-white">
                      {pago.estudiantes?.nombre} {pago.estudiantes?.apellido}
                    </td>
                    <td className="px-6 py-4 text-orange-300 font-mono text-sm">{pago.estudiantes?.dni}</td>
                    <td className="px-6 py-4 text-orange-200">{pago.conceptos_pago?.nombre}</td>
                    <td className="px-6 py-4 text-right font-bold text-orange-400">
                      {formatoMoneda(pago.monto_pagado)}
                    </td>
                    <td className="px-6 py-4 text-orange-300">{formatoFecha(pago.fecha_pago)}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleAbrirModalTalonario(pago.id, pago.numero_talonario || '')}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-xs transition flex items-center gap-2 mx-auto"
                      >
                        <Edit2 size={14} />
                        Asignar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL TALONARIO */}
      {modalTalonario && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <FileText size={24} className="text-blue-400" />
                Número de Talonario
              </h3>
              <button onClick={() => setModalTalonario(null)} className="text-slate-400 hover:text-slate-200 transition p-1">
                <X size={28} />
              </button>
            </div>

            {errorTalonario && (
              <div className="mb-4 p-4 bg-red-500/20 border-l-4 border-red-500 text-red-300 rounded-lg text-sm font-medium">
                {errorTalonario}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wide">
                Número <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={numeroTalonarioInput}
                onChange={(e) => setNumeroTalonarioInput(e.target.value)}
                placeholder="Ej: 0001 o 00001-00010"
                disabled={guardandoTalonario}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none text-base font-semibold transition"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalTalonario(null)}
                disabled={guardandoTalonario}
                className="flex-1 px-4 py-3 border-2 border-slate-600/50 text-slate-300 hover:text-slate-200 hover:border-slate-500/50 hover:bg-slate-700/50 rounded-lg font-bold disabled:opacity-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarTalonario}
                disabled={guardandoTalonario}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-bold disabled:from-slate-600 disabled:to-slate-600 transition shadow-lg"
              >
                {guardandoTalonario ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCEPCIONES */}
      {mostrarExcepciones?.show && (
        <ModalExcepcionesPago
          isOpen={true}
          onClose={() => setMostrarExcepciones(null)}
          estudiante_id={mostrarExcepciones.estudianteId || 0}
          concepto_id={mostrarExcepciones.conceptoId || 0}
          concepto_nombre={mostrarExcepciones.conceptoNombre || ''}
          monto_original={mostrarExcepciones.montoOriginal || 0}
          monto_pagado={mostrarExcepciones.montoPagado || 0}
          monto_adeudado={(mostrarExcepciones.montoOriginal || 0) - (mostrarExcepciones.montoPagado || 0)}
          onExcepcionAplicada={handleExcepcionAplicada}
        />
      )}

      {/* MODAL ANULACIÓN */}
      {modalAnulacion && (
        <ModalAnulacionPago
          isOpen={true}
          onClose={() => setModalAnulacion(null)}
          onConfirmar={handleConfirmarAnulacion}
          estudiante={`${modalAnulacion.pago.estudiantes?.nombre} ${modalAnulacion.pago.estudiantes?.apellido}`}
          monto={modalAnulacion.pago.monto_pagado}
          concepto={modalAnulacion.pago.conceptos_pago?.nombre || ''}
          cargando={anulando}
        />
      )}
    </div>
  )
}
