// Helper PWA para captura e instalación en pantalla de inicio del dispositivo móvil

let deferredPrompt: any = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir el prompt automático nativo y guardar el evento
    e.preventDefault()
    deferredPrompt = e
  })
}

export const promptPWAInstall = async (): Promise<boolean> => {
  if (deferredPrompt) {
    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        deferredPrompt = null
        return true
      }
    } catch (err) {
      console.warn('Error al activar el prompt de instalación PWA:', err)
    }
  }
  return false
}
