import React, { useState } from 'react'
import { Truck, Cloud, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'

interface LoginScreenProps {
  isOffline: boolean
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ isOffline }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isOffline) {
      Swal.fire('Atención', 'Necesitas conexión a internet para iniciar sesión', 'warning')
      return
    }

    setLoading(true)
    setErrorMsg('')
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      // La redirección ocurrirá automáticamente por el listener en App.tsx
    } catch (err: any) {
      setErrorMsg(err.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : err.message)
      setLoading(false)
    }
  }

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
            {isOffline ? 'Offline' : 'Online'}
          </span>
        </div>

        {/* Logo Icon */}
        <div className="w-24 h-24 bg-gradient-to-tr from-orange-500 to-amber-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20 rotate-3 hover:rotate-0 transition-transform duration-300">
          <Truck size={48} className="animate-pulse" />
        </div>

        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
          Panificadora <span className="text-orange-500">System</span>
        </h1>
        <p className="text-slate-400 mb-8 text-sm font-medium">
          Ingresa tus credenciales para acceder
        </p>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm flex items-center gap-2 text-left">
            <AlertCircle size={20} className="shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Formulario de Login */}
        <form onSubmit={handleLogin} className="space-y-5 text-left">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-300 ml-1">Correo Electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={18} className="text-slate-500" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || isOffline}
                className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all placeholder:text-slate-600"
                placeholder="usuario@panificadora.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-300 ml-1">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-slate-500" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || isOffline}
                className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isOffline}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 text-lg shadow-lg shadow-orange-600/20 active:scale-[0.98] mt-2"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-xs text-slate-500 font-medium">
          Software de Gestión Panificadora v0.2
        </div>
      </div>
    </div>
  )
}
