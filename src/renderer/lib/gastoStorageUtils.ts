import { supabase } from './supabase'

interface UploadGastoArchivoResult {
  success: boolean
  url?: string
  error?: string
  tipoArchivo?: string
}

/**
 * Sube un archivo de factura/comprobante usando Edge Function
 * @param archivo - File object del input
 * @param institucionId - ID de la institución
 * @param usuarioId - ID del usuario (para validación en Edge Function)
 * @returns URL pública del archivo o error
 */
export const subirArchivoGasto = async (
  archivo: File,
  institucionId: number,
  usuarioId: number
): Promise<UploadGastoArchivoResult> => {
  try {
    // Validaciones locales (primeras defensas)
    if (!archivo) {
      return { success: false, error: 'No se seleccionó archivo' }
    }

    // Validar tipo de archivo
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!tiposPermitidos.includes(archivo.type)) {
      return {
        success: false,
        error: 'Tipo de archivo no permitido. Solo JPG, PNG, WebP y PDF.'
      }
    }

    // Validar tamaño (máximo 10 MB)
    const maxTamano = 10 * 1024 * 1024 // 10 MB
    if (archivo.size > maxTamano) {
      return {
        success: false,
        error: 'Archivo demasiado grande. Máximo 10 MB.'
      }
    }

    // Validaciones completadas, llamar Edge Function
    console.log(`📤 Llamando Edge Function para subir: ${archivo.name}`)

    // Crear FormData para enviar archivo
    const formData = new FormData()
    formData.append('archivo', archivo)
    formData.append('institucion_id', institucionId.toString())
    formData.append('usuario_id', usuarioId.toString())

    // Obtener URL de Supabase
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tcqamchiwtijniiwbpde.supabase.co'
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/upload-gasto-comprobante`

    // Obtener token Supabase (si existe sesión)
    const token = localStorage.getItem('supabase.auth.token')
    
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Llamar Edge Function
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      body: formData,
      headers: headers,
    })

    // Verificar respuesta
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
      console.error(`❌ Error en Edge Function (${response.status}):`, errorData)
      
      return {
        success: false,
        error: errorData.error || `Error ${response.status}: ${response.statusText}`
      }
    }

    // Parsear respuesta exitosa
    const data = await response.json()

    if (!data.success) {
      console.error('❌ Edge Function retornó error:', data.error)
      return {
        success: false,
        error: data.error || 'Error desconocido en Edge Function'
      }
    }

    console.log(`✅ Archivo subido exitosamente: ${data.url}`)

    return {
      success: true,
      url: data.url,
      tipoArchivo: data.tipoArchivo
    }
  } catch (err) {
    console.error('❌ Error en subirArchivoGasto:', err)
    const mensaje = err instanceof Error ? err.message : 'Error desconocido'
    return {
      success: false,
      error: `Error al subir archivo: ${mensaje}`
    }
  }
}

/**
 * Obtiene la extensión de un archivo desde su URL
 */
export const obtenerExtensionArchivo = (url: string): string => {
  try {
    const partes = url.split('.')
    return partes[partes.length - 1].toLowerCase() || 'archivo'
  } catch {
    return 'archivo'
  }
}

/**
 * Determina si un archivo es imagen o PDF desde su URL
 */
export const esImagenDelUrl = (url: string): boolean => {
  const extensionesImagen = ['jpg', 'jpeg', 'png', 'webp', 'gif']
  const ext = obtenerExtensionArchivo(url)
  return extensionesImagen.includes(ext)
}
