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
      // ✅ ARREGLADO v2.10: Usar proxy de Vercel para evitar CORS
      const proxyUrl = '/api/sincronizar'
      
      console.log(`🔄 Sincronizando...`)
      console.log(`📍 URL proxy: ${proxyUrl}`)
      
      const response = await fetch(proxyUrl, {
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
    // Ya no se usa, pero lo dejamos por compatibilidad
    return import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || ""
  }
}))
