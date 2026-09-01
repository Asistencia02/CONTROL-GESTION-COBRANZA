import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useEstudiantes } from '@renderer/hooks/useEstudiantes'
import { useInsumos } from '@renderer/hooks/useInsumos'
import { useConfiguracion } from '@renderer/hooks/useConfiguracion'
import { supabase } from '@renderer/lib/supabase'
import { Upload, Save, AlertCircle, Edit2, Plus, Download, Receipt, Zap } from 'lucide-react'
import * as XLSX from 'xlsx'
import { generarExcelReferencia } from '@renderer/lib/excelGenerator'
import { ModalAgregarEstudiante } from '@renderer/components/ModalAgregarEstudiante'
import { ModalAgregarInsumo } from '@renderer/components/ModalAgregarInsumo'
import { ModalVerConceptosEstudiante } from '@renderer/components/ModalVerConceptosEstudiante'
import { TablaInsumos } from '@renderer/components/TablaInsumos'
import { TablaEstudiantesCargar } from '@renderer/components/TablaEstudiantesCargar'
import { useTalonarioManager } from '@renderer/hooks/useTalonarioManager'
import { PestaniaEstadosAlumnos } from '@renderer/components/PestaniaEstadosAlumnos'
import { obtenerFechaLocalIso } from '@renderer/lib/dateUtils'
import { ModalGeneradorConceptos } from '@renderer/components/ModalGeneradorConceptos'

interface Carrera {
  id: number
  nombre: string
  nivel?: string
  duracion_años?: number
}

