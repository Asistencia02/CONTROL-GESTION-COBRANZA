import React, { useState, useEffect } from 'react'
import { Sidebar } from '@renderer/components/Sidebar'
import { DashboardModerno } from '@renderer/modules/DashboardModerno'
import { Cobranzas } from '@renderer/modules/Cobranzas'
import { DeudasModerno } from '@renderer/modules/DeudasModerno'
import { VentasModerno } from '@renderer/modules/VentasModerno'
import { ConfiguracionModerno } from '@renderer/modules/ConfiguracionModerno'
import { GastosModerno } from '@renderer/modules/GastosModerno'
import { ReportesModerno } from '@renderer/modules/ReportesModerno'
import { CierreModerno } from '@renderer/modules/CierreModerno'
import { Testing } from '@renderer/modules/Testing'
import { loadConfig } from '@renderer/lib/env'
import { fixSupabaseInsertIssue } from '@renderer/lib/fixSupabaseIssue'
import { supabase } from '@renderer/lib/supabase'
import { AlertCircle, CheckCircle } from 'lucide-react'

type ModuleId = 'dashboard' | 'cobranzas' | 'deudas' | 'ventas' | 'gastos' | 'reportes' | 'cierre' | 'configuracion' | 'testing'

// Función para verificar conexión a Supabase
const checkConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('instituciones').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

export const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard')
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null)

  // Cargar config desde Electron en producción
  useEffect(() => {
    loadConfig()
  }, [])

  // Inicializar fix para error 400
  useEffect(() => {
    fixSupabaseInsertIssue()
  }, [])

  // Verificar conexión a Supabase al cargar
  useEffect(() => {
    let isMounted = true

    const verifyConnection = async () => {
      try {
        // Esperar un poco para asegurar que Supabase esté listo
        await new Promise(resolve => setTimeout(resolve, 500))

        const connected = await checkConnection()

        if (isMounted) {
          setSupabaseConnected(connected)
          if (connected) {
            console.log('✅ Estado actualizado: Supabase conectado')
          } else {
            console.warn('⚠️ Estado actualizado: No conectado')
          }
        }
      } catch (error) {
        console.error('❌ Error verificando Supabase:', error)
        if (isMounted) {
          setSupabaseConnected(false)
        }
      }
    }

    verifyConnection()

    return () => {
      isMounted = false
    }
  }, [])

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardModerno />
      case 'cobranzas':
        return <Cobranzas />
      case 'deudas':
        return <DeudasModerno />
      case 'ventas':
        return <VentasModerno />
      case 'gastos':
        return <GastosModerno />
      case 'reportes':
        return <ReportesModerno />
      case 'cierre':
        return <CierreModerno />
      case 'configuracion':
        return <ConfiguracionModerno />
      case 'testing':
        return <Testing />
      default:
        return <DashboardModerno />
    }
  }

  const isLoading = supabaseConnected === null

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar y contenido */}
      <Sidebar activeModule={activeModule} onModuleChange={(id) => setActiveModule(id as ModuleId)} />
      <main className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin mb-4">
                <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
              <p className="text-gray-600">Inicializando aplicación...</p>
            </div>
          </div>
        ) : (
          renderModule()
        )}
      </main>
    </div>
  )
}
