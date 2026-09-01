import { create } from 'zustand'

interface ImportadorStore {
  loading: boolean
  error: string | null
  resultado: any | null
  
  sincronizarManualmente: (institucion_id: number) => Promise<void>
  obtenerWebhookUrl: () => string
}

export const useImportadorGoogleSheets = create<ImportadorStore>((set, get) => ({
  loading: false,
  error: null,
  resultado: null,

  sincronizarManualmente: async (institucion_id: number) => {
    set({ loading: true, error: null, resultado: null })
    try {
      const webhookUrl = get().obtenerWebhookUrl()
      
      if (!webhookUrl) {
        throw new Error("URL del webhook no configurada")
      }
      
      console.log(`🔄 Sincronizando...`)
      
      const response = await fetch(webhookUrl + "?accion=sincronizar", {
        method: "POST",
        mode: 'no-cors',
        headers: { "Content-Type": "application/json" }
      })
      
      const resultado = await response.text()
      console.log('Response recibida:', resultado)
      
      if (!resultado || resultado.trim() === '') {
        throw new Error('Respuesta vacía del servidor')
      }
      
      let data
      try {
        data = JSON.parse(resultado)
      } catch (e) {
        console.error('Error parseando JSON:', e)
        console.error('Response text:', resultado)
        throw new Error(`Respuesta inválida del servidor: ${resultado.substring(0, 100)}`)
      }
      
      if (!data.exito) {
        throw new Error(data.mensaje || "Error en sincronización")
      }
      
      set({ resultado: data, loading: false })
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al sincronizar'
      set({ error: message, loading: false })
      console.error('Error sincronizando:', err)
    }
  },

  obtenerWebhookUrl: () => {
    return import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || ""
  }
}))
