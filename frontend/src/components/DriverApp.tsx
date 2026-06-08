import React, { useState, useMemo, useEffect } from 'react'
import { 
  Wifi, WifiOff, Truck, MapPin, Package, ClipboardCheck, 
  X, CheckCircle, AlertCircle, Banknote, CreditCard, ShoppingCart, 
  TrendingDown, ClipboardList, LogOut, ArrowLeft, Search, ChevronRight,
  Plus, Minus, Printer, MessageCircle, Star, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Sale, Expense, SaleItem, Driver, Product } from '../store/useStore'
import Swal from 'sweetalert2'

interface DriverAppProps {
  onLogout: () => void
}

export const DriverApp: React.FC<DriverAppProps> = ({ onLogout }) => {
  const { 
    drivers, currentDriverId, setCurrentDriver, fetchInitialData, 
    fetchDriverData, isOffline, setOffline, syncQueue, isSyncing,
    loads, weeklyRoutes, products
  } = useStore()
  
  const [driverView, setDriverView] = useState<'HOME' | 'CLIENTS' | 'ROADMAP' | 'TERMINAL'>('HOME')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)

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

  // Carga inicial de datos de Supabase
  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  // Cargar datos específicos del chofer activo al seleccionarlo
  useEffect(() => {
    if (currentDriverId) {
      fetchDriverData(currentDriverId)
    }
  }, [currentDriverId, fetchDriverData])

  const driver = drivers.find(d => d.id === currentDriverId)

  // Autorecuperación de loads si el chofer está en ruta pero el inventario local está vacío
  useEffect(() => {
    if (driver && driver.status === 'En Ruta' && loads.length === 0 && weeklyRoutes.length > 0 && products.length > 0) {
      const todayJS = new Date().getDay()
      const todayISO = todayJS === 0 ? 7 : todayJS
      const initialLoadStop = weeklyRoutes.find(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'initial_load')
      
      let plannedLoad: Record<string, number> = initialLoadStop?.planned_load || {}
      
      if (Object.keys(plannedLoad).length === 0) {
        const routeClientStops = weeklyRoutes.filter(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'client')
        const { clients: allClients } = useStore.getState()
        routeClientStops.forEach(stop => {
          const clientObj = allClients.find(c => c.id === stop.client_id)
          if (clientObj && clientObj.fixed_order) {
            Object.entries(clientObj.fixed_order).forEach(([prodId, qty]) => {
              plannedLoad[prodId] = (plannedLoad[prodId] || 0) + (qty as number)
            })
          }
        })
      }

      const initialLoads = products.map(p => ({
        id: crypto.randomUUID(),
        driver_id: driver.id,
        product_id: p.id,
        date_loaded: new Date().toISOString(),
        initial_quantity: plannedLoad[p.id] || 0,
        current_quantity: plannedLoad[p.id] || 0
      }))
      useStore.setState({ loads: initialLoads })
    }
  }, [driver, loads.length, weeklyRoutes, products])

  // Pantalla de selección de repartidor si no hay ninguno seleccionado
  if (!currentDriverId) {
    return (
      <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
        <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-white shadow-sm border border-brand-muted/10 text-brand-navy rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Truck size={32} />
          </div>
          <h2 className="text-2xl font-black text-brand-deep mb-2 tracking-tight">Acceso Repartidor</h2>
          <p className="text-brand-muted/80 mb-6 text-sm">Selecciona tu nombre para cargar tu hoja de ruta</p>
          
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {drivers.length === 0 ? (
              <div className="text-brand-muted/80 py-6 flex flex-col items-center gap-2">
                <RefreshCw className="animate-spin text-brand-navy" size={24} />
                <span>Cargando repartidores de Supabase...</span>
              </div>
            ) : (
              drivers.map(d => (
                <button
                  key={d.id}
                  onClick={() => setCurrentDriver(d.id)}
                  className="w-full bg-white hover:bg-brand-navy/5 text-brand-deep font-bold p-4 rounded-2xl shadow-sm border border-brand-muted/10 transition-all flex justify-between items-center group mb-2 active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-navy/5 text-brand-navy flex items-center justify-center border border-brand-navy/10">
                      <Truck size={18} />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm">{d.full_name}</span>
                      <span className="text-[10px] font-semibold text-brand-muted/80 flex items-center gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${d.status === 'En Ruta' ? 'bg-brand-orange animate-pulse' : d.status === 'Finalizado' ? 'bg-green-500' : 'bg-brand-muted/40'}`}></span>
                        {d.status}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-brand-muted/40 group-hover:text-brand-navy transition-colors" />
                </button>
              ))
            )}
          </div>
          
          <button
            onClick={onLogout}
            className="w-full mt-6 bg-bg-app text-brand-muted border border-brand-muted/20 font-bold py-3 rounded-xl hover:bg-bg-surface shadow-sm active:scale-[0.98] transition-all text-sm"
          >
            Volver al Selector General
          </button>
        </div>
      </div>
    )
  }

  if (!driver) return null

  // Enrutamiento de sub-vistas del repartidor
  const renderDriverView = () => {
    switch (driverView) {
      case 'HOME':
        return (
          <DriverHome 
            driver={driver} 
            onNewSale={() => setDriverView('CLIENTS')} 
            onViewRoadmap={() => setDriverView('ROADMAP')}
            onSelectDifferentDriver={() => setCurrentDriver(null)} 
          />
        )
      case 'CLIENTS':
        return (
          <DriverClients 
            onBack={() => setDriverView('HOME')} 
            onSelectClient={(id) => { setSelectedClientId(id); setDriverView('TERMINAL'); }} 
          />
        )
      case 'ROADMAP':
        return (
          <DriverRoadmap 
            driver={driver}
            onBack={() => setDriverView('HOME')} 
            onSelectClient={(id) => { setSelectedClientId(id); setDriverView('TERMINAL'); }} 
          />
        )
      case 'TERMINAL':
        return (
          <DriverTerminal 
            driver={driver}
            clientId={selectedClientId!}
            onBack={() => setDriverView('CLIENTS')}
            onComplete={() => setDriverView('HOME')}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-bg-app flex justify-center items-center font-sans">
      {/* Marco de Simulador Móvil Premium */}
      <div className="w-full max-w-md h-[100dvh] bg-bg-surface shadow-sm flex flex-col shadow-2xl overflow-hidden relative sm:h-[850px] sm:rounded-[2.5rem] sm:border-8 border-slate-950">
        {/* Barra de Estado del Simulador */}
        <div className="bg-brand-navy text-white text-[10px] pt-8 pb-2 sm:pt-1.5 sm:pb-1.5 px-6 flex justify-between items-center z-30 font-semibold tracking-wide sm:rounded-t-[2.1rem]">
          <span>{new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center gap-2.5">
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
        <div className="flex-1 overflow-hidden flex flex-col relative bg-bg-surface shadow-sm">
          {renderDriverView()}
        </div>

        {/* Barra de Navegación Inferior (Móvil) */}
        {driverView === 'HOME' && (
          <div className="bg-white border-t border-brand-muted/10 flex justify-around p-2 pb-safe relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] sm:rounded-b-[2.1rem]">
            <button className="flex flex-col items-center justify-center p-2 rounded-2xl w-20 text-brand-navy font-black active:scale-95 transition-all bg-brand-navy/5">
              <Truck size={22} className="mb-1" />
              <span className="text-[10px]">Inicio</span>
            </button>
            <button 
              onClick={() => setDriverView('CLIENTS')} 
              className="flex flex-col items-center justify-center p-2 rounded-2xl w-20 text-brand-muted hover:text-brand-navy hover:bg-brand-navy/5 font-semibold active:scale-95 transition-all"
            >
              <MapPin size={22} className="mb-1 opacity-70" />
              <span className="text-[10px]">Ruta</span>
            </button>
            <button 
              onClick={() => {
                if (syncQueue.length > 0) {
                  Swal.fire('Advertencia', `Tienes ${syncQueue.length} ventas sin sincronizar. Asegúrate de tener conexión antes de salir.`, 'warning')
                }
                setCurrentDriver(null)
              }} 
              className="flex flex-col items-center justify-center p-2 rounded-2xl w-20 text-brand-muted hover:text-red-500 hover:bg-red-50 font-semibold active:scale-95 transition-all"
            >
              <LogOut size={22} className="mb-1 opacity-70" />
              <span className="text-[10px]">Salir</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// COMPONENTE: DRIVER HOME
// ==========================================
interface DriverHomeProps {
  driver: Driver
  onNewSale: () => void
  onViewRoadmap: () => void
  onSelectDifferentDriver: () => void
}

const DriverHome: React.FC<DriverHomeProps> = ({ driver, onNewSale, onViewRoadmap, onSelectDifferentDriver }) => {
  const { products, weeklyRoutes, startDriverRoute, endDriverRoute, isOffline, syncQueue, processSyncQueue, driverExpenseCategories } = useStore()
  const [showLoadChecklist, setShowLoadChecklist] = useState(false)
  const [hasConfirmedLoad, setHasConfirmedLoad] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)

  const todayJS = new Date().getDay()
  const todayISO = todayJS === 0 ? 7 : todayJS

  const initialLoadStop = useMemo(() => {
    return weeklyRoutes.find(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'initial_load')
  }, [weeklyRoutes, driver.id, todayISO])

  const plannedLoad = useMemo(() => {
    if (initialLoadStop && initialLoadStop.planned_load && Object.keys(initialLoadStop.planned_load).length > 0) {
      return initialLoadStop.planned_load
    }

    // Si no hay carga inicial guardada en la base de datos, sumamos sugeridos de pedidos fijos de los clientes en la ruta de hoy
    const suggested: Record<string, number> = {}
    const routeClientStops = weeklyRoutes.filter(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'client')
    const { clients: allClients } = useStore.getState()
    
    routeClientStops.forEach(stop => {
      const clientObj = allClients.find(c => c.id === stop.client_id)
      if (clientObj && clientObj.fixed_order) {
        Object.entries(clientObj.fixed_order).forEach(([prodId, qty]) => {
          suggested[prodId] = (suggested[prodId] || 0) + (qty as number)
        })
      }
    })
    return suggested
  }, [initialLoadStop, weeklyRoutes, driver.id, todayISO])

  const hasLoad = Object.keys(plannedLoad).length > 0

  // States de gasto
  const [expAmount, setExpAmount] = useState('')
  const [expCategory, setExpCategory] = useState('')
  const [expDesc, setExpDesc] = useState('')
  const [expMethod, setExpMethod] = useState<'efectivo' | 'transferencia'>('efectivo')

  useEffect(() => {
    if (driverExpenseCategories && driverExpenseCategories.length > 0 && !expCategory) {
      setExpCategory(driverExpenseCategories[0].name)
    }
  }, [driverExpenseCategories, expCategory])

  const driverRouteClientsCount = useMemo(() => {
    return weeklyRoutes.filter(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'client').length
  }, [weeklyRoutes, driver.id, todayISO])

  const handleStart = async () => {
    // Inicializar stock (loads) en el store a partir de plannedLoad
    const initialLoads = products.map(p => ({
      id: crypto.randomUUID(),
      driver_id: driver.id,
      product_id: p.id,
      date_loaded: new Date().toISOString(),
      initial_quantity: plannedLoad[p.id] || 0,
      current_quantity: plannedLoad[p.id] || 0
    }))
    useStore.setState({ loads: initialLoads })

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

        <div className="w-full">
          <button 
            onClick={handleStart} 
            disabled={driverRouteClientsCount === 0} 
            className="bg-brand-navy hover:bg-brand-navy/90 disabled:opacity-40 disabled:hover:bg-brand-navy text-white w-full py-4 rounded-2xl font-black text-base shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <MapPin size={20} /> Iniciar Recorrido
          </button>
        </div>

        {/* Modal Checklist Carga */}
        {showLoadChecklist && (
          <div className="absolute inset-0 bg-bg-app/80 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
            <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-brand-deep flex items-center gap-2">
                  <Package size={20} className="text-brand-navy"/> Pedido para Hoy
                </h3>
                <button onClick={() => setShowLoadChecklist(false)} className="p-1.5 text-brand-muted hover:bg-brand-muted/10 rounded-full">
                  <X size={18}/>
                </button>
              </div>
              <p className="text-brand-muted mb-4 text-xs">Asegúrate de tener esta mercadería cargada en la furgoneta antes de salir.</p>
              
              <div className="flex-1 overflow-y-auto space-y-2 mb-6 pr-1">
                {products.map(p => {
                  const qty = plannedLoad[p.id] || 0
                  if (qty === 0) return null
                  return (
                    <div key={p.id} className="flex justify-between items-center bg-brand-muted/10/40 border border-brand-muted/20/80 p-3 rounded-xl">
                      <span className="font-semibold text-brand-deep text-sm">{p.name}</span>
                      <span className="font-black text-brand-navy bg-brand-navy/10 px-3 py-1 rounded-lg text-sm">{qty} {p.unit_type === 'unidad' ? 'u' : p.unit_type === 'docena' ? 'doc' : p.unit_type === 'bolsa' ? 'bolsas' : p.unit_type}</span>
                    </div>
                  )
                })}
                {!hasLoad && (
                  <div className="text-center text-brand-muted/80 py-6 text-sm">Tu carga de hoy está vacía. Comunícate con administración.</div>
                )}
              </div>
              <button 
                onClick={() => {
                  // Inicializar stock (loads) en el store
                  const initialLoads = products.map(p => ({
                    id: crypto.randomUUID(),
                    driver_id: driver.id,
                    product_id: p.id,
                    date_loaded: new Date().toISOString(),
                    initial_quantity: plannedLoad[p.id] || 0,
                    current_quantity: plannedLoad[p.id] || 0
                  }))
                  useStore.setState({ loads: initialLoads })

                  setHasConfirmedLoad(true)
                  setShowLoadChecklist(false)
                }} 
                className="w-full bg-brand-muted/10 hover:bg-brand-muted/20 text-brand-deep py-3.5 rounded-xl font-bold shadow-lg transition-colors text-sm"
              >
                Carga Confirmada
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Vista "Finalizado" (Rendición realizada)
  if (driver.status === 'Finalizado') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-bg-surface shadow-sm p-8 text-center relative z-10">
        <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <CheckCircle size={44} />
        </div>
        <h2 className="text-2xl font-black text-brand-deep mb-2">Ruta Finalizada</h2>
        <p className="text-brand-muted mb-8 text-sm">Tus planillas y cobros de caja se han guardado con éxito.</p>
        
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
        <button
          onClick={onSelectDifferentDriver}
          className="mt-8 bg-brand-muted/10 hover:bg-brand-muted/20 text-brand-deep font-bold py-3 px-6 rounded-xl text-sm transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    )
  }

  // Vista Principal de Trabajo ("En Ruta")
  return (
    <div className="flex flex-col h-full bg-bg-surface shadow-sm overflow-y-auto relative">
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
      <div className="p-5 flex-1 flex flex-col justify-start gap-4 pb-24">
        {/* Botón Ver Hoja de Ruta (Secuencia ordenada) */}
        <button 
          onClick={onViewRoadmap} 
          className="bg-brand-navy hover:bg-brand-navy/90 text-white rounded-[2rem] p-5 shadow-xl shadow-blue-900/20 flex items-center justify-start gap-4 active:scale-[0.98] transition-all relative overflow-hidden group w-full"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-white/0 via-white/5 to-white/10 group-hover:via-white/10 transition-colors"></div>
          <div className="bg-white/10 p-3 rounded-xl shadow-inner relative z-10 backdrop-blur-sm border border-white/10">
            <ClipboardList size={24} />
          </div>
          <div className="text-left relative z-10">
            <span className="text-base font-black tracking-tight block">Ver Hoja de Ruta</span>
            <span className="text-[10px] text-white/70 font-semibold block mt-0.5">Recorrido ordenado y cargas</span>
          </div>
        </button>

        {/* Botón Seleccionar Cliente (Búsqueda directa) */}
        <button 
          onClick={onNewSale} 
          className="bg-white hover:bg-brand-navy/5 text-brand-navy border border-brand-navy/20 rounded-[2rem] p-5 shadow-sm flex items-center justify-start gap-4 active:scale-[0.98] transition-all w-full"
        >
          <div className="bg-brand-navy/5 p-3 rounded-xl border border-brand-navy/10 text-brand-navy">
            <Search size={24} />
          </div>
          <div className="text-left">
            <span className="text-base font-black tracking-tight block">Seleccionar Cliente</span>
            <span className="text-[10px] text-brand-muted/80 font-semibold block mt-0.5">Listado completo de clientes</span>
          </div>
        </button>
        
        {/* Gastos y Resumen */}
        <div className="flex gap-4">
          <button 
            onClick={() => setShowExpenseModal(true)} 
            className="flex-1 bg-white hover:bg-red-50 text-red-500 border border-red-100 rounded-3xl p-5 flex flex-col items-center justify-center gap-2 font-bold active:scale-95 transition-all text-sm shadow-sm"
          >
            <div className="bg-red-50 p-2 rounded-xl text-red-500 mb-1">
              <TrendingDown size={24} />
            </div>
            Registrar Gasto
          </button>
          <button 
            onClick={() => Swal.fire('Caja de Dinero', `Ventas registradas: $${(driver.cash_collected + driver.transfer_collected).toLocaleString()}`, 'info')}
            className="flex-1 bg-white hover:bg-brand-muted/5 text-brand-deep border border-brand-muted/10 rounded-3xl p-5 flex flex-col items-center justify-center gap-2 font-bold active:scale-95 transition-all text-sm shadow-sm"
          >
            <div className="bg-brand-muted/5 p-2 rounded-xl text-brand-muted mb-1">
              <ClipboardList size={24} />
            </div>
            Resumen Caja
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
        <div className="absolute inset-0 bg-bg-app/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-in fade-in">
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
  const { clients, weeklyRoutes, currentDriverId } = useStore()
  const [searchTerm, setSearchTerm] = useState('')

  const todayJS = new Date().getDay()
  const todayISO = todayJS === 0 ? 7 : todayJS



  const filteredClients = useMemo(() => {
    const routeClientIds = weeklyRoutes
      .filter(r => r.driver_id === currentDriverId && r.day_of_week === todayISO && r.stop_type === 'client')
      .map(r => r.client_id)

    return clients
      .filter(c => routeClientIds.includes(c.id))
      .filter(c => 
        c.business_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
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
        {filteredClients.length === 0 ? (
          <div className="text-center text-brand-muted/80 mt-10">
            <MapPin size={40} className="mx-auto mb-4 text-slate-700" />
            <p className="font-bold text-brand-muted">Sin clientes en ruta</p>
            <p className="text-xs text-brand-muted/80 mt-1">No se encontraron clientes asignados hoy.</p>
          </div>
        ) : (
          filteredClients.map((client, idx) => (
            <div 
              key={client.id} 
              onClick={() => onSelectClient(client.id)} 
              className="bg-white hover:bg-brand-navy/5 border border-brand-muted/10 rounded-3xl p-4 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-navy/5 text-brand-navy flex items-center justify-center font-black text-sm flex-shrink-0 border border-brand-navy/10">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-brand-deep text-sm truncate">{client.business_name}</h3>
                  {client.allow_credit && (
                    <span className="bg-brand-navy text-white text-[9px] px-2 py-0.5 rounded-lg font-bold whitespace-nowrap shadow-sm">
                      Cta. Cte.
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
          ))
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
  const { products, clients, loads, addSale } = useStore()
  
  const [tab, setTab] = useState<1 | 2 | 3>(1)
  const [cart, setCart] = useState<Record<string, number>>({}) // product_uuid -> qty
  const [returns, setReturns] = useState<Record<string, number>>({}) // product_uuid -> qty
  
  // Pagos mixtos
  const [payCash, setPayCash] = useState('')
  const [payTransfer, setPayTransfer] = useState('')
  const [includeDebt, setIncludeDebt] = useState(false)
  const [generatedTicket, setGeneratedTicket] = useState<Sale | null>(null)

  const client = clients.find(c => c.id === clientId)

  // Carga del pedido fijo al iniciar
  useEffect(() => {
    if (client && client.fixed_order) {
      setCart({ ...client.fixed_order })
    }
  }, [client])

  if (!client) return null

  const getPrice = (product: Product) => 
    client.price_category === 'A' ? product.price_a : product.price_b

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
    maxStock: number
  ) => {
    const current = obj[productId] || 0
    const step = unitType === 'kg' ? 0.5 : 1
    let next = current + (delta * step)
    if (next < 0) next = 0
    if (next > maxStock) next = maxStock

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

  const handleProcess = async () => {
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
      id: crypto.randomUUID(),
      client_id: client.id,
      driver_id: driver.id,
      transaction_date: new Date().toISOString(),
      subtotal_sales: subtotalSales,
      total_returns: totalReturns,
      applied_debt: includeDebt && client.current_balance < 0 ? Math.abs(client.current_balance) : 0,
      final_total: finalTotal,
      payment_cash: cashAmt,
      payment_transfer: transferAmt,
      payment_account: willAddToDebt,
      items: items,
      client_name: client.business_name,
      driver_name: driver.full_name
    }

    await addSale(newSale)
    setGeneratedTicket(newSale)
  }

  const handleWhatsApp = () => {
    if (!generatedTicket) return
    let text = `🍞 *PANIFICADORA*\n🎫 Ticket #${generatedTicket.id.substring(0, 8).toUpperCase()}\n👤 Cliente: ${generatedTicket.client_name}\n📅 Fecha: ${new Date(generatedTicket.transaction_date).toLocaleString('es-AR')}\n--------------------------------\n`
    if (subtotalSales > 0) {
      text += `*DESPACHO:*\n`
      generatedTicket.items.filter(i => i.operation_type === 'sale').forEach(item => text += `• ${item.quantity}x ${item.name} - $${item.quantity * item.unit_price}\n`)
    }
    if (totalReturns > 0) {
      text += `\n*DEVOLUCIONES (MERMAS):*\n`
      generatedTicket.items.filter(i => i.operation_type === 'return').forEach(item => text += `• -${item.quantity}x ${item.name} - -$${item.quantity * item.unit_price}\n`)
    }
    text += `--------------------------------\n*TOTAL BOLETA: $${generatedTicket.final_total}*\n`
    if (generatedTicket.payment_cash > 0) text += `💵 Efectivo: $${generatedTicket.payment_cash}\n`
    if (generatedTicket.payment_transfer > 0) text += `💳 Transferencia: $${generatedTicket.payment_transfer}\n`
    if (generatedTicket.payment_account !== 0) text += `📝 A Cuenta Corriente: $${generatedTicket.payment_account}\n`
    text += `\n¡Gracias por elegirnos!`

    window.open(`https://wa.me/${client.phone || ''}?text=${encodeURIComponent(text)}`, '_blank')
  }

  // Vista de Ticket generado
  if (generatedTicket) {
    return (
      <div className="flex flex-col h-full bg-bg-surface shadow-sm">
        <div className="bg-green-600/10 text-green-400 border-b border-green-500/20 py-4 px-6 flex items-center justify-center gap-2 z-10 shadow-md">
          <CheckCircle size={22} />
          <h2 className="font-bold text-sm">Venta procesada con éxito</h2>
        </div>

        {/* Boleta Virtual */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-start">
          <div className="bg-amber-50/5 text-brand-deep/80 w-full max-w-[280px] p-5 shadow-2xl rounded-2xl border border-brand-muted/20 text-xs font-mono relative leading-relaxed">
            <div className="text-center mb-4 border-b border-brand-muted/20/80 pb-3">
              <h1 className="font-black text-sm text-brand-deep tracking-wide">PANIFICADORA</h1>
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
                  <span>${item.quantity * item.unit_price}</span>
                </div>
              ))}
              
              {generatedTicket.items.filter(i => i.operation_type === 'return').map((item, idx) => (
                <div key={idx} className="flex justify-between text-red-400">
                  <span>-{item.quantity}x {item.name} (dev)</span>
                  <span>-${item.quantity * item.unit_price}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-brand-muted/20/60 mt-3 pt-2 text-[10px] space-y-1">
              <div className="flex justify-between"><span>Venta Bruta:</span><span>${generatedTicket.subtotal_sales}</span></div>
              {generatedTicket.total_returns > 0 && <div className="flex justify-between text-red-400"><span>Devoluciones:</span><span>-${generatedTicket.total_returns}</span></div>}
              {generatedTicket.applied_debt > 0 && <div className="flex justify-between"><span>Saldo Previo:</span><span>${generatedTicket.applied_debt}</span></div>}
            </div>

            <div className="border-t-2 border-brand-muted/30/80 mt-2.5 pt-2.5 mb-2">
              <div className="flex justify-between items-center text-sm font-black text-brand-deep">
                <span>TOTAL:</span>
                <span className="text-brand-navy">${generatedTicket.final_total}</span>
              </div>
              <div className="text-[9px] text-brand-muted/80 mt-2 space-y-0.5">
                {generatedTicket.payment_cash > 0 && <div className="flex justify-between"><span>Abonó Efectivo:</span><span>${generatedTicket.payment_cash}</span></div>}
                {generatedTicket.payment_transfer > 0 && <div className="flex justify-between"><span>Abonó Transfer.:</span><span>${generatedTicket.payment_transfer}</span></div>}
                {generatedTicket.payment_account !== 0 && (
                  <div className={`flex justify-between font-bold ${generatedTicket.payment_account > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                    <span>{generatedTicket.payment_account > 0 ? 'A Cta. Cte:' : 'Saldo a Favor:'}</span>
                    <span>${Math.abs(generatedTicket.payment_account)}</span>
                  </div>
                )}
              </div>
            </div>
            
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
              Cantidades auto-completadas por pedido fijo
            </div>
            {products.map(p => {
              const qty = cart[p.id] || 0
              
              // Buscar stock de la camioneta
              const l = loads.find(load => load.product_id === p.id)
              const maxStock = l ? l.current_quantity : 0

              return (
                <div key={p.id} className="bg-white border border-brand-muted/10 rounded-3xl p-4 flex items-center justify-between shadow-sm">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-brand-deep text-sm truncate">{p.name}</h4>
                    <p className="text-xs text-brand-navy font-black mt-1">
                      ${getPrice(p)} <span className="text-[10px] text-brand-muted font-semibold">x {p.unit_type}</span>
                    </p>
                    <span className="text-[9px] text-brand-orange mt-1.5 font-bold uppercase tracking-wider block bg-brand-orange/10 w-max px-2 py-0.5 rounded-md">Stock: {maxStock}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleUpdateQty(cart, setCart, p.id, -1, p.unit_type, maxStock)}
                      className="w-10 h-10 bg-brand-muted/5 border border-brand-muted/10 text-brand-deep rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Minus size={18} />
                    </button>
                    <input 
                      type="number"
                      value={qty || ''}
                      onChange={(e) => {
                        let val = parseFloat(e.target.value) || 0
                        if (val > maxStock) val = maxStock
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
                      onClick={() => handleUpdateQty(cart, setCart, p.id, 1, p.unit_type, maxStock)}
                      disabled={qty >= maxStock}
                      className="w-10 h-10 bg-brand-navy/10 border border-brand-navy/20 text-brand-navy rounded-xl flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 disabled:bg-brand-muted/5 disabled:border-brand-muted/10 disabled:text-brand-muted"
                    >
                      <Plus size={18} />
                    </button>
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
            {products.map(p => {
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
                      onClick={() => handleUpdateQty(returns, setReturns, p.id, -1, p.unit_type, 9999)}
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
                      onClick={() => handleUpdateQty(returns, setReturns, p.id, 1, p.unit_type, 9999)}
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
                      onChange={e => setIncludeDebt(e.target.checked)} 
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
          <button 
            onClick={handleProcess} 
            disabled={
              (subtotalSales === 0 && totalReturns === 0) || 
              (remainingToPay > 0 && !client.allow_credit)
            }
            className="w-full bg-brand-navy hover:bg-brand-navy text-white font-bold text-sm py-3.5 rounded-xl flex justify-center items-center gap-2 active:bg-blue-700 transition-colors disabled:opacity-30"
          >
            <Printer size={18} /> Confirmar Transmisión e Imprimir
          </button>
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
    // Si no hay carga inicial guardada en la base de datos, sumamos sugeridos de pedidos fijos de los clientes en la ruta de hoy
    const suggested: Record<string, number> = {}
    const routeClientStops = weeklyRoutes.filter(r => r.driver_id === driver.id && r.day_of_week === todayISO && r.stop_type === 'client')
    const { clients: allClients } = useStore.getState()
    
    routeClientStops.forEach(stop => {
      const clientObj = allClients.find(c => c.id === stop.client_id)
      if (clientObj && clientObj.fixed_order) {
        Object.entries(clientObj.fixed_order).forEach(([prodId, qty]) => {
          suggested[prodId] = (suggested[prodId] || 0) + (qty as number)
        })
      }
    })
    return suggested
  }, [initialLoadStop, weeklyRoutes, driver.id, todayISO])

  const hasLoad = Object.keys(plannedLoad).length > 0

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
                <div className="grid grid-cols-1 gap-1.5 mt-2 bg-brand-muted/5 p-3 rounded-xl border border-brand-muted/10">
                  {products.map(p => {
                    const qty = plannedLoad[p.id] || 0
                    if (qty === 0) return null
                    return (
                      <div key={p.id} className="flex justify-between items-center text-xs">
                        <span className="text-brand-deep font-semibold">{p.name}</span>
                        <span className="font-black text-brand-navy bg-brand-navy/10 px-2 py-0.5 rounded text-[11px]">{qty} {p.unit_type === 'unidad' ? 'u' : p.unit_type === 'docena' ? 'doc' : p.unit_type === 'bolsa' ? 'bolsas' : p.unit_type}</span>
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
            const stopLoad = stop.planned_load || {}
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
                  {isLoad ? (
                    <div>
                      <span className="text-[9px] font-black text-brand-orange uppercase tracking-wider block mb-1">Carga en Ruta</span>
                      <h4 className="font-bold text-brand-deep text-sm mb-2">Carga Intermedia (Fábrica)</h4>
                      
                      {stopHasLoad ? (
                        <div className="grid grid-cols-1 gap-1.5 mt-2 bg-brand-muted/5 p-3 rounded-xl border border-brand-muted/10">
                          {products.map(p => {
                            const qty = stopLoad[p.id] || 0
                            if (qty === 0) return null
                            return (
                              <div key={p.id} className="flex justify-between items-center text-xs">
                                <span className="text-brand-deep font-semibold">{p.name}</span>
                                <span className="font-black text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded text-[11px]">{qty} {p.unit_type}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-brand-muted/80 italic mt-1">Sin mercadería planificada.</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-black text-brand-navy uppercase tracking-wider block mb-1">Cliente a Visitar</span>
                          <h4 className="font-bold text-brand-deep text-sm truncate">{client?.business_name || 'Cliente Desconocido'}</h4>
                          <p className="text-xs text-brand-muted truncate flex items-center gap-1.5 mt-1 font-medium">
                            <MapPin size={12} className="text-brand-orange flex-shrink-0" /> {client?.address || 'Sin dirección'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {client && client.fixed_order && Object.keys(client.fixed_order).some(k => (client.fixed_order?.[k] || 0) > 0) && (
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

                      {client && expandedClients[client.id] && client.fixed_order && (
                        <div className="grid grid-cols-1 gap-1.5 mt-3 bg-brand-muted/5 p-3 rounded-xl border border-brand-muted/10" onClick={e => e.stopPropagation()}>
                          <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider block mb-1">Pedido Fijo a Descargar:</span>
                          {products.map(p => {
                            const qty = client.fixed_order?.[p.id] || 0
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
    </div>
  )
}
