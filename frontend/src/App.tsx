import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import { LoginScreen } from './components/LoginScreen'
import { DriverApp } from './components/DriverApp'
import { AdminApp } from './components/AdminApp'

function App() {
  const navigate = useNavigate()
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

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginScreen setView={(v) => navigate(`/${v.toLowerCase()}`)} isOffline={isOffline} />} />
      <Route path="/driver/*" element={<DriverApp onLogout={() => navigate('/login')} />} />
      <Route path="/admin/*" element={<AdminApp onLogout={() => navigate('/login')} />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
