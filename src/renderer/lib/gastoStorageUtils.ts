import { supabase } from './supabase'

interface UploadGastoArchivoResult {
  success: boolean
  url?: string
  error?: string
  tipoArchivo?: string
}

/**
 * Sube un archivo de factura/comprobante a Supabase Storage
 * @param archivo - File object del input
 * @param institucionId - ID de la institución
 * @param gastoId - ID del gasto (opcional, para organizar carpetas)
 * @returns URL pública del archivo o error
 */
export const subirArchivoGasto = async (
  archivo: File,
  institucionId: number,
  gastoId?: number
): Promise<UploadGastoArchivoResult> => {
  try {
    // Validaciones
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

    // Generar nombre único
    const timestamp = Date.now()
    const extension = archivo.name.split('.').pop() || 'archivo'
    const nombreArchivo = `gasto-${institucionId}-${timestamp}.${extension}`
    const carpeta = `gastos/${institucionId}`
    const ruta = `${carpeta}/${nombreArchivo}`

    // Subir a Supabase Storage
    const { data, error: errorUpload } = await supabase.storage
      .from('comprobantes')
      .upload(ruta, archivo, {
        cacheControl: '3600',
        upsert: false,
      })

    if (errorUpload) {
      console.error('Error uploading to storage:', errorUpload)
      return {
        success: false,
        error: `Error al subir archivo: ${errorUpload.message}`
      }
    }

    // Obtener URL pública
    const { data: datosPublicos } = supabase.storage
      .from('comprobantes')
      .getPublicUrl(ruta)

    return {
      success: true,
      url: datosPublicos.publicUrl,
      tipoArchivo: archivo.type.includes('image') ? 'imagen' : 'pdf'
    }
  } catch (err) {
    console.error('Error en subirArchivoGasto:', err)
    return {
      success: false,
      error: 'Error desconocido al subir archivo'
    }
  }
}

/**
 * Elimina un archivo de comprobante de Supabase Storage
 * @param archivoUrl - URL pública del archivo
 * @param institucionId - ID de la institución
 */
export const eliminarArchivoGasto = async (
  archivoUrl: string,
  institucionId: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!archivoUrl) {
      return { success: false, error: 'URL vacía' }
    }

    // Extraer ruta del archivo de la URL pública
    // Formato: https://[supabase-url]/storage/v1/object/public/comprobantes/gastos/[institucionId]/[archivo]
    const partes = archivoUrl.split('comprobantes/')
    if (partes.length < 2) {
      return { success: false, error: 'URL de archivo inválida' }
    }

    const ruta = partes[1]

    const { error: errorDelete } = await supabase.storage
      .from('comprobantes')
      .remove([ruta])

    if (errorDelete) {
      console.error('Error deleting from storage:', errorDelete)
      return { success: false, error: errorDelete.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error en eliminarArchivoGasto:', err)
    return { success: false, error: 'Error desconocido al eliminar archivo' }
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
