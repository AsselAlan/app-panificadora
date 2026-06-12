import React, { useState } from 'react'
import { Lock, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useStore } from '../store/useStore'
import Swal from 'sweetalert2'

export const ForceChangePassword = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const { userSession, setSession, userRole } = useStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      // 1. Actualizar contraseña en Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      })

      if (authError) throw authError

      // 2. Actualizar flag en user_roles mediante RPC (por seguridad de RLS)
      const { error: roleError } = await supabase.rpc('clear_password_change_flag')

      if (roleError) throw roleError

      Swal.fire('¡Éxito!', 'Tu contraseña ha sido actualizada.', 'success')
      
      // Actualizamos la sesión local
      setSession(userSession, userRole, false)

    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center backdrop-blur-md relative z-10">
        
        <div className="w-20 h-20 bg-orange-500/10 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Lock size={40} />
        </div>

        <h1 className="text-2xl font-black text-white mb-2">Cambio Obligatorio</h1>
        <p className="text-slate-400 mb-8 text-sm">
          Por seguridad, debes cambiar tu contraseña predeterminada para continuar.
        </p>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm flex items-center gap-2 text-left">
            <AlertCircle size={20} className="shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-300 ml-1">Nueva Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder:text-slate-600"
              placeholder="Min. 6 caracteres"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-300 ml-1">Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder:text-slate-600"
              placeholder="Vuelve a escribirla"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : 'Guardar y Continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}