export const Configuracion: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { estudiantes, agregarEstudiante } = useEstudiantes()
  const { insumos, cargarInsumos, agregarInsumo, actualizarInsumo, eliminarInsumo, loading: insumosLoading } = useInsumos()
  const { configuraciones, cargarConfiguracionesPorInstitucion, actualizarConfiguracionCarrera, loading } = useConfiguracion()

  const [carreras, setCarreras] = useState<Carrera[]>([])
  const [cargandoExcel, setCargandoExcel] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [editandoCarrera, setEditandoCarrera] = useState<number | null>(null)
  const [modalAbrirEstudiante, setModalAbrirEstudiante] = useState(false)
  const [modalAbrirInsumo, setModalAbrirInsumo] = useState(false)
  const [activarPestana, setActivarPestana] = useState<'estudiantes' | 'insumos' | 'montos' | 'talonarios' | 'estados'>('estudiantes')
  const [modalVerConceptos, setModalVerConceptos] = useState<{ isOpen: boolean; estudiante: any | null }>({
    isOpen: false,
    estudiante: null,
  })

  const { obtenerTodasLasConfiguraciones } = useTalonarioManager()
  const [configsTalonarios, setConfigsTalonarios] = useState<any[]>([])
  const [editandoTalonario, setEditandoTalonario] = useState<string | null>(null)
  const [nuevoNumeroTalonario, setNuevoNumeroTalonario] = useState<Record<string, number>>({})
  const [guardandoTalonario, setGuardandoTalonario] = useState(false)
  const [modalGeneradorConceptos, setModalGeneradorConceptos] = useState(false)

  const [formData, setFormData] = useState<Record<number, { monto_inscripcion: number; monto_cuota: number; monto_seguro: number; recargo_mora_porcentaje: number; dias_vencimiento: number }>>({})

  const procesarExcel = useCallback(async (file: File) => {
    console.log("🔴 procesarExcel INICIADO con archivo:", file.name, file.size)
    setCargandoExcel(true)
    setMensaje('')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(worksheet) as any[]

      console.log("📊 Excel procesado, filas:", data.length)

      if (data.length === 0) {
        setMensaje('❌ Excel vacío')
        return
      }

      let exitosos = 0
      let errores = 0
      let pagosRegistrados = 0
      const erroresDetalle: { fila: number; razon: string }[] = []

      const { data: conceptosData } = await supabase
        .from('conceptos_pago')
        .select('id, nombre, tipo, monto, mes, carrera_id')
        .eq('institucion_id', institucionActiva.id)
        .eq('activo', true)

      const conceptos = conceptosData || []
      console.log("📋 Conceptos cargados:", conceptos.length)

      for (let index = 0; index < data.length; index++) {
        const row = data[index]
        const numeroFila = index + 2
        try {
          const dni = String(row.DNI || row.dni || '').trim()
          const nombre = String(row.Nombre || row.nombre || '').trim()
          const apellido = String(row.Apellido || row.apellido || '').trim()

          let carrera_id: number | null = null
          let carreraValor = row['Carrera/Nivel'] || row['carrera/nivel'] || row.Carrera || row.carrera || row.Nivel || row.nivel || ''
          carreraValor = String(carreraValor).trim()

          console.log(`Fila ${numeroFila}: DNI=${dni}, Nombre=${nombre}, CarreraValor=${carreraValor}`)

          const carrera_id_str = row.carrera_id || row.Carrera_ID || carreraValor
          if (carrera_id_str && !isNaN(parseInt(carrera_id_str))) {
            const parsed = parseInt(carrera_id_str)
            if (!isNaN(parsed)) {
              carrera_id = parsed
              console.log(`  ✓ Carrera ID encontrado: ${carrera_id}`)
            }
          }

          if (!carrera_id || isNaN(carrera_id)) {
            const nombreCarrera = carreraValor
            console.log(`  Buscando carrera por nombre: "${nombreCarrera}"`)
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
                console.log(`  ✓ Carrera encontrada: ${carrera_id}`)
              }
            }
          }

          if (!dni) {
            erroresDetalle.push({ fila: numeroFila, razon: 'DNI vacío' })
            errores++
            continue
          }

          if (!nombre) {
            erroresDetalle.push({ fila: numeroFila, razon: 'Nombre vacío' })
            errores++
            continue
          }

          if (!apellido) {
            erroresDetalle.push({ fila: numeroFila, razon: 'Apellido vacío' })
            errores++
            continue
          }

          if (!carrera_id || isNaN(carrera_id)) {
            const carrera_input = row.Carrera || row.carrera || row.Nivel || row.nivel || 'no especificada'
            erroresDetalle.push({ fila: numeroFila, razon: `Carrera/Nivel no encontrada: "${carrera_input}"` })
            errores++
            continue
          }

          const carreraExiste = carreras.find((c) => c.id === carrera_id)
          if (!carreraExiste) {
            erroresDetalle.push({ fila: numeroFila, razon: `Carrera ID ${carrera_id} no existe` })
            errores++
            continue
          }

          const { data: estudianteExistente } = await supabase
            .from('estudiantes')
            .select('id, carrera_id')
            .eq('dni', dni)
            .eq('institucion_id', institucionActiva.id)
            .maybeSingle()

          let estudianteId: number

          if (estudianteExistente) {
            estudianteId = estudianteExistente.id
            if (estudianteExistente.carrera_id !== carrera_id) {
              console.log(`Actualizando carrera de estudiante ${estudianteId}: ${estudianteExistente.carrera_id} → ${carrera_id}`)
              await supabase
                .from('estudiantes')
                .update({ carrera_id: carrera_id })
                .eq('id', estudianteId)
            }
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
              throw new Error('No se pudo agregar el estudiante')
            }

            estudianteId = nuevoEstudianteData[0].id
            exitosos++
          }

          const pagosARegistrar: any[] = []

          const carrera_id_num = parseInt(String(carrera_id))
          const conceptosDelEstudiante = conceptos.filter(c => {
            const c_carrera_id = parseInt(String(c.carrera_id))
            return c_carrera_id === carrera_id_num
          })

          console.log(`Fila ${numeroFila}: Buscando en carrera ${carrera_id_num}, encontrados ${conceptosDelEstudiante.length} conceptos`)

          for (const [key, value] of Object.entries(row)) {
            const keyLower = String(key).toLowerCase().trim()
            const valorStr = String(value).toLowerCase().trim()

            const esPagado = ['si', '1', 'x', 's', 'true', 'sí', 'v', 'verdadero'].includes(valorStr) && valorStr !== ''

            if (esPagado) {
              let conceptoCoincidente = null

            console.log(`\n📌 Fila ${numeroFila}, Estudiante: ${nombre}, Carrera: ${carrera_id_num}`)
console.log(`  Buscando concepto: "${keyLower}"`)
console.log(`  Conceptos disponibles en carrera ${carrera_id_num}:`, conceptosDelEstudiante.map(c => `${c.id}:${c.nombre}`))

// Buscar solo la primera palabra
conceptoCoincidente = conceptosDelEstudiante.find((c) => {
  const conceptoPrimera = c.nombre.split(' ')[0].toLowerCase()
  const match = conceptoPrimera === keyLower
  console.log(`    Comparando: "${conceptoPrimera}" === "${keyLower}" = ${match}`)
  return match
})

if (conceptoCoincidente) {
  console.log(`  ✓ ENCONTRADO: ${conceptoCoincidente.nombre} (ID ${conceptoCoincidente.id}, Carrera ${conceptoCoincidente.carrera_id})`)
  
  // Verificación de seguridad
  const conceptoCarreraId = parseInt(String(conceptoCoincidente.carrera_id))
  if (conceptoCarreraId !== carrera_id_num) {
    console.log(`  ❌ RECHAZADO: carrera ${conceptoCarreraId} != ${carrera_id_num}`)
    conceptoCoincidente = null
  }
} else {
  console.log(`  ❌ NO ENCONTRADO`)
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
                    carrera_id: carrera_id_num,
                    monto_pagado: conceptoCoincidente.monto,
                    monto_original: conceptoCoincidente.monto,
                    metodo_pago: 'EFECTIVO',
                    fecha_pago: obtenerFechaLocalIso(),
                    estado: null,
                    notas: 'Registrado en carga masiva',
                  })
                }
              }
            }
          }

          if (pagosARegistrar.length > 0) {
            const { error: errorPagos } = await supabase.from('pagos').insert(pagosARegistrar)

            if (!errorPagos) {
              pagosRegistrados += pagosARegistrar.length
            }
          }
        } catch (err) {
          const razon = err instanceof Error ? err.message : 'Error desconocido'
          erroresDetalle.push({ fila: numeroFila, razon })
          console.error(`Error fila ${numeroFila}:`, err)
          errores++
        }
      }

      let msgCompleto = `✓ ${exitosos} importados, ${pagosRegistrados} pagos registrados, ${errores} errores`
      if (erroresDetalle.length > 0) {
        const detalles = erroresDetalle.slice(0, 3)
        const detallesMsg = detalles.map((e) => `Fila ${e.fila}: ${e.razon}`).join(' | ')
        msgCompleto += ` - ${detallesMsg}`
        if (erroresDetalle.length > 3) {
          msgCompleto += ` (y ${erroresDetalle.length - 3} más)`
        }
      }
      setMensaje(msgCompleto)
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error al procesar Excel')
    } finally {
      setCargandoExcel(false)
    }
  }, [institucionActiva.id, carreras])

  const fileInputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
  const input = document.getElementById('excel-upload') as HTMLInputElement

    if (!input) {
      console.log('❌ Input no encontrado')
      return
    }

    console.log('✅ useEffect ejecutado, agregando listener')

    const handleChange = async (event: Event) => {
      console.log('🔴 onChange disparado')
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      
      if (file) {
        console.log('📁 Archivo:', file.name)
        await procesarExcel(file)
      }
      
      target.value = ''
    }

    input.addEventListener('change', handleChange)
    return () => input.removeEventListener('change', handleChange)
  }, [procesarExcel])

  const triggerFileSelect = useCallback(() => {
    console.log('🖱️ Click en botón')
    fileInputRef.current?.click()
  }, [])

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
        configs.forEach((c: any) => {
          numeros[c.tipo_talonario] = c.numero_actual
        })
        setNuevoNumeroTalonario(numeros)
      } catch (error) {
        console.error('Error cargando datos:', error)
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

      setMensaje('✓ Configuración guardada')
      setEditandoCarrera(null)
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      console.error('Error:', error)
      setMensaje('❌ Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleDescargarExcelReferencia = async () => {
    try {
      const { data: conceptosData } = await supabase
        .from('conceptos_pago')
        .select('id, nombre, tipo')
        .eq('institucion_id', institucionActiva.id)
        .eq('activo', true)
        .order('tipo', { ascending: false })
        .order('mes', { ascending: true })

      generarExcelReferencia({
        carreras: carreras,
        conceptos: conceptosData || [],
      })
    } catch (error) {
      console.error('Error generando Excel:', error)
      setMensaje('❌ Error al generar Excel de referencia')
    }
  }

  const handleActualizarStock = async (insumo_id: number, nuevaCantidad: number) => {
    try {
      await actualizarInsumo(insumo_id, { cantidad_stock: nuevaCantidad })
      setMensaje('✓ Stock actualizado')
      setTimeout(() => setMensaje(''), 2000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al actualizar'
      setMensaje(`❌ ${errorMsg}`)
    }
  }

  const handleEliminarInsumo = async (insumo_id: number) => {
    try {
      await eliminarInsumo(insumo_id)
      setMensaje('✓ Insumo eliminado')
      setTimeout(() => setMensaje(''), 2000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al eliminar'
      setMensaje(`❌ ${errorMsg}`)
    }
  }

  const handleAgregarCategoria = async (nombre: string) => {
    try {
      setMensaje(`✓ Categoría "${nombre}" agregada`)
      setTimeout(() => setMensaje(''), 3000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al agregar categoría'
      setMensaje(`❌ ${errorMsg}`)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Configuración - {institucionActiva.nombreCorto}</h1>

      {mensaje && (
        <div className={`mb-6 p-4 rounded-lg border ${mensaje.includes('✓') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {mensaje}
        </div>
      )}

      <div className="flex gap-2 mb-8 border-b border-gray-200">
        <button
          onClick={() => setActivarPestana('estudiantes')}
          className={`px-4 py-2 font-semibold transition ${
            activarPestana === 'estudiantes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Estudiantes
        </button>
        <button
          onClick={() => setActivarPestana('insumos')}
          className={`px-4 py-2 font-semibold transition ${
            activarPestana === 'insumos' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Inventario/Insumos
        </button>
        <button
          onClick={() => setActivarPestana('montos')}
          className={`px-4 py-2 font-semibold transition ${
            activarPestana === 'montos' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Montos por Carrera
        </button>
        <button
          onClick={() => setActivarPestana('talonarios')}
          className={`px-4 py-2 font-semibold transition flex items-center gap-2 ${
            activarPestana === 'talonarios' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Receipt size={18} />
          Talonarios
        </button>
        <button
          onClick={() => setActivarPestana('estados')}
          className={`px-4 py-2 font-semibold transition ${
            activarPestana === 'estados' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Estados de Alumnos
        </button>
      </div>

      {activarPestana === 'estudiantes' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setModalAbrirEstudiante(true)}
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              <Plus size={20} />
              Agregar Estudiante
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Upload size={20} />
                Carga Masiva de Estudiantes
              </h2>
              <button
                onClick={handleDescargarExcelReferencia}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                <Download size={18} />
                Descargar Excel Referencia
              </button>
            </div>

            <div className="text-sm text-gray-600 mb-4 space-y-2">
              <p>
                <strong>Formato Excel requerido (mínimo):</strong> DNI | Nombre | Apellido | Carrera/Nivel | Email (opcional) | Telefono (opcional)
              </p>
              <p>
                <strong>Columnas para pagos:</strong> Inscripción | Seguro | Cuota Marzo | Cuota Abril | Cuota Mayo | Cuota Junio | Cuota Julio | Cuota Agosto | Cuota Septiembre | Cuota Octubre | Cuota Noviembre | Cuota Diciembre
              </p>
              <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded border border-gray-300">
                <strong>Ejemplos de uso:</strong>
                <br />• Carrera por ID: Valor numérico (1, 2, 3)
                <br />• Carrera por nombre: "Analista en Sistemas"
                <br />• Conceptos pagados: "SI", "1", "X", "V" en la columna del concepto
                <br />• Ejemplo: 12345678 | Juan | Pérez | Analista | juan@mail.com | 1234567890 | SI | SI | SI | | | | | SI
              </p>
            </div>

            <button
              type="button"
              onClick={triggerFileSelect}
              disabled={cargandoExcel}
              className={`w-full p-8 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-2 transition ${
                cargandoExcel ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400 cursor-pointer'
              }`}
            >
              <Upload size={32} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {cargandoExcel ? 'Cargando...' : 'Haz clic para seleccionar archivo'}
              </span>
            </button>

            <input 
              ref={fileInputRef}
              type="file" 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Estudiantes - Ver Conceptos y Registrar Pagos</h2>
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

      {activarPestana === 'insumos' && (
        <TablaInsumos
          insumos={insumos}
          loading={insumosLoading}
          onAgregar={() => setModalAbrirInsumo(true)}
          onActualizarStock={handleActualizarStock}
          onEliminar={handleEliminarInsumo}
          onAgregarCategoria={handleAgregarCategoria}
        />
      )}

      {activarPestana === 'montos' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Configurar Montos por Carrera/Nivel</h2>
            <button
              onClick={() => setModalGeneradorConceptos(true)}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition flex items-center gap-2"
            >
              <Zap size={18} />
              Generar Conceptos
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500">Cargando...</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {carreras.map((carrera) => {
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
                  <div key={carrera.id} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-800">{carrera.nombre}</h3>
                        {carrera.duracion_años && <p className="text-xs text-gray-600">{carrera.duracion_años} años</p>}
                      </div>
                      <button onClick={() => setEditandoCarrera(isEditing ? null : carrera.id)} className="text-blue-600 hover:text-blue-700 p-2">
                        <Edit2 size={18} />
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Inscripción</label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.monto_inscripcion}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  [carrera.id]: { ...form, monto_inscripcion: parseFloat(e.target.value) },
                                })
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Cuota Mensual</label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.monto_cuota}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  [carrera.id]: { ...form, monto_cuota: parseFloat(e.target.value) },
                                })
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Seguro</label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.monto_seguro}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  [carrera.id]: { ...form, monto_seguro: parseFloat(e.target.value) },
                                })
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Recargo Mora (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={form.recargo_mora_porcentaje}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  [carrera.id]: { ...form, recargo_mora_porcentaje: parseFloat(e.target.value) },
                                })
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Días Vencimiento</label>
                            <input
                              type="number"
                              value={form.dias_vencimiento}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  [carrera.id]: { ...form, dias_vencimiento: parseInt(e.target.value) },
                                })
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => handleGuardarCarrera(carrera.id)}
                          disabled={guardando}
                          className="w-full bg-blue-600 text-white py-2 rounded text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                        >
                          <Save size={16} />
                          {guardando ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Inscripción</p>
                          <p className="font-semibold text-gray-900">${form.monto_inscripcion.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Cuota</p>
                          <p className="font-semibold text-gray-900">${form.monto_cuota.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Seguro</p>
                          <p className="font-semibold text-gray-900">${form.monto_seguro.toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activarPestana === 'estados' && (
        <PestaniaEstadosAlumnos institucion_id={institucionActiva.id} />
      )}

      {activarPestana === 'talonarios' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
              <Receipt size={20} />
              Configuración de Talonarios
            </h2>
            <p className="text-sm text-gray-600">Aquí configuras el número de talonario actual. A partir del próximo cobro, el sistema asignará automáticamente los números secuenciales.</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {configsTalonarios.map((config: any) => (
              <div key={`${config.institucion_id}-${config.tipo_talonario}`} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Receipt size={18} className="text-blue-600" />
                      Talonario: {config.tipo_talonario}
                    </h3>
                    <p className="text-xs text-gray-600 mt-2">
                      Próximo número: <strong>{String(config.numero_actual).padStart(config.padding, '0')}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setEditandoTalonario(editandoTalonario === config.tipo_talonario ? null : config.tipo_talonario)}
                    className="text-blue-600 hover:text-blue-700 p-2 transition"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>

                {editandoTalonario === config.tipo_talonario ? (
                  <div className="space-y-3 bg-gray-50 p-4 rounded border border-gray-200">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Número inicial</label>
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Dígitos</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={config.padding || 4}
                          onChange={(e) => {
                            const newPadding = parseInt(e.target.value) || 4
                            setConfigsTalonarios(
                              configsTalonarios.map((c) =>
                                c.tipo_talonario === config.tipo_talonario
                                  ? { ...c, padding: newPadding }
                                  : c
                              )
                            )
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prefijo</label>
                        <input
                          type="text"
                          maxLength="5"
                          value={config.prefijo || ''}
                          onChange={(e) => {
                            setConfigsTalonarios(
                              configsTalonarios.map((c) =>
                                c.tipo_talonario === config.tipo_talonario
                                  ? { ...c, prefijo: e.target.value }
                                  : c
                              )
                            )
                          }}
                          placeholder="Ej: C, V, F"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        setGuardandoTalonario(true)
                        try {
                          const { error } = await supabase
                            .from('talonarios_config')
                            .update({
                              numero_actual: nuevoNumeroTalonario[config.tipo_talonario] || config.numero_actual,
                              padding: config.padding || 4,
                              prefijo: config.prefijo || null,
                            })
                            .eq('institucion_id', institucionActiva.id)
                            .eq('tipo_talonario', config.tipo_talonario)

                          if (error) throw error

                          setMensaje(`✓ Talonario ${config.tipo_talonario} actualizado`)
                          setEditandoTalonario(null)
                          const configs = await obtenerTodasLasConfiguraciones(institucionActiva.id)
                          setConfigsTalonarios(configs)
                          setTimeout(() => setMensaje(''), 3000)
                        } catch (error) {
                          console.error('Error:', error)
                          setMensaje('❌ Error al guardar')
                        } finally {
                          setGuardandoTalonario(false)
                        }
                      }}
                      disabled={guardandoTalonario}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2 disabled:bg-gray-400"
                    >
                      <Save size={16} />
                      {guardandoTalonario ? 'Guardando...' : 'Guardar'}
                    </button>
                    <p className="text-xs text-gray-600 text-center">
                      Próximo talonario: <strong>{(config.prefijo || '') + String(nuevoNumeroTalonario[config.tipo_talonario] || config.numero_actual).padStart(config.padding || 4, '0')}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <p className="text-gray-600 text-xs">Formato actual</p>
                      <p className="font-semibold text-gray-900 text-lg mt-1">{(config.prefijo || '') + String(config.numero_actual).padStart(config.padding, '0')}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <p className="text-gray-600 text-xs">Dígitos</p>
                      <p className="font-semibold text-gray-900 text-lg mt-1">{config.padding}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <p className="text-gray-600 text-xs">Prefijo</p>
                      <p className="font-semibold text-gray-900 text-lg mt-1">{config.prefijo || '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <ModalAgregarEstudiante isOpen={modalAbrirEstudiante} onClose={() => setModalAbrirEstudiante(false)} onAgregar={agregarEstudiante} carreras={carreras} institucion_id={institucionActiva.id} />

      <ModalAgregarInsumo isOpen={modalAbrirInsumo} onClose={() => setModalAbrirInsumo(false)} onAgregar={agregarInsumo} categorias={[...new Set(insumos.map((i) => i.categoria).filter(Boolean))]} />

      <ModalVerConceptosEstudiante isOpen={modalVerConceptos.isOpen} onClose={() => setModalVerConceptos({ isOpen: false, estudiante: null })} estudiante={modalVerConceptos.estudiante} />

      <ModalGeneradorConceptos
        institucionId={institucionActiva.id}
        isOpen={modalGeneradorConceptos}
        onClose={() => setModalGeneradorConceptos(false)}
        onSuccess={() => {
          // Recargar datos si es necesario
        }}
      />
    </div>
  )
}
