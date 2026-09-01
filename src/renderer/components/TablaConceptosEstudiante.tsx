import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Plus, X } from 'lucide-react'
import { formatoMoneda, formatoFecha } from '@renderer/lib/helpers'
import { supabase } from '@renderer/lib/supabase'

interface ConceptoEstudiante {
  concepto_id: number
  concepto: string
  tipo: string
  monto_original: number
  monto_pagado: number
  estado_pago: 'PAGADO' | 'PENDIENTE'
  fecha_pago?: string
  numero_talonario?: string
  monto_adeudado: number
}

interface TablaConceptosEstudianteProps {
  estudiante_id: number
  institucion_id: number
  nombre_completo: string
  estado_estudiante: string
  onPagoRegistrado?: () => void
}

export const TablaConceptosEstudiante: React.FC<TablaConceptosEstudianteProps> = ({
  estudiante_id,
  institucion_id,
  nombre_completo,
  estado_estudiante,
  onPagoRegistrado,
}) => {
  const [conceptos, setConceptos] = useState<ConceptoEstudiante[]>([])
  const [loading, setLoading] = useState(true)
  const [registrandoPago, setRegistrandoPago] = useState(false)
  const [conceptoSeleccionado, setConceptoSeleccionado] = useState<ConceptoEstudiante | null>(null)
  const [metodo_pago, setMetodo_pago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA'>('EFECTIVO')
  const [numero_talonario, setNumero_talonario] = useState('')

  useEffect(() => {
    cargarConceptos()
  }, [estudiante_id])

  const cargarConceptos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('v_estudiante_conceptos')
        .select('*')
        .eq('estudiante_id', estudiante_id)

      if (error) throw error
      setConceptos((data as ConceptoEstudiante[]) || [])
    } catch (err) {
      console.error('Error cargando conceptos:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRegistrarPago = async () => {
    if (!conceptoSeleccionado) return

    setRegistrandoPago(true)
    try {
      // Calcular monto según estado del estudiante
      let monto_a_pagar = conceptoSeleccionado.monto_original
      if (estado_estudiante === 'BECADO_100') {
        monto_a_pagar = 0
      } else if (estado_estudiante === 'BECADO_50') {
        monto_a_pagar = conceptoSeleccionado.monto_original * 0.5
      }

      // Insertar pago
      const { error } = await supabase.from('pagos').insert([
        {
          institucion_id,
          estudiante_id,
          concepto_id: conceptoSeleccionado.concepto_id,
          monto_pagado: monto_a_pagar,
          monto_original: conceptoSeleccionado.monto_original,
          metodo_pago,
          numero_talonario: numero_talonario || null,
          fecha_pago: new Date().toISOString().split('T')[0],
          comprobante_numero: null,
          cae: null,
          notas: `Carga rápida desde listado de estudiantes`,
        },
      ])

      if (error) throw error

      // Recargar y limpiar
      await cargarConceptos()
      setConceptoSeleccionado(null)
      setNumero_talonario('')
      onPagoRegistrado?.()
    } catch (err) {
      console.error('Error registrando pago:', err)
      alert('Error al registrar pago')
    } finally {
      setRegistrandoPago(false)
    }
  }

  const pendientes = conceptos.filter((c) => c.estado_pago === 'PENDIENTE')
  const pagados = conceptos.filter((c) => c.estado_pago === 'PAGADO')
  const totalDeuda = pendientes.reduce((sum, c) => sum + c.monto_adeudado, 0)

  return (
    <div className="space-y-4">
      {/* RESUMEN */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <p className="text-xs text-blue-700">Total Conceptos</p>
          <p className="text-lg font-bold text-blue-900">{conceptos.length}</p>
        </div>
        <div className="bg-green-50 p-3 rounded border border-green-200">
          <p className="text-xs text-green-700">Pagados</p>
          <p className="text-lg font-bold text-green-900">{pagados.length}</p>
        </div>
        <div className="bg-red-50 p-3 rounded border border-red-200">
          <p className="text-xs text-red-700">Pendientes</p>
          <p className="text-lg font-bold text-red-900">{pendientes.length}</p>
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="px-3 py-2 text-left font-semibold">Concepto</th>
              <th className="px-3 py-2 text-left font-semibold">Tipo</th>
              <th className="px-3 py-2 text-right font-semibold">Monto</th>
              <th className="px-3 py-2 text-center font-semibold">Estado</th>
              <th className="px-3 py-2 text-left font-semibold">Info</th>
              <th className="px-3 py-2 text-center font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-2 text-center text-gray-500">
                  Cargando...
                </td>
              </tr>
            ) : conceptos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-2 text-center text-gray-500">
                  Sin conceptos
                </td>
              </tr>
            ) : (
              conceptos.map((concepto, idx) => (
                <tr
                  key={idx}
                  className={`border-b ${
                    concepto.estado_pago === 'PAGADO'
                      ? 'bg-green-50 hover:bg-green-100'
                      : 'bg-red-50 hover:bg-red-100'
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-gray-900">{concepto.concepto}</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-800 rounded text-xs">
                      {concepto.tipo}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatoMoneda(concepto.monto_original)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {concepto.estado_pago === 'PAGADO' ? (
                      <CheckCircle size={16} className="mx-auto text-green-700" />
                    ) : (
                      <XCircle size={16} className="mx-auto text-red-700" />
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {concepto.estado_pago === 'PAGADO' ? (
                      <span>
                        Pagado: {formatoFecha(concepto.fecha_pago || '')}
                        {concepto.numero_talonario && <br />}
                        {concepto.numero_talonario && `Tal: ${concepto.numero_talonario}`}
                      </span>
                    ) : (
                      <span className="text-red-700 font-semibold">
                        Debe: {formatoMoneda(concepto.monto_adeudado)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {concepto.estado_pago === 'PENDIENTE' && (
                      <button
                        onClick={() => setConceptoSeleccionado(concepto)}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition"
                      >
                        <Plus size={14} className="inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE PAGO RÁPIDO */}
      {conceptoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Registrar Pago</h3>
              <button
                onClick={() => setConceptoSeleccionado(null)}
                className="text-gray-500 hover:text-gray-700"
                disabled={registrandoPago}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-gray-600">Estudiante</p>
                <p className="font-semibold text-gray-900">{nombre_completo}</p>
              </div>

              <div className="p-3 bg-purple-50 rounded border border-purple-200">
                <p className="text-sm text-gray-600">Concepto</p>
                <p className="font-semibold text-gray-900">{conceptoSeleccionado.concepto}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-600">Monto Original</p>
                  <p className="font-bold text-gray-900">{formatoMoneda(conceptoSeleccionado.monto_original)}</p>
                </div>
                <div
                  className={`p-3 rounded border ${
                    estado_estudiante === 'BECADO_100' || estado_estudiante === 'BECADO_50'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <p className="text-xs text-gray-600">A Pagar</p>
                  <p className="font-bold text-gray-900">
                    {formatoMoneda(
                      estado_estudiante === 'BECADO_100'
                        ? 0
                        : estado_estudiante === 'BECADO_50'
                          ? conceptoSeleccionado.monto_original * 0.5
                          : conceptoSeleccionado.monto_original
                    )}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Método de Pago</label>
                <select
                  value={metodo_pago}
                  onChange={(e) => setMetodo_pago(e.target.value as any)}
                  disabled={registrandoPago}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="EFECTIVO">💵 Efectivo</option>
                  <option value="TRANSFERENCIA">🏦 Transferencia</option>
                  <option value="TARJETA">💳 Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nº Talonario (Opcional)
                </label>
                <input
                  type="text"
                  value={numero_talonario}
                  onChange={(e) => setNumero_talonario(e.target.value)}
                  placeholder="Ej: 001"
                  disabled={registrandoPago}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConceptoSeleccionado(null)}
                disabled={registrandoPago}
                className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 disabled:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarPago}
                disabled={registrandoPago}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-1"
              >
                <Plus size={16} />
                {registrandoPago ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
