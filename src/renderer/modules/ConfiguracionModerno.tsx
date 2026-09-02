import React, { useState, useEffect } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { useInsumos } from '@renderer/hooks/useInsumos'
import { useConfiguracion } from '@renderer/hooks/useConfiguracion'
import { supabase } from '@renderer/lib/supabase'
import { Settings, Save, AlertCircle, Edit2, Plus, Download, Upload, RefreshCw, Receipt, Building2, ShoppingCart } from 'lucide-react'
import * as XLSX from 'xlsx'
import { generarExcelReferencia } from '@renderer/lib/excelGenerator'
import { ModalAgregarEstudiante } from '@renderer/components/ModalAgregarEstudiante'
import { ModalAgregarInsumo } from '@renderer/components/ModalAgregarInsumo'
import { ModalVerConceptosEstudiante } from '@renderer/components/ModalVerConceptosEstudiante'
import { TablaInsumos } from '@renderer/components/TablaInsumos'
import { TablaEstudiantesCargar } from '@renderer/components/TablaEstudiantesCargar'
import { useTalonarioManager } from '@renderer/hooks/useTalonarioManager'
import { PestaniaEstadosAlumnos } from '@renderer/components/PestaniaEstadosAlumnos'
import { KioscoConfigTab } from '@renderer/modules/KioscoConfigTab'
import { obtenerFechaLocalIso } from '@renderer/lib/dateUtils'
import { crearOActualizarConceptos } from '@renderer/hooks/useConceptos'

interface Carrera {
  id: number
  nombre: string
  nivel?: string
  duracion_años?: number
}

type TabConfig = 'institucion' | 'estudiantes' | 'insumos' | 'montos' | 'talonarios' | 'estados'

// Helper para extraer tipo de concepto del nombre de columna
const obtenerTipoConcepto = (nombre: string): string | null => {
  const nombreLower = nombre.toLowerCase()
  if (nombreLower.includes('inscripcion') || nombreLower.includes('inscripción')) return 'INSCRIPCION'
  if (nombreLower.includes('seguro')) return 'SEGURO'
  if (nombreLower.includes('cuota')) return 'CUOTA'
  return null
}

