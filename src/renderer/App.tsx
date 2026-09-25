import React, { useState, useEffect } from 'react'
import { useAuth } from '@renderer/hooks/useAuth'
import { Sidebar } from '@renderer/components/Sidebar'
import { LoginModerno } from '@renderer/modules/LoginModerno'
import { AdminPermisosModerno } from '@renderer/modules/AdminPermisosModerno'
import { DashboardModerno } from '@renderer/modules/DashboardModerno'
import { Cobranzas } from '@renderer/modules/Cobranzas'
import { DeudasModerno } from '@renderer/modules/DeudasModerno'
import { VentasModerno } from '@renderer/modules/VentasModerno'
import { ConfiguracionModerno } from '@renderer/modules/ConfiguracionModerno'
import { GastosModerno } from '@renderer/modules/GastosModerno'
import { ReportesFinancierosModerno } from '@renderer/modules/ReportesFinancierosModerno'
import { CierreModerno } from '@renderer/modules/CierreModerno'
import { VentaKioscoModerno } from '@renderer/modules/VentaKioscoModerno'
import { KioscoConfiguracionModerno } from '@renderer/modules/KioscoConfiguracionModerno'
import { GestionEstudiantesModerno } from '@renderer/modules/GestionEstudiantesModerno'
import { Sincronizacion } from '@renderer/modules/Sincronizacion'
import { supabase } from '@renderer/lib/supabase'
import '@renderer/lib/verificarVariables'

type ModuleId = 'dashboard' | 'cobranzas' | 'deudas' | 'ventas' | 'ventakiosco' | 'gastos' | 'reportes' | 'cierre' | 'configuracion' | 'kioscoconfig' | 'sincronizacion' | 'estudiantes' | 'admin'

const checkConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('instituciones').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}

export const App: React.FC = () => {
  const { usuarioActual, autenticado, modulosPermitidos, logout } = useAuth()
  
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard')
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null)
  const [usuarioLoaded, setUsuarioLoaded] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuarioActual')
    setUsuarioLoaded(true)
  }, [])

  useEffect(() => {
    let isMounted = true

    const verifyConnection = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500))
        const connected = await checkConnection()
        if (isMounted) setSupabaseConnected(connected)
      } catch {
        if (isMounted) setSupabaseConnected(false)
      }
    }

    verifyConnection()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    if (autenticado && modulosPermitidos.length > 0) {
      if (!modulosPermitidos.includes('dashboard') && activeModule === 'dashboard') {
        setActiveModule(modulosPermitidos[0] as ModuleId)
      } else if (!modulosPermitidos.includes(activeModule) && activeModule !== 'admin') {
        setActiveModule(modulosPermitidos[0] as ModuleId)
      }
    }
  }, [autenticado, modulosPermitidos])

  const renderModule = () => {
    if (activeModule === 'admin' && usuarioActual?.rol === 'ADMIN') {
      return <AdminPermisosModerno />
    }

    if (!modulosPermitidos.includes(activeModule) && activeModule !== 'dashboard' && activeModule !== 'admin') {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-300 mb-2">Acceso Denegado</h2>
            <p className="text-slate-500">No tienes permiso para acceder a este módulo</p>
          </div>
        </div>
      )
    }

    switch (activeModule) {
      case 'dashboard': return <DashboardModerno />
      case 'cobranzas': return <Cobranzas />
      case 'deudas': return <DeudasModerno />
      case 'ventas': return <VentasModerno />
      case 'ventakiosco': return <VentaKioscoModerno />
      case 'gastos': return <GastosModerno />
      case 'estudiantes': return <GestionEstudiantesModerno />
      case 'reportes': return <ReportesFinancierosModerno />
      case 'cierre': return <CierreModerno />
      case 'kioscoconfig': return <KioscoConfiguracionModerno />
      case 'sincronizacion': return <Sincronizacion />
      case 'configuracion': return <ConfiguracionModerno />
      default: return <DashboardModerno />
    }
  }

  const isLoading = supabaseConnected === null || !usuarioLoaded

  if (!autenticado) {
    return <LoginModerno onLoginSuccess={() => {}} />
  }

  return (
    <div className="flex h-screen w-screen bg-gray-100 flex-col md:flex-row">
      <div className="md:hidden flex items-center gap-2 bg-slate-900 border-b border-slate-700/50 px-4 py-3 z-40">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg text-slate-400 hover:text-white transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-white font-bold text-sm flex-1">GESTION</span>
      </div>

      <Sidebar 
        activeModule={activeModule} 
        onModuleChange={(id) => {
          if (id === 'logout') {
            logout()
          } else {
            setActiveModule(id as ModuleId)
            setSidebarOpen(false)
          }
        }}
        modulosPermitidos={modulosPermitidos}
        usuarioActual={usuarioActual}
        esAdmin={usuarioActual?.rol === 'ADMIN'}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="flex-1 w-full bg-slate-900 overflow-y-auto">
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
