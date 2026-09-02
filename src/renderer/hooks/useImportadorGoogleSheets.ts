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
      console.log(`📍 URL: ${webhookUrl}`)
      
      // ✅ ARREGLADO v2.9: Sin mode:'no-cors' para recibir JSON
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ accion: "sincronizar", institucion_id })
      })
      
      console.log(`📊 Status: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('❌ Error parseando JSON:', parseError)
        const text = await response.text()
        console.error('📝 Response text:', text)
        throw new Error(`Respuesta inválida: ${text.substring(0, 100)}`)
      }
      
      console.log('✅ Resultado:', data)
      
      if (!data || !data.exito) {
        throw new Error(data?.mensaje || "Error en sincronización")
      }
      
      set({ resultado: data, loading: false })
      console.log('🎉 Sincronización exitosa')
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al sincronizar'
      set({ error: message, loading: false })
      console.error('❌ Error sincronizando:', err)
    }
  },

  obtenerWebhookUrl: () => {
    return import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || ""
  }
}))
