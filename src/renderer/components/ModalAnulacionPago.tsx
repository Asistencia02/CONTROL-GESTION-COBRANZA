import React from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface ModalAnulacionPagoProps {
  isOpen: boolean
  onClose: () => void
  onConfirmar: (motivo: string) => Promise<void>
  estudiante: string
  monto: number
  concepto: string
  cargando?: boolean
}

export const ModalAnulacionPago: React.FC<ModalAnulacionPagoProps> = ({
  isOpen,
  onClose,
  onConfirmar,
  estudiante,
  monto,
  concepto,
  cargando = false,
}) => {
  const [motivo, setMotivo] = React.useState('')
  const [error, setError] = React.useState('')

  const handleConfirmar = async () => {
    if (!motivo.trim()) {
      setError('Debes ingresar un motivo de anulación')
      return
    }

    try {
      setError('')
      await onConfirmar(motivo.trim())
      setMotivo('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al anular pago')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-red-500/50 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <AlertTriangle size={24} className="text-red-400" />
            Anular Pago
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition p-1" disabled={cargando}>
            <X size={28} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-sm text-red-200 font-semibold mb-3">
            ⚠️ Estás a punto de anular este pago. No se eliminará, solo aparecerá como ANULADO y no contará como pagado.
          </p>
          <div className="space-y-2 text-sm text-red-300">
            <p>
              <span className="font-bold">Estudiante:</span> {estudiante}
            </p>
            <p>
              <span className="font-bold">Concepto:</span> {concepto}
            </p>
            <p>
              <span className="font-bold">Monto:</span> ${monto.toFixed(2)}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border-l-4 border-red-500 text-red-300 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wide">
            Motivo de Anulación <span className="text-red-400">*</span>
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Pago duplicado, error del operador, cliente lo solicitó..."
            disabled={cargando}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-red-500/50 focus:outline-none text-base font-semibold transition resize-none h-28"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={cargando}
            className="flex-1 px-4 py-3 border-2 border-slate-600/50 text-slate-300 hover:text-slate-200 hover:border-slate-500/50 hover:bg-slate-700/50 rounded-lg font-bold disabled:opacity-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={cargando || !motivo.trim()}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold disabled:bg-slate-600 disabled:cursor-not-allowed transition shadow-lg"
          >
            {cargando ? 'Anulando...' : 'Confirmar Anulación'}
          </button>
        </div>
      </div>
    </div>
  )
}
