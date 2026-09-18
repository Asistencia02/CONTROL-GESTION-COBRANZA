import React, { useState, useEffect, useRef } from 'react'
import { useInstitucion } from '@renderer/hooks/useInstitucion'
import { useChatFundacion } from '@renderer/hooks/useChatFundacion'
import { ChatAvatar } from '@renderer/components/ChatAvatar'
import { MessageCircle, Send, Trash2, Zap, BookOpen, DollarSign, Users, TrendingUp } from 'lucide-react'

export const ChatFundacion: React.FC = () => {
  const { institucionActiva } = useInstitucion()
  const { mensajes, cargando, error, enviarPregunta, limpiarHistorial, cargarHistorial } = useChatFundacion()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cargarHistorial(institucionActiva.id)
  }, [institucionActiva.id, cargarHistorial])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const handleEnviar = async () => {
    if (!input.trim() || cargando) return
    
    const pregunta = input
    setInput('')
    
    await enviarPregunta(pregunta, institucionActiva.id)
  }

  const ejemplos = [
    { icon: <DollarSign size={16} />, texto: '¿Cuánto recaudé en total?' },
    { icon: <Users size={16} />, texto: '¿Cuántos estudiantes activos?' },
    { icon: <TrendingUp size={16} />, texto: '¿Cuál es la deuda total?' },
    { icon: <BookOpen size={16} />, texto: '¿Resumen financiero?' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4 md:p-8">
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-xl shadow-lg shadow-purple-500/50 animate-pulse">
          <MessageCircle size={32} className="text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            💬 chat-FUNDACION
          </h1>
          <p className="text-slate-400 mt-1">IA Local - Consulta tus finanzas</p>
        </div>
      </div>

      {/* ALERTA SI OLLAMA NO DISPONIBLE */}
      {error && error.includes('Ollama') && (
        <div className="mb-6 p-4 bg-orange-500/20 border border-orange-500/50 rounded-xl animate-pulse">
          <p className="text-orange-300 font-bold">⚠️ Ollama no disponible</p>
          <p className="text-orange-200 text-sm mt-2">
            Ejecuta en terminal: <code className="bg-orange-900/50 px-2 py-1 rounded font-mono">ollama serve</code>
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* CHAT PRINCIPAL */}
        <div className="lg:col-span-3 space-y-6">
          {/* CONTENEDOR DE MENSAJES */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 h-96 overflow-y-auto space-y-4 scroll-smooth">
            {mensajes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-purple-500/10 rounded-full mb-4">
                  <Zap size={48} className="text-purple-400" />
                </div>
                <p className="text-xl font-bold text-slate-300 mb-2">¡Hola! 👋</p>
                <p className="text-slate-400">Soy FUNDACION, tu asistente financiero</p>
                <p className="text-slate-500 text-sm mt-3">Pregúntame sobre tus finanzas...</p>
              </div>
            ) : (
              <>
                {mensajes.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.tipo === 'usuario' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                  >
                    {msg.tipo === 'bot' && <ChatAvatar tipo="bot" />}

                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg whitespace-pre-wrap text-sm leading-relaxed ${
                        msg.tipo === 'usuario'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : `${msg.estado === 'error' ? 'bg-red-900/50 text-red-100' : 'bg-slate-700 text-slate-100'} rounded-bl-none`
                      }`}
                    >
                      {msg.texto}
                      <p className="text-xs opacity-70 mt-2">
                        {msg.timestamp.toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {msg.tipo === 'usuario' && <ChatAvatar tipo="usuario" />}
                  </div>
                ))}

                {cargando && (
                  <div className="flex gap-3 justify-start animate-in fade-in">
                    <ChatAvatar tipo="bot" />
                    <div className="bg-slate-700 px-4 py-3 rounded-lg rounded-bl-none">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* INPUT */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleEnviar()}
              placeholder="¿Cuánto recaudé? ¿Cuántos estudiantes? ¿Cuál es mi deuda?"
              className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/50 transition"
              disabled={cargando}
            />
            <button
              onClick={handleEnviar}
              disabled={cargando || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition font-semibold flex items-center gap-2"
            >
              <Send size={18} />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>

          {/* BOTÓN LIMPIAR */}
          {mensajes.length > 0 && (
            <button
              onClick={limpiarHistorial}
              className="w-full py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition flex items-center justify-center gap-2 font-semibold"
            >
              <Trash2 size={16} />
              Limpiar historial
            </button>
          )}
        </div>

        {/* PANEL DERECHO */}
        <div className="space-y-6">
          {/* EJEMPLOS */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Zap size={18} />
              Preguntas
            </h3>
            <div className="space-y-2">
              {ejemplos.map((ej, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(ej.texto)
                    setTimeout(() => handleEnviar(), 100)
                  }}
                  disabled={cargando}
                  className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded text-sm transition flex items-center gap-2 disabled:opacity-50 font-semibold"
                >
                  <span className="text-purple-400">{ej.icon}</span>
                  {ej.texto}
                </button>
              ))}
            </div>
          </div>

          {/* INFO */}
          <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 space-y-3">
            <h3 className="font-bold text-white">ℹ️ Sobre FUNDACION</h3>
            <div className="text-xs text-slate-400 space-y-2">
              <p>✅ <strong>Gratuito</strong> - Sin costo</p>
              <p>✅ <strong>Privado</strong> - Datos en tu PC</p>
              <p>⚡ <strong>Local</strong> - Ollama + IA</p>
              <p>💾 <strong>Guardado</strong> - Historial en BD</p>
            </div>
          </div>

          {/* REQUISITOS */}
          <div className="bg-purple-500/10 backdrop-blur-xl border border-purple-500/50 rounded-xl p-6">
            <h3 className="font-bold text-purple-300 mb-3 flex items-center gap-2">
              ✨ Requisitos
            </h3>
            <div className="text-xs text-purple-200 space-y-2">
              <p>💾 8GB RAM (tienes)</p>
              <p>🖥️ Ollama instalado</p>
              <p>🔧 ollama serve ejecutándose</p>
              <p>🌐 Conexión local</p>
            </div>
          </div>

          {/* ESTADO */}
          <div className={`backdrop-blur-xl border rounded-xl p-6 ${
            error && error.includes('Ollama')
              ? 'bg-red-500/10 border-red-500/50'
              : 'bg-green-500/10 border-green-500/50'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                error && error.includes('Ollama')
                  ? 'bg-red-400 animate-pulse'
                  : 'bg-green-400 animate-pulse'
              }`} />
              <span className={`text-xs font-bold ${
                error && error.includes('Ollama')
                  ? 'text-red-300'
                  : 'text-green-300'
              }`}>
                {error && error.includes('Ollama') ? 'Ollama offline' : 'Listo'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
