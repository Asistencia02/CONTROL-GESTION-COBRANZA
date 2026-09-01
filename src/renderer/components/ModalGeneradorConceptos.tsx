import React, { useState, useEffect } from 'react'
import { Zap, CheckCircle2, AlertCircle, PlayCircle } from 'lucide-react'
import { supabase } from '@renderer/lib/supabase'
import {
  generarConceptosPorCarrera,
  generarConceptosMultiplesInstituciones,
  obtenerDesgloceConceptos,
  actualizarConceptosDesdeConfiguracion,
} from '@renderer/lib/generadorConceptosPago'

interface ModalGeneradorConceptosProps {
  institucionId?: number
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const ModalGeneradorConceptos: React.FC<ModalGeneradorConceptosProps> = ({
  institucionId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'inicio' | 'configuracion' | 'preview' | 'resultado'>('inicio')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [año, setAño] = useState(new Date().getFullYear())
  const [desglose, setDesglose] = useState<any>(null)
  const [resultado, setResultado] = useState<any>(null)
  const [modo, setModo] = useState<'una' | 'multiples'>('una')
  const [institucionesSeleccionadas, setInstitucionesSeleccionadas] = useState<number[]>([])
  const [instituciones, setInstituciones] = useState<any[]>([])

  useEffect(() => {
    if (isOpen && modo === 'multiples') {
      cargarInstituciones()
    }
  }, [isOpen, modo])

  const cargarInstituciones = async () => {
    try {
      const { data } = await supabase.from('instituciones').select('id, nombre')
      setInstituciones(data || [])
      if (institucionId) {
        setInstitucionesSeleccionadas([institucionId])
      }
    } catch (error) {
      console.error('Error cargando instituciones:', error)
    }
  }

  const handleCargarPreview = async () => {
    setLoading(true)
    try {
      const targetId = modo === 'una' ? institucionId : institucionesSeleccionadas[0]
      if (!targetId) throw new Error('Selecciona una institución')

      const result = await obtenerDesgloceConceptos(targetId, año)
      setDesglose(result)
      setStep('preview')
    } catch (error) {
      setMensaje(`❌ ${error instanceof Error ? error.message : 'Error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerar = async () => {
    setLoading(true)
    try {
      let result

      if (modo === 'multiples') {
        result = await generarConceptosMultiplesInstituciones(institucionesSeleccionadas, año)
      } else {
        if (!institucionId) throw new Error('ID de institución requerido')
        result = await generarConceptosPorCarrera(institucionId, año)
      }

      setResultado(result)
      setMensaje(result.mensaje || 'Proceso completado')
      setStep('resultado')
      onSuccess?.()
    } catch (error) {
      setMensaje(`❌ ${error instanceof Error ? error.message : 'Error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleActualizar = async () => {
    setLoading(true)
    try {
      const result = await actualizarConceptosDesdeConfiguracion(
        modo === 'una' ? institucionId! : institucionesSeleccionadas[0],
        undefined,
        año
      )
      setResultado(result)
      setMensaje(result.mensaje || 'Actualización completada')
      setStep('resultado')
      onSuccess?.()
    } catch (error) {
      setMensaje(`❌ ${error instanceof Error ? error.message : 'Error'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 flex items-center gap-3 sticky top-0">
          <Zap size={28} />
          <div>
            <h2 className="text-2xl font-bold">Generador de Conceptos de Pago</h2>
            <p className="text-blue-100 text-sm">Crea conceptos basados en configuración de carreras</p>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="p-6 space-y-6">
          {mensaje && (
            <div
              className={`p-4 rounded-lg border-l-4 flex items-start gap-3 ${
                mensaje.includes('✓')
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'bg-red-50 border-red-500 text-red-700'
              }`}
            >
              {mensaje.includes('✓') ? (
                <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              )}
              <p>{mensaje}</p>
            </div>
          )}

          {/* PASO 1: INICIO */}
          {step === 'inicio' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-900">
                  Este generador crea automáticamente conceptos de pago (INSCRIPCIÓN, SEGURO, CUOTAS) basados en los montos
                  configurados en cada carrera.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Modo:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setModo('una')}
                    className={`p-4 rounded-lg border-2 transition text-center font-semibold ${
                      modo === 'una' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 bg-gray-50 text-gray-700'
                    }`}
                  >
                    Una Institución
                  </button>
                  <button
                    onClick={() => setModo('multiples')}
                    className={`p-4 rounded-lg border-2 transition text-center font-semibold ${
                      modo === 'multiples'
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-300 bg-gray-50 text-gray-700'
                    }`}
                  >
                    Múltiples Instituciones
                  </button>
                </div>
              </div>

              {modo === 'multiples' && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Instituciones:</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                    {instituciones.map((inst) => (
                      <label key={inst.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={institucionesSeleccionadas.includes(inst.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInstitucionesSeleccionadas([...institucionesSeleccionadas, inst.id])
                            } else {
                              setInstitucionesSeleccionadas(institucionesSeleccionadas.filter((id) => id !== inst.id))
                            }
                          }}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-700">{inst.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Año:</label>
                <input
                  type="number"
                  min="2020"
                  max="2100"
                  value={año}
                  onChange={(e) => setAño(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCargarPreview}
                  disabled={loading || (modo === 'multiples' && institucionesSeleccionadas.length === 0)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <PlayCircle size={18} />
                      Previsualizar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: PREVIEW */}
          {step === 'preview' && desglose && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold mb-2">Desglose por Carrera ({año}):</p>
                {Object.entries(desglose.por_carrera).length === 0 ? (
                  <p className="text-sm text-blue-800">No hay configuraciones cargadas aún.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(desglose.por_carrera).map(([carreraId, datos]: [string, any]) => (
                      <div key={carreraId} className="bg-white p-3 rounded border border-blue-200">
                        <p className="font-semibold text-gray-800 mb-2">{datos.carrera_nombre}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Inscripción: ${datos.inscripcion?.toFixed(2) || '-'}</div>
                          <div>Seguro: ${datos.seguro?.toFixed(2) || '-'}</div>
                          <div>Cuota Mensual: ${datos.cuota_mensual?.toFixed(2) || '-'}</div>
                          <div className="font-bold text-blue-600">Total Anual: ${datos.total_anual?.toFixed(2) || '-'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep('inicio')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Atrás
                </button>
                <button
                  onClick={handleGenerar}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Zap size={18} />
                      Generar Conceptos
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: RESULTADO */}
          {step === 'resultado' && resultado && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg border-l-4 flex items-start gap-3 ${
                  resultado.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                }`}
              >
                {resultado.success ? (
                  <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle size={24} className="text-red-600 flex-shrink-0" />
                )}
                <div>
                  <p className={`font-bold ${resultado.success ? 'text-green-700' : 'text-red-700'}`}>{resultado.mensaje}</p>
                  {resultado.resultados && (
                    <div className="mt-3 space-y-1 text-sm">
                      {resultado.resultados.map((r: any, idx: number) => (
                        <p key={idx} className="text-gray-700">
                          {r.institucion_id ? `ID ${r.institucion_id}: ${r.conceptosGenerados || 0} conceptos` : r.resumen}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setStep('inicio')
                    setResultado(null)
                    setMensaje('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                >
                  Generar Más
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
