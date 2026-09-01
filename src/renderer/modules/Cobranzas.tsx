import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { usePagos } from '@renderer/hooks/usePagos'
import { supabase } from '@renderer/lib/supabase'
import { Receipt, HistoryIcon, Zap } from 'lucide-react'
import { RegistroPagos } from '@renderer/components/RegistroPagos'
import { usePagoValidation } from '@renderer/hooks/usePagoValidation'
import { PestaniaTalonariosModerna } from '@renderer/components/PestaniaTalonariosModerna'

interface ConceptoPago {
  id: number
  nombre: string
  tipo: string
  monto: number
  mes?: number
}

export const Cobranzas: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { estudiantes, cargarEstudiantes, loading: estudiantesLoading } = useEstudiantes()
  const { pagos, cargarPagos, loading: pagosLoading } = usePagos()
  const { anularPago } = usePagoValidation()
  
  const [conceptos, setConceptos] = useState<ConceptoPago[]>([])
  const [loadingConceptos, setLoadingConceptos] = useState(true)
  const [successMessage, setSuccessMessage] = useState('')
  const [institucionIdActual, setInstitucionIdActual] = useState(institucionActiva.id)
  const [vistaActiva, setVistaActiva] = useState<'cobranza' | 'registro'>('cobranza')
  const [carreras, setCarreras] = useState<any[]>([])

  useEffect(() => {
    if (institucionActiva.id !== institucionIdActual) {
      setInstitucionIdActual(institucionActiva.id)
    }
  }, [institucionActiva.id])

  useEffect(() => {
    const cargarDatos = async () => {
      setLoadingConceptos(true)
      try {
        await cargarEstudiantes(institucionActiva.id)
        await cargarPagos(institucionActiva.id)

        const { data, error } = await supabase
          .from('conceptos_pago')
          .select('*')
          .eq('institucion_id', institucionActiva.id)
          .eq('activo', true)
          .order('tipo', { ascending: false })
          .order('mes', { ascending: true })

        if (error) throw error
        setConceptos(data as ConceptoPago[])

        const { data: carrerasData } = await supabase
          .from('configuracion_carreras')
          .select('*')
          .eq('institucion_id', institucionActiva.id)
        setCarreras(carrerasData || [])
      } catch (error) {
        console.error('Error cargando datos:', error)
      } finally {
        setLoadingConceptos(false)
      }
    }

    cargarDatos()
  }, [institucionActiva.id])

  const handleAgregarTalonario = async (pagoId: number | string, numeroTalonario: string) => {
    try {
      console.log('📝 Guardando talonario:', { pagoId, numeroTalonario, tipo: typeof pagoId, esString: typeof pagoId === 'string' })
      
      // IMPORTANTE: Detectar si es pago múltiple (string que empieza con "pm_")
      const esSintetico = typeof pagoId === 'string' && pagoId.startsWith('pm_')
      console.log(`🔍 ¿Es ID sintético? ${esSintetico}. Valor: "${pagoId}"`)
      
      if (esSintetico) {
        // Extraer ID de pago múltiple: pm_[pm_id]_[detalle_id]
        const partes = pagoId.split('_')
        console.log('📊 Partes del ID sintético:', partes)
        
        if (partes.length >= 3) {
          const pmId = parseInt(partes[1], 10)
          const detalleId = parseInt(partes[2], 10)
          
          console.log(`🔢 IDs extraídos: pmId=${pmId}, detalleId=${detalleId}, NaN_pm=${isNaN(pmId)}, NaN_det=${isNaN(detalleId)}`)
          
          if (!isNaN(pmId) && !isNaN(detalleId) && pmId > 0 && detalleId > 0) {
            console.log('✅ IDs válidos. Actualizando pago_múltiple:', { pmId, detalleId, numeroTalonario })
            
            // ✅ CORREGIDO: Actualizar pagos_multiples, NO pagos
            const { error, status } = await supabase
              .from('pagos_multiples')
              .update({ numero_talonario: numeroTalonario })
              .eq('id', pmId)
            
            if (error) {
              console.error('❌ Error en update:', { error, status, pmId, numeroTalonario })
              throw new Error(`Error al actualizar pago múltiple ID=${pmId}: ${error.message}`)
            }
            console.log('✅ Pago múltiple actualizado exitosamente')
          } else {
            throw new Error(`IDs inválidos en pago sintético: pm_id=${pmId} (NaN=${isNaN(pmId)}), detalle_id=${detalleId} (NaN=${isNaN(detalleId)})`)
          }
        } else {
          throw new Error(`Formato de pago sintético inválido: "${pagoId}". Se esperaba pm_<id>_<detalle_id>. Partes encontradas: ${partes.length}`)
        }
      } else {
        // Pago regular (número) - tabla pagos
        let pagoIdNum: number
        
        if (typeof pagoId === 'number') {
          pagoIdNum = pagoId
        } else if (typeof pagoId === 'string') {
          pagoIdNum = parseInt(pagoId, 10)
        } else {
          throw new Error(`Tipo de pagoId inesperado: ${typeof pagoId} (valor: ${pagoId})`)
        }
        
        if (isNaN(pagoIdNum) || pagoIdNum <= 0) {
          throw new Error(`ID de pago inválido o no positivo: ${pagoId} → ${pagoIdNum}`)
        }
        
        console.log('✅ Actualizando pago regular de tabla "pagos":', { pagoIdNum, numeroTalonario })
        
        const { error, status } = await supabase
          .from('pagos')
          .update({ numero_talonario: numeroTalonario })
          .eq('id', pagoIdNum)
        
        if (error) {
          console.error('❌ Error en update:', { error, status, pagoIdNum, numeroTalonario })
          throw new Error(`Error al actualizar pago ID=${pagoIdNum}: ${error.message}`)
        }
        console.log('✅ Pago regular actualizado exitosamente')
      }

      await cargarPagos(institucionActiva.id)
      setSuccessMessage('✓ Talonario guardado correctamente')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido'
      console.error('❌ Error al guardar talonario:', mensaje)
      throw new Error(mensaje)
    }
  }

  const handleAnularPago = async (pagoId: number) => {
    const motivo = window.prompt('Motivo de la anulación:', 'Pago duplicado')
    if (!motivo) return

    try {
      const resultado = await anularPago(pagoId, motivo, 'Usuario')
      if (resultado.success) {
        setSuccessMessage(`✓ ${resultado.mensaje}`)
        await cargarPagos(institucionActiva.id)
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        alert(`Error: ${resultado.mensaje}`)
      }
    } catch (error) {
      console.error('Error anulando pago:', error)
      alert('Error al anular pago')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      {/* HEADER FUTURISTA */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/50">
              <Zap size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Gestión de Cobranzas
              </h1>
              <p className="text-slate-400 mt-1">Sistema de cobros múltiples y registro de pagos</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Institución</p>
            <p className="text-xl font-bold text-white">{institucionActiva.nombre}</p>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg text-green-400 font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            {successMessage}
          </div>
        )}
      </div>

      {/* TABS FUTURISTAS */}
      <div className="mb-12">
        <div className="flex gap-2 p-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl w-fit">
          <button
            onClick={() => setVistaActiva('cobranza')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              vistaActiva === 'cobranza'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt size={20} />
            Cobranzas Múltiples
          </button>
          <button
            onClick={() => setVistaActiva('registro')}
            className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 ${
              vistaActiva === 'registro'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HistoryIcon size={20} />
            Registro de Pagos
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="transition-all duration-500">
        {vistaActiva === 'cobranza' ? (
          <PestaniaTalonariosModerna institucionId={institucionActiva.id} carreras={carreras} />
        ) : (
          <RegistroPagos
            estudiantes={estudiantes}
            pagos={pagos}
            conceptos={conceptos}
            onAgregarTalonario={handleAgregarTalonario}
            onAnularPago={handleAnularPago}
            onRecargarPagos={() => cargarPagos(institucionActiva.id)}
            loading={pagosLoading || loadingConceptos}
          />
        )}
      </div>
    </div>
  )
}
