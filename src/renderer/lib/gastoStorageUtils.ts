import { supabase } from './supabase'

interface UploadGastoArchivoResult {
  success: boolean
  url?: string
  error?: string
  tipoArchivo?: string
}

/**
 * Sube un archivo de factura/comprobante directamente a Storage
 * REQUIERE: Bucket "comprobantes" con RLS DESHABILITADO
 * @param archivo - File object del input
 * @param institucionId - ID de la institución
 * @param usuarioId - ID del usuario (para logs)
 * @returns URL pública del archivo o error
 */
export const subirArchivoGasto = async (
  archivo: File,
  institucionId: number,
  usuarioId: number
): Promise<UploadGastoArchivoResult> => {
  try {
    // Validaciones locales
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
    const maxTamano = 10 * 1024 * 1024
    if (archivo.size > maxTamano) {
      return {
        success: false,
        error: 'Archivo demasiado grande. Máximo 10 MB.'
      }
    }

    console.log(`📤 Subiendo archivo a Storage: ${archivo.name}`)

    // Generar nombre único
    const timestamp = Date.now()
    const extension = archivo.name.split('.').pop() || 'archivo'
    const nombreArchivo = `gasto-${institucionId}-${timestamp}.${extension}`
    const carpeta = `gastos/${institucionId}`
    const ruta = `${carpeta}/${nombreArchivo}`

    // SUBIR DIRECTAMENTE A STORAGE (sin Edge Function)
    const { data, error } = await supabase.storage
      .from('comprobantes')
      .upload(ruta, archivo, {
        contentType: archivo.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('❌ Error uploading to Storage:', error)
      console.error('Status:', error.status)
      console.error('Message:', error.message)

      // Errores específicos
      if (error.message?.includes('row-level security')) {
        return {
          success: false,
          error: 'Error RLS: Deshabilita RLS en Supabase Storage (bucket: comprobantes)'
        }
      }

      if (error.message?.includes('Bucket not found')) {
        return {
          success: false,
          error: 'Error: Bucket "comprobantes" no existe. Créalo en Supabase Storage.'
        }
      }

      return {
        success: false,
        error: `Error al subir: ${error.message}`
      }
    }

    // Obtener URL pública
    const { data: datosPublicos } = supabase.storage
      .from('comprobantes')
      .getPublicUrl(ruta)

    const archivoUrl = datosPublicos.publicUrl

    console.log(`✅ Archivo subido: ${archivoUrl}`)

    return {
      success: true,
      url: archivoUrl,
      tipoArchivo: archivo.type.includes('image') ? 'imagen' : 'pdf'
    }
  } catch (err) {
    console.error('❌ Error en subirArchivoGasto:', err)
    const mensaje = err instanceof Error ? err.message : 'Error desconocido'
    return {
      success: false,
      error: `Error: ${mensaje}`
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
