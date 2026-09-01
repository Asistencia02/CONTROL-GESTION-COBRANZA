/**
 * EJEMPLO PRÁCTICO DE INTEGRACIÓN
 * 
 * Este archivo muestra un componente de ejemplo completo
 * que integra el modal de financiamiento de deuda.
 * 
 * NOTA: Este es un EJEMPLO - cópialo y adaptalo a tu código real
 */

import React, { useState } from 'react'
import { ModalFinanciamientoDeuda } from '@renderer/components/ModalFinanciamientoDeuda'
import { useDeudaAñosAnteriores } from '@renderer/hooks/useDeudaAñosAnteriores'
import { 
  registrarFinanciamientoDeuda, 
  obtenerDeudaEstudiante 
} from '@renderer/lib/deudaFinanciamientoUtils'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { Plus, AlertCircle } from 'lucide-react'
import { formatoMoneda } from '@renderer/lib/helpers'

interface Estudiante {
  id: number
  nombre: string
  apellido: string
  dni: string
  email?: string
  deuda_años_anteriores?: number
}

/**
 * EJEMPLO DE COMPONENTE CON INTEGRACIÓN
 * Esto es un componente ficticio para mostrar cómo usar el modal
 */
export const EjemploInscripcionConDeuda: React.FC = () => {
  const { institucionActiva } = useInstitucion()

  // States del modal de deuda
  const [mostrarModalDeuda, setMostrarModalDeuda] = useState(false)
  const [deudaEstudiante, setDeudaEstudiante] = useState(0)
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<Estudiante | null>(null)
  const [procesandoDeuda, setProcesandoDeuda] = useState(false)

  // Ejemplo: lista de estudiantes
  const [estudiantes] = useState<Estudiante[]>([
    { id: 1, nombre: 'Juan', apellido: 'López', dni: '12345678' },
    { id: 2, nombre: 'María', apellido: 'García', dni: '87654321' },
    { id: 3, nombre: 'Carlos', apellido: 'Martínez', dni: '11111111', deuda_años_anteriores: 60000 },
  ])

  /**
   * FUNCIÓN 1: Verificar si estudiante tiene deuda
   * Se llama cuando se intenta inscribir
   */
  const verificarYMostrarModalDeuda = async (estudiante_id: number, estudiante: Estudiante) => {
    try {
      console.log(`🔍 Verificando deuda para estudiante ${estudiante.nombre}...`)

      const deuda = await obtenerDeudaEstudiante(
        estudiante_id,
        institucionActiva.id
      )

      console.log(`Deuda encontrada: $${deuda}`)

      if (deuda > 0) {
        // Mostrar modal si tiene deuda
        setDeudaEstudiante(deuda)
        setEstudianteSeleccionado(estudiante)
        setMostrarModalDeuda(true)
        return false // No continuar inscripción
      }

      // Sin deuda, continuar normal
      console.log('✓ Sin deuda, continuar inscripción')
      return true
    } catch (err) {
      console.error('Error verificando deuda:', err)
      alert('Error: ' + (err instanceof Error ? err.message : 'Desconocido'))
      return true // Continuar de todos modos
    }
  }

  /**
   * FUNCIÓN 2: Handler principal del modal
   * Se ejecuta cuando usuario confirma su opción
   */
  const handleConfirmarFinanciamiento = async (
    opcion: 'pagar_ahora' | 'financiar_todo' | 'pago_inicial',
    monto_inicial?: number,
    cuotas?: number
  ) => {
    setProcesandoDeuda(true)
    try {
      if (!estudianteSeleccionado) throw new Error('Estudiante no definido')

      console.log(`📝 Procesando opción: ${opcion}`)
      console.log(`   Monto inicial: $${monto_inicial}, Cuotas: ${cuotas}`)

      if (opcion === 'pagar_ahora') {
        // OPCIÓN 1: Pagar todo ahora
        // Aquí deberías registrar un pago de $deudaEstudiante
        console.log(`💰 Registrando pago de deuda: $${deudaEstudiante}`)

        // PSEUDOCÓDIGO - Reemplaza con tu lógica:
        // await registrarPagoDeuda({
        //   estudiante_id: estudianteSeleccionado.id,
        //   monto: deudaEstudiante,
        //   metodo_pago: 'EFECTIVO',
        //   fecha_pago: new Date()
        // })

        alert(`✓ Deuda de $${deudaEstudiante.toLocaleString('es-AR')} pagada.\n\nAhora puedes inscribir normalmente.`)

      } else if (opcion === 'financiar_todo') {
        // OPCIÓN 2: Financiar sin pago inicial
        console.log(`📊 Financiando $${deudaEstudiante} en ${cuotas} cuotas`)

        const resultado = await registrarFinanciamientoDeuda({
          estudiante_id: estudianteSeleccionado.id,
          institucion_id: institucionActiva.id,
          deuda_original: deudaEstudiante,
          pago_inicial: 0,
          cuotas: cuotas || 10,
          año_deuda: 2026,
          año_financiamiento: 2027,
          metodo_pago: 'EFECTIVO'
        })

        if (!resultado.success) {
          throw new Error(resultado.error || 'Error al crear financiamiento')
        }

        console.log('✓ Financiamiento creado')
        alert(`✓ ${resultado.mensaje}\n\nAhora puedes completar la inscripción.`)

      } else if (opcion === 'pago_inicial') {
        // OPCIÓN 3: Pago inicial + financiar resto
        console.log(`💳 Pago inicial: $${monto_inicial}, Financiando: $${deudaEstudiante - (monto_initial || 0)}`)

        // PSEUDOCÓDIGO - Registrar pago inicial primero:
        // const pago_inicial_id = await registrarPagoDeuda({...})

        const resultado = await registrarFinanciamientoDeuda({
          estudiante_id: estudianteSeleccionado.id,
          institucion_id: institucionActiva.id,
          deuda_original: deudaEstudiante,
          pago_inicial: monto_inicial || 0,
          cuotas: cuotas || 10,
          año_deuda: 2026,
          año_financiamiento: 2027,
          metodo_pago: 'EFECTIVO',
          // concepto_inscripcion_id: pago_inicial_id // Si guardaste el pago
        })

        if (!resultado.success) {
          throw new Error(resultado.error || 'Error al crear financiamiento')
        }

        console.log('✓ Financiamiento con pago inicial creado')
        alert(`✓ ${resultado.mensaje}\n\nAhora puedes completar la inscripción.`)
      }

      // Cerrar modal después de éxito
      setMostrarModalDeuda(false)

      // AQUÍ: Continuar con tu flujo normal de inscripción
      // await registrarInscripcion(estudianteSeleccionado)

    } catch (err) {
      console.error('Error al confirmar financiamiento:', err)
      alert('❌ Error: ' + (err instanceof Error ? err.message : 'Desconocido'))
    } finally {
      setProcesandoDeuda(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <h1 className="text-3xl font-bold text-white mb-8">Inscripción 2027 - Ejemplo con Deuda</h1>

        {/* LISTA DE ESTUDIANTES */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-700/50 to-slate-600/50">
            <h2 className="text-lg font-bold text-white">Estudiantes para Inscribir</h2>
          </div>

          <div className="divide-y divide-slate-700/30">
            {estudiantes.map(estudiante => (
              <div key={estudiante.id} className="p-4 hover:bg-slate-700/20 transition flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-bold text-white">{estudiante.nombre} {estudiante.apellido}</p>
                  <p className="text-sm text-slate-400">DNI: {estudiante.dni}</p>

                  {/* Mostrar si tiene deuda */}
                  {estudiante.deuda_años_anteriores && estudiante.deuda_años_anteriores > 0 && (
                    <div className="mt-2 flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/30 rounded w-fit">
                      <AlertCircle size={14} className="text-red-400" />
                      <p className="text-sm text-red-300 font-semibold">
                        Deuda 2026: {formatoMoneda(estudiante.deuda_años_anteriores)}
                      </p>
                    </div>
                  )}
                </div>

                {/* BOTÓN INSCRIBIR */}
                <button
                  onClick={() => verificarYMostrarModalDeuda(estudiante.id, estudiante)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-bold flex items-center gap-2 transition"
                >
                  <Plus size={18} />
                  Inscribir
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* NOTAS */}
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 <strong>Nota:</strong> Si un estudiante tiene deuda, al hacer clic en "Inscribir" se mostrará un modal con 3 opciones:
            <br/>1. Pagar todo ahora
            <br/>2. Financiar en 10 cuotas
            <br/>3. Pago inicial + financiar resto
          </p>
        </div>

        {/* INSTRUCCIONES */}
        <div className="mt-8 p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg">
          <h3 className="font-bold text-white mb-2">Cómo funciona:</h3>
          <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
            <li>Click en "Inscribir" sobre estudiante</li>
            <li>Sistema verifica si tiene deuda del año anterior</li>
            <li>Si tiene deuda → Aparece modal con opciones</li>
            <li>Usuario elige opción → Se registra el financiamiento</li>
            <li>Se puede continuar con inscripción normal</li>
          </ol>
        </div>
      </div>

      {/* MODAL DE FINANCIAMIENTO */}
      {estudianteSeleccionado && (
        <ModalFinanciamientoDeuda
          isOpen={mostrarModalDeuda}
          onClose={() => {
            setMostrarModalDeuda(false)
            setEstudianteSeleccionado(null)
          }}
          onConfirm={handleConfirmarFinanciamiento}
          deuda={deudaEstudiante}
          cuotaBase={20000}
          estudiante_nombre={`${estudianteSeleccionado.nombre} ${estudianteSeleccionado.apellido}`}
          loading={procesandoDeuda}
        />
      )}
    </div>
  )
}

export default EjemploInscripcionConDeuda
