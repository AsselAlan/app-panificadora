// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { 
  Wifi, WifiOff, Truck, MapPin, Package, ClipboardCheck, 
  X, CheckCircle, AlertCircle, Banknote, CreditCard, 
  TrendingDown, ClipboardList, LogOut, ArrowLeft, Search, ChevronRight,
  Plus, Minus, Printer, MessageCircle, Star, RefreshCw, ChevronDown, ChevronUp,
  History, Calendar, Settings, Home
} from 'lucide-react'
import { useStore, getFixedOrderForDay, sortProducts } from '../store/useStore'
import type { Sale, Expense, SaleItem, Driver, Product } from '../store/useStore'
import { supabase } from '../supabaseClient'
import Swal from 'sweetalert2'
import { DriverSyncQueue } from './DriverSyncQueue'
import { CloudOff } from 'lucide-react'
import { SettingsModal } from './SettingsModal'
import { DebtHistoryPrintBlock } from './mostrador/DebtHistoryPrintBlock'
const getPlannedLoadQty = (plannedLoad: any, productId: string): { fixed: number; extra: number; total: number } => {
  const item = plannedLoad?.[productId];
  if (!item) return { fixed: 0, extra: 0, total: 0 };
  
  // Compatibilidad con el formato antiguo (solo un número)
  if (typeof item === 'number') {
    return { fixed: item, extra: 0, total: item };
  }
  
  // Nuevo formato: { fixed: number, extra: number }
  const fixed = Number(item.fixed) || 0;
  const extra = Number(item.extra) || 0;
  return { fixed, extra, total: fixed + extra };
}

const getSuggestedLoadForDriver = (
  weeklyRoutes: any[],
  clients: any[],
  driverId: string,
  todayISO: number,
  stopOrder: number // -1 for initial load, or route_order for intermediate
) => {
  const suggested: Record<string, number> = {}
  const currentRoute = weeklyRoutes
    .filter(r => r.driver_id === driverId && r.day_of_week === todayISO && r.stop_type !== 'initial_load')
    .sort((a, b) => a.route_order - b.route_order)

  const stopIndex = stopOrder === -1 ? -1 : currentRoute.findIndex(r => r.route_order === stopOrder)
  
  for (let i = stopIndex + 1; i < currentRoute.length; i++) {
    const stop = currentRoute[i]
    if (stop.stop_type === 'load') break
    
    const client = clients.find(c => c.id === stop.client_id)
    if (client) {
      const orderForDay = getFixedOrderForDay(client, todayISO)
      Object.entries(orderForDay).forEach(([prodId, qty]) => {
        suggested[prodId] = (suggested[prodId] || 0) + (qty as number)
      })
    }
  }
  return suggested
}

interface DriverAppProps {
  onLogout: () => void
}

const DriverOrderPreview: React.FC<{ driver: any, clientId: string, onBack: () => void }> = ({ driver, clientId, onBack }) => {
  const { clients, products } = useStore()
  const client = clients.find(c => c.id === clientId)
  
  const todayISO = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const orderForDay = client ? getFixedOrderForDay(client, todayISO) : {}
  
  return (
    <div className="flex flex-col h-full bg-bg-app">
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-brand-muted/10 shadow-sm rounded-b-3xl">
        <button onClick={onBack} className="p-2 text-brand-navy hover:bg-brand-navy/5 rounded-xl border border-brand-muted/10 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black text-brand-deep flex-1 tracking-tight">Pedido a Entregar</h2>
      </div>

      <div className="p-5 flex-1 overflow-y-auto">
        <div className="bg-brand-orange/10 border border-brand-orange/20 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="text-brand-orange shrink-0 mt-0.5" size={18} />
          <p className="text-sm font-bold text-brand-orange">
            Aún no has iniciado tu ruta. Solo puedes ver el pedido programado.
          </p>
        </div>

        <h3 className="font-bold text-brand-deep text-lg mb-4">{client?.business_name || 'Cliente'}</h3>

        <div className="space-y-3">
          {sortProducts(products).map(p => {
            const qty = orderForDay[p.id] || 0
            if (qty === 0) return null
            return (
              <div key={p.id} className="bg-white border border-brand-muted/10 rounded-2xl p-4 flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="font-bold text-brand-deep">{p.name}</h4>
                  <p className="text-[10px] uppercase font-bold text-brand-muted">{p.unit_type}</p>
                </div>
                <span className="font-black text-brand-navy text-lg">
                  {qty} <span className="text-xs text-brand-muted">{p.unit_type === 'unidad' ? 'u' : p.unit_type === 'docena' ? 'doc' : p.unit_type === 'bolsa' ? 'bols' : p.unit_type}</span>
                </span>
              </div>
            )
          })}
          {Object.keys(orderForDay).filter(k => (orderForDay[k] || 0) > 0).length === 0 && (
            <p className="text-brand-muted text-sm text-center py-6 font-bold">El cliente no tiene pedido fijo para hoy.</p>
          )}
        </div>
      </div>
    </div>
  )
}

const DriverTerminalWrapper: React.FC<{
  driver: any;
  onBack: () => void;
  onComplete: () => void;
}> = ({ driver, onBack, onComplete }) => {
  const { clientId } = useParams<{ clientId: string }>()
  const client = useStore(state => state.clients.find(c => c.id === clientId))
  
  if (!client) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-app">
        <div className="text-brand-navy animate-pulse font-bold text-sm">Cargando...</div>
      </div>
    )
  }

  if (driver.status === 'En Base') {
    return <DriverOrderPreview driver={driver} clientId={clientId!} onBack={onBack} />
  }

  return (
    <DriverTerminal 
      driver={driver}
      clientId={clientId!}
      onBack={onBack}
      onComplete={onComplete}
    />
  )
}

