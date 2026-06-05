import React from 'react'
import { Truck, Settings, Cloud } from 'lucide-react'

interface LoginScreenProps {
  setView: (view: 'LOGIN' | 'DRIVER' | 'ADMIN') => void
  isOffline: boolean
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ setView, isOffline }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Elementos visuales decorativos premium */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-900/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-orange-950/20 rounded-full blur-[120px]" />

      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center backdrop-blur-md relative z-10">
        {/* Indicador de Estado de Conexión */}
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-full text-xs font-semibold">
          <Cloud size={14} className={isOffline ? 'text-red-500' : 'text-green-500'} />
          <span className={isOffline ? 'text-slate-400' : 'text-slate-200'}>
            {isOffline ? 'Modo Offline' : 'En Línea'}
          </span>
        </div>

        {/* Logo Icon */}
        <div className="w-24 h-24 bg-gradient-to-tr from-orange-500 to-amber-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20 rotate-3 hover:rotate-0 transition-transform duration-300">
          <Truck size={48} className="animate-pulse" />
        </div>

        {/* Títulos */}
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          Panificadora <span className="text-orange-500">System</span>
        </h1>
        <p className="text-slate-400 mb-8 text-sm font-medium">
          Selecciona tu perfil de acceso para comenzar
        </p>

        {/* Botones de Roles */}
        <div className="space-y-4">
          <button
            onClick={() => setView('DRIVER')}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-between transition-all duration-200 text-lg shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-700 rounded-xl">
                <Truck size={24} />
              </div>
              <div className="text-left">
                <span className="block font-black">Repartidores</span>
                <span className="block text-xs text-blue-200 font-normal">Acceso móvil offline-first</span>
              </div>
            </div>
            <span className="text-blue-300">➔</span>
          </button>

          <button
            onClick={() => setView('ADMIN')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-between transition-all duration-200 text-lg border border-slate-700/50 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-900 rounded-xl">
                <Settings size={24} className="text-slate-400" />
              </div>
              <div className="text-left">
                <span className="block font-black">Administrador</span>
                <span className="block text-xs text-slate-400 font-normal">Panel central y control de stock</span>
              </div>
            </div>
            <span className="text-slate-500">➔</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-xs text-slate-500 font-medium">
          Software de Gestión Panificadora v0.1
        </div>
      </div>
    </div>
  )
}
