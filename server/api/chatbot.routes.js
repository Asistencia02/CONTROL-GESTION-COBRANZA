import express from 'express'
import axios from 'axios'
import { supabase } from '../config/database.js'

const router = express.Router()

// Palabras clave para detectar tipo de pregunta
const PALABRAS_CLAVE = {
  dinero: ['cuanto', 'cuánto', 'plata', 'pesos', 'dinero', 'monto', 'recaudado', 'recaudé', 'cobre', 'cobré', 'ingreso'],
  estudiantes: ['estudiante', 'estudiantes', 'alumnos', 'alumno', 'cuantos', 'cuántos', 'cuanta', 'cuánta', 'cantidad'],
  deuda: ['deuda', 'adeudado', 'debe', 'deben', 'deudas', 'mora', 'moroso', 'atrasado'],
  conceptos: ['concepto', 'conceptos', 'cuota', 'cuotas', 'inscripcion', 'inscripción', 'seguro'],
  becas: ['beca', 'becas', 'becado', 'becados'],
  carrera: ['carrera', 'carreras'],
}

// Detección de tipo de pregunta
function detectarTipoPregunta(pregunta) {
  const preguntaLower = pregunta.toLowerCase()
  
  for (const [tipo, palabras] of Object.entries(PALABRAS_CLAVE)) {
    if (palabras.some(p => preguntaLower.includes(p))) {
      return tipo
    }
  }
  
  return 'general'
}

// POST: Enviar pregunta
router.post('/ask', async (req, res) => {
  const { pregunta, institucion_id } = req.body
  const logger = req.app.locals.logger

  try {
    if (!pregunta || !institucion_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: pregunta e institucion_id'
      })
    }

    logger.info(`[CHATBOT] Pregunta: "${pregunta}"`)

    // 1️⃣ Enviar a Ollama
    let respuestaOllama = ''
    try {
      const response = await axios.post(
        'http://localhost:11434/api/generate',
        {
          model: 'mistral:7b',
          prompt: `Eres FUNDACION, un asistente financiero inteligente para una institución educativa.

Usuario pregunta: "${pregunta}"

Responde concisamente en español (máximo 3 líneas). Si pide datos financieros específicos, primero extrae la intención (cuánto, cuántos, cuál), luego responde que consultarás la BD.

Ejemplo:
Q: ¿Cuánto recaudé?
A: Voy a consultar cuánto recaudaste en total...`,
          stream: false,
          temperature: 0.7
        },
        { timeout: 30000 }
      )

      respuestaOllama = response.data.response
      logger.info(`[CHATBOT] Respuesta Ollama: ${respuestaOllama.substring(0, 100)}...`)
    } catch (ollamaError) {
      logger.error('[CHATBOT] Error Ollama:', ollamaError.message)
      throw new Error('Ollama no está disponible. Ejecuta "ollama serve" en terminal.')
    }

    // 2️⃣ Detectar tipo de pregunta
    const tipoPregunta = detectarTipoPregunta(pregunta)
    let datosConsultados = false
    let datosAdicionales = ''

    // 3️⃣ Consultar datos si es necesario
    if (tipoPregunta !== 'general') {
      datosConsultados = true

      switch (tipoPregunta) {
        case 'dinero':
          const { data: pagos } = await supabase
            .from('pagos')
            .select('monto_pagado')
            .eq('institucion_id', institucion_id)
            .neq('estado', 'ANULADO')

          const totalRecaudado = pagos?.reduce((sum, p) => sum + (p.monto_pagado || 0), 0) || 0
          datosAdicionales = `Total recaudado: $${totalRecaudado.toLocaleString('es-AR')}`
          break

        case 'estudiantes':
          const { data: estudiantes } = await supabase
            .from('estudiantes')
            .select('id, estado')
            .eq('institucion_id', institucion_id)
            .neq('estado', 'NO_VIENE_MAS')

          const total = estudiantes?.length || 0
          const activos = estudiantes?.filter(e => e.estado === 'ACTIVO').length || 0
          datosAdicionales = `Total: ${total} estudiantes (${activos} activos)`
          break

        case 'deuda':
          const { data: deudasCriticas } = await supabase
            .from('deudas_criticas')
            .select('total_adeudado')
            .eq('institucion_id', institucion_id)

          const totalDeuda = deudasCriticas?.reduce((sum, d) => sum + (d.total_adeudado || 0), 0) || 0
          datosAdicionales = `Deuda total: $${totalDeuda.toLocaleString('es-AR')}`
          break

        case 'conceptos':
          const { data: conceptos } = await supabase
            .from('conceptos_pago')
            .select('nombre, tipo, monto')
            .eq('institucion_id', institucion_id)
            .eq('activo', true)
            .limit(5)

          const conceptosTexto = conceptos?.map(c => `${c.nombre}: $${c.monto}`).join(', ') || 'N/A'
          datosAdicionales = `Conceptos: ${conceptosTexto}`
          break

        case 'becas':
          const { data: estudiantesEstado } = await supabase
            .from('estudiantes')
            .select('estado')
            .eq('institucion_id', institucion_id)

          const becado100 = estudiantesEstado?.filter(e => e.estado === 'BECADO_100').length || 0
          const becado50 = estudiantesEstado?.filter(e => e.estado === 'BECADO_50').length || 0
          datosAdicionales = `Becados 100%: ${becado100}, Becados 50%: ${becado50}`
          break

        case 'carrera':
          const { data: carreras } = await supabase
            .from('carreras')
            .select('nombre, id')
            .eq('institucion_id', institucion_id)
            .limit(5)

          const carrerasTexto = carreras?.map(c => c.nombre).join(', ') || 'N/A'
          datosAdicionales = `Carreras: ${carrerasTexto}`
          break
      }
    }

    // 4️⃣ Generar respuesta final
    const respuestaFinal = datosAdicionales 
      ? `${respuestaOllama}\n\n📊 Datos: ${datosAdicionales}`
      : respuestaOllama

    // 5️⃣ Guardar en BD
    try {
      await supabase
        .from('chatbot_historial')
        .insert({
          institucion_id,
          pregunta,
          respuesta: respuestaFinal,
          modelo: 'mistral:7b',
          tipo_pregunta: tipoPregunta,
          datos_consultados: datosConsultados,
          created_at: new Date().toISOString()
        })
    } catch (dbError) {
      logger.warn('[CHATBOT] Error guardando en BD:', dbError.message)
      // No fallar si no se guarda en BD
    }

    res.json({
      success: true,
      respuesta: respuestaFinal,
      datos_consultados: datosConsultados,
      tipo_pregunta: tipoPregunta
    })
  } catch (error) {
    logger.error('[CHATBOT] Error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message || 'Error procesando pregunta'
    })
  }
})

export default router