export const DriverApp: React.FC<DriverAppProps> = ({ onLogout }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { 
    drivers, currentDriverId, setCurrentDriver, fetchInitialData, 
    fetchDriverData, isOffline, setOffline, syncQueue, isSyncing,
    loads, weeklyRoutes, products, userSession, checkAndResetDriverDay
  } = useStore()
  
  const [navigationSource, setNavigationSource] = useState<'CLIENTS' | 'ROADMAP' | 'PENDIENTES'>('CLIENTS')
  const [showSettings, setShowSettings] = useState(false)

  const currentPath = location.pathname.split('/')[2]?.toUpperCase() || 'HOME'
  const driverView = currentPath === '' ? 'HOME' : currentPath

  const setDriverView = (view: string) => {
    navigate(`/driver/${view.toLowerCase()}`)
  }

  // Escuchar estado offline/online nativo
  useEffect(() => {
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOffline])

  // Carga inicial y suscripción en tiempo real (Realtime) a Supabase
  useEffect(() => {
    fetchInitialData()

    const channel = supabase
      .channel('driver-app-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        fetchInitialData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchInitialData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_settlements' }, () => {
        fetchInitialData()
      })
      .subscribe()

    const handleFocus = () => {
      fetchInitialData()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [fetchInitialData])

  // Cargar datos específicos del chofer activo al seleccionarlo
  useEffect(() => {
    if (currentDriverId) {
      checkAndResetDriverDay(currentDriverId).then(() => {
        fetchDriverData(currentDriverId)
      })
    }
  }, [currentDriverId, fetchDriverData, checkAndResetDriverDay])

  // Autoseleccionar chofer según la sesión activa
  useEffect(() => {
    if (!currentDriverId && userSession && drivers.length > 0) {
      const myDriver = drivers.find(d => d.user_id === userSession.user.id)
      if (myDriver) {
        setCurrentDriver(myDriver.id)
      }
    }
  }, [currentDriverId, userSession, drivers, setCurrentDriver])

  const driver = drivers.find(d => d.id === currentDriverId)

  // Autorecuperación de loads si el chofer está en ruta pero el inventario local está vacío
  useEffect(() => {
    if (driver && driver.status === 'En Ruta' && loads.length === 0 && weeklyRoutes.length > 0 && products.length > 0) {
      const todayJS = new Date().getDay()
      const todayISO = todayJS === 0 ? 7 : todayJS
      const initialLoadStop = weeklyRoutes.find(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'initial_load')
      let plannedLoad: Record<string, any> = initialLoadStop?.planned_load ? { ...initialLoadStop.planned_load } : {}
      
      if (Object.keys(plannedLoad).length === 0) {
        const { clients: allClients } = useStore.getState()
        plannedLoad = getSuggestedLoadForDriver(weeklyRoutes, allClients, driver.id, todayISO, -1)
      }

      const initialLoads = sortProducts(products).map(p => {
        const qtyInfo = getPlannedLoadQty(plannedLoad, p.id)
        return {
          id: crypto.randomUUID(),
          driver_id: driver.id,
          product_id: p.id,
          date_loaded: new Date().toISOString(),
          initial_quantity: qtyInfo.total,
          current_quantity: qtyInfo.total
        }
      })
      useStore.setState({ loads: initialLoads })
    }
  }, [driver, loads.length, weeklyRoutes, products])

  // Pantalla de selección de repartidor si no hay ninguno seleccionado
  if (!currentDriverId) {
    // Solo mostrar el conductor vinculado a la sesión activa
    const myDriver = userSession ? drivers.find(d => d.user_id === userSession.user.id) : null

    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
        <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-white shadow-sm border border-brand-muted/10 text-brand-navy rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Truck size={32} />
          </div>
          <h2 className="text-2xl font-black text-brand-deep mb-2 tracking-tight">Acceso Repartidor</h2>
          <p className="text-brand-muted/80 mb-6 text-sm">Verificando tu perfil de conductor...</p>
          
          <div className="space-y-3">
            {drivers.length === 0 ? (
              <div className="text-brand-muted/80 py-6 flex flex-col items-center gap-2">
                <RefreshCw className="animate-spin text-brand-navy" size={24} />
                <span>Cargando datos desde el servidor...</span>
              </div>
            ) : myDriver ? (
              // Solo mostrar el propio conductor de la sesión activa
              <button
                key={myDriver.id}
                onClick={() => setCurrentDriver(myDriver.id)}
                className="w-full bg-white hover:bg-brand-navy/5 text-brand-deep font-bold p-4 rounded-2xl shadow-sm border border-brand-muted/10 transition-all flex justify-between items-center group mb-2 active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-navy/5 text-brand-navy flex items-center justify-center border border-brand-navy/10">
                    <Truck size={18} />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm">{myDriver.full_name}</span>
                    <span className="text-[10px] font-semibold text-brand-muted/80 flex items-center gap-1 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${myDriver.status === 'En Ruta' ? 'bg-brand-orange animate-pulse' : myDriver.status === 'Finalizado' ? 'bg-green-500' : 'bg-brand-muted/40'}`}></span>
                      {myDriver.status}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-brand-muted/40 group-hover:text-brand-navy transition-colors" />
              </button>
            ) : (
              // Sin conductor asociado a esta cuenta
              <div className="text-brand-muted/80 py-6 flex flex-col items-center gap-3">
                <AlertCircle className="text-orange-500" size={28} />
                <div>
                  <p className="font-bold text-brand-deep text-sm">Sin perfil de conductor</p>
                  <p className="text-xs text-brand-muted mt-1">Esta cuenta no está vinculada a ningún conductor activo.<br/>Contactá al administrador.</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 mt-6">
            <button
              onClick={() => setShowSettings(true)}
              className="bg-brand-orange/10 text-brand-orange border border-brand-orange/20 font-bold py-3 rounded-xl hover:bg-brand-orange/20 transition-all text-xs flex items-center justify-center gap-1.5"
            >
              <Settings size={14} /> Configurar
            </button>
            <button
              onClick={onLogout}
              className="bg-bg-app text-brand-muted border border-brand-muted/20 font-bold py-3 rounded-xl hover:bg-bg-surface shadow-sm transition-all text-xs flex items-center justify-center gap-1.5"
            >
              <LogOut size={14} /> Salir
            </button>
          </div>
        </div>
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </div>
    )
  }

  if (!driver) return null

  return (
    <div className="min-h-[100dvh] bg-bg-app flex justify-center sm:items-center font-sans">
      {/* Marco de Simulador Móvil Premium */}
      <div className="w-full max-w-md min-h-[100dvh] sm:min-h-0 sm:h-[850px] bg-bg-surface shadow-sm flex flex-col shadow-2xl overflow-hidden relative sm:rounded-[2.5rem] sm:border-8 border-slate-950">
        {/* Barra de Estado del Simulador */}
        <div 
          className="bg-brand-navy text-white text-[10px] pb-2 sm:pt-1.5 sm:pb-1.5 px-6 flex justify-between items-center z-30 font-semibold tracking-wide sm:rounded-t-[2.1rem]"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <span>{new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate('/driver/home')}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded text-[9px] font-bold transition-colors"
            >
              <Home size={10} /> Inicio
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded text-[9px] font-bold transition-colors"
            >
              <Settings size={10} /> Configurar
            </button>
            {isSyncing && <RefreshCw size={10} className="animate-spin text-white/80" />}
            {syncQueue.length > 0 && (
              <span className="bg-orange-500 text-white px-1.5 py-0.5 rounded-full text-[8px] font-bold shadow-sm">
                {syncQueue.length} SYNC
              </span>
            )}
            {isOffline ? (
              <span className="flex items-center gap-1 text-red-300"><WifiOff size={10} /> OFFLINE</span>
            ) : (
              <span className="flex items-center gap-1 text-green-300"><Wifi size={10} /> 4G</span>
            )}
          </div>
        </div>

        {/* Contenedor de la Vista */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-brand-navy shadow-sm">
          <Routes>
            <Route path="/" element={<Navigate to="/driver/home" replace />} />
            <Route path="/home" element={<DriverHome driver={driver} onNewSale={() => navigate('/driver/clients')} onViewRoadmap={() => navigate('/driver/roadmap')} onViewCashSummary={() => navigate('/driver/caja')} onSelectDifferentDriver={() => { setCurrentDriver(null); onLogout(); }} />} />
            <Route path="/clients" element={<DriverClients onBack={() => navigate('/driver/home')} onSelectClient={(id) => { setNavigationSource('CLIENTS'); navigate(`/driver/terminal/${id}`); }} />} />
            <Route path="/roadmap" element={<DriverRoadmap driver={driver} onBack={() => navigate('/driver/home')} onSelectClient={(id) => { setNavigationSource('ROADMAP'); navigate(`/driver/terminal/${id}`); }} />} />
            <Route path="/caja" element={<DriverCashSummary driver={driver} onBack={() => navigate('/driver/home')} />} />
            <Route path="/terminal/:clientId" element={<DriverTerminalWrapper driver={driver} onBack={() => navigate(`/driver/${navigationSource.toLowerCase()}`)} onComplete={() => navigate('/driver/home')} />} />
            <Route path="/pendientes" element={<DriverSyncQueue onBack={() => navigate('/driver/home')} driverId={driver.id} onEditSale={(clientId) => { setNavigationSource('PENDIENTES'); navigate(`/driver/terminal/${clientId}`); }} />} />
            <Route path="*" element={<Navigate to="/driver/home" replace />} />
          </Routes>
        </div>

        {/* Barra de Navegación Inferior (Móvil) */}
        {driverView === 'HOME' && (
          <div className="bg-white border-t border-brand-muted/10 flex justify-around p-2 pb-safe relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] sm:rounded-b-[2.1rem]">
            <button className="flex flex-col items-center justify-center p-2 rounded-2xl w-16 text-brand-navy font-black active:scale-95 transition-all bg-brand-navy/5">
              <Truck size={20} className="mb-1" />
              <span className="text-[9px]">Inicio</span>
            </button>
            <button 
              onClick={() => setDriverView('CLIENTS')} 
              className="flex flex-col items-center justify-center p-2 rounded-2xl w-16 text-brand-muted hover:text-brand-navy hover:bg-brand-navy/5 font-semibold active:scale-95 transition-all"
            >
              <MapPin size={20} className="mb-1 opacity-70" />
              <span className="text-[9px]">Ruta</span>
            </button>
            <button 
              onClick={() => navigate('/driver/pendientes')} 
              className="flex flex-col items-center justify-center p-2 rounded-2xl w-16 text-brand-muted hover:text-orange-500 hover:bg-orange-50 font-semibold active:scale-95 transition-all relative"
            >
              <div className="relative">
                <CloudOff size={20} className="mb-1 opacity-70" />
                {syncQueue.length > 0 && (
                  <span className="absolute -top-1 -right-2 bg-orange-500 text-white text-[9px] w-3.5 h-3.5 flex items-center justify-center rounded-full font-bold shadow-sm">
                    {syncQueue.length}
                  </span>
                )}
              </div>
              <span className="text-[9px]">Espera</span>
            </button>
            <button 
              onClick={() => setShowSettings(true)} 
              className="flex flex-col items-center justify-center p-2 rounded-2xl w-16 text-brand-muted hover:text-brand-navy hover:bg-brand-navy/5 font-semibold active:scale-95 transition-all"
            >
              <Settings size={20} className="mb-1 opacity-70" />
              <span className="text-[9px]">Ajustes</span>
            </button>
            <button 
              onClick={() => {
                if (syncQueue.length > 0) {
                  Swal.fire('Advertencia', `Tienes ${syncQueue.length} ventas sin sincronizar. Asegúrate de tener conexión antes de salir.`, 'warning')
                }
                setCurrentDriver(null)
                onLogout()
              }} 
              className="flex flex-col items-center justify-center p-2 rounded-2xl w-16 text-brand-muted hover:text-red-500 hover:bg-red-50 font-semibold active:scale-95 transition-all"
            >
              <LogOut size={20} className="mb-1 opacity-70" />
              <span className="text-[9px]">Salir</span>
            </button>
          </div>
        )}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: EDITABLE LOAD MODAL
// ==========================================
interface EditableLoadModalProps {
  plannedLoad: Record<string, any>;
  onClose: () => void;
  onConfirm: (actualLoads: Record<string, number>) => void;
  title: string;
}

const EditableLoadModal: React.FC<EditableLoadModalProps> = ({ plannedLoad, onClose, onConfirm, title }) => {
  const { products } = useStore()
  
  const [actualLoads, setActualLoads] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    products.forEach(p => {
      init[p.id] = getPlannedLoadQty(plannedLoad, p.id).total
    })
    return init
  })



  // Usamos el orden predeterminado (por display_order y nombre) que viene del store
  const sortedProducts = sortProducts(products);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
      <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh]">
        <div className="p-5 border-b border-brand-muted/20 bg-brand-navy/5 rounded-t-3xl flex justify-between items-center text-brand-deep">
          <div>
            <h3 className="text-lg font-bold text-brand-deep flex items-center gap-2">
              <Package size={20} className="text-brand-navy"/> {title}
            </h3>
            <p className="text-xs text-brand-muted mt-0.5">Revise y edite la cantidad final cargada en camioneta.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-brand-muted hover:bg-brand-muted/10 rounded-full transition-colors">
            <X size={18}/>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 p-5 bg-slate-50/50 pr-2">
          {sortedProducts.map(p => {
            const qtyInfo = getPlannedLoadQty(plannedLoad, p.id)
            const currentVal = actualLoads[p.id] || 0
            const step = p.unit_type === 'kg' ? 0.5 : 1

            return (
              <div key={p.id} className={`p-3 rounded-2xl border transition-colors flex flex-col gap-2 ${currentVal > 0 ? 'bg-white border-brand-muted/10 shadow-sm' : 'bg-slate-50/50 border-brand-muted/5 opacity-70 hover:opacity-100'}`}>
                <div className="flex flex-col">
                  <span className="font-semibold text-brand-deep text-sm">{p.name}</span>
                  {qtyInfo.total > 0 && (
                    <span className="text-[9px] text-brand-muted font-bold">Planificado: {qtyInfo.fixed} fijos + {qtyInfo.extra} mostrador = {qtyInfo.total} {p.unit_type}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <button 
                    onClick={() => setActualLoads(prev => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] || 0) - step) }))}
                    className="w-10 h-10 bg-brand-muted/5 border border-brand-muted/10 text-brand-deep rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Minus size={16} />
                  </button>
                  <input 
                    type="number"
                    value={currentVal || ''}
                    onChange={(e) => {
                      let val = parseFloat(e.target.value) || 0
                      setActualLoads(prev => ({ ...prev, [p.id]: Math.max(0, val) }))
                    }}
                    className="w-16 h-10 text-center text-lg font-black text-brand-deep bg-white border border-brand-muted/20 rounded-xl outline-none focus:border-brand-navy/50 transition-colors shadow-sm"
                  />
                  <button 
                    onClick={() => setActualLoads(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + step }))}
                    className="w-10 h-10 bg-brand-navy/10 border border-brand-navy/20 text-brand-navy rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Plus size={16} />
                  </button>
                  <span className="text-[10px] text-brand-muted/70 font-black uppercase tracking-wider">{p.unit_type}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="p-4 border-t border-brand-muted/20 bg-white rounded-b-3xl">
          <button 
            onClick={() => onConfirm(actualLoads)} 
            className="w-full bg-brand-navy hover:bg-brand-navy/90 text-white py-3.5 rounded-xl font-bold shadow-lg transition-colors text-sm"
          >
            Confirmar Carga
          </button>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: DRIVER STOCK MODAL
// ==========================================
interface DriverStockModalProps {
  driver: Driver;
  onClose: () => void;
}

const DriverStockModal: React.FC<DriverStockModalProps> = ({ driver, onClose }) => {
  const { products, loads, weeklyRoutes, clients, sales } = useStore()
  
  const todayJS = new Date().getDay()
  const todayISO = todayJS === 0 ? 7 : todayJS
  const todayStr = new Date().toLocaleDateString('sv')

  const remainingFixedOrders = useMemo(() => {
    const remaining: Record<string, number> = {}
    
    const routeClientStops = weeklyRoutes.filter(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'client')
    
    routeClientStops.forEach(stop => {
      const clientObj = clients.find(c => c.id === stop.client_id)
      if (clientObj) {
        // Check if visited
        const wasVisited = sales.some(s => s.driver_id === driver.id && s.client_id === clientObj.id && new Date(s.transaction_date).toLocaleDateString('sv') === todayStr)
        if (!wasVisited) {
          const orderForDay = getFixedOrderForDay(clientObj, todayISO);
          Object.entries(orderForDay).forEach(([prodId, qty]) => {
            remaining[prodId] = (remaining[prodId] || 0) + (qty as number)
          })
        }
      }
    })
    return remaining
  }, [weeklyRoutes, driver.id, todayISO, clients, sales, todayStr])

  // Get current loads for this driver
  const driverLoads = loads.filter(l => l.driver_id === driver.id)
  
  return (
    <div className="absolute inset-0 bg-bg-app z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-brand-muted/10 sticky top-0 z-10 shadow-sm rounded-b-3xl">
        <button onClick={onClose} className="p-2 text-brand-navy hover:bg-brand-navy/5 rounded-xl border border-brand-muted/10 active:scale-90 transition-all">
          <ArrowLeft size={20}/>
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-black text-brand-orange flex items-center gap-2">
            <Package size={20} className="text-brand-orange"/> Stock en Camioneta
          </h2>
          <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider mt-0.5">Mercadería disponible y reservas</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 p-5 pb-24">
          {sortedProducts.map(p => {
            const loadInfo = driverLoads.find(l => l.product_id === p.id)
            const currentQty = loadInfo?.current_quantity || 0
            const returnedQty = loadInfo?.returned_quantity || 0
            const reserved = remainingFixedOrders[p.id] || 0
            const libre = currentQty - reserved

            if (currentQty === 0 && reserved === 0 && returnedQty === 0) return null

            return (
              <div key={p.id} className="bg-white p-4 rounded-3xl border border-brand-muted/10 shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-orange"></div>
                <div className="flex justify-between items-center ml-2">
                  <span className="font-black text-brand-deep text-sm uppercase tracking-tight">{p.name}</span>
                </div>
                
                <div className="flex items-center gap-3 ml-2">
                  <div className="flex flex-col items-center justify-center bg-brand-orange/10 p-3 rounded-2xl border border-brand-orange/20 w-24 flex-shrink-0">
                    <span className="text-[10px] font-black text-brand-orange uppercase tracking-wider mb-0.5">En Camioneta</span>
                    <span className="text-2xl font-black text-brand-deep leading-none my-1">{currentQty}</span>
                    <span className="text-[9px] font-bold text-brand-orange/80 uppercase">{p.unit_type}</span>
                  </div>
                  
                  <div className="flex-1 flex gap-2">
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-2 rounded-2xl border border-slate-200">
                      <span className="text-[9px] font-bold text-slate-500 uppercase leading-tight">Pedidos</span>
                      <span className="text-lg font-black text-slate-700 mt-0.5">{reserved}</span>
                    </div>
                    <div className={`flex-1 flex flex-col items-center justify-center p-2 rounded-2xl border ${libre < 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-600'}`}>
                      <span className="text-[9px] font-bold uppercase leading-tight">Libre</span>
                      <span className="text-lg font-black mt-0.5">{Math.max(0, libre)}</span>
                    </div>
                  </div>
                </div>

                {libre < 0 && (
                  <div className="ml-2 bg-red-50 text-red-600 px-3 py-2 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-red-100">
                    <AlertCircle size={14}/>
                    Faltan {Math.abs(libre)} {p.unit_type} para cubrir pedidos.
                  </div>
                )}
                {returnedQty > 0 && (
                  <div className="ml-2 bg-orange-50 text-orange-600 px-3 py-2 rounded-xl text-[10px] font-bold flex items-center gap-2 border border-orange-100">
                    <TrendingDown size={14}/>
                    {returnedQty} {p.unit_type} en devoluciones (merma).
                  </div>
                )}
              </div>
            )
          })}
          {driverLoads.length === 0 && (
            <div className="text-center text-brand-muted/80 py-10">
              <Package size={40} className="mx-auto mb-4 text-slate-300" />
              <p className="font-bold text-brand-muted">Sin stock registrado</p>
              <p className="text-xs text-brand-muted/80 mt-1">No hay mercadería en la camioneta.</p>
            </div>
          )}
        </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: DRIVER HOME
// ==========================================
// ==========================================
// COMPONENTE: DRIVER LOAD STOPS MODAL
// ==========================================
interface DriverLoadStopsModalProps {
  driver: any;
  onClose: () => void;
}

const DriverLoadStopsModal: React.FC<DriverLoadStopsModalProps> = ({ driver, onClose }) => {
  const { weeklyRoutes, products, clients } = useStore()
  
  const todayJS = new Date().getDay()
  const todayISO = todayJS === 0 ? 7 : todayJS

  const initialLoadStop = useMemo(() => {
    return weeklyRoutes.find(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'initial_load')
  }, [weeklyRoutes, driver.id, todayISO])

  const plannedLoad = useMemo(() => {
    if (initialLoadStop && initialLoadStop.planned_load && Object.keys(initialLoadStop.planned_load).length > 0) {
      return initialLoadStop.planned_load
    }
    return getSuggestedLoadForDriver(weeklyRoutes, clients, driver.id, todayISO, -1)
  }, [initialLoadStop, weeklyRoutes, driver.id, todayISO, clients])

  const intermediateLoadStops = useMemo(() => {
    return weeklyRoutes
      .filter(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'load')
      .sort((a, b) => a.route_order - b.route_order)
  }, [weeklyRoutes, driver.id, todayISO])

  const hasInitialLoad = Object.keys(plannedLoad).length > 0

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
      <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-5 border-b border-brand-muted/20 bg-brand-navy/5 rounded-t-3xl flex justify-between items-center text-brand-deep">
          <div>
            <h3 className="text-lg font-bold text-brand-deep flex items-center gap-2">
              <Package size={20} className="text-brand-navy"/> Paradas de Carga
            </h3>
            <p className="text-xs text-brand-muted mt-0.5">Mercadería a cargar durante el recorrido.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-brand-muted hover:bg-brand-muted/10 rounded-full transition-colors">
            <X size={18}/>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-white border border-brand-muted/10 rounded-2xl p-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-orange"></div>
            <h4 className="font-bold text-brand-deep text-sm mb-3">Primera Carga (Base)</h4>
            {hasInitialLoad ? (
              <div className="space-y-2">
                {sortProducts(products).map(p => {
                  const qtyInfo = getPlannedLoadQty(plannedLoad, p.id)
                  if (qtyInfo.total === 0) return null
                  return (
                    <div key={p.id} className="flex justify-between items-center text-xs border-b border-brand-muted/5 pb-2 last:border-b-0 last:pb-0">
                      <div className="flex flex-col">
                        <span className="text-brand-deep font-semibold">{p.name}</span>
                        <span className="text-[9px] text-brand-muted font-bold">Pedidos: {qtyInfo.fixed} {p.unit_type} | Mostrador: {qtyInfo.extra} {p.unit_type}</span>
                      </div>
                      <span className="font-black text-brand-navy bg-brand-navy/10 px-2.5 py-0.5 rounded text-[11px]">{qtyInfo.total} {p.unit_type === 'unidad' ? 'u' : p.unit_type === 'docena' ? 'doc' : p.unit_type === 'bolsa' ? 'bols' : p.unit_type}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-brand-muted/80 italic">Sin mercadería planificada.</p>
            )}
          </div>

          {intermediateLoadStops.map((stop, index) => {
            const stopLoad = stop.planned_load && Object.keys(stop.planned_load).length > 0
              ? stop.planned_load
              : getSuggestedLoadForDriver(weeklyRoutes, clients, driver.id, todayISO, stop.route_order)
            const stopHasLoad = Object.keys(stopLoad).length > 0
            return (
              <div key={stop.id} className="bg-white border border-brand-muted/10 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-brand-navy"></div>
                <h4 className="font-bold text-brand-deep text-sm mb-3">Recarga en Ruta #{index + 1}</h4>
                {stopHasLoad ? (
                  <div className="space-y-2">
                    {sortProducts(products).map(p => {
                      const qtyInfo = getPlannedLoadQty(stopLoad, p.id)
                      if (qtyInfo.total === 0) return null
                      return (
                        <div key={p.id} className="flex justify-between items-center text-xs border-b border-brand-muted/5 pb-2 last:border-b-0 last:pb-0">
                          <div className="flex flex-col">
                            <span className="text-brand-deep font-semibold">{p.name}</span>
                            <span className="text-[9px] text-brand-muted font-bold">Pedidos: {qtyInfo.fixed} {p.unit_type} | Mostrador: {qtyInfo.extra} {p.unit_type}</span>
                          </div>
                          <span className="font-black text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded text-[11px]">{qtyInfo.total} {p.unit_type === 'unidad' ? 'u' : p.unit_type === 'docena' ? 'doc' : p.unit_type === 'bolsa' ? 'bols' : p.unit_type}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-brand-muted/80 italic">Sin mercadería planificada.</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface DriverHomeProps {
  driver: Driver
  onNewSale: () => void
  onViewRoadmap: () => void
  onViewCashSummary: () => void
  onSelectDifferentDriver: () => void
}

const DriverHome: React.FC<DriverHomeProps> = ({ driver, onNewSale, onViewCashSummary, onSelectDifferentDriver }) => {
  const { weeklyRoutes, startDriverRoute, endDriverRoute, isOffline, syncQueue, processSyncQueue, driverExpenseCategories, settlements, clients } = useStore()
  const [showLoadChecklist, setShowLoadChecklist] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showStockLoadModal, setShowStockLoadModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showLoadStopsModal, setShowLoadStopsModal] = useState(false)
  const [expAmount, setExpAmount] = useState('')
  const [expCategory, setExpCategory] = useState('')
  const [expDesc, setExpDesc] = useState('')
  const [expMethod, setExpMethod] = useState<'efectivo' | 'transferencia'>('efectivo')

  const todayJS = new Date().getDay()
  const todayISO = todayJS === 0 ? 7 : todayJS

  const initialLoadStop = useMemo(() => {
    return weeklyRoutes.find(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'initial_load')
  }, [weeklyRoutes, driver.id, todayISO])

  const plannedLoad = useMemo(() => {
    if (initialLoadStop && initialLoadStop.planned_load && Object.keys(initialLoadStop.planned_load).length > 0) {
      return initialLoadStop.planned_load
    }
    return getSuggestedLoadForDriver(weeklyRoutes, clients, driver.id, todayISO, -1)
  }, [initialLoadStop, weeklyRoutes, driver.id, todayISO, clients])
  useEffect(() => {
    if (driverExpenseCategories && driverExpenseCategories.length > 0 && !expCategory) {
      setExpCategory(driverExpenseCategories[0].name)
    }
  }, [driverExpenseCategories, expCategory])

  const driverRouteClientsCount = useMemo(() => {
    return weeklyRoutes.filter(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'client').length
  }, [weeklyRoutes, driver.id, todayISO])

  const handleStart = async () => {
    // Ya no se inicializan loads, directamente se inicia la ruta
    await startDriverRoute(driver.id)
    Swal.fire({
      title: '¡Ruta Iniciada!',
      text: 'Camioneta en calle. Que tengas un buen recorrido de ventas.',
      icon: 'success',
      confirmButtonColor: '#2563eb'
    })
  }

  const handleEnd = async () => {
    const result = await Swal.fire({
      title: '¿Finalizar Recorrido?',
      text: 'Se cerrará tu caja del día y se rendirán las ventas acumuladas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Sí, finalizar caja',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      await endDriverRoute(driver.id)
      Swal.fire('Ruta Finalizada', 'Rendición realizada con éxito en base.', 'success')
    }
  }

  const handleReopenRoute = async () => {
    const result = await Swal.fire({
      title: '¿Reabrir Ruta?',
      text: '¿Está seguro que desea reabrir la ruta? Se reactivará tu caja y stock del día para que puedas registrar nuevas transacciones.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Sí, reabrir',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      await startDriverRoute(driver.id)
      Swal.fire('Ruta Reabierta', 'La ruta y caja se encuentran operativas nuevamente.', 'success')
    }
  }

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(expAmount)
    if (isNaN(val) || val <= 0 || !expDesc.trim()) return

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      expense_date: new Date().toISOString(),
      category: expCategory,
      amount: val,
      description: expDesc,
      origin: driver.full_name,
      payment_method: expMethod
    }

    const { addExpense } = useStore.getState()
    await addExpense(newExpense)

    setExpAmount('')
    setExpDesc('')
    setShowExpenseModal(false)
    Swal.fire('Gasto Registrado', `Se restaron $${val} de tu caja.`, 'success')
  }

  // Vista "En Base"
  if (driver.status === 'En Base') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-bg-app p-6 text-center relative z-10">
        <div className="w-24 h-24 bg-white shadow-sm border border-brand-muted/10 text-brand-navy rounded-[2rem] flex items-center justify-center mb-6 relative">
          <Truck size={40} className="text-brand-navy" />
          <div className="absolute -bottom-2 -right-2 bg-brand-orange text-white text-[10px] font-black px-2 py-0.5 rounded-lg border-2 border-bg-app shadow-sm">BASE</div>
        </div>
        <h2 className="text-3xl font-black text-brand-deep mb-1 tracking-tight">Bienvenido</h2>
        <h3 className="text-base font-bold text-brand-muted mb-8">{driver.full_name}</h3>
        
        <div className="bg-white border border-brand-muted/10 rounded-3xl p-6 mb-8 w-full shadow-sm text-left relative overflow-hidden">
          <p className="text-[10px] text-brand-muted mb-1 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <MapPin size={12} /> Tu Ruta de Hoy
          </p>
          <p className="text-4xl font-black text-brand-deep">{driverRouteClientsCount} <span className="text-sm font-semibold text-brand-muted/80">Clientes</span></p>
        </div>

        <div className="w-full space-y-3">
          <button 
            onClick={handleStart} 
            disabled={driverRouteClientsCount === 0} 
            className="bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-40 disabled:hover:bg-brand-navy text-white w-full py-4 rounded-2xl font-black text-base shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <MapPin size={20} /> Iniciar Recorrido
          </button>
          
          <button 
            onClick={() => setShowLoadStopsModal(true)} 
            className="bg-white hover:bg-brand-navy/5 text-brand-orange border border-brand-orange/30 w-full py-3.5 rounded-2xl font-bold text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Package size={18} /> Paradas de Carga
          </button>

          <button 
            onClick={() => setShowHistoryModal(true)} 
            className="bg-white hover:bg-brand-navy/5 text-brand-navy border border-brand-navy/20 w-full py-3.5 rounded-2xl font-bold text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <History size={18} /> Historial de Cajas
          </button>
        </div>

        {/* Modal de Historial */}
        {showHistoryModal && (
          <DriverHistoryModal driver={driver} onClose={() => setShowHistoryModal(false)} />
        )}

        {/* Modal Paradas de Carga */}
        {showLoadStopsModal && (
          <DriverLoadStopsModal driver={driver} onClose={() => setShowLoadStopsModal(false)} />
        )}

        {/* Modal Checklist Carga Editabe Eliminado por migración a stock global */}
      </div>
    )
  }

  // Vista "Finalizado" (Rendición realizada)
  if (driver.status === 'Finalizado') {
    const isSettled = settlements.some(s => s.driver_id === driver.id)

    return (
      <div className="flex flex-col items-center justify-center h-full bg-bg-surface shadow-sm p-8 text-center relative z-10">
        <div className={`w-20 h-20 ${isSettled ? 'bg-green-500/10 text-green-500' : 'bg-brand-orange/10 text-brand-orange'} rounded-full flex items-center justify-center mb-6 shadow-inner`}>
          {isSettled ? <CheckCircle size={44} /> : <AlertCircle size={44} />}
        </div>
        <h2 className="text-2xl font-black text-brand-deep mb-2">Ruta Finalizada</h2>
        
        {isSettled ? (
          <p className="text-green-600 font-bold mb-8 text-sm flex items-center justify-center gap-1">
            <CheckCircle size={16} /> Rendición Recibida por Administración
          </p>
        ) : (
          <p className="text-brand-orange font-bold mb-8 text-sm flex items-center justify-center gap-1">
            <AlertCircle size={16} /> Pendiente de Entrega en Base
          </p>
        )}
        
        <div className="bg-brand-muted/10/40 border border-brand-muted/20 rounded-2xl p-5 w-full mb-8 text-left space-y-3">
          <p className="text-xs text-brand-muted font-bold uppercase border-b border-brand-muted/20 pb-2">Rendición de Caja Real</p>
          
          <div className="pt-1">
            <p className="text-[10px] text-brand-muted/80 mb-2 uppercase font-bold tracking-wider">Efectivo y Transferencias a Entregar:</p>
            <div className="flex justify-between items-center mb-2">
              <span className="text-brand-deep/80 text-sm flex items-center gap-1.5"><Banknote size={14} className="text-green-500"/> Efectivo en Mano</span>
              <span className="font-black text-green-400">${driver.cash_collected.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-brand-deep/80 text-sm flex items-center gap-1.5"><CreditCard size={14} className="text-brand-navy"/> Transferencias</span>
              <span className="font-black text-brand-navy">${driver.transfer_collected.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-brand-muted/80">Puedes salir o apagar el dispositivo ahora.</p>
        <div className="flex gap-3 mt-8 w-full">
          <button
            onClick={onSelectDifferentDriver}
            className="flex-1 bg-brand-muted/10 hover:bg-brand-muted/20 text-brand-deep font-bold py-3 px-4 rounded-xl text-sm transition-colors active:scale-95"
          >
            Cerrar Sesión
          </button>
          <button
            onClick={handleReopenRoute}
            className="flex-1 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={14} /> Reabrir Ruta
          </button>
        </div>
        <button 
          onClick={() => setShowHistoryModal(true)} 
          className="mt-4 text-brand-navy text-sm font-bold flex items-center justify-center gap-1.5 hover:underline"
        >
          <History size={16} /> Ver Historial de Cajas
        </button>

        {/* Modal de Historial */}
        {showHistoryModal && (
          <DriverHistoryModal driver={driver} onClose={() => setShowHistoryModal(false)} />
        )}
      </div>
    )
  }

  // Vista Principal de Trabajo ("En Ruta")
  return (
    <div className="flex flex-col h-full bg-brand-navy shadow-sm overflow-y-auto relative">
      {/* Encabezado Principal */}
      <div className="bg-brand-navy text-white p-6 pb-8 rounded-b-[2.5rem] shadow-md relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-10">
          <Truck size={140} />
        </div>
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">{driver.full_name.split(' ')[0]}</h1>
            <p className="text-xs text-brand-orange font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-ping"></span> En Calle
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isOffline && syncQueue.length > 0 && (
              <button 
                onClick={processSyncQueue}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-transform active:scale-90 shadow-sm"
                title="Sincronizar ahora"
              >
                <RefreshCw size={14} className="text-white" />
              </button>
            )}
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold shadow-sm ${isOffline ? 'bg-red-500/20 text-red-100 border border-red-400/30' : 'bg-green-500/20 text-green-100 border border-green-400/30'}`}>
              {isOffline ? <WifiOff size={12} /> : <Wifi size={12} />}
              {isOffline ? 'OFFLINE' : 'ONLINE'}
            </span>
          </div>
        </div>

        {/* Caja de Dinero */}
        <div className="bg-white text-brand-deep rounded-3xl p-5 flex gap-4 shadow-lg relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-brand-muted mb-1.5">
              <Banknote size={16} className="text-green-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Efectivo</span>
            </div>
            <p className="text-2xl font-black text-brand-deep">${driver.cash_collected.toLocaleString()}</p>
          </div>
          <div className="w-px bg-brand-muted/10"></div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-brand-muted mb-1.5">
              <CreditCard size={16} className="text-brand-navy" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Transf.</span>
            </div>
            <p className="text-2xl font-black text-brand-deep">${driver.transfer_collected.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Contenido de Ruta / Acciones */}
      <div className="p-5 flex-1 flex flex-col justify-start gap-4 pb-24 bg-bg-app">
        {/* Botón Seleccionar Cliente (Búsqueda directa) */}
        <button 
          onClick={onNewSale} 
          className="bg-brand-navy hover:bg-brand-navy/90 text-white rounded-[2rem] p-6 flex items-center gap-5 shadow-xl shadow-brand-navy/20 active:scale-[0.98] transition-all relative overflow-hidden group w-full"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/20 transition-colors"></div>
          <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
            <Search size={28} className="text-white"/>
          </div>
          <div className="text-left flex-1">
            <span className="block font-black text-xl mb-1">Seleccionar Cliente</span>
            <span className="text-xs font-semibold text-white/70">Listado completo de clientes</span>
          </div>
          <ChevronRight size={24} className="text-white/50" />
        </button>

        {/* Paradas de Carga */}
        <button 
          onClick={() => setShowLoadStopsModal(true)} 
          className="bg-white hover:bg-brand-orange/5 text-brand-orange border border-brand-orange/20 rounded-3xl p-5 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all w-full"
        >
          <div className="bg-brand-orange/10 p-3 rounded-2xl text-brand-orange">
            <Package size={24} />
          </div>
          <div className="text-left flex-1">
            <span className="block font-bold text-sm mb-0.5 text-brand-orange">Paradas de Carga</span>
            <span className="text-[10px] font-semibold text-brand-muted">Ver mercadería a cargar hoy</span>
          </div>
          <ChevronRight size={20} className="text-brand-orange/40" />
        </button>

        {/* Gastos y Resumen */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setShowExpenseModal(true)} 
            className="bg-white hover:bg-red-50 text-red-500 border border-red-100 rounded-3xl p-4 flex flex-col items-center justify-center gap-2 font-bold active:scale-95 transition-all text-xs shadow-sm"
          >
            <div className="bg-red-50 p-2 rounded-xl text-red-500 mb-1">
              <TrendingDown size={20} />
            </div>
            Gasto
          </button>
          <button 
            onClick={onViewCashSummary}
            className="bg-white hover:bg-brand-muted/5 text-brand-deep border border-brand-muted/10 rounded-3xl p-4 flex flex-col items-center justify-center gap-2 font-bold active:scale-95 transition-all text-xs shadow-sm"
          >
            <div className="bg-brand-muted/5 p-2 rounded-xl text-brand-muted mb-1">
              <ClipboardList size={20} />
            </div>
            Caja
          </button>
        </div>

        {/* Finalizar Recorrido */}
        <button 
          onClick={handleEnd} 
          className="mt-auto mb-2 bg-white hover:bg-red-50 shadow-sm border border-red-100 text-red-500 rounded-2xl p-4 font-bold active:scale-95 transition-all flex justify-center items-center gap-2 text-sm"
        >
          <LogOut size={18} /> Finalizar Ruta y Cerrar Caja
        </button>
      </div>

      {/* Modal Nuevo Gasto */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-in fade-in">
          <div className="bg-bg-surface shadow-sm border-t sm:border border-brand-muted/20 rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-2xl flex flex-col">
            <div className="p-5 border-b border-brand-muted/20 bg-red-500/5 rounded-t-3xl flex justify-between items-center">
              <div>
                <h3 className="font-bold text-red-400 text-lg flex items-center gap-2">
                  <TrendingDown size={18}/> Registrar Gasto
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">El monto se descontará de tu caja.</p>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="text-brand-muted/80 hover:bg-brand-muted/10 p-1.5 rounded-full"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-brand-muted uppercase mb-1 block">Categoría</label>
                <select 
                  value={expCategory} 
                  onChange={e => setExpCategory(e.target.value)} 
                  className="w-full bg-brand-muted/10 border border-brand-muted/30 text-brand-deep rounded-xl p-3 font-semibold text-sm outline-none focus:ring-1 focus:ring-red-500"
                >
                  {driverExpenseCategories && driverExpenseCategories.length > 0 ? (
                    driverExpenseCategories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="Combustible">Combustible</option>
                      <option value="Reparación / Taller">Reparación / Taller</option>
                      <option value="Peaje">Peaje</option>
                      <option value="Varios">Varios</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-brand-muted uppercase mb-1 block">Monto Gastado</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 font-bold text-brand-muted">$</span>
                  <input 
                    type="number" 
                    step="any" 
                    required 
                    value={expAmount} 
                    onChange={e => setExpAmount(e.target.value)} 
                    className="w-full pl-8 pr-4 py-3 bg-brand-muted/10 border border-brand-muted/30 rounded-xl text-lg font-black text-brand-deep focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none" 
                    placeholder="0" 
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-brand-muted uppercase mb-1 block">Descripción breve</label>
                <input 
                  type="text" 
                  required 
                  value={expDesc} 
                  onChange={e => setExpDesc(e.target.value)} 
                  placeholder="Ej: Gomero rueda trasera" 
                  className="w-full py-3 px-4 bg-brand-muted/10 border border-brand-muted/30 rounded-xl text-sm text-brand-deep focus:ring-1 focus:ring-red-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-brand-muted uppercase mb-2 block">¿De dónde salió el dinero?</label>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setExpMethod('efectivo')} 
                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${expMethod === 'efectivo' ? 'bg-green-500/10 border-green-500 text-green-400' : 'border-brand-muted/20 text-brand-muted bg-brand-muted/10/30'}`}
                  >
                    <Banknote size={14}/> Efectivo
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setExpMethod('transferencia')} 
                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${expMethod === 'transferencia' ? 'bg-brand-navy/10 border-brand-navy/30 text-brand-navy' : 'border-brand-muted/20 text-brand-muted bg-brand-muted/10/30'}`}
                  >
                    <CreditCard size={14}/> Transf.
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                className="w-full mt-4 bg-red-600 hover:bg-red-500 text-white py-3.5 rounded-xl font-bold shadow-lg active:bg-red-700 transition-colors flex justify-center items-center gap-2 text-sm"
              >
                <CheckCircle size={18}/> Guardar y Descontar
              </button>
            </form>
          </div>
        </div>
      )}

        {/* Modal de Stock */}
        {showStockModal && (
          <DriverStockModal driver={driver} onClose={() => setShowStockModal(false)} />
        )}
        
        {/* Modal Carga de Stock Editable */}
        {showStockLoadModal && (
          <DriverScheduledLoadsModal 
            driver={driver}
            onClose={() => setShowStockLoadModal(false)} 
          />
        )}

      {/* Modal Historial */}
      {showHistoryModal && (
        <DriverHistoryModal driver={driver} onClose={() => setShowHistoryModal(false)} />
      )}

      {/* Modal Paradas de Carga */}
      {showLoadStopsModal && (
        <DriverLoadStopsModal driver={driver} onClose={() => setShowLoadStopsModal(false)} />
      )}
    </div>
  )
}

// ==========================================
// COMPONENTE: CARGAS PROGRAMADAS (DRIVER)
// ==========================================
interface DriverScheduledLoadsModalProps {
  driver: Driver;
  onClose: () => void;
}

const DriverScheduledLoadsModal: React.FC<DriverScheduledLoadsModalProps> = ({ driver, onClose }) => {
  const { weeklyRoutes, products } = useStore()
  const [activeLoadModal, setActiveLoadModal] = useState<any>(null)
  const [completedLoads, setCompletedLoads] = useState<string[]>([])

  const todayJS = new Date().getDay()
  const todayISO = todayJS === 0 ? 7 : todayJS

  const dayLoads = useMemo(() => {
    return weeklyRoutes
      .filter(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'load')
      .sort((a, b) => a.route_order - b.route_order)
  }, [weeklyRoutes, driver.id, todayISO])

  const todayRoutes = useMemo(() => {
    return weeklyRoutes
      .filter(r => r.driver_id === driver.id && r.day_of_week === todayISO)
      .sort((a, b) => a.route_order - b.route_order)
  }, [weeklyRoutes, driver.id, todayISO])

  const getSuggestedLoadForStop = (stopId: string) => {
    const suggested: Record<string, number> = {}
    const { clients: allClients } = useStore.getState()

    let startCounting = false;
    for (let i = 0; i < todayRoutes.length; i++) {
      const s = todayRoutes[i];
      if (s.id === stopId) {
        startCounting = true;
        continue;
      }
      
      if (startCounting) {
        if (s.stop_type === 'load') break;
        
        if (s.stop_type === 'client') {
          const clientObj = allClients.find(c => c.id === s.client_id)
          if (clientObj) {
            const orderForDay = getFixedOrderForDay(clientObj, todayISO)
            Object.entries(orderForDay).forEach(([prodId, qty]) => {
              suggested[prodId] = (suggested[prodId] || 0) + (qty as number)
            })
          }
        }
      }
    }
    return suggested
  }


  const handleConfirmIntermediateLoad = (stop: any, actualLoads: Record<string, number>) => {
    const { loads } = useStore.getState()
    const newLoadsToAdd = sortProducts(products).map(p => {
      const qty = actualLoads[p.id] || 0;
      return {
        id: crypto.randomUUID(),
        driver_id: driver.id,
        product_id: p.id,
        date_loaded: new Date().toISOString(),
        initial_quantity: qty,
        current_quantity: qty
      }
    }).filter(l => l.initial_quantity > 0)

    const updatedLoads = [...loads]
    newLoadsToAdd.forEach(newLoad => {
      const existingIdx = updatedLoads.findIndex(l => l.product_id === newLoad.product_id)
      if (existingIdx >= 0) {
        updatedLoads[existingIdx] = {
          ...updatedLoads[existingIdx],
          current_quantity: updatedLoads[existingIdx].current_quantity + newLoad.current_quantity,
          initial_quantity: updatedLoads[existingIdx].initial_quantity + newLoad.initial_quantity
        }
      } else {
        updatedLoads.push(newLoad)
      }
    })

    useStore.setState({ loads: updatedLoads })
    setCompletedLoads(prev => [...prev, stop ? stop.id : 'initial'])
    setActiveLoadModal(null)
    
    Swal.fire({
      title: 'Carga Registrada',
      text: 'Se ha sumado el stock a tu inventario de la camioneta.',
      icon: 'success',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    })
  }

  return (
    <div className="absolute inset-0 bg-bg-app z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-brand-muted/10 shadow-sm rounded-b-3xl">
        <button onClick={onClose} className="p-2 text-brand-navy hover:bg-brand-navy/5 rounded-xl border border-brand-muted/10 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black text-brand-deep flex-1 tracking-tight">Cargas Programadas</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-24 pr-2">
        <div className="relative border-l-2 border-dashed border-brand-muted/20 ml-4 pl-6 space-y-6">
          
          {dayLoads.length === 0 && (
            <div className="text-center text-brand-muted/80 py-10">
              <Package size={40} className="mx-auto mb-4 text-slate-700" />
              <p className="font-bold text-brand-muted">Sin recargas programadas</p>
              <p className="text-xs text-brand-muted/80 mt-1">No hay cargas intermedias adicionales para hoy.</p>
            </div>
          )}

          {dayLoads.map((stop) => {
            let stopLoad = stop.planned_load || {}
            let stopHasLoad = Object.keys(stopLoad).length > 0
            let isSuggested = false

            if (!stopHasLoad) {
              stopLoad = getSuggestedLoadForStop(stop.id)
              stopHasLoad = Object.keys(stopLoad).length > 0
              isSuggested = true
            }
            const isCompleted = completedLoads.includes(stop.id)

            return (
              <div key={stop.id} className="relative">
                <span className="absolute -left-[35px] top-1 bg-brand-orange text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm border border-white text-xs font-black">
                  <Package size={12} />
                </span>

                <div className="bg-white border rounded-2xl p-4 shadow-sm transition-all border-brand-muted/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black text-brand-orange uppercase tracking-wider block mb-1">Carga en Ruta</span>
                      <h4 className="font-bold text-brand-deep text-sm mb-1 flex items-center gap-2">
                        Carga Intermedia
                        {isCompleted && <CheckCircle size={14} className="text-green-500" />}
                      </h4>
                      {isSuggested && !isCompleted && stopHasLoad && (
                        <span className="text-[10px] font-semibold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-md">
                          Cantidades Sugeridas
                        </span>
                      )}
                    </div>
                    {!isCompleted && (
                      <button 
                        onClick={() => setActiveLoadModal({ stop, plannedLoad: stopLoad })}
                        className="bg-brand-navy hover:bg-brand-navy/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors active:scale-95"
                      >
                        Registrar Carga
                      </button>
                    )}
                  </div>
                  
                  {stopHasLoad ? (
                    <div className={`grid grid-cols-1 gap-2 mt-2 p-3 rounded-xl border transition-all ${isCompleted ? 'bg-green-50/50 border-green-500/20' : 'bg-brand-muted/5 border-brand-muted/10'}`}>
                      {products.map(p => {
                        const qtyInfo = getPlannedLoadQty(stopLoad, p.id)
                        if (qtyInfo.total === 0) return null
                        return (
                          <div key={p.id} className="flex justify-between items-center text-xs border-b border-brand-muted/5 pb-1.5 last:border-b-0 last:pb-0">
                            <div className="flex flex-col">
                              <span className="text-brand-deep font-semibold">{p.name}</span>
                              <span className="text-[9px] text-brand-muted font-bold">Pedidos: {qtyInfo.fixed} {p.unit_type} | Mostrador: {qtyInfo.extra} {p.unit_type}</span>
                            </div>
                            <span className={`font-black px-2.5 py-0.5 rounded text-[11px] ${isCompleted ? 'bg-green-500/10 text-green-600' : 'bg-brand-orange/10 text-brand-orange'}`}>
                              {qtyInfo.total} {p.unit_type === 'unidad' ? 'u' : p.unit_type === 'docena' ? 'doc' : p.unit_type === 'bolsa' ? 'bols' : p.unit_type}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-brand-muted/80 italic mt-1">Sin mercadería planificada.</p>
                  )}
                  {isCompleted && (
                    <p className="text-[10px] text-green-600 font-bold mt-2 text-right w-full flex items-center justify-end gap-1">
                      Carga sumada al inventario
                    </p>
                  )}
                </div>
              </div>
            )
          })}
          
          <div className="pt-2 relative">
            <span className="absolute -left-[35px] top-6 bg-brand-navy/10 text-brand-navy w-6 h-6 rounded-full flex items-center justify-center shadow-sm border border-white text-xs font-black">
              <Plus size={12} />
            </span>
            <button 
              onClick={() => setActiveLoadModal({ stop: null, plannedLoad: {} })}
              className="w-full bg-white hover:bg-slate-50 border-2 border-dashed border-brand-navy/30 text-brand-navy font-black text-sm py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
            >
              <Package size={18} />
              Carga Libre (No Programada)
            </button>
            <p className="text-[10px] text-center text-brand-muted mt-2 px-4">
              Usa esta opción si necesitas cargar mercadería adicional que no estaba planificada en tu ruta.
            </p>
          </div>

        </div>
      </div>

      {activeLoadModal && (
        <EditableLoadModal 
          plannedLoad={activeLoadModal.plannedLoad}
          onClose={() => setActiveLoadModal(null)}
          onConfirm={(actualLoads) => handleConfirmIntermediateLoad(activeLoadModal.stop, actualLoads)}
          title={activeLoadModal.stop ? "Carga Intermedia" : "Primera Carga"}
        />
      )}
    </div>
  )
}

// ==========================================
// COMPONENTE: HISTORIAL DE CAJAS (DRIVER)
// ==========================================
interface DriverHistoryModalProps {
  driver: Driver;
  onClose: () => void;
}

const DriverHistoryModal: React.FC<DriverHistoryModalProps> = ({ driver, onClose }) => {
  const { fetchDriverSalesHistory } = useStore()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(5)

  useEffect(() => {
    fetchDriverSalesHistory(driver.id).then(data => {
      setHistory(data)
      setLoading(false)
    })
  }, [driver.id, fetchDriverSalesHistory])

  const visibleHistory = history.slice(0, visibleCount)

  return (
    <div className="absolute inset-0 bg-bg-app/80 z-50 flex justify-center pt-16 pb-6 px-4 backdrop-blur-md animate-in fade-in">
      <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh]">
        <div className="p-5 border-b border-brand-muted/20 bg-brand-navy/5 rounded-t-3xl flex justify-between items-center text-brand-deep">
          <div>
            <h3 className="text-lg font-bold text-brand-deep flex items-center gap-2">
              <History size={20} className="text-brand-navy"/> Historial de Cajas
            </h3>
            <p className="text-xs text-brand-muted mt-0.5">Últimos 30 días de recaudación.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-brand-muted hover:bg-brand-muted/10 rounded-full transition-colors">
            <X size={18}/>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 p-5 bg-slate-50/50">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="animate-spin text-brand-navy mx-auto mb-2" size={24} />
              <p className="text-sm text-brand-muted font-semibold">Cargando historial...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-brand-muted font-semibold">No hay historial reciente.</p>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {visibleHistory.map((day, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-brand-muted/10 shadow-sm flex flex-col gap-3">
                  <div className="font-bold text-brand-deep border-b border-brand-muted/10 pb-2 flex items-center gap-2">
                    <Calendar size={14} className="text-brand-navy" /> {day.dateStr}
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <span className="text-[10px] text-brand-muted/80 uppercase font-bold tracking-wider flex items-center gap-1"><Banknote size={12} className="text-green-500" /> Efectivo</span>
                      <span className="font-black text-green-500 text-lg">${day.cash.toLocaleString()}</span>
                    </div>
                    <div className="w-px bg-brand-muted/10"></div>
                    <div className="flex-1">
                      <span className="text-[10px] text-brand-muted/80 uppercase font-bold tracking-wider flex items-center gap-1"><CreditCard size={12} className="text-brand-navy" /> Transfer.</span>
                      <span className="font-black text-brand-navy text-lg">${day.transfer.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {visibleCount < history.length && (
                <button
                  onClick={() => setVisibleCount(prev => prev + 5)}
                  className="w-full py-3 mt-4 text-brand-navy font-bold text-sm bg-brand-navy/5 hover:bg-brand-navy/10 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronDown size={16} /> Ver cajas anteriores
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: DRIVER CLIENTS
// ==========================================
interface DriverClientsProps {
  onBack: () => void
  onSelectClient: (clientId: string) => void
}

const DriverClients: React.FC<DriverClientsProps> = ({ onBack, onSelectClient }) => {
  const { clients, weeklyRoutes, currentDriverId, sales } = useStore()
  const [searchTerm, setSearchTerm] = useState('')

  const todayJS = new Date().getDay()
  const todayISO = todayJS === 0 ? 7 : todayJS
  const todayStr = useMemo(() => new Date().toLocaleDateString('sv'), [])

  const routeStops = useMemo(() => {
    const todayRoutes = weeklyRoutes.filter(r => r.driver_id === currentDriverId && r.day_of_week === todayISO)
    const initialLoad = todayRoutes.find(r => r.stop_type === 'initial_load')
    const others = todayRoutes.filter(r => r.stop_type !== 'initial_load').sort((a, b) => a.route_order - b.route_order)
    
    let stops = initialLoad ? [initialLoad, ...others] : others

    if (searchTerm) {
      stops = stops.filter(stop => {
        if (stop.stop_type === 'client') {
          const client = clients.find(c => c.id === stop.client_id)
          if (!client) return false
          return client.business_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 client.address.toLowerCase().includes(searchTerm.toLowerCase())
        }
        return false
      })
    }
    
    return stops
  }, [clients, weeklyRoutes, currentDriverId, searchTerm, todayISO])

  return (
    <div className="flex flex-col h-full bg-bg-app">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-brand-muted/10 sticky top-0 z-10 shadow-sm rounded-b-3xl">
        <button onClick={onBack} className="p-2 text-brand-navy hover:bg-brand-navy/5 rounded-xl border border-brand-muted/10 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black text-brand-deep flex-1 tracking-tight">Mi Ruta</h2>
      </div>

      {/* Buscador */}
      <div className="p-4 bg-bg-app border-b border-brand-muted/10">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-brand-muted" size={20} />
          <input 
            type="text" 
            placeholder="Buscar comercio..." 
            className="w-full bg-white border border-brand-muted/10 shadow-sm rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-brand-navy/20 text-brand-deep placeholder-brand-muted/60 outline-none font-semibold text-sm" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 pr-2">
        {routeStops.length === 0 ? (
          <div className="text-center text-brand-muted/80 mt-10">
            <MapPin size={40} className="mx-auto mb-4 text-slate-700" />
            <p className="font-bold text-brand-muted">Sin paradas en ruta</p>
            <p className="text-xs text-brand-muted/80 mt-1">No se encontró una ruta asignada para hoy.</p>
          </div>
        ) : (
          routeStops.map((stop, idx) => {
            if (stop.stop_type === 'client') {
              const client = clients.find(c => c.id === stop.client_id)
              if (!client) return null
              
              return (
                <div 
                  key={stop.id} 
                  onClick={() => onSelectClient(client.id)} 
                  className="bg-white hover:bg-brand-navy/5 border border-brand-muted/10 rounded-3xl p-4 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-navy/5 text-brand-navy flex items-center justify-center font-black text-sm flex-shrink-0 border border-brand-navy/10">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-bold text-brand-deep text-sm truncate">{client.business_name}</h3>
                      {client.allow_credit && (
                        <span className="bg-brand-navy text-white text-[9px] px-2 py-0.5 rounded-lg font-bold whitespace-nowrap shadow-sm">
                          Cta. Cte.
                        </span>
                      )}
                      {sales.some(s => s.client_id === client.id && s.status === 'completed' && new Date(s.transaction_date).toLocaleDateString('sv') === todayStr) && (
                        <span className="bg-emerald-600 text-white text-[9px] px-2 py-0.5 rounded-lg font-bold whitespace-nowrap shadow-sm flex items-center gap-1">
                          ✓ Visitado
                        </span>
                      )}
                      {sales.some(s => s.client_id === client.id && s.status === 'draft' && new Date(s.transaction_date).toLocaleDateString('sv') === todayStr) && (
                        <span className="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-lg font-bold whitespace-nowrap shadow-sm animate-pulse">
                          🟡 Ticket Abierto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brand-muted truncate flex items-center gap-1.5 font-medium">
                      <MapPin size={12} className="text-brand-orange" /> {client.address}
                    </p>
                  </div>

                  {/* Saldo Visual */}
                  {client.current_balance < 0 ? (
                    <div className="bg-red-50 text-red-500 px-3 py-1.5 rounded-xl border border-red-100 flex flex-col items-end flex-shrink-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider">Deuda</span>
                      <span className="text-sm font-black">${Math.abs(client.current_balance)}</span>
                    </div>
                  ) : client.current_balance > 0 ? (
                    <div className="bg-green-50 text-green-600 px-3 py-1.5 rounded-xl border border-green-100 flex flex-col items-end flex-shrink-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider">A Favor</span>
                      <span className="text-sm font-black">${client.current_balance}</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-brand-muted/5 flex items-center justify-center border border-brand-muted/10 group-hover:bg-brand-navy/10 group-hover:border-brand-navy/20 group-hover:text-brand-navy transition-colors">
                      <ChevronRight size={18} className="text-brand-muted" />
                    </div>
                  )}
                </div>
              )
            } else {
              const isInitial = stop.stop_type === 'initial_load'
              return (
                <div 
                  key={stop.id} 
                  className={`bg-white border rounded-3xl p-4 shadow-sm flex items-center gap-4 transition-all group ${isInitial ? 'border-brand-orange/40 bg-brand-orange/5' : 'border-brand-orange/20'}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center font-black text-sm flex-shrink-0 border border-brand-orange/20">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-brand-orange text-sm truncate">{isInitial ? 'Primera Carga (Fábrica)' : 'Recarga en Ruta'}</h3>
                    <p className="text-[10px] font-bold text-brand-orange/80 uppercase tracking-wider mt-0.5">Parada de Carga</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-brand-orange/10 flex items-center justify-center border border-brand-orange/20">
                    <Package size={16} className="text-brand-orange" />
                  </div>
                </div>
              )
            }
          })
        )}
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: DRIVER TERMINAL (FACTURACIÓN)
// ==========================================
interface DriverTerminalProps {
  driver: Driver
  clientId: string
  onBack: () => void
  onComplete: () => void
}

const DriverTerminal: React.FC<DriverTerminalProps> = ({ driver, clientId, onBack, onComplete }) => {
  const { products, clients, loads, addSale, weeklyRoutes, sales } = useStore()
  
  const [tab, setTab] = useState<1 | 2 | 3>(1)
  
  const client = clients.find(c => c.id === clientId)
  
  // Buscar si existe una venta/ticket abierto previo hoy para este cliente
  const todayStr = useMemo(() => new Date().toLocaleDateString('sv'), [])
  const existingDraftSale = useMemo(() => {
    return sales.find(s => 
      s.driver_id === driver.id && 
      s.client_id === clientId && 
      s.status === 'draft' && 
      new Date(s.transaction_date).toLocaleDateString('sv') === todayStr
    )
  }, [sales, driver.id, clientId, todayStr])

  const [cart, setCart] = useState<Record<string, number>>(() => {
    // 1. Si hay borrador guardado previo en el día, cargar sus ítems
    if (existingDraftSale) {
      const draftCart: Record<string, number> = {}
      existingDraftSale.items.forEach(item => {
        if (item.operation_type === 'sale') {
          draftCart[item.product_id] = item.quantity
        }
      })
      return draftCart
    }
    // 2. De lo contrario, auto-completar con pedido fijo si corresponde
    if (client) {
      const clampedCart: Record<string, number> = {}
      const todayISO = new Date().getDay() === 0 ? 7 : new Date().getDay()
      const orderForDay = getFixedOrderForDay(client, todayISO)
      Object.entries(orderForDay).forEach(([prodId, qty]) => {
        const finalQty = qty as number
        if (finalQty > 0) {
          clampedCart[prodId] = finalQty
        }
      })
      return clampedCart
    }
    return {}
  }) // product_uuid -> qty
  
  const [returns, setReturns] = useState<Record<string, number>>(() => {
    if (existingDraftSale) {
      const draftReturns: Record<string, number> = {}
      existingDraftSale.items.forEach(item => {
        if (item.operation_type === 'return') {
          draftReturns[item.product_id] = item.quantity
        }
      })
      return draftReturns
    }
    return {}
  }) // product_uuid -> qty
  
  // Pagos mixtos
  const [payCash, setPayCash] = useState(existingDraftSale && existingDraftSale.payment_cash > 0 ? existingDraftSale.payment_cash.toString() : '')
  const [payTransfer, setPayTransfer] = useState(existingDraftSale && existingDraftSale.payment_transfer > 0 ? existingDraftSale.payment_transfer.toString() : '')
  const [cajonesLeft, setCajonesLeft] = useState(existingDraftSale && existingDraftSale.cajones_left > 0 ? existingDraftSale.cajones_left.toString() : '')
  const [cajonesReturned, setCajonesReturned] = useState(existingDraftSale && existingDraftSale.cajones_returned > 0 ? existingDraftSale.cajones_returned.toString() : '')
  const [includeDebt, setIncludeDebt] = useState(existingDraftSale ? existingDraftSale.applied_debt > 0 : false)
  const [generatedTicket, setGeneratedTicket] = useState<Sale | null>(null)
  const [debtWspText, setDebtWspText] = useState('')

  const todayJS = new Date().getDay()
  const todayISO = todayJS === 0 ? 7 : todayJS

  const todaySales = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('sv')
    return sales.filter(s => {
      const saleDate = new Date(s.transaction_date).toLocaleDateString('sv')
      return s.driver_id === driver.id && saleDate === todayStr
    })
  }, [sales, driver.id])

  if (!client) return null

  const getPrice = (product: Product) => {
    return client.price_category === 'B' ? product.price_b : product.price_a;
  }

  // Totales
  const subtotalSales = Object.entries(cart).reduce((acc, [id, qty]) => {
    const p = products.find(p => p.id === id)
    return acc + (p ? getPrice(p) * qty : 0)
  }, 0)

  const totalReturns = Object.entries(returns).reduce((acc, [id, qty]) => {
    const p = products.find(p => p.id === id)
    return acc + (p ? getPrice(p) * qty : 0)
  }, 0)

  const finalTotal = subtotalSales - totalReturns + (includeDebt && client.current_balance < 0 ? Math.abs(client.current_balance) : 0)

  const cashAmt = parseFloat(payCash) || 0
  const transferAmt = parseFloat(payTransfer) || 0
  const totalPaid = cashAmt + transferAmt
  const remainingToPay = finalTotal - totalPaid
  
  // Saldo a cuenta corriente (puede ser positivo o negativo si hay saldo a favor)
  const willAddToDebt = (subtotalSales - totalReturns) - totalPaid

  const handleUpdateQty = (
    obj: Record<string, number>, 
    setObj: React.Dispatch<React.SetStateAction<Record<string, number>>>, 
    productId: string, 
    delta: number, 
    unitType: string,
    // // maxStock: number
  ) => {
    const current = obj[productId] || 0
    const step = unitType === 'kg' ? 0.5 : 1
    let next = current + (delta * step)
    if (next < 0) next = 0


    setObj(prev => {
      const nextObj = { ...prev }
      if (next === 0) {
        delete nextObj[productId]
      } else {
        nextObj[productId] = next
      }
      return nextObj
    })
  }

  const handleProcess = async (asDraft: boolean = false) => {
    const items: SaleItem[] = []

    // 1. Agregar items de venta
    Object.entries(cart).forEach(([id, qty]) => {
      const p = products.find(p => p.id === id)
      if (p && qty > 0) {
        items.push({
          product_id: p.id,
          operation_type: 'sale',
          quantity: qty,
          unit_price: getPrice(p),
          name: p.name
        })
      }
    })

    // 2. Agregar items de devolución
    Object.entries(returns).forEach(([id, qty]) => {
      const p = products.find(p => p.id === id)
      if (p && qty > 0) {
        items.push({
          product_id: p.id,
          operation_type: 'return',
          quantity: qty,
          unit_price: getPrice(p),
          name: p.name
        })
      }
    })

    const newSale: Sale = {
      id: existingDraftSale ? existingDraftSale.id : crypto.randomUUID(),
      client_id: client.id,
      driver_id: driver.id,
      transaction_date: new Date().toISOString(),
      subtotal_sales: subtotalSales,
      total_returns: totalReturns,
      applied_debt: includeDebt && client.current_balance < 0 ? Math.abs(client.current_balance) : 0,
      final_total: subtotalSales - totalReturns,
      payment_cash: asDraft ? 0 : cashAmt,
      payment_transfer: asDraft ? 0 : transferAmt,
      payment_account: asDraft ? 0 : willAddToDebt,
      cajones_left: parseInt(cajonesLeft) || 0,
      cajones_returned: parseInt(cajonesReturned) || 0,
      status: asDraft ? 'draft' : 'completed',
      items: items,
      client_name: client.business_name,
      driver_name: driver.full_name
    }

    await addSale(newSale)
    
    if (asDraft) {
      Swal.fire({
        title: 'Ticket Guardado Abierto',
        text: 'La mercadería entregada fue descontada del camión. Podrás cerrar el ticket en la siguiente visita.',
        icon: 'info',
        confirmButtonColor: '#2563eb'
      })
      onComplete()
    } else {
      setGeneratedTicket(newSale)
    }
  }

  const handleWhatsApp = () => {
    if (!generatedTicket) return
    let text = `🍞 *PANIFICADORA FENIX*\n🎫 Ticket #${generatedTicket.id.substring(0, 8).toUpperCase()}\n👤 Cliente: ${generatedTicket.client_name}\n📅 Fecha: ${new Date(generatedTicket.transaction_date).toLocaleString('es-AR')}\n--------------------------------\n`
    if (subtotalSales > 0) {
      text += `*DESPACHO:*\n`
      generatedTicket.items.filter(i => i.operation_type === 'sale').forEach(item => text += `• ${item.quantity}x ${item.name} - $${item.quantity * item.unit_price}\n`)
    }
    if (totalReturns > 0) {
      text += `\n*DEVOLUCIONES (MERMAS):*\n`
      generatedTicket.items.filter(i => i.operation_type === 'return').forEach(item => text += `• -${item.quantity}x ${item.name} - -$${item.quantity * item.unit_price}\n`)
    }
    const totalToCollect = generatedTicket.final_total + (generatedTicket.applied_debt || 0)
    text += `--------------------------------\n*${generatedTicket.applied_debt > 0 ? 'TOTAL A COBRAR (Venta + Deuda)' : 'TOTAL BOLETA'}: $${totalToCollect.toLocaleString('es-AR')}*\n`
    if (generatedTicket.payment_cash > 0) text += `💵 Efectivo: $${generatedTicket.payment_cash.toLocaleString('es-AR')}\n`
    if (generatedTicket.payment_transfer > 0) text += `💳 Transferencia: $${generatedTicket.payment_transfer.toLocaleString('es-AR')}\n`
    if (generatedTicket.payment_account !== 0) {
      const isPayingDebt = generatedTicket.payment_account < 0 && generatedTicket.applied_debt >= Math.abs(generatedTicket.payment_account)
      text += `📝 ${generatedTicket.payment_account > 0 ? 'A Cuenta Corriente:' : (isPayingDebt ? 'Cobro Deuda Previa:' : 'Saldo a Favor / Vuelto:')} $${Math.abs(generatedTicket.payment_account).toLocaleString('es-AR')}\n`
    }
    if (generatedTicket.cajones_left || generatedTicket.cajones_returned) {
      text += `\n*CAJONES:*\n`
      if (generatedTicket.cajones_left) text += `📦 Dejados: ${generatedTicket.cajones_left}\n`
      if (generatedTicket.cajones_returned) text += `📦 Devueltos: ${generatedTicket.cajones_returned}\n`
    }

    if (debtWspText) {
      text += debtWspText
    }

    text += `\n¡Gracias por elegirnos!`

    window.open(`https://wa.me/${client.phone || ''}?text=${encodeURIComponent(text)}`, '_blank')
  }

  // Vista de Ticket generado
  if (generatedTicket) {
    const totalToCollect = generatedTicket.final_total + (generatedTicket.applied_debt || 0)

    return (
      <div className="flex flex-col h-full bg-bg-surface shadow-sm">
        <div className="bg-green-600/10 text-green-400 border-b border-green-500/20 py-4 px-6 flex items-center justify-center gap-2 z-10 shadow-md">
          <CheckCircle size={22} />
          <h2 className="font-bold text-sm">Venta procesada con éxito</h2>
        </div>

        {/* Boleta Virtual */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-start">
          <div className="bg-amber-50/5 text-brand-deep/80 w-full max-w-[280px] p-5 shadow-2xl rounded-2xl border border-brand-muted/20 text-xs font-mono relative leading-relaxed" id="sale-ticket-print">
            <div className="text-center mb-4 border-b border-brand-muted/20/80 pb-3">
              <h1 className="font-black text-sm text-brand-deep tracking-wide">PANIFICADORA FENIX</h1>
              <p className="text-[10px] text-brand-muted/80 mt-0.5">Comprobante de Venta</p>
              <p className="text-[9px] text-slate-600 mt-1">Ticket: {generatedTicket.id.substring(0, 8).toUpperCase()}</p>
              <p className="text-[9px] text-slate-600">{new Date(generatedTicket.transaction_date).toLocaleString('es-AR')}</p>
            </div>
            
            <div className="mb-3 border-b border-brand-muted/20/80 pb-2">
              <p className="font-bold text-brand-muted">CLIENTE:</p>
              <p className="text-brand-deep font-bold">{generatedTicket.client_name}</p>
            </div>

            {/* Ítems */}
            <div className="space-y-2 mb-3">
              <div className="flex justify-between font-bold text-brand-muted/80 text-[9px] uppercase border-b border-brand-muted/20/40 pb-0.5">
                <span>Cant x Detalle</span>
                <span>Total</span>
              </div>
              
              {generatedTicket.items.filter(i => i.operation_type === 'sale').map((item, idx) => (
                <div key={idx} className="flex justify-between text-brand-deep/80">
                  <span>{item.quantity}x {item.name}</span>
                  <span>${(item.quantity * item.unit_price).toLocaleString('es-AR')}</span>
                </div>
              ))}
              
              {generatedTicket.items.filter(i => i.operation_type === 'return').map((item, idx) => (
                <div key={idx} className="flex justify-between text-red-400">
                  <span>-{item.quantity}x {item.name} (dev)</span>
                  <span>-${(item.quantity * item.unit_price).toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-brand-muted/20/60 mt-3 pt-2 text-[10px] space-y-1">
              <div className="flex justify-between"><span>Venta Bruta Día:</span><span>${generatedTicket.subtotal_sales.toLocaleString('es-AR')}</span></div>
              {generatedTicket.total_returns > 0 && <div className="flex justify-between text-red-400"><span>Devoluciones:</span><span>-${generatedTicket.total_returns.toLocaleString('es-AR')}</span></div>}
              {generatedTicket.applied_debt > 0 && <div className="flex justify-between font-bold text-orange-600"><span>Deuda Previa Incluida:</span><span>+${generatedTicket.applied_debt.toLocaleString('es-AR')}</span></div>}
            </div>

            <div className="border-t-2 border-brand-muted/30/80 mt-2.5 pt-2.5 mb-2">
              <div className="flex justify-between items-center text-sm font-black text-brand-deep">
                <span>{generatedTicket.applied_debt > 0 ? 'TOTAL A COBRAR:' : 'TOTAL VENTA:'}</span>
                <span className="text-brand-navy">${totalToCollect.toLocaleString('es-AR')}</span>
              </div>
              <div className="text-[9px] text-brand-muted/80 mt-2 space-y-0.5">
                {generatedTicket.payment_cash > 0 && <div className="flex justify-between"><span>Abonó Efectivo:</span><span>${generatedTicket.payment_cash.toLocaleString('es-AR')}</span></div>}
                {generatedTicket.payment_transfer > 0 && <div className="flex justify-between"><span>Abonó Transfer.:</span><span>${generatedTicket.payment_transfer.toLocaleString('es-AR')}</span></div>}
                {generatedTicket.payment_account !== 0 && (
                  <div className={`flex justify-between font-bold ${generatedTicket.payment_account > 0 ? 'text-orange-400' : 'text-green-500'}`}>
                    <span>{generatedTicket.payment_account > 0 ? 'A Cta. Cte:' : (generatedTicket.applied_debt >= Math.abs(generatedTicket.payment_account) ? 'Cobro Deuda Previa:' : 'Saldo a Favor / Vuelto:')}</span>
                    <span>${Math.abs(generatedTicket.payment_account).toLocaleString('es-AR')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Desglose de Deuda Previa Incluida */}
            {generatedTicket.applied_debt > 0 && generatedTicket.client_id && (
              <DebtHistoryPrintBlock
                clientId={generatedTicket.client_id}
                currentSaleId={generatedTicket.id}
                appliedDebt={generatedTicket.applied_debt}
                onHistoryLoaded={setDebtWspText}
              />
            )}
            
            <div className="text-center text-[9px] text-slate-600 mt-6 border-t border-brand-muted/20/60 pt-3">
              *** DOCUMENTO NO VÁLIDO COMO FACTURA ***
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="bg-bg-app p-4 border-t border-brand-muted/20/80 space-y-2">
          <button 
            onClick={handleWhatsApp} 
            className="w-full bg-[#25D366] hover:bg-green-600 text-brand-deep font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-colors text-sm"
          >
            <MessageCircle size={20} /> Enviar por WhatsApp
          </button>
          <button 
            onClick={onComplete} 
            className="w-full bg-brand-muted/10 hover:bg-brand-muted/20 text-brand-deep font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-colors text-sm"
          >
            Volver a Hoja de Ruta
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-bg-app">
      {/* Header Cliente */}
      <div className="bg-white pt-5 pb-3 px-5 border-b border-brand-muted/10 z-20 shadow-sm rounded-b-3xl">
        <div className="flex items-center gap-4 mb-5">
          <button onClick={onBack} className="p-2 text-brand-navy hover:bg-brand-navy/5 rounded-xl border border-brand-muted/10 active:scale-90 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-brand-deep truncate">{client.business_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider bg-brand-muted/5 px-2 py-0.5 rounded-md border border-brand-muted/10">Cat. {client.price_category}</span>
            </div>
          </div>
          <div className="text-right bg-brand-navy/5 px-3 py-1.5 rounded-xl border border-brand-navy/10">
            <div className="text-[9px] text-brand-navy/70 uppercase font-bold tracking-wider">Subtotal</div>
            <div className="text-xl font-black text-brand-navy leading-none mt-0.5">${subtotalSales - totalReturns}</div>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex rounded-2xl bg-brand-muted/5 border border-brand-muted/10 p-1.5 shadow-inner">
          <button 
            onClick={() => setTab(1)} 
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === 1 ? 'bg-white text-brand-navy shadow-sm border border-brand-muted/10' : 'text-brand-muted hover:text-brand-deep hover:bg-white/50'}`}
          >
            1. Venta
          </button>
          <button 
            onClick={() => setTab(2)} 
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === 2 ? 'bg-red-50 text-red-500 shadow-sm border border-red-100' : 'text-brand-muted hover:text-brand-deep hover:bg-white/50'}`}
          >
            2. Devolución
          </button>
          <button 
            onClick={() => setTab(3)} 
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${tab === 3 ? 'bg-green-50 text-green-600 shadow-sm border border-green-100' : 'text-brand-muted hover:text-brand-deep hover:bg-white/50'}`}
          >
            3. Cobro
          </button>
        </div>
      </div>

      {/* Listado de Productos por Pestaña */}
      <div className="flex-1 overflow-y-auto p-4 pb-28 pr-2">
        {tab === 1 && (
          <div className="space-y-3">
            <div className="text-brand-muted text-xs font-bold mb-2 flex items-center gap-1.5 bg-brand-navy/5 p-2 rounded-lg border border-brand-navy/30/10">
              <Star size={12} className="text-brand-navy animate-spin" />
              Cantidades auto-completadas por pedido de este cliente
            </div>
            {sortProducts(products).map(p => {
              const qty = cart[p.id] || 0
              
              const todayISO = new Date().getDay() === 0 ? 7 : new Date().getDay();
              const orderForDay = getFixedOrderForDay(client, todayISO);
              const fixedQty = orderForDay[p.id] || 0

              return (
                <div key={p.id} className="bg-white border border-brand-muted/10 rounded-3xl p-4 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-center justify-between w-full">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-brand-deep text-sm truncate">{p.name}</h4>
                      <p className="text-xs text-brand-navy font-black mt-1">
                        ${getPrice(p)} <span className="text-[10px] text-brand-muted font-semibold">x {p.unit_type}</span>
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[9px] text-brand-navy font-bold uppercase tracking-wider bg-brand-navy/10 px-2 py-0.5 rounded-md">Pedido Cliente: {fixedQty}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <button 
                        onClick={() => handleUpdateQty(cart, setCart, p.id, -1, p.unit_type)}
                        className="w-10 h-10 bg-brand-muted/5 border border-brand-muted/10 text-brand-deep rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <Minus size={18} />
                      </button>
                      <input 
                        type="number"
                        value={qty || ''}
                        onChange={(e) => {
                          let val = parseFloat(e.target.value) || 0
                          setCart(prev => {
                            const n = { ...prev }
                            if (val <= 0) delete n[p.id]
                            else n[p.id] = val
                            return n
                          })
                        }}
                        className="w-12 h-10 text-center text-lg font-black text-brand-deep bg-brand-muted/5 border border-brand-muted/10 rounded-xl outline-none focus:border-brand-navy/50 focus:ring-1 focus:ring-brand-navy/50 transition-all"
                        placeholder="0"
                      />
                      <button 
                        onClick={() => handleUpdateQty(cart, setCart, p.id, 1, p.unit_type)}
                        className="w-10 h-10 bg-brand-navy/10 border border-brand-navy/20 text-brand-navy rounded-xl flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 disabled:bg-brand-muted/5 disabled:border-brand-muted/10 disabled:text-brand-muted"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 2 && (
          <div className="space-y-3">
            <div className="text-brand-muted text-xs font-bold mb-2 flex items-center gap-1.5 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
              <AlertCircle size={12} className="text-red-400" />
              Las devoluciones se tomarán como merma y se sumarán a tu furgoneta
            </div>
            {sortProducts(products).map(p => {
              const qty = returns[p.id] || 0
              return (
                <div key={p.id} className="bg-brand-muted/10/20 border border-brand-muted/20 rounded-2xl p-4 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-brand-deep text-sm truncate">{p.name}</h4>
                    <p className="text-xs text-red-400 font-semibold mt-0.5">
                      -${getPrice(p)} <span className="text-[10px] text-brand-muted/80 font-normal">x {p.unit_type}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleUpdateQty(returns, setReturns, p.id, -1, p.unit_type)}
                      className="w-8 h-8 bg-brand-muted/10 border border-brand-muted/30 text-brand-deep/80 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Minus size={14} />
                    </button>
                    <input 
                      type="number"
                      value={qty || ''}
                      onChange={(e) => {
                        let val = parseFloat(e.target.value) || 0
                        setReturns(prev => {
                          const n = { ...prev }
                          if (val <= 0) delete n[p.id]
                          else n[p.id] = val
                          return n
                        })
                      }}
                      className="w-12 h-8 text-center text-sm font-bold text-brand-deep bg-brand-muted/10 border border-brand-muted/30 rounded-lg outline-none"
                      placeholder="0"
                    />
                    <button 
                      onClick={() => handleUpdateQty(returns, setReturns, p.id, 1, p.unit_type)}
                      className="w-8 h-8 bg-brand-muted/10 border border-brand-muted/30 text-brand-deep/80 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 3 && (
          <div className="space-y-4">
            {/* Boleta resumida */}
            <div className="bg-brand-muted/5 border border-brand-muted/20/80 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between text-xs text-brand-muted">
                <span>Subtotal Despacho:</span>
                <span className="font-bold text-brand-deep">${subtotalSales}</span>
              </div>
              {totalReturns > 0 && (
                <div className="flex justify-between text-xs text-red-400">
                  <span>Devolución / Mermas:</span>
                  <span className="font-bold">-${totalReturns}</span>
                </div>
              )}
              {client.current_balance < 0 && (
                <div className="flex justify-between items-center bg-brand-muted/10/30 p-2 rounded-lg mt-2 border border-brand-muted/20">
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="checkbox" 
                      id="incDebt" 
                      checked={includeDebt} 
                      onChange={e => {
                        setIncludeDebt(e.target.checked)
                        setPayCash('')
                        setPayTransfer('')
                      }} 
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-bg-surface shadow-sm border-brand-muted/30"
                    />
                    <label htmlFor="incDebt" className="text-xs text-brand-deep/80 cursor-pointer font-semibold">Incluir Deuda Previa</label>
                  </div>
                  <span className="font-bold text-red-400 text-xs">${Math.abs(client.current_balance)}</span>
                </div>
              )}

              <div className="flex justify-between items-end border-t border-brand-muted/20/80 pt-3 mt-3">
                <span className="text-xs font-bold text-brand-muted uppercase tracking-wider">A cobrar:</span>
                <span className="text-2xl font-black text-brand-deep">${finalTotal > 0 ? finalTotal : 0}</span>
              </div>
            </div>

            {/* Métodos de Pago Mixto */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Ingresar Cobro</h3>
              
              {/* Efectivo */}
              <div className="bg-brand-muted/10/20 border border-brand-muted/10 rounded-2xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center">
                    <Banknote size={20} />
                  </div>
                  <span className="font-bold text-brand-deep text-sm">Efectivo</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setPayCash(finalTotal > 0 ? finalTotal.toString() : '0'); setPayTransfer('') }}
                    className="bg-green-500/10 text-green-400 text-[10px] px-2.5 py-1.5 rounded-lg border border-green-500/20 font-bold uppercase active:scale-95 transition-transform"
                  >
                    Total
                  </button>
                  <input 
                    type="number"
                    value={payCash}
                    onChange={e => setPayCash(e.target.value)}
                    className="w-24 h-9 px-3 bg-brand-muted/10 border border-brand-muted/30 rounded-lg text-right text-sm font-bold text-brand-deep outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Transferencia */}
              <div className="bg-brand-muted/10/20 border border-brand-muted/10 rounded-2xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-navy/10 text-brand-navy rounded-xl flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  <span className="font-bold text-brand-deep text-sm">Transferencia</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setPayTransfer(finalTotal > 0 ? finalTotal.toString() : '0'); setPayCash('') }}
                    className="bg-brand-navy/10 text-brand-navy text-[10px] px-2.5 py-1.5 rounded-lg border border-brand-navy/30/20 font-bold uppercase active:scale-95 transition-transform"
                  >
                    Total
                  </button>
                  <input 
                    type="number"
                    value={payTransfer}
                    onChange={e => setPayTransfer(e.target.value)}
                    className="w-24 h-9 px-3 bg-brand-muted/10 border border-brand-muted/30 rounded-lg text-right text-sm font-bold text-brand-deep outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Cuenta Corriente (Restante) */}
              {remainingToPay !== 0 && (
                <div className={`p-4 rounded-2xl border ${remainingToPay > 0 ? 'bg-brand-orange/5 border-orange-500/20 text-orange-400' : 'bg-green-500/5 border-green-500/20 text-green-400'} flex justify-between items-center`}>
                  <div className="text-xs font-bold">
                    {remainingToPay > 0 ? 'A Cuenta Corriente:' : 'Saldo a Favor / Vuelto:'}
                    {remainingToPay > 0 && !client.allow_credit && (
                      <span className="block text-[9px] text-red-400 mt-1 font-semibold flex items-center gap-1">
                        <AlertCircle size={10} /> Crédito no habilitado
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-black">${Math.abs(remainingToPay)}</span>
                </div>
              )}
            </div>

            {/* Sección Cajones */}
            <div className="space-y-3 pt-3 border-t border-brand-muted/10">
              <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wider mb-2">Cajones</h3>
              <div className="flex gap-4">
                <div className="flex-1 bg-brand-orange/5 border border-brand-orange/20 rounded-2xl p-4 flex flex-col justify-between items-center">
                  <span className="font-bold text-brand-orange text-xs text-center mb-2">Cajones Dejados</span>
                  <input 
                    type="number"
                    value={cajonesLeft}
                    onChange={e => setCajonesLeft(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-brand-muted/30 rounded-lg text-center text-sm font-bold text-brand-deep outline-none"
                    placeholder="0"
                  />
                </div>
                {(client.cajones_prestados || 0) > 0 && (
                  <div className="flex-1 bg-green-500/5 border border-green-500/20 rounded-2xl p-4 flex flex-col justify-between items-center">
                    <span className="font-bold text-green-500 text-xs text-center mb-2">Cajones Devueltos</span>
                    <input 
                      type="number"
                      value={cajonesReturned}
                      onChange={e => setCajonesReturned(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-brand-muted/30 rounded-lg text-center text-sm font-bold text-brand-deep outline-none"
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botón de Acción Inferior */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-bg-app border-t border-brand-muted/20/80 pb-safe z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
        {tab < 3 ? (
          <button 
            onClick={() => setTab((tab + 1) as any)} 
            className="w-full bg-brand-muted/10 hover:bg-brand-muted/20 text-brand-deep font-bold text-sm py-3.5 rounded-xl active:bg-brand-muted/20 transition-colors"
          >
            Siguiente Paso
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => handleProcess(false)} 
              disabled={
                (subtotalSales === 0 && totalReturns === 0) || 
                (remainingToPay > 0 && !client.allow_credit)
              }
              className="w-full bg-brand-navy hover:bg-brand-navy text-white font-bold text-sm py-3.5 rounded-xl flex justify-center items-center gap-2 active:bg-blue-700 transition-colors disabled:opacity-30"
            >
              <Printer size={18} /> Confirmar Transmisión e Imprimir Ticket Final
            </button>
            <button 
              onClick={() => handleProcess(true)} 
              disabled={subtotalSales === 0 && totalReturns === 0}
              className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-bold text-xs py-2.5 rounded-xl border border-amber-300/40 flex justify-center items-center gap-2 transition-colors disabled:opacity-30"
            >
              <History size={16} /> Dejar Ticket Abierto (1ª Visita)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: DRIVER ROADMAP (HOJA DE RUTA)
// ==========================================
interface DriverRoadmapProps {
  driver: Driver
  onBack: () => void
  onSelectClient: (clientId: string) => void
}

const DriverRoadmap: React.FC<DriverRoadmapProps> = ({ driver, onBack, onSelectClient }) => {
  const { weeklyRoutes, clients, products } = useStore()
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({})
  const [activeLoadModal, setActiveLoadModal] = useState<any>(null)
  const [completedLoads, setCompletedLoads] = useState<string[]>([])

  const todayJS = new Date().getDay()
  const todayISO = todayJS === 0 ? 7 : todayJS

  // 1. Obtener paradas del día
  const dayRoutes = useMemo(() => {
    return weeklyRoutes
      .filter(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type !== 'initial_load')
      .sort((a, b) => a.route_order - b.route_order)
  }, [weeklyRoutes, driver.id, todayISO])

  // 2. Obtener primera carga
  const initialLoadStop = useMemo(() => {
    return weeklyRoutes.find(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'initial_load')
  }, [weeklyRoutes, driver.id, todayISO])

  const plannedLoad = useMemo(() => {
    if (initialLoadStop && initialLoadStop.planned_load && Object.keys(initialLoadStop.planned_load).length > 0) {
      return initialLoadStop.planned_load
    }
    return getSuggestedLoadForDriver(weeklyRoutes, clients, driver.id, todayISO, -1)
  }, [initialLoadStop, weeklyRoutes, driver.id, todayISO, clients])

  const hasLoad = Object.keys(plannedLoad).length > 0

  const handleConfirmIntermediateLoad = (stop: any, actualLoads: Record<string, number>) => {
    const { loads } = useStore.getState()
    
    // Sumar las cantidades al stock actual de la camioneta
    const newLoadsToAdd = products.map(p => {
      const qty = actualLoads[p.id] || 0;
      return {
        id: crypto.randomUUID(),
        driver_id: driver.id,
        product_id: p.id,
        date_loaded: new Date().toISOString(),
        initial_quantity: qty,
        current_quantity: qty
      }
    }).filter(l => l.initial_quantity > 0)

    // Agrupar los loads por product_id sumándolos a los existentes
    const updatedLoads = [...loads]
    newLoadsToAdd.forEach(newLoad => {
      const existingIdx = updatedLoads.findIndex(l => l.product_id === newLoad.product_id)
      if (existingIdx >= 0) {
        updatedLoads[existingIdx] = {
          ...updatedLoads[existingIdx],
          current_quantity: updatedLoads[existingIdx].current_quantity + newLoad.current_quantity,
          initial_quantity: updatedLoads[existingIdx].initial_quantity + newLoad.initial_quantity
        }
      } else {
        updatedLoads.push(newLoad)
      }
    })

    useStore.setState({ loads: updatedLoads })
    setCompletedLoads(prev => [...prev, stop.id])
    setActiveLoadModal(null)
    
    Swal.fire({
      title: 'Carga Registrada',
      text: 'Se ha sumado el stock a tu inventario de la camioneta.',
      icon: 'success',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    })
  }

  return (
    <div className="flex flex-col h-full bg-bg-app">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-brand-muted/10 sticky top-0 z-10 shadow-sm rounded-b-3xl">
        <button onClick={onBack} className="p-2 text-brand-navy hover:bg-brand-navy/5 rounded-xl border border-brand-muted/10 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black text-brand-deep flex-1 tracking-tight">Hoja de Ruta</h2>
      </div>

      {/* Contenido Timeline */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-24 pr-2">
        
        {/* Timeline Line Conector */}
        <div className="relative border-l-2 border-dashed border-brand-muted/20 ml-4 pl-6 space-y-6">
          
          {/* Parada 0: Carga Inicial */}
          <div className="relative">
            {/* Indicador del timeline */}
            <span className="absolute -left-[35px] top-1 bg-brand-orange text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm border border-white">
              <Package size={12} />
            </span>
            <div className="bg-white border border-brand-muted/10 rounded-2xl p-4 shadow-sm">
              <span className="text-[9px] font-black text-brand-orange uppercase tracking-wider block mb-1">Punto de Salida</span>
              <h4 className="font-bold text-brand-deep text-sm mb-2">Primera Carga (Fábrica)</h4>
              
              {hasLoad ? (
                <div className="grid grid-cols-1 gap-2 mt-2 bg-brand-muted/5 p-3 rounded-xl border border-brand-muted/10">
                  {sortProducts(products).map(p => {
                    const qtyInfo = getPlannedLoadQty(plannedLoad, p.id)
                    if (qtyInfo.total === 0) return null
                    return (
                      <div key={p.id} className="flex justify-between items-center text-xs border-b border-brand-muted/5 pb-1.5 last:border-b-0 last:pb-0">
                        <div className="flex flex-col">
                          <span className="text-brand-deep font-semibold">{p.name}</span>
                          <span className="text-[9px] text-brand-muted font-bold">Pedidos: {qtyInfo.fixed} {p.unit_type} | Mostrador: {qtyInfo.extra} {p.unit_type}</span>
                        </div>
                        <span className="font-black text-brand-navy bg-brand-navy/10 px-2.5 py-0.5 rounded text-[11px]">{qtyInfo.total} {p.unit_type === 'unidad' ? 'u' : p.unit_type === 'docena' ? 'doc' : p.unit_type === 'bolsa' ? 'bols' : p.unit_type}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-brand-muted/80 italic mt-1">Sin mercadería planificada para esta carga.</p>
              )}
            </div>
          </div>

          {/* Demás paradas */}
          {dayRoutes.map((stop, index) => {
            const isLoad = stop.stop_type === 'load'
            const client = isLoad ? null : clients.find(c => c.id === stop.client_id)
            const stopLoad = stop.planned_load && Object.keys(stop.planned_load).length > 0
              ? stop.planned_load
              : getSuggestedLoadForDriver(weeklyRoutes, clients, driver.id, todayISO, stop.route_order)
            const stopHasLoad = Object.keys(stopLoad).length > 0

            return (
              <div key={stop.id} className="relative">
                {/* Indicador del timeline */}
                <span className={`absolute -left-[35px] top-1 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm border border-white text-xs font-black ${isLoad ? 'bg-brand-orange' : 'bg-brand-navy'}`}>
                  {isLoad ? <Package size={12} /> : index + 1}
                </span>

                <div 
                  onClick={() => {
                    if (!isLoad && client) {
                      onSelectClient(client.id)
                    }
                  }}
                  className={`bg-white border rounded-2xl p-4 shadow-sm transition-all ${!isLoad ? 'hover:border-brand-navy/30 cursor-pointer hover:shadow-md active:scale-[0.99]' : 'border-brand-muted/10'}`}
                >
                  {isLoad ? (() => {
                    const isCompleted = completedLoads.includes(stop.id)
                    return (
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black text-brand-orange uppercase tracking-wider block mb-1">Carga en Ruta</span>
                            <h4 className="font-bold text-brand-deep text-sm mb-2 flex items-center gap-2">
                              Carga Intermedia (Fábrica)
                              {isCompleted && <CheckCircle size={14} className="text-green-500" />}
                            </h4>
                          </div>
                          {!isCompleted && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveLoadModal({ stop, plannedLoad: stopLoad });
                              }}
                              className="bg-brand-navy hover:bg-brand-navy/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors active:scale-95"
                            >
                              Registrar Carga
                            </button>
                          )}
                        </div>
                        
                        {stopHasLoad ? (
                          <div className={`grid grid-cols-1 gap-2 mt-2 p-3 rounded-xl border transition-all ${isCompleted ? 'bg-green-50/50 border-green-500/20' : 'bg-brand-muted/5 border-brand-muted/10'}`}>
                            {sortProducts(products).map(p => {
                              const qtyInfo = getPlannedLoadQty(stopLoad, p.id)
                              if (qtyInfo.total === 0) return null
                              return (
                                <div key={p.id} className="flex justify-between items-center text-xs border-b border-brand-muted/5 pb-1.5 last:border-b-0 last:pb-0">
                                  <div className="flex flex-col">
                                    <span className="text-brand-deep font-semibold">{p.name}</span>
                                    <span className="text-[9px] text-brand-muted font-bold">Pedidos: {qtyInfo.fixed} {p.unit_type} | Mostrador: {qtyInfo.extra} {p.unit_type}</span>
                                  </div>
                                  <span className={`font-black px-2.5 py-0.5 rounded text-[11px] ${isCompleted ? 'bg-green-500/10 text-green-600' : 'bg-brand-orange/10 text-brand-orange'}`}>
                                    {qtyInfo.total} {p.unit_type === 'unidad' ? 'u' : p.unit_type === 'docena' ? 'doc' : p.unit_type === 'bolsa' ? 'bols' : p.unit_type}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-brand-muted/80 italic mt-1">Sin mercadería planificada.</p>
                        )}
                        {isCompleted && (
                          <p className="text-[10px] text-green-600 font-bold mt-2 text-right w-full flex items-center justify-end gap-1">
                            Carga sumada al inventario
                          </p>
                        )}
                      </div>
                    )
                  })() : (
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <h4 className="font-bold text-brand-deep text-sm truncate">{client?.business_name || 'Cliente Desconocido'}</h4>
                            {client?.allow_credit && (
                              <span className="bg-brand-navy text-white text-[9px] px-2 py-0.5 rounded-lg font-bold whitespace-nowrap shadow-sm">
                                Cta. Cte.
                              </span>
                            )}
                            {client && sales.some(s => s.client_id === client.id && s.status === 'completed' && new Date(s.transaction_date).toLocaleDateString('sv') === todayStr) && (
                              <span className="bg-emerald-600 text-white text-[9px] px-2 py-0.5 rounded-lg font-bold whitespace-nowrap shadow-sm flex items-center gap-1">
                                ✓ Visitado
                              </span>
                            )}
                            {client && sales.some(s => s.client_id === client.id && s.status === 'draft' && new Date(s.transaction_date).toLocaleDateString('sv') === todayStr) && (
                              <span className="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-lg font-bold whitespace-nowrap shadow-sm animate-pulse">
                                🟡 Ticket Abierto
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-brand-muted truncate flex items-center gap-1.5 mt-1 font-medium">
                            <MapPin size={12} className="text-brand-orange flex-shrink-0" /> {client?.address || 'Sin dirección'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {client && Object.keys(getFixedOrderForDay(client, todayISO)).some(k => (getFixedOrderForDay(client, todayISO)[k] || 0) > 0) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedClients(prev => ({ ...prev, [client.id]: !prev[client.id] }))
                              }}
                              className="p-1.5 hover:bg-brand-navy/5 rounded-lg text-brand-navy transition-colors border border-brand-muted/10 flex items-center justify-center"
                              title="Ver mercadería a descargar"
                            >
                              {expandedClients[client.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          )}
                          <ChevronRight size={18} className="text-brand-muted/40" />
                        </div>
                      </div>

                      {client && expandedClients[client.id] && Object.keys(getFixedOrderForDay(client, todayISO)).length > 0 && (
                        <div className="grid grid-cols-1 gap-1.5 mt-3 bg-brand-muted/5 p-3 rounded-xl border border-brand-muted/10" onClick={e => e.stopPropagation()}>
                          <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider block mb-1">Pedido Fijo a Descargar:</span>
                          {sortProducts(products).map(p => {
                            const orderForDay = getFixedOrderForDay(client, todayISO);
                            const qty = orderForDay[p.id] || 0
                            if (qty === 0) return null
                            return (
                              <div key={p.id} className="flex justify-between items-center text-xs">
                                <span className="text-brand-deep font-semibold">{p.name}</span>
                                <span className="font-black text-brand-navy bg-brand-navy/10 px-2 py-0.5 rounded text-[11px]">{qty} {p.unit_type === 'unidad' ? 'u' : p.unit_type === 'docena' ? 'doc' : p.unit_type === 'bolsa' ? 'bolsas' : p.unit_type}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {dayRoutes.length === 0 && (
          <div className="text-center text-brand-muted/80 py-10">
            <MapPin size={40} className="mx-auto mb-4 text-slate-700" />
            <p className="font-bold text-brand-muted">Ruta sin paradas</p>
            <p className="text-xs text-brand-muted/80 mt-1">No hay clientes ni recargas asignadas para hoy.</p>
          </div>
        )}
      </div>

      {/* Modal Editable de Carga Intermedia */}
      {activeLoadModal && (
        <EditableLoadModal 
          plannedLoad={activeLoadModal.plannedLoad}
          onClose={() => setActiveLoadModal(null)}
          onConfirm={(actualLoads) => handleConfirmIntermediateLoad(activeLoadModal.stop, actualLoads)}
          title="Carga Intermedia"
        />
      )}
    </div>
  )
}

// ==========================================
// COMPONENTE: DRIVER CASH SUMMARY (RESUMEN DE CAJA)
// ==========================================
interface DriverCashSummaryProps {
  driver: Driver
  onBack: () => void
}

const DriverCashSummary: React.FC<DriverCashSummaryProps> = ({ driver, onBack }) => {
  const { sales, expenses, clients } = useStore()
  const [selectedTicket, setSelectedTicket] = useState<Sale | null>(null)

  // Obtener la fecha local en formato 'YYYY-MM-DD'
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('sv') // 'YYYY-MM-DD'
  }, [])

  // Filtrar las ventas de hoy de este repartidor
  const todaySales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = new Date(s.transaction_date).toLocaleDateString('sv')
      return s.driver_id === driver.id && saleDate === todayStr
    })
  }, [sales, driver.id, todayStr])

  // Filtrar los gastos de hoy de este repartidor
  const todayExpenses = useMemo(() => {
    return expenses.filter(e => {
      const expDate = new Date(e.expense_date).toLocaleDateString('sv')
      return e.origin === driver.full_name && expDate === todayStr
    })
  }, [expenses, driver.full_name, todayStr])

  // Totales financieros de ventas
  const totalCashSales = useMemo(() => todaySales.reduce((acc, s) => acc + s.payment_cash, 0), [todaySales])
  const totalTransferSales = useMemo(() => todaySales.reduce((acc, s) => acc + s.payment_transfer, 0), [todaySales])
  const totalAccountSales = useMemo(() => todaySales.reduce((acc, s) => acc + s.payment_account, 0), [todaySales])
  const totalSalesAmount = useMemo(() => todaySales.reduce((acc, s) => acc + s.final_total, 0), [todaySales])

  // Totales de gastos
  const totalCashExpenses = useMemo(() => 
    todayExpenses.filter(e => e.payment_method === 'efectivo').reduce((acc, e) => acc + e.amount, 0), 
    [todayExpenses]
  )
  const totalTransferExpenses = useMemo(() => 
    todayExpenses.filter(e => e.payment_method === 'transferencia').reduce((acc, e) => acc + e.amount, 0), 
    [todayExpenses]
  )
  const totalExpensesAmount = useMemo(() => todayExpenses.reduce((acc, e) => acc + e.amount, 0), [todayExpenses])

  // Caja neta en mano
  const netCashInHand = totalCashSales - totalCashExpenses
  const netTransferInHand = totalTransferSales - totalTransferExpenses

  // WhatsApp helper
  const handleWhatsApp = (ticket: Sale) => {
    const clientObj = clients.find(c => c.id === ticket.client_id)
    let text = `🍞 *PANIFICADORA FENIX*\n🎫 Ticket #${ticket.id.substring(0, 8).toUpperCase()}\n👤 Cliente: ${ticket.client_name || clientObj?.business_name || 'Cliente'}\n📅 Fecha: ${new Date(ticket.transaction_date).toLocaleString('es-AR')}\n--------------------------------\n`
    
    const salesItems = ticket.items.filter(i => i.operation_type === 'sale')
    if (salesItems.length > 0) {
      text += `*DESPACHO:*\n`
      salesItems.forEach(item => text += `• ${item.quantity}x ${item.name} - $${item.quantity * item.unit_price}\n`)
    }
    
    const returnsItems = ticket.items.filter(i => i.operation_type === 'return')
    if (returnsItems.length > 0) {
      text += `\n*DEVOLUCIONES (MERMAS):*\n`
      returnsItems.forEach(item => text += `• -${item.quantity}x ${item.name} - -$${item.quantity * item.unit_price}\n`)
    }
    
    text += `--------------------------------\n*TOTAL BOLETA: $${ticket.final_total}*\n`
    if (ticket.payment_cash > 0) text += `💵 Efectivo: $${ticket.payment_cash}\n`
    if (ticket.payment_transfer > 0) text += `💳 Transferencia: $${ticket.payment_transfer}\n`
    if (ticket.payment_account !== 0) text += `📝 A Cuenta Corriente: $${ticket.payment_account}\n`
    text += `\n¡Gracias por elegirnos!`

    const phone = clientObj?.phone || ''
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="flex flex-col h-full bg-bg-app">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center gap-3 border-b border-brand-muted/10 sticky top-0 z-10 shadow-sm rounded-b-3xl">
        <button onClick={onBack} className="p-2 text-brand-navy hover:bg-brand-navy/5 rounded-xl border border-brand-muted/10 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-black text-brand-deep tracking-tight">Resumen de Caja</h2>
          <p className="text-[10px] text-brand-muted font-bold uppercase tracking-wider mt-0.5">Control diario de valores</p>
        </div>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 pr-2">
        
        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Ventas */}
          <div className="bg-white p-4 rounded-2xl border border-brand-muted/10 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider block mb-1">Total Ventas</span>
              <p className="text-lg font-black text-brand-navy">${totalSalesAmount.toLocaleString()}</p>
            </div>
            <span className="text-[9px] text-brand-muted mt-2 block font-semibold">{todaySales.length} ticket(s) hoy</span>
          </div>

          {/* Gastos en Calle */}
          <div className="bg-white p-4 rounded-2xl border border-brand-muted/10 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider block mb-1">Gastos en Calle</span>
              <p className="text-lg font-black text-red-500">${totalExpensesAmount.toLocaleString()}</p>
            </div>
            <span className="text-[9px] text-brand-muted mt-2 block font-semibold">{todayExpenses.length} registro(s) hoy</span>
          </div>
        </div>

        {/* Detalle de Caja en Mano */}
        <div className="bg-white rounded-3xl p-5 border border-brand-muted/10 shadow-md space-y-4">
          <h3 className="text-xs font-black text-brand-deep uppercase tracking-wider pb-2 border-b border-brand-muted/10">Valores en Mano</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-50 text-green-500 border border-green-100 rounded-xl flex items-center justify-center">
                <Banknote size={18} />
              </div>
              <div>
                <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">Efectivo Conciliado</span>
                <p className="text-[10px] text-brand-muted font-medium mt-0.5">Ventas: ${totalCashSales.toLocaleString()} | Gastos: -${totalCashExpenses.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-base font-black text-brand-deep">${netCashInHand.toLocaleString()}</p>
          </div>

          <div className="w-full bg-brand-muted/5 h-px"></div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-navy/5 text-brand-navy border border-brand-navy/10 rounded-xl flex items-center justify-center">
                <CreditCard size={18} />
              </div>
              <div>
                <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">Transferencias Conciliadas</span>
                <p className="text-[10px] text-brand-muted font-medium mt-0.5">Ventas: ${totalTransferSales.toLocaleString()} | Gastos: -${totalTransferExpenses.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-base font-black text-brand-deep">${netTransferInHand.toLocaleString()}</p>
          </div>

          <div className="w-full bg-brand-muted/5 h-px"></div>

          <div className="flex items-center justify-between bg-brand-navy/5 -mx-5 -mb-5 p-4 rounded-b-3xl border-t border-brand-navy/10">
            <span className="text-xs font-black text-brand-navy uppercase tracking-wider">Total en Mano</span>
            <p className="text-lg font-black text-brand-navy">${(netCashInHand + netTransferInHand).toLocaleString()}</p>
          </div>
        </div>

        {/* Saldo en Cuenta Corriente */}
        <div className="bg-white rounded-2xl p-4 border border-brand-muted/10 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-50 text-orange-500 border border-orange-100 rounded-xl flex items-center justify-center">
              <ClipboardCheck size={16} />
            </div>
            <div>
              <span className="text-[9px] text-brand-muted font-bold uppercase tracking-wider">Cargado a Cuenta Corriente</span>
              <p className="text-[10px] text-brand-muted font-medium mt-0.5">Ventas a crédito hoy</p>
            </div>
          </div>
          <p className={`text-sm font-black ${totalAccountSales > 0 ? 'text-orange-500' : totalAccountSales < 0 ? 'text-green-500' : 'text-brand-muted'}`}>
            {totalAccountSales > 0 ? `+` : ''}${totalAccountSales.toLocaleString()}
          </p>
        </div>

        {/* Listado de Tickets */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-brand-deep uppercase tracking-wider">Tickets del Día</h3>
            <span className="text-[10px] font-bold bg-brand-navy/5 text-brand-navy px-2 py-0.5 rounded-lg border border-brand-navy/10">{todaySales.length} Ventas</span>
          </div>

          {todaySales.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-brand-muted/10 shadow-sm">
              <ClipboardList className="mx-auto mb-3 text-brand-muted/40" size={36} />
              <p className="font-bold text-xs text-brand-muted">Sin tickets generados</p>
              <p className="text-[10px] text-brand-muted/80 mt-1">Registra cobros para visualizarlos aquí.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySales.map((ticket) => {
                const totalPaid = ticket.payment_cash + ticket.payment_transfer
                const clientObj = clients.find(c => c.id === ticket.client_id)
                const clientName = ticket.client_name || clientObj?.business_name || 'Cliente'
                return (
                  <div 
                    key={ticket.id}
                    onClick={async () => {
                      const fullTicket = { ...ticket, client_name: clientName }
                      if (!ticket.items) {
                        setSelectedTicket({ ...fullTicket, items: [] })
                        const { data } = await supabase.from('sale_items').select('*, products(name)').eq('sale_id', ticket.id)
                        if (data) {
                          const mappedItems = data.map((i: any) => ({
                             product_id: i.product_id,
                             quantity: i.quantity,
                             unit_price: i.unit_price,
                             operation_type: i.operation_type,
                             name: i.products?.name || 'Producto'
                          }))
                          setSelectedTicket({ ...fullTicket, items: mappedItems })
                        }
                      } else {
                        setSelectedTicket(fullTicket)
                      }
                    }}
                    className="bg-white hover:bg-brand-navy/5 border border-brand-muted/10 rounded-2xl p-3.5 shadow-sm flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-mono bg-brand-muted/10 text-brand-muted px-1.5 py-0.5 rounded border border-brand-muted/20 uppercase">#{ticket.id.substring(0, 5)}</span>
                        <span className="text-[9px] text-brand-muted font-semibold">{new Date(ticket.transaction_date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</span>
                      </div>
                      <h4 className="font-bold text-xs text-brand-deep truncate">{clientName}</h4>
                      <div className="flex gap-2.5 mt-1">
                        {ticket.payment_cash > 0 && (
                          <span className="text-[8px] font-bold text-green-500 uppercase tracking-wider flex items-center gap-0.5">💵 Efe</span>
                        )}
                        {ticket.payment_transfer > 0 && (
                          <span className="text-[8px] font-bold text-brand-navy uppercase tracking-wider flex items-center gap-0.5">💳 Tra</span>
                        )}
                        {ticket.payment_account !== 0 && (
                          <span className={`text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5 ${ticket.payment_account > 0 ? 'text-orange-400' : 'text-green-400'}`}>📝 Cta</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        <p className="text-xs font-black text-brand-deep">${ticket.final_total.toLocaleString()}</p>
                        <p className="text-[9px] text-brand-muted/80 font-medium">Cobrado: ${totalPaid.toLocaleString()}</p>
                      </div>
                      <ChevronRight size={16} className="text-brand-muted/40" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* Modal Detalle de Ticket (Boleta Virtual) */}
      {selectedTicket && (
        <div className="absolute inset-0 bg-bg-app/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-in fade-in">
          <div className="bg-bg-surface shadow-sm border-t sm:border border-brand-muted/20 rounded-t-3xl sm:rounded-3xl w-full max-w-sm shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[750px]">
            {/* Header del Modal */}
            <div className="p-4 border-b border-brand-muted/20 bg-brand-navy/5 rounded-t-3xl flex justify-between items-center">
              <div>
                <h3 className="font-bold text-brand-navy text-sm flex items-center gap-2">
                  <ClipboardList size={16}/> Comprobante de Venta
                </h3>
              </div>
              <button 
                onClick={() => setSelectedTicket(null)} 
                className="text-brand-muted/80 hover:bg-brand-muted/10 p-1.5 rounded-full"
              >
                <X size={18}/>
              </button>
            </div>
            
            {/* Ticket Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-start">
              <div className="bg-amber-50/5 text-brand-deep/80 w-full max-w-[280px] p-5 shadow-inner rounded-2xl border border-brand-muted/20 text-xs font-mono relative leading-relaxed">
                <div className="text-center mb-4 border-b border-brand-muted/20 pb-3">
                  <h1 className="font-black text-sm text-brand-deep tracking-wide">PANIFICADORA FENIX</h1>
                  <p className="text-[10px] text-brand-muted/80 mt-0.5">Comprobante de Venta</p>
                  <p className="text-[9px] text-slate-600 mt-1">Ticket: {selectedTicket.id.substring(0, 8).toUpperCase()}</p>
                  <p className="text-[9px] text-slate-600">{new Date(selectedTicket.transaction_date).toLocaleString('es-AR')}</p>
                </div>
                
                <div className="mb-3 border-b border-brand-muted/20 pb-2">
                  <p className="font-bold text-brand-muted text-[10px]">CLIENTE:</p>
                  <p className="text-brand-deep font-bold">{selectedTicket.client_name || clients.find(c => c.id === selectedTicket.client_id)?.business_name || 'Cliente'}</p>
                </div>

                {/* Ítems */}
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between font-bold text-brand-muted/80 text-[9px] uppercase border-b border-brand-muted/20 pb-0.5">
                    <span>Cant x Detalle</span>
                    <span>Total</span>
                  </div>
                  
                  {selectedTicket.items.filter(i => i.operation_type === 'sale').map((item, idx) => (
                    <div key={idx} className="flex justify-between text-brand-deep/80">
                      <span>{item.quantity}x {item.name}</span>
                      <span>${item.quantity * item.unit_price}</span>
                    </div>
                  ))}
                  
                  {selectedTicket.items.filter(i => i.operation_type === 'return').map((item, idx) => (
                    <div key={idx} className="flex justify-between text-red-400">
                      <span>-{item.quantity}x {item.name} (dev)</span>
                      <span>-${item.quantity * item.unit_price}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-brand-muted/20 mt-3 pt-2 text-[10px] space-y-1">
                  <div className="flex justify-between"><span>Venta Bruta Día:</span><span>${(selectedTicket.subtotal_sales || 0).toLocaleString('es-AR')}</span></div>
                  {selectedTicket.total_returns > 0 && <div className="flex justify-between text-red-400"><span>Devoluciones:</span><span>-${selectedTicket.total_returns.toLocaleString('es-AR')}</span></div>}
                  {selectedTicket.applied_debt > 0 && <div className="flex justify-between font-bold text-orange-600"><span>Deuda Previa Incluida:</span><span>+${selectedTicket.applied_debt.toLocaleString('es-AR')}</span></div>}
                </div>

                <div className="border-t-2 border-brand-muted/30 mt-2.5 pt-2.5 mb-2">
                  <div className="flex justify-between items-center text-sm font-black text-brand-deep">
                    <span>{selectedTicket.applied_debt > 0 ? 'TOTAL A COBRAR:' : 'TOTAL VENTA:'}</span>
                    <span className="text-brand-navy">${(selectedTicket.applied_debt > 0 ? (selectedTicket.final_total + selectedTicket.applied_debt) : selectedTicket.final_total).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="text-[9px] text-brand-muted/80 mt-2 space-y-0.5">
                    {selectedTicket.payment_cash > 0 && <div className="flex justify-between"><span>Abonó Efectivo:</span><span>${selectedTicket.payment_cash.toLocaleString('es-AR')}</span></div>}
                    {selectedTicket.payment_transfer > 0 && <div className="flex justify-between"><span>Abonó Transfer.:</span><span>${selectedTicket.payment_transfer.toLocaleString('es-AR')}</span></div>}
                    {selectedTicket.payment_account !== 0 && (
                      <div className={`flex justify-between font-bold ${selectedTicket.payment_account > 0 ? 'text-orange-400' : 'text-green-500'}`}>
                        <span>{selectedTicket.payment_account > 0 ? 'A Cta. Cte:' : (selectedTicket.applied_debt >= Math.abs(selectedTicket.payment_account) ? 'Cobro Deuda Previa:' : 'Saldo a Favor / Vuelto:')}</span>
                        <span>${Math.abs(selectedTicket.payment_account).toLocaleString('es-AR')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-center text-[9px] text-slate-600 mt-6 border-t border-brand-muted/20 pt-3">
                  *** DOCUMENTO NO VÁLIDO COMO FACTURA ***
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="bg-bg-app p-4 border-t border-brand-muted/20 flex flex-col gap-2 rounded-b-3xl">
              <button 
                onClick={() => handleWhatsApp(selectedTicket)} 
                className="w-full bg-[#25D366] hover:bg-green-600 text-brand-deep font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-colors text-sm"
              >
                <MessageCircle size={18} /> Reenviar por WhatsApp
              </button>
              <button 
                onClick={() => setSelectedTicket(null)} 
                className="w-full bg-brand-muted/10 hover:bg-brand-muted/20 text-brand-deep font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 transition-colors text-sm"
              >
                Cerrar Comprobante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
