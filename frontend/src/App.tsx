import { useState, useEffect } from 'react'
import { useStore } from './store/useStore'
import { LoginScreen } from './components/LoginScreen'
import { DriverApp } from './components/DriverApp'
import { AdminApp } from './components/AdminApp'

function App() {
  const [view, setView] = useState<'LOGIN' | 'DRIVER' | 'ADMIN'>('LOGIN')
  const { isOffline, setOffline, processSyncQueue } = useStore()

  // Manejo de la conectividad global y cola de sincronización
  useEffect(() => {
    const handleOnline = () => {
      setOffline(false)
      processSyncQueue() // Ejecutar cola al recuperar internet
    }
    const handleOffline = () => {
      setOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Sincronización inicial al cargar si estamos online
    if (navigator.onLine) {
      setOffline(false)
      processSyncQueue()
    } else {
      setOffline(true)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOffline, processSyncQueue])

  if (view === 'LOGIN') {
    return <LoginScreen setView={setView} isOffline={isOffline} />
  }

  if (view === 'DRIVER') {
    return <DriverApp onLogout={() => setView('LOGIN')} />
  }

  if (view === 'ADMIN') {
    return <AdminApp onLogout={() => setView('LOGIN')} />
  }

  return null
}

export default App
