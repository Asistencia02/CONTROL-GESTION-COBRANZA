import React from 'react'
import { X } from 'lucide-react'
import { TablaConceptosEstudiante } from './TablaConceptosEstudiante'

interface Estudiante {
  id: number
  nombre: string
  apellido: string
  dni: string
  estado: string
  institucion_id: number
}

interface ModalVerConceptosEstudianteProps {
  isOpen: boolean
  onClose: () => void
  estudiante: Estudiante | null
  onPagoRegistrado?: () => void
}

export const ModalVerConceptosEstudiante: React.FC<ModalVerConceptosEstudianteProps> = ({
  isOpen,
  onClose,
  estudiante,
  onPagoRegistrado,
}) => {
  if (!isOpen || !estudiante) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {estudiante.nombre} {estudiante.apellido}
            </h2>
            <p className="text-sm text-gray-600">
              DNI: {estudiante.dni} | Estado: {estudiante.estado}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        <TablaConceptosEstudiante
          estudiante_id={estudiante.id}
          institucion_id={estudiante.institucion_id}
          nombre_completo={`${estudiante.nombre} ${estudiante.apellido}`}
          estado_estudiante={estudiante.estado}
          onPagoRegistrado={() => {
            onPagoRegistrado?.()
          }}
        />
      </div>
    </div>
  )
}
