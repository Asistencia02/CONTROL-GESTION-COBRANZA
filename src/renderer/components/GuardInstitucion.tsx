import React from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'

/**
 * Wrapper que evita renderizar contenido durante cambios de institución
 * Previene cruzamiento de datos
 */
interface GuardInstitucionProps {
  institucionId: number
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const GuardInstitucion: React.FC<GuardInstitucionProps> = ({
  institucionId,
  children,
  fallback
}) => {
  const { institucionActiva } = useInstitucion()

  // Si el ID no coincide, mostrar fallback
  if (institucionActiva.id !== institucionId) {
    return <>{fallback || <div className="p-8 text-center text-gray-500">Cargando datos...</div>}</>
  }

  return <>{children}</>
}
