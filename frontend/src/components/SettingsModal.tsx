import React, { useState } from 'react'
import { Settings, RefreshCw, Trash2, Database, ShieldCheck, X, Wifi, WifiOff, Smartphone, Download, CheckCircle2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import localforage from 'localforage'
import Swal from 'sweetalert2'

interface SettingsModalProps {
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { isOffline, syncQueue, clearAllData, processSyncQueue } = useStore()
  const [clearing, setClearing] = useState(false)

  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )

  const handleInstallApp = async () => {
    if (isStandalone) {
      Swal.fire({
        title: '¡App ya instalada!',
        text: 'La aplicación ya se encuentra añadida y funcionando en la pantalla principal de este celular o dispositivo.',
        icon: 'info',
        confirmButtonColor: '#1e3a8a'
      })
      return
    }

    // 1. Verificar si hay evento nativo de Chrome/Android/Edge
    const promptEvent = (window as any).deferredInstallPrompt

    // 2. Detectar si es iOS (Safari en iPhone/iPad)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream

    if (isIOS) {
      Swal.fire({
        title: 'Enviar App a Pantalla Principal (iPhone / iPad)',
        html: `
          <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.6;">
            <p>Sigue estos simples pasos en tu navegador <b>Safari</b>:</p>
            <ol style="margin-top: 8px; padding-left: 20px; font-weight: 500;">
              <li style="margin-bottom: 6px;">Toca el botón <b>Compartir</b> 📤 (en la barra inferior o superior de Safari).</li>
              <li style="margin-bottom: 6px;">Desliza hacia abajo y selecciona <b>"Agregar a inicio"</b> ➕.</li>
              <li>Toca <b>"Agregar"</b> arriba a la derecha.</li>
            </ol>
          </div>
        `,
        icon: 'info',
        confirmButtonColor: '#1e3a8a',
        confirmButtonText: 'Entendido'
      })
      return
    }

    if (promptEvent) {
      try {
        promptEvent.prompt()
        const { outcome } = await promptEvent.userChoice
        if (outcome === 'accepted') {
          (window as any).deferredInstallPrompt = null
          Swal.fire({
            title: '¡Enviada al Inicio!',
            text: 'El icono de la app se añadió exitosamente a la pantalla principal.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          })
        }
      } catch (e) {
        console.warn('Error ejecutando prompt de instalación PWA:', e)
      }
    } else {
      Swal.fire({
        title: 'Enviar App al Inicio (Android / Navegador)',
        html: `
          <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.6;">
            <p>Para crear el icono directo en la pantalla de tu celular:</p>
            <ul style="margin-top: 8px; padding-left: 18px; font-weight: 500;">
              <li style="margin-bottom: 8px;">Toca el botón de <b>Opciones</b> (los <b>3 puntos ⋮</b> arriba a la derecha en Chrome).</li>
              <li>Selecciona <b>"Instalar aplicación"</b> o <b>"Añadir a la pantalla principal"</b>.</li>
            </ul>
          </div>
        `,
        icon: 'info',
        confirmButtonColor: '#1e3a8a',
        confirmButtonText: 'Entendido'
      })
    }
  }

  const handleForceUpdate = async () => {
    const result = await Swal.fire({
      title: '¿Actualizar App y Limpiar Memoria?',
      text: 'Esto eliminará archivos en caché viejos, reseteará la memoria del navegador en tu dispositivo y descargará la versión más reciente del servidor.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, Actualizar App',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    setClearing(true)
    try {
      if (!isOffline && syncQueue.length > 0) {
        try {
          await processSyncQueue()
        } catch (e) {
          console.warn('Error sincronizando antes de limpiar:', e)
        }
      }

      try {
        await localforage.clear()
      } catch (e) {
        console.warn('Error en localforage.clear:', e)
      }

      localStorage.clear()
      sessionStorage.clear()
      clearAllData()

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of registrations) {
          await reg.unregister()
        }
      }

      if ('caches' in window) {
        const keys = await caches.keys()
        for (const key of keys) {
          await caches.delete(key)
        }
      }

      await Swal.fire({
        title: '¡Memoria Limpiada!',
        text: 'La aplicación se reiniciará con la última versión limpia.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })

      window.location.reload()
    } catch (err: any) {
      console.error('Error limpiando memoria:', err)
      window.location.reload()
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-bg-surface border border-brand-muted/20 rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden text-brand-deep">
        
        {/* Header */}
        <div className="p-5 border-b border-brand-muted/20 flex justify-between items-center bg-brand-navy/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-orange/10 text-brand-orange rounded-xl">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-brand-deep">Configuración del Sistema</h2>
              <p className="text-[11px] text-brand-muted">Ajustes y mantenimiento del dispositivo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-brand-muted/10 rounded-xl text-brand-muted hover:text-brand-deep transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          
          {/* Info Versión y Red */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-brand-muted/5 border border-brand-muted/15 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-brand-muted uppercase block mb-1">Versión App</span>
              <span className="text-xs font-black text-brand-deep flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-green-500" /> v0.16
              </span>
            </div>
            <div className="bg-brand-muted/5 border border-brand-muted/15 rounded-2xl p-3">
              <span className="text-[10px] font-bold text-brand-muted uppercase block mb-1">Estado de Red</span>
              <span className={`text-xs font-black flex items-center gap-1.5 ${isOffline ? 'text-red-500' : 'text-green-500'}`}>
                {isOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
                {isOffline ? 'Offline' : 'En línea'}
              </span>
            </div>
          </div>

          {/* Botón: Enviar App al Inicio (Añadir a Pantalla Principal) */}
          <div className="bg-brand-navy/5 border border-brand-navy/15 rounded-2xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-brand-navy" />
                <div>
                  <span className="text-xs font-black text-brand-deep block">Pantalla Principal</span>
                  <span className="text-[10px] text-brand-muted">Acceso directo en el celular</span>
                </div>
              </div>
              {isStandalone && (
                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={12} /> Instalada
                </span>
              )}
            </div>

            <button
              onClick={handleInstallApp}
              className="w-full mt-1 bg-brand-navy hover:bg-blue-900 text-white font-bold py-2.5 px-3 rounded-xl transition-all shadow-sm flex justify-center items-center gap-2 text-xs active:scale-95"
            >
              <Download size={15} /> Enviar App al Inicio (Instalar)
            </button>
          </div>

          {/* Cola de Sync Pendiente */}
          <div className="bg-brand-muted/5 border border-brand-muted/15 rounded-2xl p-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-brand-navy" />
              <div>
                <span className="text-xs font-bold block">Ventas/Gastos en Cola</span>
                <span className="text-[10px] text-brand-muted">Pendientes de subir al servidor</span>
              </div>
            </div>
            <span className={`text-sm font-black px-2.5 py-1 rounded-xl ${syncQueue.length > 0 ? 'bg-orange-500 text-white' : 'bg-brand-muted/10 text-brand-muted'}`}>
              {syncQueue.length}
            </span>
          </div>

          {/* Botón de Actualizar y Limpiar Memoria */}
          <div className="pt-1">
            <button
              onClick={handleForceUpdate}
              disabled={clearing}
              className="w-full bg-brand-orange hover:bg-orange-600 text-white font-black py-3.5 rounded-2xl transition-all shadow-md flex justify-center items-center gap-2 text-sm disabled:opacity-50 active:scale-95"
            >
              {clearing ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <>
                  <Trash2 size={18} /> Actualizar y Limpiar Memoria
                </>
              )}
            </button>
            <p className="text-[10px] text-brand-muted/80 text-center mt-2 px-2 leading-relaxed">
              Usa este botón si notas inconsistencias de datos en tu celular. Eliminará la memoria local temporal y descargará la versión limpia del servidor.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-brand-muted/5 border-t border-brand-muted/15 text-center">
          <button onClick={onClose} className="text-xs font-bold text-brand-muted hover:text-brand-deep py-1">
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  )
}
