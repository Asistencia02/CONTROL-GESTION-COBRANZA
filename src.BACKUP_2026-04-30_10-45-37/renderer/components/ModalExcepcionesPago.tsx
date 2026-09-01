import React, { useState } from 'react'
import { useExcepcionesCobro } from '@renderer/hooks/useExcepcionesCobro'
import { formatoMoneda } from '@renderer/lib/helpers'
import { Gift, Percent, X, AlertCircle, CreditCard } from 'lucide-react'

interface ModalExcepcionesPagoProps {
  isOpen: boolean
  onClose: () => void
  estudiante_id: number
  concepto_id: number
  concepto_nombre: string
  monto_original: number
  monto_pagado: number
  monto_adeudado?: number
  onExcepcionAplicada?: () => void
  soloModosParcial?: boolean
  metodoPago?: string
  tipoTarjeta?: string
}

export const ModalExcepcionesPago: React.FC<ModalExcepcionesPagoProps> = ({
  isOpen,
  onClose,
  estudiante_id,
  concepto_id,
  concepto_nombre,
  monto_original,
  monto_pagado,
  monto_adeudado: monto_adeudado_prop,
  onExcepcionAplicada,
  soloModosParcial = false,
  metodoPago = 'EFECTIVO',
  tipoTarjeta,
}) => {
  const { crearPerdonMora, registrarPagoParcial, loading } = useExcepcionesCobro()
  const [activeTab, setActiveTab] = useState<'perdon' | 'parcial'>(soloModosParcial ? 'parcial' : 'perdon')
  const [motivo, setMotivo] = useState('')
  const [metodo, setMetodo] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO'>(metodoPago as any)
  const [tipoT, setTipoT] = useState<'CREDITO' | 'DEBITO'>(tipoTarjeta as any || 'CREDITO')
  const [numeroTransaccion, setNumeroTransaccion] = useState('')
  
  // Calcular monto adeudado correctamente
  const monto_adeudado = monto_adeudado_prop || (monto_original - monto_pagado)
  const [montoParcial, setMontoParcial] = useState(monto_adeudado)
  const [procesando, setProcesando] = useState(false)

  const handlePerdonMora = async () => {
    if (!motivo.trim()) {
      alert('Debes ingresar un motivo')
      return
    }

    setProcesando(true)
    const exitoso = await crearPerdonMora(estudiante_id, concepto_id, motivo)
    setProcesando(false)

    if (exitoso) {
      alert('✓ Perdón de mora aplicado')
      onExcepcionAplicada?.()
      handleClose()
    }
  }

  const handlePagoParcial = async () => {
    if (montoParcial <= 0 || montoParcial > monto_adeudado) {
      alert('Monto debe ser entre 0 y ' + formatoMoneda(monto_adeudado))
      return
    }

    if (metodo === 'TRANSFERENCIA' && !numeroTransaccion.trim()) {
      alert('Debes ingresar el número de transacción')
      return
    }

    setProcesando(true)
    const exitoso = await registrarPagoParcial(
      estudiante_id,
      concepto_id,
      montoParcial,
      monto_original,
      metodo,
      tipoT
    )
    setProcesando(false)

    if (exitoso) {
      const montoRestante = monto_adeudado - montoParcial
      alert(`✓ Pago parcial registrado: ${formatoMoneda(montoParcial)}\nMétodo: ${metodo}${tipoT ? ` (${tipoT})` : ''}\nPendiente: ${formatoMoneda(montoRestante)}`)
      onExcepcionAplicada?.()
      handleClose()
    }
  }

  const handleClose = () => {
    setMotivo('')
    setMontoParcial(monto_adeudado)
    setActiveTab('perdon')
    setMetodo('EFECTIVO')
    setTipoT('CREDITO')
    setNumeroTransaccion('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
              <AlertCircle size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Excepciones de Cobro</h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-200 transition p-1" disabled={procesando}>
            <X size={24} />
          </button>
        </div>

        {/* Concepto Info */}
        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 p-4 rounded-xl mb-6">
          <div className="space-y-2 text-sm">
            <p className="text-slate-300">
              <span className="font-semibold text-slate-200">Concepto:</span> {concepto_nombre}
            </p>
            <p className="text-slate-300">
              <span className="font-semibold text-slate-200">Original:</span> <span className="text-white font-bold">{formatoMoneda(monto_original)}</span>
            </p>
            <p className="text-slate-300">
              <span className="font-semibold text-slate-200">Ya Pagado:</span> <span className="text-green-400 font-bold">{formatoMoneda(monto_pagado)}</span>
            </p>
            <p className="text-slate-300 pt-2 border-t border-orange-500/30">
              <span className="font-semibold text-slate-200">Adeudado:</span> <span className="text-red-400 font-bold text-lg">{formatoMoneda(monto_adeudado)}</span>
            </p>
          </div>
        </div>

        {/* Tabs - Solo mostrar si no es modo parcial únicamente */}
        {!soloModosParcial && (
          <div className="flex gap-2 mb-6 border-b border-slate-700/50">
            <button
              onClick={() => setActiveTab('perdon')}
              className={`flex-1 py-3 px-3 font-semibold text-sm border-b-2 transition flex items-center justify-center gap-2 ${
                activeTab === 'perdon'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gift size={16} />
              Perdonar Mora
            </button>
            <button
              onClick={() => setActiveTab('parcial')}
              className={`flex-1 py-3 px-3 font-semibold text-sm border-b-2 transition flex items-center justify-center gap-2 ${
                activeTab === 'parcial'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Percent size={16} />
              Pago Parcial
            </button>
          </div>
        )}

        {/* Perdonar Mora Tab - Solo mostrar si no es modo parcial únicamente */}
        {!soloModosParcial && activeTab === 'perdon' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                Motivo del Perdón
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Situación económica difícil, caso social, etc."
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-orange-500/50 focus:outline-none transition resize-none"
                rows={3}
              />
            </div>

            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-lg p-3">
              <p className="text-sm text-orange-300 font-semibold mb-2">Resultado:</p>
              <p className="text-sm text-slate-300">
                Se perdonarán: <span className="font-bold text-red-400 text-lg">{formatoMoneda(monto_adeudado)}</span>
              </p>
            </div>

            <button
              onClick={handlePerdonMora}
              disabled={!motivo.trim() || procesando || loading}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-bold transition shadow-lg"
            >
              {procesando ? 'Procesando...' : 'Aplicar Perdón'}
            </button>
          </div>
        )}

        {/* Pago Parcial Tab */}
        {activeTab === 'parcial' && (
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Monto a Pagar (Máximo: {formatoMoneda(monto_adeudado)})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  value={montoParcial}
                  onChange={(e) => setMontoParcial(parseFloat(e.target.value) || 0)}
                  min="0"
                  max={monto_adeudado}
                  className="w-full pl-8 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none transition font-semibold"
                />
              </div>
            </div>

            {/* Método de Pago */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                <CreditCard size={16} className="text-blue-400" />
                Método de Pago
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'EFECTIVO', label: '💵 Efectivo' },
                  { value: 'TRANSFERENCIA', label: '🏦 Transfer.' },
                  { value: 'TARJETA_CREDITO', label: '💳 Crédito' },
                  { value: 'TARJETA_DEBITO', label: '💳 Débito' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`px-3 py-2 rounded-lg border-2 cursor-pointer font-semibold transition text-center text-sm ${
                      metodo === opt.value
                        ? 'border-blue-500 bg-blue-600/30 text-blue-300'
                        : 'border-slate-600/50 bg-slate-700/30 text-slate-400 hover:border-slate-500/50 hover:bg-slate-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      checked={metodo === opt.value}
                      onChange={(e) => setMetodo(e.target.value as any)}
                      className="hidden"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Número de Transacción - Solo para transferencias */}
            {metodo === 'TRANSFERENCIA' && (
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Número de Transacción</label>
                <input
                  type="text"
                  value={numeroTransaccion}
                  onChange={(e) => setNumeroTransaccion(e.target.value)}
                  placeholder="Ej: 123456789"
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none text-sm font-medium transition"
                />
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/50 rounded-lg p-3">
              <p className="text-sm text-blue-300 font-semibold mb-2">Resumen:</p>
              <div className="space-y-1 text-sm text-slate-300">
                <p>
                  Pagará Ahora: <span className="font-bold text-blue-400 text-lg">{formatoMoneda(montoParcial)}</span>
                </p>
                <p>
                  Método: <span className="font-bold text-white">
                    {metodo === 'EFECTIVO' ? '💵 Efectivo' : metodo === 'TRANSFERENCIA' ? '🏦 Transfer.' : metodo === 'TARJETA_CREDITO' ? '💳 Crédito' : '💳 Débito'}
                  </span>
                </p>
                <p className="pt-1 border-t border-blue-500/30">
                  Quedará Pendiente: <span className="font-bold text-orange-400 text-lg">{formatoMoneda(Math.max(0, monto_adeudado - montoParcial))}</span>
                </p>
              </div>
            </div>

            <button
              onClick={handlePagoParcial}
              disabled={
                montoParcial <= 0 || 
                montoParcial > monto_adeudado || 
                procesando || 
                loading ||
                (metodo === 'TRANSFERENCIA' && !numeroTransaccion.trim())
              }
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-bold transition shadow-lg"
            >
              {procesando ? 'Procesando...' : 'Registrar Pago Parcial'}
            </button>
          </div>
        )}

        {/* Botón Cerrar */}
        <button
          onClick={handleClose}
          disabled={procesando}
          className="w-full py-3 border-2 border-slate-600/50 text-slate-300 hover:text-slate-200 hover:border-slate-500/50 hover:bg-slate-700/50 rounded-lg font-bold transition disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}