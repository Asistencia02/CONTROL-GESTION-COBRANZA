import { useRef, useEffect, useCallback } from 'react'

export const useFileUpload = (onFileSelect: (file: File) => Promise<void>) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = fileInputRef.current
    if (!input) return

    console.log('📎 Agregando listener de change al input')

    const handleChange = async (event: Event) => {
      console.log('🔴 Change event detectado')
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      
      if (file) {
        console.log('📁 Archivo seleccionado:', file.name, file.size)
        try {
          await onFileSelect(file)
        } catch (error) {
          console.error('Error procesando archivo:', error)
        }
      }
      
      // Limpiar para permitir seleccionar el mismo archivo otra vez
      target.value = ''
    }

    // Agregar listener manualmente (React no lo hace correctamente)
    input.addEventListener('change', handleChange)
    
    return () => {
      input.removeEventListener('change', handleChange)
    }
  }, [onFileSelect])

  const triggerFileSelect = useCallback(() => {
    console.log('🖱️ Abriendo selector de archivos')
    fileInputRef.current?.click()
  }, [])

  return {
    fileInputRef,
    triggerFileSelect,
  }
}
