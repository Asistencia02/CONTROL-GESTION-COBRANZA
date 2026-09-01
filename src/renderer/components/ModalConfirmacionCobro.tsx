import React, { useState } from 'react'
import { X, Gift, CheckCircle, AlertCircle } from 'lucide-react'
import { formatoMoneda } from '@renderer/lib/helpers'
import { ModalExcepcionesPago } from './ModalExcepcionesPago'

interface ModalConfirmacionCobroProps {
  isOpen: boolean
  onClose: () => void
  estudiante: { nombre: string; apellido: string; id?: number } | undefined
  conceptos: any[]
  totalSinMora: number
  totalMora: number
  totalConMora: number
  registrando: boolean
  onConfirmar: (opciones?: { perdonarMora?: boolean; montoParcial?: number }) => void
  metodoPago?: string
  tipoTarjeta?: string
  pagoDividido?: boolean
  pagosMultiples?: any[]
}

export const ModalConfirmacionCobro: React.FC<ModalConfirmacionCobroProps> = ({
  isOpen,
  onClose,
  estudiante,
  conceptos,
  totalSinMora,
  totalMora,
  totalConMora,
  registrando,
  onConfirmar,
  metodoPago = 'EFECTIVO',
  tipoTarjeta,
  pagoDividido = false,
  pagosMultiples = [],
}) => {
  const [aplicarPerdonMora, setAplicarPerdonMora] = useState(false)
  const [mostrarModalExcepciones, setMostrarModalExcepciones] = useState(false)

  if (!isOpen) return null

  let totalFinal = totalConMora
  if (aplicarPerdonMora) {
    totalFinal = totalSinMora
  }

  const montoPerdonado = totalConMora - totalFinal

  const metodosAMostrar = pagoDividido && pagosMultiples.length > 0
    ? pagosMultiples
    : [{ metodo: metodoPago, monto: totalConMora, tipoTarjeta }]

  const handleConfirmar = () => {
    onConfirmar({
      perdonarMora: aplicarPerdonMora,
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 flex justify-between items-center border-b border-slate-700/50">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle size={28} />
              Confirmar Cobro
            </h3>
            <button onClick={onClose} className="text-white/80 hover:text-white transition p-1">
              <X size={28} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Estudiante */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 p-6 rounded-xl">
              <p className="text-xs text-green-300 mb-2 font-bold uppercase">Estudiante</p>
              <p className="text-2xl font-black text-white">
                {estudiante?.nombre} {estudiante?.apellido}
              </p>
            </div>

            {/* Conceptos a Cobrar */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-300 uppercase flex items-center gap-2">
                <AlertCircle size={16} className="text-blue-400" />
                Conceptos a Cobrar ({conceptos.length})
              </p>
              <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-4 max-h-40 overflow-y-auto space-y-2">
                {conceptos.map((c, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm pb-2 border-b border-slate-600/50 last:border-b-0">
                    <span className="font-semibold text-slate-300">{c.nombre}</span>
                    <span className="font-bold text-blue-400">{formatoMoneda(c.montoFinal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Métodos de Pago */}
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-300 uppercase flex items-center gap-2">
                <AlertCircle size={16} className="text-purple-400" />
                Métodos de Pago
              </p>
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 rounded-lg p-4 space-y-3">
                {metodosAMostrar.map((metodo, idx) => {
                  const iconoMetodo = 
                    metodo.metodo === 'EFECTIVO' ? '💵' :
                    metodo.metodo === 'TRANSFERENCIA' ? '🏦' :
                    metodo.metodo === 'TARJETA_CREDITO' ? '💳' :
                    metodo.metodo === 'TARJETA_DEBITO' ? '💳' : '💰'

                  return (
                    <div key={idx} className="flex justify-between items-center text-sm bg-slate-700/30 p-3 rounded-lg border border-purple-500/30">
                      <span className="font-semibold text-slate-300">
                        {iconoMetodo} {metodo.metodo}
                        {metodo.tipoTarjeta && ` (${metodo.tipoTarjeta})`}
                      </span>
                      <span className="font-bold text-purple-300">{formatoMoneda(metodo.monto)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Resumen de Montos */}
            <div className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-600/50 rounded-lg p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300 font-semibold">Subtotal:</span>
                <span className="font-bold text-white">{formatoMoneda(totalSinMora)}</span>
              </div>

              {totalMora > 0 && (
                <>
                  <div className="border-t border-slate-600/50"></div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-400 font-bold">Mora automática:</span>
                    <span className="text-red-400 font-bold">+{formatoMoneda(totalMora)}</span>
                  </div>
                </>
              )}

              {montoPerdonado > 0 && (
                <>
                  <div className="border-t border-slate-600/50"></div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400 font-bold">Perdón de mora:</span>
                    <span className="text-green-400 font-bold">-{formatoMoneda(montoPerdonado)}</span>
                  </div>
                </>
              )}

              <div className="border-t-2 border-slate-500 pt-3"></div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200 text-lg">TOTAL A PAGAR:</span>
                <span className={`text-3xl font-black ${aplicarPerdonMora ? 'text-green-400' : 'text-blue-400'}`}>
                  {formatoMoneda(totalFinal)}
                </span>
              </div>
            </div>

            {/* Opción Perdonar Mora */}
            {totalMora > 0 && (
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-2 border-orange-500/50 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aplicarPerdonMora}
                    onChange={(e) => setAplicarPerdonMora(e.target.checked)}
                    className="w-5 h-5 rounded border-orange-500/50 bg-slate-700/50 text-orange-500 mt-1 cursor-pointer accent-orange-500"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-orange-300 flex items-center gap-2 text-base">
                      <Gift size={20} />
                      Perdonar Mora
                    </p>
                    <p className="text-sm text-orange-200 mt-2">
                      {totalMora > 0
                        ? `Quita el recargo de mora: ${formatoMoneda(totalMora)} (Total pasa a ${formatoMoneda(totalSinMora)})`
                        : 'No hay mora a perdonar en este cobro'}
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Opción Pago Parcial */}
            <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500/50 rounded-lg p-4">
              <p className="text-sm font-bold text-yellow-300 mb-3">
                Para hacer un pago parcial, abre el modal de excepciones:
              </p>
              <button
                onClick={() => setMostrarModalExcepciones(true)}
                className="w-full px-4 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white rounded-lg font-bold transition shadow-lg"
              >
                Abrir Modal de Pago Parcial
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-700/50 border-t border-slate-600/50 p-6 flex gap-3 sticky bottom-0">
            <button
              onClick={onClose}
              disabled={registrando}
              className="flex-1 px-4 py-3 border-2 border-slate-600/50 text-slate-300 hover:text-slate-200 hover:border-slate-500/50 hover:bg-slate-700/50 rounded-lg font-bold transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmar}
              disabled={registrando}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold transition disabled:from-slate-600 disabled:to-slate-600 flex items-center justify-center gap-2 shadow-lg"
            >
              {registrando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  Confirmar Pago
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {mostrarModalExcepciones && conceptos.length > 0 && estudiante?.id && (
        <ModalExcepcionesPago
          isOpen={mostrarModalExcepciones}
          onClose={() => setMostrarModalExcepciones(false)}
          estudiante_id={estudiante.id}
          concepto_id={conceptos[0]?.id || 0}
          concepto_nombre={conceptos[0]?.nombre || ''}
          monto_original={conceptos[0]?.monto || 0}
          monto_pagado={0}
          monto_adeudado={totalFinal}
          soloModosParcial={true}
          onExcepcionAplicada={() => {
            setMostrarModalExcepciones(false)
            onClose()
          }}
        />
      )}
    </>
  )
}