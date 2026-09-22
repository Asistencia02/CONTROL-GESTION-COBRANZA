import { useState, useEffect } from 'react'

type ThemeMode = 'light' | 'dark' | 'system'

export const useDarkMode = () => {
  const [mode, setMode] = useState<ThemeMode>('dark')
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    // Cargar preferencia guardada
    const saved = localStorage.getItem('theme-mode') as ThemeMode
    if (saved) {
      setMode(saved)
    } else {
      // Detectar preferencia del sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setMode(prefersDark ? 'dark' : 'light')
    }
  }, [])

  useEffect(() => {
    // Actualizar DOM y localStorage
    const htmlElement = document.documentElement
    
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      htmlElement.classList.toggle('dark', prefersDark)
      setIsDark(prefersDark)
    } else {
      htmlElement.classList.toggle('dark', mode === 'dark')
      setIsDark(mode === 'dark')
    }

    localStorage.setItem('theme-mode', mode)
  }, [mode])

  const toggleDarkMode = () => {
    setMode(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const setSystemMode = () => {
    setMode('system')
  }

  return {
    mode,
    isDark,
    toggleDarkMode,
    setSystemMode,
    setMode,
  }
}
