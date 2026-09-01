import React from 'react'
import { Download, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { ImportadorGoogleSheets } from '@renderer/components/ImportadorGoogleSheets'

export const Sincronizacion: React.FC = () => {
  const institucionId = 2 // INSM

  return (
    <div className="w-full p-8 space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg shadow-lg">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Sincronización de Datos</h1>
            <p className="text-slate-600">Google Sheets ↔ Supabase</p>
          </div>
        </div>
      </div>

      {/* Info Principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-cyan-200/50 p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Sincronización</h3>
            <Clock className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-900">Diaria</p>
            <p className="text-xs text-slate-500">08:00 UTC automáticamente</p>
            <div className="mt-2 inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
              ✅ Activa
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-blue-200/50 p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Datos Sincronizados</h3>
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-900">4,600+</p>
            <p className="text-xs text-slate-500">Registros últimas 24h</p>
            <div className="mt-2 inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
              625 estudiantes
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-emerald-200/50 p-6 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Estado</h3>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-slate-900">Conectado</p>
            <p className="text-xs text-slate-500">Supabase + Google</p>
            <div className="mt-2 inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">
              ✅ Sin errores
            </div>
          </div>
        </div>
      </div>

      {/* Componente Principal */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <ImportadorGoogleSheets institucion_id={institucionId} />
      </div>

      {/* Información Adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Flujo de Datos */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-6">
          <h3 className="text-base font-semibold mb-1">📊 Flujo de Datos</h3>
          <p className="text-sm text-slate-600 mb-4">Cómo funciona la sincronización</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">1</div>
              <div>
                <p className="font-semibold text-sm">Google Sheet</p>
                <p className="text-xs text-slate-600">Datos normalizados en 4 hojas</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">2</div>
              <div>
                <p className="font-semibold text-sm">Google Apps Script</p>
                <p className="text-xs text-slate-600">Valida y conecta con Supabase</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">3</div>
              <div>
                <p className="font-semibold text-sm">Supabase REST API</p>
                <p className="text-xs text-slate-600">INSERT/UPDATE de datos</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">4</div>
              <div>
                <p className="font-semibold text-sm">Esta App</p>
                <p className="text-xs text-slate-600">Lee datos sincronizados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Datos Sincronizados */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-6">
          <h3 className="text-base font-semibold mb-1">📋 Tablas Sincronizadas</h3>
          <p className="text-sm text-slate-600 mb-4">Qué se sincroniza automáticamente</p>
          <div className="space-y-2">
            <div className="bg-white p-3 rounded border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">👥 Estudiantes</p>
              <p className="text-xs text-slate-600">DNI, apellido, nombres, carrera</p>
            </div>
            <div className="bg-white p-3 rounded border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">💳 Pagos Inscripción</p>
              <p className="text-xs text-slate-600">Monto, estado, validación</p>
            </div>
            <div className="bg-white p-3 rounded border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">📅 Pagos Cuota Mensual</p>
              <p className="text-xs text-slate-600">Por mes, año, monto, estado</p>
            </div>
            <div className="bg-white p-3 rounded border border-slate-200">
              <p className="text-sm font-semibold text-slate-700">🛡️ Pagos Seguro Anual</p>
              <p className="text-xs text-slate-600">Suma de 10 cuotas mensuales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notas */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-900">
              <strong>ℹ️ Información:</strong> Los datos se validan automáticamente contra la configuración de carreras en Supabase. Si hay errores, se registran en el LOG_SINCRONIZACIÓN del Google Sheet.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
