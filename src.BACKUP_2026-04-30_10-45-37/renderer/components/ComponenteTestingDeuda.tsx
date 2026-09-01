/**
 * COMPONENTE DE TESTING: Inyector de Deudas
 * 
 * Permite crear deudas de prueba directamente desde la interfaz
 * para testear el flujo de detección y financiamiento
 * 
 * USO:
 * 1. Importar este componente en una página de admin/testing
 * 2. Seleccionar estudiante y monto
 * 3. Click "Crear deuda de prueba"
 * 4. Ir a Cobranzas para probar el flujo
 */

import React, { useState, useEffect } from 'react'
import { supabase } from '@renderer/lib/supabase'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { AlertCircle, CheckCircle2, Trash2, Plus, TestTube } from 'lucide-react'
import { formatoMoneda } from '@renderer/lib/helpers'

interface Estudiante {
  id: number
  nombre: string
  apellido: string
  dni: string
}

interface DeudaPrueba {
  estudiante_id: number
  nombre_completo: string
  año: number
  monto: number
}

export const ComponenteTestingDeuda: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<number | null>(null)
  const [montoDeuda, setMontoDeuda] = useState(60000)
  const [añoDeuda, setAñoDeuda] = useState(2026)
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)
  const [deudasActuales, setDeudasActuales] = useState<DeudaPrueba[]>([])

  // Cargar estudiantes
  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await supabase
          .from('estudiantes')
          .select('id, nombre, apellido, dni')
          .eq('institucion_id', institucionActiva.id)
          .neq('estado', 'NO_VIENE_MAS')
          .order('nombre')
          .limit(20)

        setEstudiantes(data || [])
      } catch (err) {
        console.error('Error cargando estudiantes:', err)
      }
    }
    cargar()
  }, [institucionActiva.id])

  // Cargar deudas actuales
  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await supabase
          .from('deudas_historicas')
          .select('*')
          .eq('institucion_id', institucionActiva.id)

        if (data) {
          const deudasConNombre = await Promise.all(
            data.map(async (deuda) => {
              const { data: est } = await supabase
                .from('estudiantes')
                .select('nombre, apellido')
                .eq('id', deuda.estudiante_id)
                .single()

              return {
                estudiante_id: deuda.estudiante_id,
                nombre_completo: est ? `${est.nombre} ${est.apellido}` : 'Desconocido',
                año: deuda.año_deuda,
                monto: deuda.total_adeudado,
              }
            })
          )
          setDeudasActuales(deudasConNombre)
        }
      } catch (err) {
        console.error('Error cargando deudas:', err)
      }
    }
    cargar()
  }, [institucionActiva.id])

  const crearDeudaPrueba = async () => {
    if (!estudianteSeleccionado) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un estudiante' })
      return
    }

    setLoading(true)
    try {
      // 1. Crear en deudas_historicas
      const { data: deuda, error: errorDeuda } = await supabase
        .from('deudas_historicas')
        .insert([
          {
            institucion_id: institucionActiva.id,
            estudiante_id: estudianteSeleccionado,
            año_deuda: añoDeuda,
            total_adeudado: montoDeuda,
            estado: 'PENDIENTE',
          },
        ])
        .select()
        .single()

      if (errorDeuda) throw errorDeuda

      // 2. Actualizar estudiante
      const { error: errorEstudiante } = await supabase
        .from('estudiantes')
        .update({
          deuda_años_anteriores: montoDeuda,
          última_deuda_año: añoDeuda,
          última_actualización_deuda: new Date().toISOString(),
        })
        .eq('id', estudianteSeleccionado)

      if (errorEstudiante) throw errorEstudiante

      const estudiante = estudiantes.find(e => e.id === estudianteSeleccionado)
      setMensaje({
        tipo: 'success',
        texto: `✓ Deuda creada para ${estudiante?.nombre} ${estudiante?.apellido}: $${montoDeuda.toLocaleString('es-AR')} (Año ${añoDeuda})`,
      })

      // Recargar deudas
      const { data: deudasData } = await supabase
        .from('deudas_historicas')
        .select('*')
        .eq('institucion_id', institucionActiva.id)

      if (deudasData) {
        const deudasConNombre = await Promise.all(
          deudasData.map(async (deuda) => {
            const { data: est } = await supabase
              .from('estudiantes')
              .select('nombre, apellido')
              .eq('id', deuda.estudiante_id)
              .single()

            return {
              estudiante_id: deuda.estudiante_id,
              nombre_completo: est ? `${est.nombre} ${est.apellido}` : 'Desconocido',
              año: deuda.año_deuda,
              monto: deuda.total_adeudado,
            }
          })
        )
        setDeudasActuales(deudasConNombre)
      }

      setEstudianteSeleccionado(null)
      setMontoDeuda(60000)
      setTimeout(() => setMensaje(null), 4000)
    } catch (err) {
      const texto = err instanceof Error ? err.message : 'Error desconocido'
      setMensaje({ tipo: 'error', texto: `Error: ${texto}` })
      console.error('Error creando deuda:', err)
    } finally {
      setLoading(false)
    }
  }

  const eliminarDeuda = async (estudiante_id: number, año: number) => {
    if (!window.confirm('¿Eliminar esta deuda de prueba?')) return

    setLoading(true)
    try {
      // 1. Eliminar de deudas_historicas
      const { error: errorDeuda } = await supabase
        .from('deudas_historicas')
        .delete()
        .eq('estudiante_id', estudiante_id)
        .eq('año_deuda', año)

      if (errorDeuda) throw errorDeuda

      // 2. Limpiar en estudiantes
      const { error: errorEstudiante } = await supabase
        .from('estudiantes')
        .update({
          deuda_años_anteriores: 0,
          última_deuda_año: null,
          última_actualización_deuda: new Date().toISOString(),
        })
        .eq('id', estudiante_id)

      if (errorEstudiante) throw errorEstudiante

      setMensaje({ tipo: 'success', texto: '✓ Deuda eliminada' })

      // Recargar
      const { data: deudasData } = await supabase
        .from('deudas_historicas')
        .select('*')
        .eq('institucion_id', institucionActiva.id)

      if (deudasData) {
        const deudasConNombre = await Promise.all(
          deudasData.map(async (deuda) => {
            const { data: est } = await supabase
              .from('estudiantes')
              .select('nombre, apellido')
              .eq('id', deuda.estudiante_id)
              .single()

            return {
              estudiante_id: deuda.estudiante_id,
              nombre_completo: est ? `${est.nombre} ${est.apellido}` : 'Desconocido',
              año: deuda.año_deuda,
              monto: deuda.total_adeudado,
            }
          })
        )
        setDeudasActuales(deudasConNombre)
      }

      setTimeout(() => setMensaje(null), 3000)
    } catch (err) {
      setMensaje({ tipo: 'error', texto: `Error: ${err instanceof Error ? err.message : 'Desconocido'}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-xl text-white">
        <div className="flex items-center gap-3">
          <TestTube size={32} />
          <div>
            <h1 className="text-2xl font-black">Testing - Inyector de Deudas</h1>
            <p className="text-sm text-purple-100 mt-1">Crea deudas de prueba para testear el flujo de financiamiento</p>
          </div>
        </div>
      </div>

      {/* MENSAJES */}
      {mensaje && (
        <div
          className={`p-4 rounded-lg border-l-4 flex items-start gap-3 ${
            mensaje.tipo === 'success'
              ? 'bg-green-500/20 border-green-500 text-green-300'
              : 'bg-red-500/20 border-red-500 text-red-300'
          }`}
        >
          {mensaje.tipo === 'success' ? (
            <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          )}
          <p className="font-semibold">{mensaje.texto}</p>
        </div>
      )}

      {/* FORMULARIO */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl space-y-4">
        <h2 className="text-lg font-bold text-white">Crear Deuda de Prueba</h2>

        {/* Estudiante */}
        <div>
          <label className="block text-sm font-bold text-slate-300 mb-2">Estudiante</label>
          <select
            value={estudianteSeleccionado || ''}
            onChange={(e) => setEstudianteSeleccionado(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">-- Selecciona estudiante --</option>
            {estudiantes.map((est) => (
              <option key={est.id} value={est.id}>
                {est.nombre} {est.apellido} • {est.dni}
              </option>
            ))}
          </select>
        </div>

        {/* Año */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Año de Deuda</label>
            <input
              type="number"
              value={añoDeuda}
              onChange={(e) => setAñoDeuda(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Monto */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-2">Monto de Deuda</label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-slate-400 font-bold">$</span>
              <input
                type="number"
                value={montoDeuda}
                onChange={(e) => setMontoDeuda(parseInt(e.target.value))}
                className="w-full pl-8 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Botón */}
        <button
          onClick={crearDeudaPrueba}
          disabled={loading || !estudianteSeleccionado}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Plus size={20} />
          {loading ? 'Creando...' : 'Crear Deuda de Prueba'}
        </button>
      </div>

      {/* DEUDAS ACTUALES */}
      {deudasActuales.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl">
          <h2 className="text-lg font-bold text-white mb-4">Deudas Activas ({deudasActuales.length})</h2>

          <div className="space-y-2">
            {deudasActuales.map((deuda, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-slate-700/50 border border-slate-600 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-bold text-white">{deuda.nombre_completo}</p>
                  <p className="text-sm text-slate-400">Año {deuda.año}</p>
                </div>
                <div className="text-right mr-4">
                  <p className="font-bold text-white">{formatoMoneda(deuda.monto)}</p>
                </div>
                <button
                  onClick={() => eliminarDeuda(deuda.estudiante_id, deuda.año)}
                  className="px-4 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/50 rounded-lg font-bold transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INSTRUCCIONES */}
      <div className="bg-blue-500/10 border border-blue-500/50 p-6 rounded-xl">
        <h3 className="font-bold text-white mb-3">📋 Cómo usar:</h3>
        <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
          <li>Selecciona un estudiante de la lista</li>
          <li>Define el año de la deuda (ej: 2026)</li>
          <li>Define el monto de la deuda (ej: $60,000)</li>
          <li>Click "Crear Deuda de Prueba"</li>
          <li>Ve a COBRANZAS</li>
          <li>Selecciona el estudiante</li>
          <li>Selecciona concepto INSCRIPCIÓN (año siguiente)</li>
          <li>Click "Registrar Cobro"</li>
          <li>✓ Debe aparecer modal de financiamiento con las 3 opciones</li>
        </ol>
      </div>
    </div>
  )
}

export default ComponenteTestingDeuda
