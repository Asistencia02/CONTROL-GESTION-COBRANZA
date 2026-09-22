import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from '@renderer/hooks/useDarkMode'

export const DarkModeToggle: React.FC = () => {
  const { isDark, toggleDarkMode } = useDarkMode()

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 sm:p-2.5 md:p-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg sm:rounded-xl text-slate-400 hover:text-yellow-400 transition-all duration-300"
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? (
        <Sun size={20} className="sm:w-6 sm:h-6" />
      ) : (
        <Moon size={20} className="sm:w-6 sm:h-6" />
      )}
    </button>
  )
}
