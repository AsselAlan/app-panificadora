import React, { useState } from 'react'
import { Settings, RefreshCw, Trash2, Database, ShieldCheck, X, Wifi, WifiOff, Home, Smartphone, Download } from 'lucide-react'
import { useStore } from '../store/useStore'
import { promptPWAInstall } from '../pwaHelper'
import localforage from 'localforage'
import Swal from 'sweetalert2'

interface SettingsModalProps {
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { isOffline, syncQueue, clearAllData, processSyncQueue } = useStore()
  const [clearing, setClearing] = useState(false)

  const handleInstallApp = async () => {
    const installed = await promptPWAInstall()
    if (installed) return

    // Si el prompt nativo no está disponible (ej. iPhone/Safari o ya instalado), mostrar la guía interactiva
    Swal.fire({
      title: '📲 Anclar a Pantalla de Inicio',
      html: `
        <div class="text-left text-xs space-y-3.5 text-slate-700 font-sans">
          <p class="text-slate-600 font-medium">Crea un acceso directo rápido tipo aplicación en la pantalla principal de tu celular:</p>
          
          <div class="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 shadow-sm">
            <h4 class="font-bold text-blue-900 text-sm flex items-center gap-2 mb-1.5">
              🤖 Android (Chrome / Edge)
            </h4>
            <ol class="list-decimal list-inside space-y-1.5 text-blue-950 font-medium leading-relaxed">
              <li>Toca el menú de <b>3 puntos (⋮)</b> arriba a la derecha del navegador.</li>
              <li>Selecciona <b>"Agregar a la pantalla principal"</b> o <b>"Instalar aplicación"</b>.</li>
              <li>Presiona <b>"Agregar"</b> para confirmar.</li>
            </ol>
          </div>

          <div class="bg-slate-100/80 border border-slate-200/80 rounded-2xl p-3.5 shadow-sm">
            <h4 class="font-bold text-slate-900 text-sm flex items-center gap-2 mb-1.5">
              🍎 iPhone / iPad (Safari)
            </h4>
            <ol class="list-decimal list-inside space-y-1.5 text-slate-800 font-medium leading-relaxed">
              <li>Toca el botón <b>Compartir (⎋)</b> (icono del cuadrado con flecha abajo).</li>
              <li>Desliza hacia abajo y toca <b>"Agregar a inicio"</b> ➕.</li>
              <li>Toca <b>"Agregar"</b> arriba a la derecha.</li>
            </ol>
          </div>
        </div>
      `,
      confirmButtonColor: '#ea580c',
      confirmButtonText: '¡Entendido!'
    })
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
      // 1. Intentar vaciar cola de sync si estamos online
      if (!isOffline && syncQueue.length > 0) {
        try {
          await processSyncQueue()
        } catch (e) {
          console.warn('Error sincronizando antes de limpiar:', e)
        }
      }

      // 2. Limpiar IndexedDB / localForage
      try {
        await localforage.clear()
      } catch (e) {
        console.warn('Error en localforage.clear:', e)
      }

      // 3. Limpiar storage del navegador
      localStorage.clear()
      sessionStorage.clear()

      // 4. Limpiar Zustand Store
      clearAllData()

      // 5. Desregistrar Service Workers (PWA caches)
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of registrations) {
          await reg.unregister()
        }
      }

      // 6. Limpiar CacheStorage API
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

      // 7. Forzar recarga completa sin caché
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
        <div className="p-5 space-y-3.5">
          
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

          {/* Botón: Anclar App a la Pantalla de Inicio del Celular */}
          <button
            onClick={handleInstallApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl transition-all shadow-md flex justify-center items-center gap-2 text-xs active:scale-95"
          >
            <Smartphone size={16} /> Anclar App a Pantalla de Inicio (Celular)
          </button>



          {/* Botón de Actualizar y Limpiar Memoria */}
          <div className="pt-1">
            <button
              onClick={handleForceUpdate}
              disabled={clearing}
              className="w-full bg-brand-orange hover:bg-orange-600 text-white font-black py-3.5 rounded-2xl transition-all shadow-md flex justify-center items-center gap-2 text-xs disabled:opacity-50 active:scale-95"
            >
              {clearing ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <>
                  <Trash2 size={16} /> Actualizar y Limpiar Memoria
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
