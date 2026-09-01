import React, { useState } from 'react'
import {
  LayoutDashboard,
  CreditCard,
  ShoppingCart,
  TrendingDown,
  Settings,
  LogOut,
  AlertCircle,
  BarChart3,
  Lock,
  ChevronRight,
  Sparkles,
  TestTube,
} from 'lucide-react'
import { InstitucionSwitcher } from './InstitucionSwitcher'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  badge?: number
  color: string
}

interface SidebarProps {
  activeModule: string
  onModuleChange: (moduleId: string) => void
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'cobranzas',
    label: 'Cobranzas',
    icon: <CreditCard size={20} />,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'deudas',
    label: 'Gestión de Deudas',
    icon: <AlertCircle size={20} />,
    color: 'from-red-500 to-rose-500',
  },
  {
    id: 'ventas',
    label: 'Ventas/Inventario',
    icon: <ShoppingCart size={20} />,
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'gastos',
    label: 'Gastos',
    icon: <TrendingDown size={20} />,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'reportes',
    label: 'Reportes',
    icon: <BarChart3 size={20} />,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'cierre',
    label: 'Cierre de Caja',
    icon: <Lock size={20} />,
    color: 'from-amber-500 to-yellow-500',
  },
  {
    id: 'testing',
    label: '🧪 Testing (Deuda)',
    icon: <TestTube size={20} />,
    color: 'from-purple-600 to-pink-600',
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: <Settings size={20} />,
    color: 'from-indigo-500 to-purple-500',
  },
]

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, onModuleChange }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 flex flex-col h-full backdrop-blur-xl">
      {/* Header con logo */}
      <div className="px-6 py-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-lg shadow-blue-500/50">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">GESIÓN</h1>
            <p className="text-xs text-slate-500">Sistema Integral</p>
          </div>
        </div>
      </div>

      {/* Switcher de Institución */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        <InstitucionSwitcher />
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeModule === item.id
          const isHovered = hoveredItem === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onModuleChange(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group relative overflow-hidden ${
                isActive
                  ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Fondo efecto en hover */}
              {!isActive && (
                <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
              )}

              {/* Icono */}
              <div className={`relative z-10 transition-all duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                {isActive && (
                  <div className="absolute inset-0 bg-white/20 rounded-lg blur-sm animate-pulse" />
                )}
                {item.icon}
              </div>

              {/* Label */}
              <span className={`text-sm font-semibold relative z-10 transition-all duration-300 ${isActive ? 'text-white' : ''}`}>
                {item.label}
              </span>

              {/* Badge */}
              {item.badge && (
                <span className={`ml-auto relative z-10 px-2 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? 'bg-white/30 text-white'
                    : 'bg-red-500/80 text-white group-hover:bg-red-600'
                }`}>
                  {item.badge}
                </span>
              )}

              {/* Indicador derecha cuando está activo */}
              {isActive && (
                <div className="ml-auto relative z-10">
                  <ChevronRight size={18} className="text-white" />
                </div>
              )}
            </button>
          )
        })}
      </nav>

      {/* Separador */}
      <div className="px-4 py-4 border-t border-slate-700/50">
        {/* Info de usuario o estado */}
        <div className="mb-4 p-3 bg-slate-700/30 border border-slate-600/50 rounded-lg">
          <p className="text-xs text-slate-400 font-semibold mb-1">Estado</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <p className="text-xs text-green-400 font-semibold">Conectado</p>
          </div>
        </div>
      </div>

      {/* Footer - Logout */}
      <div className="px-4 py-4 border-t border-slate-700/50">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-red-400 transition-all duration-300 group relative overflow-hidden hover:bg-red-500/10 group-hover:border-red-500/50 border border-slate-700/50">
          {/* Fondo efecto hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
          
          <LogOut size={18} className="relative z-10" />
          <span className="text-sm font-semibold relative z-10">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}