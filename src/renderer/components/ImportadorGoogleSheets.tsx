import { useState, useEffect } from 'react'
import { useImportadorGoogleSheets } from '@renderer/hooks/useImportadorGoogleSheets'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Alert, AlertDescription } from '@renderer/components/ui/alert'
import { AlertCircle, CheckCircle, Loader2, Download, Info } from 'lucide-react'

interface ImportadorGoogleSheetsProps {
  institucion_id: number
}

export const ImportadorGoogleSheets = ({ institucion_id }: ImportadorGoogleSheetsProps) => {
  const { loading, error, resultado, sincronizarManualmente } = useImportadorGoogleSheets()
  const [mostrarInstrucciones, setMostrarInstrucciones] = useState(false)

  // Auto-sincronizar a las 7am
  useEffect(() => {
    const verificarHora = () => {
      const ahora = new Date()
      if (ahora.getHours() === 7 && ahora.getMinutes() === 0) {
        console.log('⏰ Ejecutando sincronización automática (7am)')
        sincronizarManualmente(institucion_id)
      }
    }
    
    const intervalo = setInterval(verificarHora, 60000)
    return () => clearInterval(intervalo)
  }, [institucion_id, sincronizarManualmente])

  const handleSincronizarAutomatico = async () => {
    await sincronizarManualmente(institucion_id)
  }

  return (
    <div className="w-full max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Sincronización Automática
          </CardTitle>
          <CardDescription>
            Google Apps Script FULL AUTO - Normalización + Sincronización
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* INFORMACIÓN */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>ℹ️ Cómo funciona:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Editas datos en tu Excel base</li>
                <li>Haces clic en "Sincronizar Ahora" aquí</li>
                <li>Google Apps Script lee tu Excel</li>
                <li>Normaliza automáticamente</li>
                <li>Carga todo en Supabase</li>
                <li>Esta app muestra los datos actualizados</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* BOTÓN PRINCIPAL */}
          <div className="space-y-4 bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-6">
            <h3 className="font-semibold text-cyan-900">🔄 Ejecutar Sincronización</h3>
            <p className="text-sm text-cyan-800">
              Normaliza tu Excel y sincroniza todos los datos con Supabase en un solo click.
            </p>
            
            <Button
              onClick={handleSincronizarAutomatico}
              disabled={loading}
              size="lg"
              className="w-full gap-2"
              variant="default"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sincronizando... (2-5 min)
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  ▶️ Sincronizar Ahora
                </>
              )}
            </Button>
          </div>

          {/* MENSAJES DE ERROR */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {/* RESULTADO */}
          {resultado && !error && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong className="text-green-900">✅ Sincronización exitosa</strong>
                <div className="mt-3 space-y-2 text-sm text-green-800">
                  <p>📊 Estudiantes: <strong>{resultado.contadores?.estudiantesInsertados}</strong></p>
                  <p>💳 Inscripciones: <strong>{resultado.contadores?.pagosInscInsertados}</strong></p>
                  <p>📅 Cuotas: <strong>{resultado.contadores?.pagosCuotaInsertados}</strong></p>
                  <p>🛡️ Seguros: <strong>{resultado.contadores?.pagosSeguroInsertados}</strong></p>
                  {resultado.contadores?.errores > 0 && (
                    <p>⚠️ Errores: <strong>{resultado.contadores.errores}</strong></p>
                  )}
                </div>
                <p className="text-xs text-green-700 mt-3">
                  {new Date(resultado.fecha).toLocaleString('es-AR')}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* INSTRUCCIONES */}
          <div className="border rounded-lg p-4 space-y-3">
            <button
              onClick={() => setMostrarInstrucciones(!mostrarInstrucciones)}
              className="font-semibold text-left w-full hover:text-blue-600 transition"
            >
              📖 Instrucciones {mostrarInstrucciones ? '▼' : '▶'}
            </button>

            {mostrarInstrucciones && (
              <div className="space-y-3 pt-3 border-t text-sm text-gray-700">
                <div>
                  <p className="font-semibold mb-1">1️⃣ Edita tu Excel base</p>
                  <p className="text-xs text-gray-600">Modifica "CUOTAS 2025 INSM vigente para cristian.xlsx" con los datos actualizados</p>
                </div>
                
                <div>
                  <p className="font-semibold mb-1">2️⃣ Abre tu Google Sheet SINCRONIZADOR</p>
                  <p className="text-xs text-gray-600">El que contiene el código Google Apps Script FULL AUTO con menú "🔄 SINCRONIZACIÓN"</p>
                </div>
                
                <div>
                  <p className="font-semibold mb-1">3️⃣ Haz clic en "▶️ Sincronizar Ahora"</p>
                  <p className="text-xs text-gray-600">Automáticamente: lee Excel → normaliza → carga en Supabase</p>
                </div>
                
                <div>
                  <p className="font-semibold mb-1">4️⃣ Espera 2-5 minutos</p>
                  <p className="text-xs text-gray-600">Puedes monitorear el progreso en el LOG_SINCRONIZACION del Google Sheet</p>
                </div>
                
                <div>
                  <p className="font-semibold mb-1">5️⃣ Recarga esta app (F5)</p>
                  <p className="text-xs text-gray-600">Verás los datos actualizados en el Dashboard</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                  <p className="font-semibold text-yellow-900 text-xs mb-2">⚙️ Configuración necesaria:</p>
                  <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Google Sheet SINCRONIZADOR con código FULL AUTO</li>
                    <li>Hoja CONFIG con SUPABASE_URL, SUPABASE_KEY, INSTITUCION_ID</li>
                    <li>Excel base con hojas: INICIAL2026, PRIMARIA2026, SECUNDARIA2026</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* INFO ADICIONAL */}
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-2">
            <p><strong>✅ Ventajas del FULL AUTO:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Sin límites de API</li>
              <li>Sincronización en paralelo (más rápido)</li>
              <li>Validación automática de datos</li>
              <li>Logs detallados en Google Sheet</li>
              <li>Totalmente automatizado</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
