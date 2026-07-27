import React, { useState, useEffect } from 'react'
import { UserPlus, Shield, Trash2, Loader2, Info, KeyRound, AlertCircle } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useStore } from '../../store/useStore'
import Swal from 'sweetalert2'

export const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'repartidor' | 'mostrador'>('repartidor')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const { userSession } = useStore()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      // Usamos la función RPC segura para obtener los usuarios
      const { data, error } = await supabase.rpc('get_all_users')
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    } finally {
      setLoading(false)
    }
  }

  const callAdminFunction = async (action: string, payload: any) => {
    // Usamos Supabase Edge Functions directamente
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action, payload }
    })

    if (error) {
      throw new Error(error.message || 'Error de conexión con la función')
    }

    if (data && data.error) {
      throw new Error(data.error)
    }

    return data
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      await callAdminFunction('createUser', {
        email: `${email}@panificadora.com`,
        password: '123456', // Contraseña por defecto solicitada
        role,
        fullName
      })


      Swal.fire('Éxito', 'Usuario creado. La contraseña inicial es 123456. Se le pedirá cambiarla al ingresar.', 'success')
      setEmail('')
      setFullName('')
      setRole('repartidor')
      fetchUsers()

    } catch (error: any) {
      console.error('Error creando usuario:', error)
      Swal.fire('Error', error.message || 'Error al crear usuario', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResetPassword = async (userId: string, userEmail: string) => {
    const result = await Swal.fire({
      title: '¿Restablecer Contraseña?',
      text: `Se restablecerá la contraseña de ${userEmail} a "123456" y se le pedirá cambiarla en su próximo inicio de sesión.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, restablecer'
    })

    if (result.isConfirmed) {
      setIsProcessing(true)
      try {
        await callAdminFunction('resetPassword', {
          userId,
          newPassword: '123456'
        })
        Swal.fire('Restablecida', 'La contraseña ha sido restablecida a "123456".', 'success')
        fetchUsers()
      } catch (error: any) {
        Swal.fire('Error', error.message, 'error')
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const handleDeleteRole = async (userId: string) => {
    const result = await Swal.fire({
      title: '¿Revocar acceso?',
      text: "Esto eliminará el rol del usuario. Aún existirá en auth pero no podrá entrar a la app.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, revocar'
    })

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('user_roles').delete().eq('user_id', userId)
        if (error) throw error
        Swal.fire('Revocado', 'El acceso ha sido revocado.', 'success')
        fetchUsers()
      } catch (error: any) {
        Swal.fire('Error', error.message, 'error')
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="text-indigo-600" />
            Gestión de Usuarios y Accesos
          </h2>
          <p className="text-slate-500 text-sm mt-1">Crea y administra las cuentas de tu equipo. Las contraseñas por defecto son "123456".</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Creación */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <UserPlus size={20} className="text-blue-500" />
            Nuevo Usuario
          </h3>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de Usuario</label>
              <div className="relative flex items-center">
                <div className="absolute left-3 text-slate-400">
                  <UserPlus size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={e => {
                    const val = e.target.value.replace(/[^a-zA-Z]/g, '').toLowerCase()
                    setEmail(val)
                  }}
                  className="w-full pl-9 pr-[140px] py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800"
                  placeholder="ejemplo"
                />
                <div className="absolute right-3 text-slate-500 text-sm font-medium pointer-events-none select-none">
                  @panificadora.com
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol del Sistema</label>
              <select
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-800"
              >
                <option value="repartidor">Repartidor (App Móvil)</option>
                <option value="mostrador">Mostrador (Punto de Venta)</option>
                <option value="admin">Administrador (Acceso Total)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <><UserPlus size={20} /> Crear Cuenta</>}
            </button>
          </form>

          <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex gap-2">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p>Se creará con la contraseña inicial <strong>123456</strong> y se le obligará a cambiarla al entrar.</p>
          </div>
        </div>

        {/* Lista de Usuarios */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Usuarios Activos</h3>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center">
              <AlertCircle size={32} className="mb-2 opacity-50" />
              <p>No se encontraron usuarios o la vista RPC aún no se actualiza.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Rol Asignado</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="text-sm font-semibold text-slate-800">{u.email}</div>
                        <div className="text-xs text-slate-500">Creado: {new Date(u.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          u.role === 'mostrador' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.requires_password_change ? (
                          <span className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded-md">Debe cambiar clave</span>
                        ) : (
                          <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-md">Al día</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleResetPassword(u.id, u.email)}
                            disabled={isProcessing}
                            className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Restablecer Contraseña a 123456"
                          >
                            <KeyRound size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(u.id)}
                            disabled={isProcessing || u.id === userSession?.user?.id}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Revocar Rol"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
