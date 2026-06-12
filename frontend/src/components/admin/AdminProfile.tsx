import React, { useState } from 'react'
import { User, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useStore } from '../../store/useStore'
import Swal from 'sweetalert2'

export const AdminProfile = () => {
  const { userSession } = useStore()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      Swal.fire('Error', 'La contraseña debe tener al menos 6 caracteres.', 'error')
      return
    }
    if (password !== confirmPassword) {
      Swal.fire('Error', 'Las contraseñas no coinciden.', 'error')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      Swal.fire('Actualizado', 'Tu contraseña ha sido cambiada exitosamente.', 'success')
      setPassword('')
      setConfirmPassword('')

    } catch (error: any) {
      console.error(error)
      Swal.fire('Error', error.message || 'No se pudo actualizar la contraseña.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <User className="text-indigo-600" />
            Mi Perfil
          </h2>
          <p className="text-slate-500 text-sm mt-1">Configuración de tu cuenta y seguridad</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Datos Personales (Solo lectura para MVP) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <User size={20} className="text-blue-500" />
            Información de Cuenta
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Correo Electrónico</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold flex items-center justify-between">
                {userSession?.user?.email}
                <CheckCircle size={16} className="text-green-500" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Rol Asignado</label>
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 font-bold uppercase text-sm inline-block">
                Administrador
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <AlertCircle size={14} /> 
                Para modificar tu correo electrónico, contacta a soporte técnico.
              </p>
            </div>
          </div>
        </div>

        {/* Cambio de Contraseña */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Lock size={20} className="text-orange-500" />
            Cambiar Contraseña
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Vuelve a escribirla"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Actualizar Contraseña'}
            </button>
          </form>
        </div>
        
      </div>
    </div>
  )
}
