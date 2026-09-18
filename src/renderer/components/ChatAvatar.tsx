import React from 'react'

interface ChatAvatarProps {
  tipo: 'bot' | 'usuario'
  tamaño?: 'pequeño' | 'normal'
}

export const ChatAvatar: React.FC<ChatAvatarProps> = ({ tipo, tamaño = 'normal' }) => {
  const size = tamaño === 'pequeño' ? 32 : 48
  const sizeClass = tamaño === 'pequeño' ? 'w-8 h-8' : 'w-12 h-12'

  if (tipo === 'usuario') {
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0`}>
        <span className="text-white font-bold text-sm">👤</span>
      </div>
    )
  }

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center flex-shrink-0 animate-pulse`}>
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1">
        {/* Fondo círculo */}
        <circle cx="24" cy="24" r="24" fill="url(#gradient)" />
        
        {/* Cabeza */}
        <circle cx="24" cy="16" r="8" fill="white" />
        
        {/* Cuerpo - libros */}
        <rect x="16" y="28" width="6" height="12" fill="white" rx="1" />
        <rect x="26" y="28" width="6" height="12" fill="white" rx="1" />
        
        {/* Brazos - abiertos */}
        <line x1="12" y1="28" x2="16" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="36" y1="28" x2="32" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" />
        
        {/* Estrella (IA) */}
        <path
          d="M24 20L26 25L31 26L27 29L28 34L24 31L20 34L21 29L17 26L22 25Z"
          fill="white"
        />
        
        {/* Gradiente */}
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="48" y2="48">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