export const ConfiguracionModerno: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { estudiantes, agregarEstudiante } = useEstudiantes()
  const { insumos, cargarInsumos, agregarInsumo, actualizarInsumo, eliminarInsumo, loading: insumosLoading } = useInsumos()
  const { configuraciones, cargarConfiguracionesPorInstitucion, actualizarConfiguracionCarrera, loading } = useConfiguracion()

  const [tabActiva, setTabActiva] = useState<TabConfig>('institucion')
  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [cargandoExcel, setCargandoExcel] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [editandoCarrera, setEditandoCarrera] = useState<number | null>(null)
  const [modalAbrirEstudiante, setModalAbrirEstudiante] = useState(false)
  const [modalAbrirInsumo, setModalAbrirInsumo] = useState(false)
  const [insumoEditando, setInsumoEditando] = useState<any | null>(null)
  const [modalVerConceptos, setModalVerConceptos] = useState<{ isOpen: boolean; estudiante: any | null }>({
    isOpen: false,
    estudiante: null,
  })

  const { obtenerTodasLasConfiguraciones, actualizarConfiguracion } = useTalonarioManager()
  const [configsTalonarios, setConfigsTalonarios] = useState<any[]>([])
  const [editandoTalonario, setEditandoTalonario] = useState<string | null>(null)
  const [nuevoNumeroTalonario, setNuevoNumeroTalonario] = useState<Record<string, number>>({})
  const [nuevoDígitos, setNuevoDígitos] = useState<Record<string, number>>({})
  const [nuevoPrefijo, setNuevoPrefijo] = useState<Record<string, string>>({})
  const [guardandoTalonario, setGuardandoTalonario] = useState(false)

  const [configInst, setConfigInst] = useState({
    nombre: institucionActiva.nombre,
    cuit: institucionActiva.cuit,
    punto_venta: institucionActiva.punto_venta,
    email: institucionActiva.email || '',
    telefono: institucionActiva.telefono || '',
    direccion: institucionActiva.direccion || '',
  })

  const [formData, setFormData] = useState<Record<number, { monto_inscripcion: number; monto_cuota: number; monto_seguro: number; recargo_mora_porcentaje: number; dias_vencimiento: number }>>({})

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { data: carrerasData } = await supabase.from('carreras').select('*').eq('institucion_id', institucionActiva.id)
        setCarreras(carrerasData || [])
        await cargarConfiguracionesPorInstitucion(institucionActiva.id)
        await cargarInsumos(institucionActiva.id)
        const configs = await obtenerTodasLasConfiguraciones(institucionActiva.id)
        setConfigsTalonarios(configs)
        const numeros: Record<string, number> = {}
        const dígitos: Record<string, number> = {}
        const prefijos: Record<string, string> = {}
        configs.forEach((c: any) => {
          numeros[c.tipo_talonario] = c.numero_actual
          dígitos[c.tipo_talonario] = c.padding || 4
          prefijos[c.tipo_talonario] = c.prefijo || ''
        })
        setNuevoNumeroTalonario(numeros)
        setNuevoDígitos(dígitos)
        setNuevoPrefijo(prefijos)
      } catch (error) {
        console.error('Error cargando datos:', error)
        setMensaje('❌ Error al cargar datos')
      }
    }
    cargarDatos()
  }, [institucionActiva.id])

  useEffect(() => {
    const newFormData: typeof formData = {}
    configuraciones.forEach((config) => {
      newFormData[config.carrera_id] = {
        monto_inscripcion: config.monto_inscripcion,
        monto_cuota: config.monto_cuota,
        monto_seguro: config.monto_seguro,
        recargo_mora_porcentaje: config.recargo_mora_porcentaje,
        dias_vencimiento: config.dias_vencimiento,
      }
    })
    setFormData(newFormData)
  }, [configuraciones])

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCargandoExcel(true)
    setMensaje('')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(worksheet) as any[]

      if (data.length === 0) {
        setMensaje('❌ Excel vacío')
        return
      }

      let exitosos = 0
      let errores = 0
      let pagosRegistrados = 0

      const { data: conceptosData } = await supabase
        .from('conceptos_pago')
        .select('id, nombre, tipo, monto, mes, carrera_id, institucion_id')
        .eq('institucion_id', institucionActiva.id)
        .eq('activo', true)

      const conceptos = conceptosData || []

      for (let index = 0; index < data.length; index++) {
        const row = data[index]
        try {
          const dni = String(row.DNI || row.dni || '').trim()
          const nombre = String(row.Nombre || row.nombre || '').trim()
          const apellido = String(row.Apellido || row.apellido || '').trim()

          let carrera_id: number | null = null
          let carreraValor = row['Carrera/Nivel'] || row['carrera/nivel'] || row.Carrera || row.carrera || ''
          carreraValor = String(carreraValor).trim()

          const carrera_id_str = row.carrera_id || row.Carrera_ID || carreraValor
          if (carrera_id_str && !isNaN(parseInt(carrera_id_str))) {
            carrera_id = parseInt(carrera_id_str)
          }

          if (!carrera_id || isNaN(carrera_id)) {
            const nombreCarrera = carreraValor
            if (nombreCarrera) {
              let carreraEncontrada = carreras.find((c) => c.nombre.toLowerCase() === nombreCarrera.toLowerCase())
              if (!carreraEncontrada) {
                carreraEncontrada = carreras.find((c) => {
                  const nombreBD = c.nombre.toLowerCase()
                  const nombreExcel = nombreCarrera.toLowerCase()
                  return nombreBD.includes(nombreExcel) || nombreExcel.includes(nombreBD.split(' ').pop() || '')
                })
              }
              if (carreraEncontrada) {
                carrera_id = carreraEncontrada.id
              }
            }
          }

          if (!dni || !nombre || !apellido || !carrera_id) {
            errores++
            continue
          }

          const { data: estudianteExistente } = await supabase
            .from('estudiantes')
            .select('id')
            .eq('dni', dni)
            .eq('institucion_id', institucionActiva.id)
            .maybeSingle()

          let estudianteId: number

          if (estudianteExistente) {
            estudianteId = estudianteExistente.id
          } else {
            const { data: nuevoEstudianteData, error: insertError } = await supabase
              .from('estudiantes')
              .insert([
                {
                  institucion_id: institucionActiva.id,
                  carrera_id: carrera_id,
                  dni,
                  nombre,
                  apellido,
                  email: row.Email || row.email || null,
                  telefono: row.Telefono || row.telefono || null,
                  estado: 'ACTIVO',
                  fecha_ingreso: obtenerFechaLocalIso(),
                },
              ])

            if (insertError || !nuevoEstudianteData || nuevoEstudianteData.length === 0) {
              errores++
              continue
            }

            estudianteId = nuevoEstudianteData[0].id
            exitosos++
          }

          const pagosARegistrar: any[] = []

          // FILTRAR CONCEPTOS POR CARRERA DEL ESTUDIANTE E INSTITUCIÓN
          const conceptosPorCarrera = conceptos.filter(
            (c) => c.carrera_id === carrera_id && c.institucion_id === institucionActiva.id
          )

          for (const [key, value] of Object.entries(row)) {
            const keyLower = String(key).toLowerCase().trim()
            const valorStr = String(value).toLowerCase().trim()
            const esPagado = ['si', '1', 'x', 's', 'true', 'sí'].includes(valorStr) && valorStr !== ''

            if (esPagado) {
              // MATCH 1: Buscar coincidencia exacta de nombre
              let conceptoCoincidente = conceptosPorCarrera.find(
                (c) => c.nombre.toLowerCase().trim() === keyLower
              )

              // MATCH 2: Buscar por tipo (INSCRIPCION, SEGURO, CUOTA)
              if (!conceptoCoincidente) {
                const tipoConcepto = obtenerTipoConcepto(keyLower)
                if (tipoConcepto) {
                  conceptoCoincidente = conceptosPorCarrera.find((c) => c.tipo.toUpperCase() === tipoConcepto)
                }
              }

              // MATCH 3: Buscar con matching aproximado
              if (!conceptoCoincidente) {
                conceptoCoincidente = conceptosPorCarrera.find((c) => {
                  const nombreConcepto = c.nombre.toLowerCase()
                  const keyNormalizado = keyLower
                    .replace(/cuota\s*/g, '')
                    .replace(/pago/g, '')
                    .replace(/[_-]/g, ' ')
                    .trim()
                  return (
                    nombreConcepto.includes(keyNormalizado) ||
                    keyNormalizado.includes(nombreConcepto.replace(/\d+/g, '').trim())
                  )
                })
              }

              if (conceptoCoincidente) {
                const { data: pagoPrevio } = await supabase
                  .from('pagos')
                  .select('id')
                  .eq('estudiante_id', estudianteId)
                  .eq('concepto_id', conceptoCoincidente.id)
                  .maybeSingle()

                if (!pagoPrevio) {
                  pagosARegistrar.push({
                    institucion_id: institucionActiva.id,
                    estudiante_id: estudianteId,
                    concepto_id: conceptoCoincidente.id,
                    monto_pagado: conceptoCoincidente.monto,
                    monto_original: conceptoCoincidente.monto,
                    metodo_pago: 'EFECTIVO',
                    fecha_pago: obtenerFechaLocalIso(),
                    notas: 'Carga masiva',
                  })
                }
              }
            }
          }

          if (pagosARegistrar.length > 0) {
            await supabase.from('pagos').insert(pagosARegistrar)
            pagosRegistrados += pagosARegistrar.length
          }
        } catch (err) {
          errores++
        }
      }

      setMensaje(`✓ ${exitosos} importados, ${pagosRegistrados} pagos, ${errores} errores`)
    } catch (error) {
      setMensaje('❌ Error al procesar Excel')
    } finally {
      setCargandoExcel(false)
    }
  }

  const handleGuardarCarrera = async (carrera_id: number) => {
    setGuardando(true)
    try {
      const config = formData[carrera_id]
      const existente = configuraciones.find((c) => c.carrera_id === carrera_id)

      if (existente) {
        await actualizarConfiguracionCarrera(carrera_id, config)
      } else {
        await supabase.from('configuracion_carreras').insert([
          {
            carrera_id,
            institucion_id: institucionActiva.id,
            ...config,
            activo: true,
          },
        ])
      }

      // CREAR/ACTUALIZAR CONCEPTOS USANDO RPC - pasando config anterior para detectar cambios
      const resultado = await crearOActualizarConceptos(
        institucionActiva.id,
        carrera_id,
        config.monto_inscripcion,
        config.monto_cuota,
        config.monto_seguro,
        existente ? {
          monto_inscripcion: existente.monto_inscripcion,
          monto_cuota: existente.monto_cuota,
          monto_seguro: existente.monto_seguro,
        } : undefined
      )

      setMensaje(`✓ Configuración guardada. ${resultado.message}`)
      setEditandoCarrera(null)
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('❌ Error al guardar')
      console.error('Error:', error)
    } finally {
      setGuardando(false)
    }
  }

  const handleGuardarTalonario = async (tipo_talonario: string) => {
    setGuardandoTalonario(true)
    try {
      const numeroActual = nuevoNumeroTalonario[tipo_talonario] || 1
      const padding = nuevoDígitos[tipo_talonario] || 4
      const prefijo = nuevoPrefijo[tipo_talonario] || ''

      const { error } = await supabase
        .from('talonarios_config')
        .update({
          numero_actual: numeroActual,
          padding: padding,
          prefijo: prefijo,
          updated_at: new Date().toISOString(),
        })
        .eq('institucion_id', institucionActiva.id)
        .eq('tipo_talonario', tipo_talonario)

      if (error) throw error

      setMensaje(`✓ Talonario ${tipo_talonario} actualizado`)
      setEditandoTalonario(null)
      setTimeout(() => setMensaje(''), 3000)

      // Recargar configuraciones
      const configs = await obtenerTodasLasConfiguraciones(institucionActiva.id)
      setConfigsTalonarios(configs)
    } catch (error) {
      console.error('Error guardando talonario:', error)
      setMensaje('❌ Error al guardar talonario')
    } finally {
      setGuardandoTalonario(false)
    }
  }

  const handleDescargarExcelReferencia = async () => {
    try {
      const { data: conceptosData } = await supabase
        .from('conceptos_pago')
        .select('id, nombre, tipo')
        .eq('institucion_id', institucionActiva.id)
        .eq('activo', true)

      generarExcelReferencia({
        carreras: carreras,
        conceptos: conceptosData || [],
      })
    } catch (error) {
      setMensaje('❌ Error al generar Excel')
    }
  }


  const handleEditarInsumo = (insumo: any) => {
    setInsumoEditando(insumo)
    setModalAbrirInsumo(true)
  }

  const handleActualizarInsumo = async (insumo_id: number, insumo: any) => {
    try {
      await actualizarInsumo(insumo_id, insumo)
      setInsumoEditando(null)
      setMensaje('✓ Insumo actualizado')
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      setMensaje('❌ Error al actualizar insumo')
    }
  }

  const handleCerrarModal = () => {
    setModalAbrirInsumo(false)
    setInsumoEditando(null)
  }
  const handleActualizarStock = async (insumo_id: number, nuevaCantidad: number) => {
    try {
      await actualizarInsumo(insumo_id, { cantidad_stock: nuevaCantidad })
      setMensaje('✓ Stock actualizado')
      setTimeout(() => setMensaje(''), 2000)
    } catch (error) {
      setMensaje(`❌ Error`)
    }
  }

  const handleEliminarInsumo = async (insumo_id: number) => {
    try {
      await eliminarInsumo(insumo_id)
      setMensaje('✓ Insumo eliminado')
      setTimeout(() => setMensaje(''), 2000)
    } catch (error) {
      setMensaje(`❌ Error`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      {/* HEADER */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg shadow-indigo-500/50">
              <Settings size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Configuración
              </h1>
              <p className="text-slate-400 mt-1">Administra todos los parámetros del sistema</p>
            </div>
          </div>
          <button className="p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-indigo-400 transition-all duration-300">
            <RefreshCw size={24} />
          </button>
        </div>

        {mensaje && (
          <div className={`p-4 rounded-lg border-l-4 mb-6 font-semibold flex items-center gap-2 ${
            mensaje.includes('✓') 
              ? 'bg-green-500/20 border-green-500/50 text-green-400' 
              : 'bg-red-500/20 border-red-500/50 text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${mensaje.includes('✓') ? 'bg-green-400' : 'bg-red-400'}`}></div>
            {mensaje}
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="mb-12">
        <div className="flex gap-2 p-1 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl w-full overflow-x-auto">
          {[
            { id: 'institucion', label: 'Institución', icon: Building2 },
            { id: 'estudiantes', label: 'Estudiantes', icon: Plus },
            { id: 'insumos', label: 'Insumos', icon: Plus },
            { id: 'montos', label: 'Montos', icon: Plus },
            { id: 'talonarios', label: 'Talonarios', icon: Receipt },
            { id: 'estados', label: 'Estados', icon: Plus },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setTabActiva(tab.id as TabConfig)}
                className={`px-4 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                  tabActiva === tab.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="transition-all duration-500">
        {/* TAB: INSTITUCIÓN */}
        {tabActiva === 'institucion' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <h2 className="text-xl font-bold text-white mb-6">Datos de la Institución</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: 'Nombre', key: 'nombre' },
                  { label: 'CUIT', key: 'cuit' },
                  { label: 'Punto de Venta', key: 'punto_venta' },
                  { label: 'Email', key: 'email' },
                  { label: 'Teléfono', key: 'telefono' },
                  { label: 'Dirección', key: 'direccion' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-bold text-slate-300 mb-2">{field.label}</label>
                    <input
                      type="text"
                      value={configInst[field.key as keyof typeof configInst]}
                      onChange={(e) => setConfigInst({ ...configInst, [field.key]: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500/50 focus:outline-none transition"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setMensaje('✓ Datos guardados')
                  setTimeout(() => setMensaje(''), 3000)
                }}
                className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition"
              >
                <Save size={20} />
                Guardar Cambios
              </button>
            </div>
          </div>
        )}

        {/* TAB: ESTUDIANTES */}
        {tabActiva === 'estudiantes' && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Gestión de Estudiantes</h2>
                <button
                  onClick={() => setModalAbrirEstudiante(true)}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold flex items-center gap-2"
                >
                  <Plus size={18} />
                  Agregar
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-3">Carga Masiva de Estudiantes</label>
                  <div className="border-2 border-dashed border-slate-600/50 rounded-lg p-8 text-center">
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} disabled={cargandoExcel} className="hidden" id="excel-upload" />
                    <label htmlFor="excel-upload" className={`cursor-pointer flex flex-col items-center gap-2 ${cargandoExcel ? 'opacity-50' : ''}`}>
                      <Upload size={32} className="text-slate-500" />
                      <span className="text-sm font-medium text-slate-300">{cargandoExcel ? 'Cargando...' : 'Haz clic para seleccionar archivo'}</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleDescargarExcelReferencia}
                  className="w-full px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg font-bold flex items-center justify-center gap-2 transition"
                >
                  <Download size={18} />
                  Descargar Excel de Referencia
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
              <TablaEstudiantesCargar
                estudiantes={estudiantes}
                onVerConceptos={(est) =>
                  setModalVerConceptos({
                    isOpen: true,
                    estudiante: est,
                  })
                }
              />
            </div>
          </div>
        )}

        {/* TAB: INSUMOS */}
        {tabActiva === 'insumos' && (
          <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
            <TablaInsumos
              insumos={insumos}
              loading={insumosLoading}
              onAgregar={() => {
                setInsumoEditando(null)
                setModalAbrirInsumo(true)
              }}
              onEditar={handleEditarInsumo}
              onActualizarStock={handleActualizarStock}
              onEliminar={handleEliminarInsumo}
              onAgregarCategoria={() => {}}
            />
          </div>
        )}

        {/* TAB: MONTOS */}
        {tabActiva === 'montos' && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Cargando...</p>
              </div>
            ) : (
              carreras.map((carrera) => {
                const config = configuraciones.find((c) => c.carrera_id === carrera.id)
                const form = formData[carrera.id] || {
                  monto_inscripcion: 0,
                  monto_cuota: 0,
                  monto_seguro: 0,
                  recargo_mora_porcentaje: 20,
                  dias_vencimiento: 30,
                }

                const isEditing = editandoCarrera === carrera.id

                return (
                  <div key={carrera.id} className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-white">{carrera.nombre}</h3>
                        {carrera.duracion_años && <p className="text-xs text-slate-400">{carrera.duracion_años} años</p>}
                      </div>
                      <button onClick={() => setEditandoCarrera(isEditing ? null : carrera.id)} className="text-indigo-400 hover:text-indigo-300 p-2">
                        <Edit2 size={18} />
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            { label: 'Inscripción', key: 'monto_inscripcion' },
                            { label: 'Cuota Mensual', key: 'monto_cuota' },
                            { label: 'Seguro (por mes)', key: 'monto_seguro' },
                          ].map((field) => (
                            <div key={field.key}>
                              <label className="block text-xs font-bold text-slate-300 mb-1">{field.label}</label>
                              <input
                                type="number"
                                step="0.01"
                                value={form[field.key as keyof typeof form]}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    [carrera.id]: { ...form, [field.key]: parseFloat(e.target.value) },
                                  })
                                }
                                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: 'Recargo Mora (%)', key: 'recargo_mora_porcentaje' },
                            { label: 'Días Vencimiento', key: 'dias_vencimiento' },
                          ].map((field) => (
                            <div key={field.key}>
                              <label className="block text-xs font-bold text-slate-300 mb-1">{field.label}</label>
                              <input
                                type="number"
                                value={form[field.key as keyof typeof form]}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    [carrera.id]: { ...form, [field.key]: parseFloat(e.target.value) },
                                  })
                                }
                                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => handleGuardarCarrera(carrera.id)}
                          disabled={guardando}
                          className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:bg-slate-600"
                        >
                          <Save size={16} />
                          {guardando ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-slate-400">Inscripción</p>
                          <p className="font-semibold text-indigo-400">${form.monto_inscripcion.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Cuota</p>
                          <p className="font-semibold text-indigo-400">${form.monto_cuota.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Seguro (total)</p>
                          <p className="font-semibold text-indigo-400">${form.monto_seguro.toFixed(2)}</p>
                          
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* TAB: TALONARIOS */}
        {tabActiva === 'talonarios' && (
          <div className="space-y-6">
            {configsTalonarios.map((config: any) => (
              <div key={`${config.institucion_id}-${config.tipo_talonario}`} className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Receipt size={18} className="text-indigo-400" />
                      Talonario: {config.tipo_talonario}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2">
                      Próximo: <strong>{String(nuevoNumeroTalonario[config.tipo_talonario] || config.numero_actual).padStart(nuevoDígitos[config.tipo_talonario] || config.padding || 4, '0')}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setEditandoTalonario(editandoTalonario === config.tipo_talonario ? null : config.tipo_talonario)}
                    className="text-indigo-400 hover:text-indigo-300 p-2"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>

                {editandoTalonario === config.tipo_talonario ? (
                  <div className="space-y-3 bg-slate-700/30 p-4 rounded border border-slate-600/50">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">Número Inicial</label>
                        <input
                          type="number"
                          min="1"
                          value={nuevoNumeroTalonario[config.tipo_talonario] || config.numero_actual}
                          onChange={(e) =>
                            setNuevoNumeroTalonario({
                              ...nuevoNumeroTalonario,
                              [config.tipo_talonario]: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">Dígitos</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={nuevoDígitos[config.tipo_talonario] || config.padding || 4}
                          onChange={(e) =>
                            setNuevoDígitos({
                              ...nuevoDígitos,
                              [config.tipo_talonario]: parseInt(e.target.value) || 4,
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">Prefijo</label>
                        <input
                          type="text"
                          maxLength="5"
                          value={nuevoPrefijo[config.tipo_talonario] || config.prefijo || ''}
                          onChange={(e) =>
                            setNuevoPrefijo({
                              ...nuevoPrefijo,
                              [config.tipo_talonario]: e.target.value,
                            })
                          }
                          placeholder="Ej: C"
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => handleGuardarTalonario(config.tipo_talonario)}
                      disabled={guardandoTalonario}
                      className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:bg-slate-600 hover:from-indigo-700 hover:to-purple-700 transition"
                    >
                      <Save size={16} />
                      {guardandoTalonario ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}


        {/* TAB: ESTADOS */}
        {tabActiva === 'estados' && (
          <div className="p-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl">
            <PestaniaEstadosAlumnos institucion_id={institucionActiva.id} />
          </div>
        )}
      </div>

      {/* MODALES */}
      <ModalAgregarEstudiante isOpen={modalAbrirEstudiante} onClose={() => setModalAbrirEstudiante(false)} onAgregar={agregarEstudiante} carreras={carreras} institucion_id={institucionActiva.id} />
      <ModalAgregarInsumo 
        isOpen={modalAbrirInsumo} 
        onClose={handleCerrarModal} 
        onAgregar={(insumo) => agregarInsumo({ ...insumo, institucion_id: institucionActiva.id })} 
        onActualizar={handleActualizarInsumo}
        insumoEditando={insumoEditando}
        categorias={[...new Set(insumos.map((i) => i.categoria).filter(Boolean))]} 
      />
      <ModalVerConceptosEstudiante isOpen={modalVerConceptos.isOpen} onClose={() => setModalVerConceptos({ isOpen: false, estudiante: null })} estudiante={modalVerConceptos.estudiante} />
    </div>
  )
}



