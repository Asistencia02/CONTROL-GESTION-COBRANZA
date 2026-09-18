import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabase'

export interface MensajeChat {
  id?: string
  tipo: 'usuario' | 'bot'
  texto: string
  timestamp: Date
  estado?: 'enviando' | 'enviado' | 'error'
}

interface UseChatFundacionStore {
  mensajes: MensajeChat[]
  cargando: boolean
  error: string | null
  institucionId: number

  enviarPregunta: (pregunta: string, institucionId: number) => Promise<void>
  cargarHistorial: (institucionId: number) => Promise<void>
  limpiarHistorial: () => void
  establecerInstitucion: (id: number) => void
}

export const useChatFundacion = create<UseChatFundacionStore>((set, get) => ({
  mensajes: [],
  cargando: false,
  error: null,
  institucionId: 1,

  establecerInstitucion: (id: number) => {
    set({ institucionId: id })
    get().cargarHistorial(id)
  },

  enviarPregunta: async (pregunta: string, institucionId: number) => {
    if (!pregunta.trim()) return

    set({ cargando: true, error: null })

    try {
      // 1️⃣ Agregar pregunta al historial
      const mensajeUsuario: MensajeChat = {
        tipo: 'usuario',
        texto: pregunta,
        timestamp: new Date(),
        estado: 'enviado'
      }

      set(state => ({
        mensajes: [...state.mensajes, mensajeUsuario]
      }))

      // 2️⃣ Enviar a servidor
      const apiUrl = process.env.NODE_ENV === 'production'
        ? `${window.location.origin}/api/chatbot/ask`
        : 'http://localhost:3001/api/chatbot/ask'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pregunta, 
          institucion_id: institucionId 
        })
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const { respuesta, datos_consultados, error: apiError } = await response.json()

      if (apiError) {
        throw new Error(apiError)
      }

      // 3️⃣ Agregar respuesta del bot
      const mensajeBot: MensajeChat = {
        tipo: 'bot',
        texto: respuesta,
        timestamp: new Date(),
        estado: 'enviado'
      }

      set(state => ({
        mensajes: [...state.mensajes, mensajeBot]
      }))

      // 4️⃣ Guardar en BD
      try {
        await supabase
          .from('chatbot_historial')
          .insert({
            institucion_id: institucionId,
            pregunta,
            respuesta,
            modelo: 'mistral:7b',
            datos_consultados: datos_consultados || false,
            created_at: new Date().toISOString()
          })
      } catch (dbError) {
        console.warn('Error guardando en BD:', dbError)
        // No fallar si no se guarda en BD
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido'

      // Agregar mensaje de error
      set(state => ({
        mensajes: [
          ...state.mensajes,
          {
            tipo: 'bot',
            texto: `❌ Error: ${errorMsg}\n\n¿Está Ollama corriendo en tu PC?\n\nEjecuta en terminal: \`ollama serve\``,
            timestamp: new Date(),
            estado: 'error'
          }
        ],
        error: errorMsg
      }))

      console.error('[CHAT] Error:', error)
    } finally {
      set({ cargando: false })
    }
  },

  cargarHistorial: async (institucionId: number) => {
    try {
      const { data, error } = await supabase
        .from('chatbot_historial')
        .select('*')
        .eq('institucion_id', institucionId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) throw error

      const mensajesCargados: MensajeChat[] = []

      data?.forEach(registro => {
        mensajesCargados.push({
          tipo: 'usuario',
          texto: registro.pregunta,
          timestamp: new Date(registro.created_at),
          estado: 'enviado'
        })

        mensajesCargados.push({
          tipo: 'bot',
          texto: registro.respuesta,
          timestamp: new Date(registro.created_at),
          estado: 'enviado'
        })
      })

      set({ mensajes: mensajesCargados })
    } catch (error) {
      console.error('[CHAT] Error cargando historial:', error)
    }
  },

  limpiarHistorial: () => {
    set({ mensajes: [] })
  }
}))
