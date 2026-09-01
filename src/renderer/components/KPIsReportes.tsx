import React from 'react'
import { CheckCircle, Clock, AlertCircle, Users, TrendingUp } from 'lucide-react'
import { formatoMoneda } from '@renderer/lib/helpers'

interface KPIsProps {
  totalRecaudable: number
  totalPagosRegistrados: number
  totalDeudasVencidas: number
  porcentajeCobro: number
  estudiantesActivos: number
  estudiantesEnMora: number
  promedioDeudasEstudiante: number
}

export const KPIsReportes: React.FC<KPIsProps> = ({
  totalRecaudable,
  totalPagosRegistrados,
  totalDeudasVencidas,
  porcentajeCobro,
  estudiantesActivos,
  estudiantesEnMora,
  promedioDeudasEstudiante,
}) => {
  const porcentajeMora = estudiantesActivos > 0 
    ? ((estudiantesEnMora / estudiantesActivos) * 100).toFixed(1)
    : '0'

  const esAlerta = parseFloat(porcentajeMora) > 30
  
  // ✅ ARREGLADO: Si no hay datos, mostrar ceros sin problemas
  const porcentajeCobro_safe = isNaN(porcentajeCobro) ? 0 : porcentajeCobro

  // ✅ NUEVO: Validar promedioDeudasEstudiante (evitar -∞)
  const promedioDeudasEstudiante_safe = 
    isNaN(promedioDeudasEstudiante) || 
    !isFinite(promedioDeudasEstudiante) || 
    promedioDeudasEstudiante < 0
      ? 0
      : promedioDeudasEstudiante

  // ✅ NUEVO: Calcular PENDIENTE (puede ser positivo o negativo)
  const pendiente = totalRecaudable - totalPagosRegistrados
  const esPositivo = pendiente >= 0
  const muestraPendiente = Math.abs(pendiente)

  // ✅ NUEVO: Calcular EXTRA POR RECARGO (cuando se cobró MÁS por mora)
  const extraPorRecargo = totalPagosRegistrados > totalRecaudable 
    ? totalPagosRegistrados - totalRecaudable 
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      {/* 1. TOTAL RECAUDABLE - PRINCIPAL */}
      <div className="lg:col-span-1 p-6 bg-gradient-to-br from-slate-800/80 to-indigo-900/30 backdrop-blur-xl border border-indigo-500/30 rounded-xl shadow-lg shadow-indigo-500/10 hover:border-indigo-500/60 transition-all group">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 font-semibold tracking-wider mb-2">TOTAL RECAUDABLE</p>
            <p className="text-3xl font-black text-transparent bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text">
              {formatoMoneda(totalRecaudable)}
            </p>
          </div>
          <div className="p-3 bg-indigo-500/20 rounded-lg group-hover:bg-indigo-500/30 transition">
            <span className="text-2xl">💰</span>
          </div>
        </div>
        <div className="pt-4 border-t border-indigo-500/20 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Meta:</span>
            <span className="text-indigo-300 font-bold">Mes actual</span>
          </div>
        </div>
      </div>

      {/* 2. GESTIÓN DE COBRO - KPI CRÍTICO */}
      <div className="lg:col-span-1 p-6 bg-gradient-to-br from-slate-800/80 to-blue-900/30 backdrop-blur-xl border border-blue-500/30 rounded-xl shadow-lg shadow-blue-500/10 hover:border-blue-500/60 transition-all">
        <p className="text-xs text-slate-400 font-semibold tracking-wider mb-4">EFICIENCIA DE COBRO</p>
        <div className="mb-6">
          <p className="text-5xl font-black text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">
            {porcentajeCobro_safe.toFixed(1)}%
          </p>
        </div>
        {/* Barra de progreso */}
        <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden mb-3">
          <div 
            className={`h-full transition-all duration-500 ${
              porcentajeCobro_safe > 100 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                : porcentajeCobro_safe > 80
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                : 'bg-gradient-to-r from-orange-500 to-yellow-500'
            }`}
            style={{ width: `${Math.min(porcentajeCobro_safe, 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 text-center">
          {porcentajeCobro_safe > 100 ? '✅ Superó meta' : 'De lo recaudable'}
        </p>
      </div>

      {/* 3. ESTUDIANTES EN MORA - ALERTA */}
      <div className={`lg:col-span-1 p-6 bg-gradient-to-br from-slate-800/80 to-red-900/30 backdrop-blur-xl border rounded-xl shadow-lg transition-all ${ 
        esAlerta 
          ? 'border-red-500/60 shadow-red-500/20 animate-pulse' 
          : 'border-red-500/30 shadow-red-500/10 hover:border-red-500/60'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 font-semibold tracking-wider mb-1">EN MORA</p>
            <p className="text-4xl font-black text-transparent bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text">
              {estudiantesEnMora}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${esAlerta ? 'bg-red-500/40 animate-bounce' : 'bg-red-500/20'}`}>
            <AlertCircle size={24} className="text-red-400" />
          </div>
        </div>
        <div className="pt-4 border-t border-red-500/20 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">De:</span>
            <span className="text-slate-300 font-bold">{estudiantesActivos}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">%:</span>
            <span className={`font-bold ${esAlerta ? 'text-red-400' : 'text-orange-400'}`}>
              {porcentajeMora}%
            </span>
          </div>
        </div>
      </div>

      {/* 4. RECAUDADO */}
      <div className="p-6 bg-gradient-to-br from-slate-800/80 to-green-900/30 backdrop-blur-xl border border-green-500/30 rounded-xl shadow-lg shadow-green-500/10 hover:border-green-500/60 transition-all group">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 font-semibold tracking-wider mb-1">RECAUDADO</p>
            <p className="text-3xl font-black text-green-400">{formatoMoneda(totalPagosRegistrados)}</p>
          </div>
          <div className="p-3 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition">
            <CheckCircle size={24} className="text-green-400" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">✓ En caja</p>
      </div>

      {/* 5. PENDIENTE (ARREGLADO: puede ser positivo o negativo) */}
      <div className={`p-6 bg-gradient-to-br from-slate-800/80 to-orange-900/30 backdrop-blur-xl border rounded-xl shadow-lg transition-all ${
        esPositivo
          ? 'border-orange-500/30 shadow-orange-500/10 hover:border-orange-500/60'
          : 'border-yellow-500/40 shadow-yellow-500/20 hover:border-yellow-500/60'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 font-semibold tracking-wider mb-1">
              {esPositivo ? 'PENDIENTE POR COBRAR' : 'SUPERÁVIT'}
            </p>
            <p className={`text-3xl font-black ${
              esPositivo ? 'text-orange-400' : 'text-yellow-400'
            }`}>
              {formatoMoneda(muestraPendiente)}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${
            esPositivo ? 'bg-orange-500/20' : 'bg-yellow-500/30'
          }`}>
            <Clock size={24} className={esPositivo ? 'text-orange-400' : 'text-yellow-400'} />
          </div>
        </div>
        <div className="pt-4 border-t border-orange-500/20 space-y-2">
          <p className="text-xs text-slate-400">
            {esPositivo 
              ? 'Aún falta cobrar' 
              : 'Cobraron más que lo facturado'}
          </p>
        </div>
      </div>

      {/* 6. DEUDA VENCIDA (ARREGLADO: nunca negativo) */}
      <div className="p-6 bg-gradient-to-br from-slate-800/80 to-red-900/30 backdrop-blur-xl border border-red-500/30 rounded-xl shadow-lg shadow-red-500/10 hover:border-red-500/60 transition-all group">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 font-semibold tracking-wider mb-1">DEUDA VENCIDA</p>
            <p className="text-3xl font-black text-red-400">{formatoMoneda(totalDeudasVencidas)}</p>
          </div>
          <div className="p-3 bg-red-500/20 rounded-lg group-hover:bg-red-500/30 transition">
            <AlertCircle size={24} className="text-red-400" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">Estudiantes adeudando</p>
      </div>

      {/* 7. PROMEDIO DEUDA/ESTUDIANTE (ARREGLADO: nunca -∞) */}
      <div className="p-6 bg-gradient-to-br from-slate-800/80 to-purple-900/30 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-lg shadow-purple-500/10 hover:border-purple-500/60 transition-all group">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400 font-semibold tracking-wider mb-1">PROM. DEUDA/EST</p>
            <p className="text-3xl font-black text-purple-400">
              {formatoMoneda(promedioDeudasEstudiante_safe)}
            </p>
          </div>
          <div className="p-3 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition">
            <Users size={24} className="text-purple-400" />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">Por estudiante activo</p>
      </div>

      {/* 8. EXTRA POR RECARGO (NUEVO: solo si hay) */}
      {extraPorRecargo > 0 && (
        <div className="p-6 bg-gradient-to-br from-slate-800/80 to-emerald-900/30 backdrop-blur-xl border border-emerald-500/40 rounded-xl shadow-lg shadow-emerald-500/20 hover:border-emerald-500/60 transition-all group animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-slate-400 font-semibold tracking-wider mb-1">EXTRA POR RECARGO</p>
              <p className="text-3xl font-black text-emerald-400">+{formatoMoneda(extraPorRecargo)}</p>
            </div>
            <div className="p-3 bg-emerald-500/30 rounded-lg group-hover:bg-emerald-500/40 transition">
              <TrendingUp size={24} className="text-emerald-400" />
            </div>
          </div>
          <div className="pt-4 border-t border-emerald-500/30 space-y-2">
            <p className="text-xs text-emerald-300">Por mora y recargos</p>
          </div>
        </div>
      )}
    </div>
  )
}
