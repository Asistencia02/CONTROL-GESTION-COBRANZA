import React, { useState } from 'react'
import { X, AlertCircle, CreditCard } from 'lucide-react'
import { formatoMoneda } from '@renderer/lib/helpers'
import { supabase } from '@renderer/lib/supabase'
import { obtenerFechaLocalIso } from '@renderer/lib/dateUtils'

interface ModalPagoParcialProps {
  isOpen: boolean
  onClose: () => void
  estudiante_id: number
  institucion_id: number
  concepto_id: number
  concepto_nombre: string
  monto_original: number
  monto_pagado: number
  onPagoRegistrado?: () => void
}

export const ModalPagoParcial: React.FC<ModalPagoParcialProps> = ({
  isOpen,
  onClose,
  estudiante_id,
  institucion_id,
  concepto_id,
  concepto_nombre,
  monto_original,
  monto_pagado,
  onPagoRegistrado,
}) => {
  const monto_adeudado = monto_original - monto_pagado
  const [montoParcial, setMontoParcial] = useState(monto_adeudado)
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO'>('EFECTIVO')
  const [tipoTarjeta, setTipoTarjeta] = useState<'CREDITO' | 'DEBITO'>('CREDITO')
  const [numeroTransaccion, setNumeroTransaccion] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  const handleRegistrar = async () => {
    setError('')

    if (montoParcial <= 0) {
      setError('El monto debe ser mayor a $0')
      return
    }

    if (montoParcial > monto_adeudado) {
      setError(`El monto no puede superar lo adeudado: ${formatoMoneda(monto_adeudado)}`)
      return
    }

    if (metodoPago === 'TRANSFERENCIA' && !numeroTransaccion.trim()) {
      setError('Debes ingresar el número de transacción para transferencias')
      return
    }

    setProcesando(true)

    try {
      // Verificar si ya existe un pago para este concepto
      const { data: pagoExistente } = await supabase
        .from('pagos')
        .select('id, monto_pagado')
        .eq('estudiante_id', estudiante_id)
        .eq('concepto_id', concepto_id)
        .maybeSingle()

      if (pagoExistente) {
        // Actualizar: SUMAR el nuevo monto al existente
        const nuevoMonto = pagoExistente.monto_pagado + montoParcial

        if (nuevoMonto > monto_original) {
          setError(`El total no puede superar ${formatoMoneda(monto_original)}`)
          setProcesando(false)
          return
        }

        const { error: errorUpdate } = await supabase
          .from('pagos')
          .update({
            monto_pagado: nuevoMonto,
            metodo_pago: metodoPago,
            tipo_tarjeta: metodoPago.includes('TARJETA') ? tipoTarjeta : null,
            numero_transaccion: numeroTransaccion || null,
          })
          .eq('id', pagoExistente.id)

        if (errorUpdate) throw errorUpdate

        console.log(
          `✓ Pago parcial actualizado: $${montoParcial} + $${pagoExistente.monto_pagado} = $${nuevoMonto} (${metodoPago})`
        )
      } else {
        // Crear nuevo pago
        const { error: errorInsert } = await supabase
          .from('pagos')
          .insert([
            {
              institucion_id,
              estudiante_id,
              concepto_id,
              monto_pagado: montoParcial,
              monto_original,
              metodo_pago: metodoPago,
              tipo_tarjeta: metodoPago.includes('TARJETA') ? tipoTarjeta : null,
              numero_transaccion: numeroTransaccion || null,
              fecha_pago: obtenerFechaLocalIso(),
            },
          ])

        if (errorInsert) throw errorInsert

        console.log(`✓ Pago parcial registrado: $${montoParcial} de $${monto_original} (${metodoPago})`)
      }

      alert(
        `✓ Pago parcial registrado\nMonto: ${formatoMoneda(montoParcial)}\nMétodo: ${metodoPago}\nPendiente: ${formatoMoneda(monto_adeudado - montoParcial)}`
      )
      onPagoRegistrado?.()
      handleClose()
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido'
      setError(mensaje)
      console.error('Error:', err)
    } finally {
      setProcesando(false)
    }
  }

  const handleClose = () => {
    setMontoParcial(monto_adeudado)
    setMetodoPago('EFECTIVO')
    setTipoTarjeta('CREDITO')
    setNumeroTransaccion('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <AlertCircle size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Pago Parcial</h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-200 p-1 transition" disabled={procesando}>
            <X size={24} />
          </button>
        </div>

        {/* Info del Concepto */}
        <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/50 p-4 rounded-xl">
          <p className="text-sm font-bold text-blue-300 mb-3">{concepto_nombre}</p>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Original:</span>
              <span className="font-bold text-white">{formatoMoneda(monto_original)}</span>
            </div>
            <div className="flex justify-between">
              <span>Ya pagado:</span>
              <span className="font-bold text-green-400">{formatoMoneda(monto_pagado)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-blue-500/30">
              <span className="font-bold text-slate-200">Adeudado:</span>
              <span className="font-bold text-red-400">{formatoMoneda(monto_adeudado)}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
            <p className="text-sm text-red-300 font-semibold">{error}</p>
          </div>
        )}

        {/* Monto a Pagar */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">Monto a Pagar Ahora</label>
          <div className="relative">
            <span className="absolute left-4 top-3 text-slate-400 font-bold text-lg">$</span>
            <input
              type="number"
              value={montoParcial}
              onChange={(e) => setMontoParcial(parseFloat(e.target.value) || 0)}
              min="0"
              max={monto_adeudado}
              step="100"
              disabled={procesando}
              className="w-full pl-8 pr-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none transition disabled:opacity-50 font-semibold"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">Máximo: {formatoMoneda(monto_adeudado)}</p>
        </div>

        {/* Método de Pago */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
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
                  metodoPago === opt.value
                    ? 'border-blue-500 bg-blue-600/30 text-blue-300'
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
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Tipo de Tarjeta - Solo si es tarjeta */}
        {(metodoPago === 'TARJETA_CREDITO' || metodoPago === 'TARJETA_DEBITO') && (
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2">Tipo de Tarjeta</label>
            <div className="flex gap-2">
              <label className="flex-1 px-3 py-2 border-2 border-slate-600/50 bg-slate-700/30 rounded-lg cursor-pointer hover:border-slate-500/50 transition font-semibold text-sm text-center text-slate-400 hover:text-slate-200">
                <input
                  type="radio"
                  value="CREDITO"
                  checked={tipoTarjeta === 'CREDITO'}
                  onChange={(e) => setTipoTarjeta(e.target.value as any)}
                  className="hidden"
                />
                Crédito
              </label>
              <label className="flex-1 px-3 py-2 border-2 border-slate-600/50 bg-slate-700/30 rounded-lg cursor-pointer hover:border-slate-500/50 transition font-semibold text-sm text-center text-slate-400 hover:text-slate-200">
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

        {/* Número de Transacción - Solo para transferencias */}
        {metodoPago === 'TRANSFERENCIA' && (
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Número de Transacción</label>
            <input
              type="text"
              value={numeroTransaccion}
              onChange={(e) => setNumeroTransaccion(e.target.value)}
              placeholder="Ej: 123456789"
              disabled={procesando}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none text-sm font-medium disabled:opacity-50 transition"
            />
          </div>
        )}

        {/* Resumen */}
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl p-4">
          <p className="text-sm font-bold text-green-300 mb-3">Resumen del Pago:</p>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex justify-between">
              <span>Pagará ahora:</span>
              <span className="font-bold text-green-400 text-lg">{formatoMoneda(montoParcial)}</span>
            </div>
            <div className="flex justify-between">
              <span>Método:</span>
              <span className="font-bold text-white">
                {metodoPago === 'EFECTIVO'
                  ? '💵 Efectivo'
                  : metodoPago === 'TRANSFERENCIA'
                  ? '🏦 Transferencia'
                  : metodoPago === 'TARJETA_CREDITO'
                  ? '💳 Crédito'
                  : '💳 Débito'}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-green-500/30">
              <span className="font-bold text-slate-200">Quedará pendiente:</span>
              <span className="font-bold text-orange-400 text-lg">{formatoMoneda(Math.max(0, monto_adeudado - montoParcial))}</span>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleClose}
            disabled={procesando}
            className="flex-1 px-4 py-3 border-2 border-slate-600/50 text-slate-300 hover:text-slate-200 hover:border-slate-500/50 rounded-lg hover:bg-slate-700/50 disabled:opacity-50 font-bold transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleRegistrar}
            disabled={
              procesando ||
              montoParcial <= 0 ||
              montoParcial > monto_adeudado ||
              (metodoPago === 'TRANSFERENCIA' && !numeroTransaccion.trim())
            }
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-600 font-bold transition shadow-lg"
          >
            {procesando ? 'Registrando...' : 'Registrar Pago'}
          </button>
        </div>
      </div>
    </div>
  )
}