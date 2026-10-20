import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import { LoginScreen } from './components/LoginScreen'
import { DriverApp } from './components/DriverApp'
import { AdminApp } from './components/AdminApp'
import { MostradorApp } from './components/MostradorApp'
import { ForceChangePassword } from './components/ForceChangePassword'
import { supabase } from './supabaseClient'

function App() {
  const { isOffline, setOffline, processSyncQueue, userSession, userRole, requiresPasswordChange, setSession } = useStore()
  const [loadingAuth, setLoadingAuth] = useState(true)

  // Escuchar estado de conexión y Auth de Supabase

  useEffect(() => {
    // Auth Listener
    // Timeout de seguridad: si Supabase tarda más de 5s (sin red o caído), liberar la pantalla de carga
    const authSafetyTimeout = setTimeout(() => {
      setLoadingAuth(false)
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      clearTimeout(authSafetyTimeout) // Cancelar el timeout si Auth responde
      if (session) {
        // Consultar el rol del usuario desde la tabla user_roles
        const { data: roleData, error } = await supabase.from('user_roles').select('role, requires_password_change').eq('user_id', session.user.id).single()
        
        if (error || !roleData) {
          console.error("Error obteniendo rol o sesión inválida. Cerrando sesión...");
          await supabase.auth.signOut()
          setSession(null, null)
        } else {
          const role = roleData.role
          const reqPwdChange = roleData.requires_password_change
          setSession(session, role, reqPwdChange)
        }
      } else {
        setSession(null, null)
      }
      setLoadingAuth(false)
    })

    // Network & Sync Listeners
    const handleOnline = () => {
      setOffline(false)
      processSyncQueue() // Ejecutar cola al recuperar internet
    }
    const handleOffline = () => {
      setOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (navigator.onLine) {
      setOffline(false)
      processSyncQueue()
    } else {
      setOffline(true)
    }

    // Suscripción Realtime con debounce para evitar ráfagas duplicadas de ancho de banda (Egress)
    let realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRealtimeRefresh = () => {
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer)
      realtimeDebounceTimer = setTimeout(() => {
        const { userRole, currentDriverId, isSyncing, fetchInitialData, fetchDriverData } = useStore.getState()
        if (isSyncing) return
        if (userRole === 'admin' || userRole === 'mostrador') {
          fetchInitialData()
        } else if (currentDriverId) {
          fetchInitialData()
          fetchDriverData(currentDriverId)
        }
      }, 1500)
    }

    const realtimeChannel = supabase
      .channel('public-db-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, scheduleRealtimeRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, scheduleRealtimeRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_settlements' }, scheduleRealtimeRefresh)
      .subscribe()

    return () => {
      clearTimeout(authSafetyTimeout)
      if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer)
      subscription.unsubscribe()
      supabase.removeChannel(realtimeChannel)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOffline, processSyncQueue, setSession])

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse font-bold">Iniciando Sistema...</div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Si no hay sesión, cualquier ruta redirige al login */}
      {!userSession ? (
        <>
          <Route path="/login" element={<LoginScreen isOffline={isOffline} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : requiresPasswordChange ? (
        <>
          <Route path="/change-password" element={<ForceChangePassword />} />
          <Route path="*" element={<Navigate to="/change-password" replace />} />
        </>
      ) : (
        <>
          {/* Ruteo Protegido por Rol */}
          {userRole === 'admin' && <Route path="/admin/*" element={<AdminApp onLogout={() => useStore.getState().logout()} />} />}
          {userRole === 'repartidor' && <Route path="/driver/*" element={<DriverApp onLogout={() => useStore.getState().logout()} />} />}
          {userRole === 'mostrador' && <Route path="/mostrador/*" element={<MostradorApp />} />}
          
          {/* Redirección por defecto según el rol */}
          <Route path="*" element={<Navigate to={userRole === 'repartidor' ? '/driver' : `/${userRole || 'login'}`} replace />} />
        </>
      )}
    </Routes>
  )
}

export default App
