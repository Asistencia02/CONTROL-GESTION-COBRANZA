import express from 'express'
import cors from 'cors'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://cobranzafnsm.vercel.app',
    'https://*.cfargotunnel.com'
  ],
  credentials: true
}))
app.use(express.json())

// Logger
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} ${msg}`)
}

app.locals.logger = logger

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Palabras clave para detectar tipo de pregunta
const PALABRAS_CLAVE = {
  dinero: ['cuanto', 'cuánto', 'plata', 'pesos', 'dinero', 'monto', 'recaudado', 'recaudé', 'cobre', 'cobré', 'ingreso'],
  estudiantes: ['estudiante', 'estudiantes', 'alumnos', 'alumno', 'cuantos', 'cuántos', 'cuanta', 'cuánta', 'cantidad'],
  deuda: ['deuda', 'adeudado', 'debe', 'deben', 'deudas', 'mora', 'moroso', 'atrasado'],
  conceptos: ['concepto', 'conceptos', 'cuota', 'cuotas', 'inscripcion', 'inscripción', 'seguro'],
  becas: ['beca', 'becas', 'becado', 'becados'],
  carrera: ['carrera', 'carreras'],
}

function detectarTipoPregunta(pregunta) {
  const preguntaLower = pregunta.toLowerCase()
  
  for (const [tipo, palabras] of Object.entries(PALABRAS_CLAVE)) {
    if (palabras.some(p => preguntaLower.includes(p))) {
      return tipo
    }
  }
  
  return 'general'
}

// POST: Procesar pregunta con Ollama
app.post('/api/chatbot/ask', async (req, res) => {
  const { pregunta, institucion_id } = req.body

  try {
    if (!pregunta) {
      return res.status(400).json({
        success: false,
        error: 'Falta parámetro: pregunta'
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
      logger.info(`[CHATBOT] Respuesta Ollama OK`)
    } catch (ollamaError) {
      logger.error(`[CHATBOT] Error Ollama: ${ollamaError.message}`)
      throw new Error('Ollama no está disponible. Ejecuta "ollama serve" en terminal.')
    }

    // 2️⃣ Detectar tipo de pregunta
    const tipoPregunta = detectarTipoPregunta(pregunta)

    // Respuesta final
    const respuestaFinal = `${respuestaOllama}`

    res.json({
      success: true,
      respuesta: respuestaFinal,
      datos_consultados: false,
      tipo_pregunta: tipoPregunta
    })
  } catch (error) {
    logger.error(`[CHATBOT] Error: ${error.message}`)
    res.status(500).json({
      success: false,
      error: error.message || 'Error procesando pregunta'
    })
  }
})

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`🚀 Servidor corriendo en http://localhost:${PORT}`)
  logger.info(`✅ Ollama esperado en http://localhost:11434`)
  logger.info(`✅ CORS habilitado para Vercel`)
})
