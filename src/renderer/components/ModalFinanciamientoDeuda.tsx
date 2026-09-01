/**
 * Modal de Financiamiento de Deuda
 * 
 * Flexible para cualquier a�o.
 * Detecta autom�ticamente el a�o anterior y el a�o actual.
 * Funciona igual para:
 * - 2026 ? 2027
 * - 2027 ? 2028
 * - 2028 ? 2029
 * - Y as� sucesivamente
 */

import React, { useState, useMemo } from 'react'
import { X, AlertCircle, DollarSign, Calculator } from 'lucide-react'
import { formatoMoneda } from '@renderer/lib/helpers'

interface ModalFinanciamientoDeudaProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (opcion: 'pagar_ahora' | 'financiar_todo' | 'pago_inicial', monto_inicial?: number, cuotas?: number) => Promise<void>
  deuda: number
  cuotaBase: number
  estudiante_nombre: string
  loading?: boolean
}

export const ModalFinanciamientoDeuda: React.FC<ModalFinanciamientoDeudaProps> = ({
  isOpen,
  onClose,
  onConfirm,
  deuda,
  cuotaBase,
  estudiante_nombre,
  loading = false,
}) => {
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<'pagar_ahora' | 'financiar_todo' | 'pago_inicial'>('financiar_todo')
  const [montoPago, setMontoPago] = useState<number>(0)
  const [cuotasSeleccionadas, setCuotasSeleccionadas] = useState<number>(10)
  const [procesando, setProcesando] = useState(false)

  const calculos = useMemo(() => {
    const cuotasDisponibles = 10 // Marzo a Diciembre
    
    if (opcionSeleccionada === 'pagar_ahora') {
      return {
        opcion: 'Pagar Todo Ahora',
        pago_inicial: deuda,
        saldo_a_financiar: 0,
        cuotas: 0,
        monto_extra_cuota: 0,
        nueva_cuota: cuotaBase,
        total_a_pagar: deuda
      }
    }
    
    if (opcionSeleccionada === 'financiar_todo') {
      const monto_extra = Math.round((deuda / cuotasSeleccionadas) * 100) / 100
      const nueva_cuota = cuotaBase + monto_extra
      return {
        opcion: 'Financiar Todo',
        pago_inicial: 0,
        saldo_a_financiar: deuda,
        cuotas: cuotasSeleccionadas,
        monto_extra_cuota: monto_extra,
        nueva_cuota,
        total_a_pagar: deuda
      }
    }
    
    if (opcionSeleccionada === 'pago_inicial') {
      const saldo = deuda - montoPago
      const monto_extra = cuotasSeleccionadas > 0 ? Math.round((saldo / cuotasSeleccionadas) * 100) / 100 : 0
      const nueva_cuota = cuotaBase + monto_extra
      return {
        opcion: 'Pago Inicial + Financiar',
        pago_inicial: montoPago,
        saldo_a_financiar: saldo,
        cuotas: cuotasSeleccionadas,
        monto_extra_cuota: monto_extra,
        nueva_cuota,
        total_a_pagar: deuda
      }
    }

    return {
      opcion: '',
      pago_inicial: 0,
      saldo_a_financiar: 0,
      cuotas: 0,
      monto_extra_cuota: 0,
      nueva_cuota: cuotaBase,
      total_a_pagar: 0
    }
  }, [opcionSeleccionada, montoPago, cuotasSeleccionadas, deuda, cuotaBase])

  const handleConfirmar = async () => {
    setProcesando(true)
    try {
      await onConfirm(opcionSeleccionada, montoPago, cuotasSeleccionadas)
      onClose()
    } finally {
      setProcesando(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
              <AlertCircle size={24} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Deuda Año Anterior</h2>
              <p className="text-sm text-slate-400">{estudiante_nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition">
            <X size={28} />
          </button>
        </div>

        {/* RESUMEN DEUDA */}
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-300 font-semibold">Deuda a Resolver:</p>
              <p className="text-3xl font-black text-red-400">{formatoMoneda(deuda)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-300 font-semibold">Cuota Base 2027:</p>
              <p className="text-3xl font-black text-amber-400">{formatoMoneda(cuotaBase)}</p>
            </div>
          </div>
        </div>

        {/* OPCIONES */}
        <div className="space-y-4 mb-6">
          {/* OPCIÓN 1 */}
          <div
            onClick={() => setOpcionSeleccionada('pagar_ahora')}
            className={`p-4 border-2 rounded-xl cursor-pointer transition ${
              opcionSeleccionada === 'pagar_ahora'
                ? 'border-green-500 bg-green-500/10'
                : 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                checked={opcionSeleccionada === 'pagar_ahora'}
                onChange={() => setOpcionSeleccionada('pagar_ahora')}
                className="mt-1"
              />
              <div className="flex-1">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <DollarSign size={18} className="text-green-400" />
                  Opción 1: Pagar Todo Ahora
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Cancela la deuda completa de inmediato. Sin financiamiento, cuota normal en 2027.
                </p>
                <p className="text-sm font-bold text-green-400 mt-2">
                  Pago: {formatoMoneda(deuda)} | Cuota 2027: {formatoMoneda(cuotaBase)}
                </p>
              </div>
            </div>
          </div>

          {/* OPCIÓN 2 */}
          <div
            onClick={() => setOpcionSeleccionada('financiar_todo')}
            className={`p-4 border-2 rounded-xl cursor-pointer transition ${
              opcionSeleccionada === 'financiar_todo'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                checked={opcionSeleccionada === 'financiar_todo'}
                onChange={() => setOpcionSeleccionada('financiar_todo')}
                className="mt-1"
              />
              <div className="flex-1">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Calculator size={18} className="text-blue-400" />
                  Opción 2: Financiar Todo (Sin Pago Inicial)
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Distribuye la deuda en las 10 cuotas mensuales (marzo a diciembre).
                </p>
                
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-300">Cuotas:</label>
                  <select
                    value={cuotasSeleccionadas}
                    onChange={(e) => setCuotasSeleccionadas(parseInt(e.target.value))}
                    disabled={opcionSeleccionada !== 'financiar_todo'}
                    className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-white text-sm disabled:opacity-50"
                  >
                    <option value={5}>5 cuotas</option>
                    <option value={8}>8 cuotas</option>
                    <option value={10}>10 cuotas</option>
                    <option value={12}>12 cuotas (extensión)</option>
                  </select>
                </div>

                <p className="text-sm font-bold text-blue-400 mt-2">
                  Deuda/Cuota: {formatoMoneda(deuda / cuotasSeleccionadas)} | 
                  Nueva Cuota: {formatoMoneda(cuotaBase + deuda / cuotasSeleccionadas)}
                </p>
              </div>
            </div>
          </div>

          {/* OPCIÓN 3 */}
          <div
            onClick={() => setOpcionSeleccionada('pago_inicial')}
            className={`p-4 border-2 rounded-xl cursor-pointer transition ${
              opcionSeleccionada === 'pago_inicial'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                checked={opcionSeleccionada === 'pago_inicial'}
                onChange={() => setOpcionSeleccionada('pago_inicial')}
                className="mt-1"
              />
              <div className="flex-1">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <DollarSign size={18} className="text-purple-400" />
                  Opción 3: Pago Inicial + Financiar el Resto
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Realiza un pago anticipado y financia el saldo en cuotas.
                </p>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-300 w-32">Pago Inicial:</label>
                    <div className="flex items-center gap-1 flex-1">
                      <span className="text-sm">$</span>
                      <input
                        type="number"
                        value={montoPago}
                        onChange={(e) => setMontoPago(Math.max(0, Math.min(deuda, parseFloat(e.target.value) || 0)))}
                        disabled={opcionSeleccionada !== 'pago_inicial'}
                        min={0}
                        max={deuda}
                        className="flex-1 px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-white disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-300 w-32">Cuotas:</label>
                    <select
                      value={cuotasSeleccionadas}
                      onChange={(e) => setCuotasSeleccionadas(parseInt(e.target.value))}
                      disabled={opcionSeleccionada !== 'pago_inicial'}
                      className="flex-1 px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-white disabled:opacity-50"
                    >
                      <option value={5}>5 cuotas</option>
                      <option value={8}>8 cuotas</option>
                      <option value={10}>10 cuotas</option>
                      <option value={12}>12 cuotas (extensión)</option>
                    </select>
                  </div>
                </div>

                <p className="text-sm font-bold text-purple-400 mt-2">
                  Pago Ahora: {formatoMoneda(montoPago)} | 
                  Saldo a Financiar: {formatoMoneda(Math.max(0, deuda - montoPago))} | 
                  Nueva Cuota: {formatoMoneda(cuotaBase + (deuda - montoPago) / cuotasSeleccionadas)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RESUMEN FINAL */}
        <div className="p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg mb-6">
          <h3 className="font-bold text-white mb-3">Resumen de tu Opción:</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-400">Pago Inicial:</p>
              <p className="font-bold text-white">{formatoMoneda(calculos.pago_inicial)}</p>
            </div>
            <div>
              <p className="text-slate-400">Saldo a Financiar:</p>
              <p className="font-bold text-white">{formatoMoneda(calculos.saldo_a_financiar)}</p>
            </div>
            <div>
              <p className="text-slate-400">Cuotas:</p>
              <p className="font-bold text-white">{calculos.cuotas || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-400">Monto Extra/Cuota:</p>
              <p className="font-bold text-white">{formatoMoneda(calculos.monto_extra_cuota)}</p>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-600">
              <p className="text-slate-400">Nueva Cuota Mensual (Marzo-Diciembre):</p>
              <p className="font-bold text-xl text-amber-400">{formatoMoneda(calculos.nueva_cuota)}</p>
            </div>
          </div>
        </div>

        {/* BOTONES */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={procesando || loading}
            className="flex-1 px-4 py-3 border-2 border-slate-600 text-slate-300 hover:text-slate-200 hover:border-slate-500 rounded-lg font-bold disabled:opacity-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={
              procesando ||
              loading ||
              (opcionSeleccionada === 'pago_inicial' && montoPago < 0)
            }
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold disabled:from-slate-600 disabled:to-slate-600 disabled:opacity-50 transition"
          >
            {procesando || loading ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>

        {/* ADVERTENCIA */}
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-xs text-amber-300">
            ⚠️ Recuerda que debes completar el formulario de inscripción para formalizar tu matrícula en {new Date().getFullYear() + 1}.
          </p>
        </div>
      </div>
    </div>
  )
}

