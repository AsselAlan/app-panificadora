import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom'
import { 
  TrendingUp, TrendingDown, Wallet, Store, Activity, Users, 
  ClipboardList, Package, LogOut, Truck,
  Plus, Minus, ShoppingCart, Printer, Banknote, CreditCard,
  X, Calendar, Clock, History, BarChart, MapPin, Map, ArrowUp, ArrowDown, Trash2,
  Pencil, Eye, Pause, Play, Shield, KeyRound, Menu
} from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Product, Expense } from '../store/useStore'
import Swal from 'sweetalert2'
import { supabase } from '../supabaseClient'
import { AdminUsers } from './admin/AdminUsers'
import { AdminProfile } from './admin/AdminProfile'

interface AdminAppProps {
  onLogout: () => void
}

export const AdminApp: React.FC<AdminAppProps> = ({ onLogout }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { fetchInitialData } = useStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const currentPath = location.pathname.split('/')[2]?.toUpperCase() || 'DASHBOARD'
  const adminView = currentPath === '' ? 'DASHBOARD' : currentPath

  const setAdminView = (view: string) => {
    navigate(`/admin/${view.toLowerCase()}`)
    setIsMobileMenuOpen(false)
  }

  useEffect(() => {
    fetchInitialData()
    
    // Polling opcional para monitoreo en vivo cada 30 segundos
    const interval = setInterval(() => {
      fetchInitialData()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [fetchInitialData])

  return (
    <div className="min-h-screen flex bg-bg-app font-sans text-slate-100 relative">
      
      {/* Overlay para móviles */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-30 md:hidden animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Lateral */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-brand-navy border-r border-brand-navy flex flex-col z-40 text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-brand-muted/20/60 bg-brand-navy font-black text-white text-lg gap-2.5">
          <div className="w-8 h-8 bg-brand-orange/10 text-orange-500 rounded-lg flex items-center justify-center">
            <Truck size={18} />
          </div>
          Panificadora <span className="text-orange-500 text-xs font-bold bg-brand-orange/10 px-2 py-0.5 rounded-full border border-orange-500/20">Admin</span>
        </div>
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto px-4">
          {[
            { id: 'DASHBOARD', label: 'Panel General', icon: TrendingUp },
            { id: 'POS', label: 'Ventas en Local', icon: Store },
            { id: 'DRIVERS', label: 'Monitoreo Flota', icon: Activity },
            { id: 'CLIENTS', label: 'Clientes y Cuentas', icon: Users },
            { id: 'EXPENSES', label: 'Gastos y Salidas', icon: Wallet },
            { id: 'STOCK', label: 'Stock Fábrica', icon: ClipboardList },
            { id: 'PRODUCTS', label: 'Catálogo y Precios', icon: Package },
            { id: 'ROUTES', label: 'Rutas Diarias', icon: Map },
            { id: 'USERS', label: 'Gestión de Usuarios', icon: Shield },
            { id: 'PROFILE', label: 'Mi Perfil', icon: KeyRound },
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => navigate(`/admin/${item.id.toLowerCase()}`)} 
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${adminView === item.id ? 'bg-brand-navy text-white font-bold bg-white/10 shadow-lg shadow-blue-600/10' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-brand-muted/10">
          <button 
            onClick={() => navigate('/admin/profile')}
            className="flex items-center gap-3 mb-4 px-2 hover:bg-white/5 rounded-xl transition-colors w-full text-left py-2"
          >
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-black text-sm">
              AD
            </div>
            <div>
              <div className="text-xs font-bold text-white">Consola Central</div>
              <div className="text-[10px] text-green-400 font-bold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span> Conectado
              </div>
            </div>
          </button>
          <button 
            onClick={onLogout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-colors font-bold"
          >
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área de Trabajo */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-16 bg-bg-surface shadow-sm border-b border-brand-muted/20/80 flex items-center justify-between px-4 md:px-8 z-10 shrink-0 gap-4">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-brand-deep hover:bg-brand-muted/10 rounded-xl"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-base md:text-lg font-black text-brand-deep tracking-tight truncate hidden sm:block">
              {adminView === 'DASHBOARD' && 'Panel General Financiero'}
              {adminView === 'POS' && 'Punto de Venta de Mostrador'}
              {adminView === 'DRIVERS' && 'Monitoreo de Repartidores'}
            {adminView === 'CLIENTS' && 'Gestión de Clientes y Deudas'}
            {adminView === 'EXPENSES' && 'Control de Gastos de Fábrica'}
            {adminView === 'STOCK' && 'Carga de Stock (Post-Envasado)'}
            {adminView === 'PRODUCTS' && 'Catálogo de Productos y Precios'}
            {adminView === 'ROUTES' && 'Rutas Diarias'}
            {adminView === 'USERS' && 'Gestión de Accesos y Usuarios'}
            {adminView === 'PROFILE' && 'Configuración de Mi Perfil'}
            </h2>
          </div>
          <div className="text-[10px] md:text-xs text-brand-muted font-semibold bg-bg-app px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-brand-muted/10 whitespace-nowrap">
            Op: <span className="text-orange-500 font-black">{['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][new Date().getDay()]}</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-bg-app">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/pos" element={<AdminPOS setAdminView={setAdminView} />} />
            <Route path="/drivers" element={<AdminDrivers />} />
            <Route path="/clients" element={<AdminClients />} />
            <Route path="/expenses" element={<AdminExpenses />} />
            <Route path="/stock" element={<AdminStock />} />
            <Route path="/products" element={<AdminProducts />} />
            <Route path="/routes" element={<AdminRoutes />} />
            <Route path="/users" element={<AdminUsers />} />
            <Route path="/profile" element={<AdminProfile />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

// ==========================================
// SECCIÓN A.1: DASHBOARD GENERAL
// ==========================================
const AdminDashboard: React.FC = () => {
  const { sales, expenses, drivers } = useStore()

  // Helper para saber si es hoy
  const isToday = (dateString: string) => {
    if (!dateString) return false
    const d = new Date(dateString)
    const today = new Date()
    return d.getDate() === today.getDate() && 
           d.getMonth() === today.getMonth() && 
           d.getFullYear() === today.getFullYear()
  }

  const todaySales = useMemo(() => sales.filter(s => isToday(s.transaction_date)), [sales])
  const todayExpenses = useMemo(() => expenses.filter(e => isToday(e.expense_date)), [expenses])

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [monthlySales, setMonthlySales] = useState<any[]>([])
  const [monthlyExpenses, setMonthlyExpenses] = useState<any[]>([])

  const fetchMonthly = useCallback(async () => {
    const start = new Date(selectedMonth + '-01T00:00:00').toISOString()
    const endDate = new Date(selectedMonth + '-01T00:00:00')
    endDate.setMonth(endDate.getMonth() + 1)
    const end = endDate.toISOString()
    
    const [salesRes, expRes] = await Promise.all([
      supabase.from('sales').select('*').gte('transaction_date', start).lt('transaction_date', end),
      supabase.from('expenses').select('*').gte('expense_date', start).lt('expense_date', end)
    ])
    
    if (!salesRes.error && salesRes.data) setMonthlySales(salesRes.data)
    if (!expRes.error && expRes.data) setMonthlyExpenses(expRes.data)
  }, [selectedMonth])

  useEffect(() => {
    fetchMonthly()
  }, [fetchMonthly])

  // Calcular métricas
  const totalSales = monthlySales.reduce((acc, s) => acc + s.final_total, 0)
  const totalExpenses = monthlyExpenses.reduce((acc, e) => acc + e.amount, 0)
  const netProfit = totalSales - totalExpenses

  const cashInHand = monthlySales.reduce((acc, s) => acc + s.payment_cash, 0)
  const transferCollected = monthlySales.reduce((acc, s) => acc + s.payment_transfer, 0)
  const accountAdded = monthlySales.reduce((acc, s) => acc + s.payment_account, 0)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Selector de Mes */}
      <div className="flex justify-end">
        <input 
          type="month" 
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-bg-surface border border-brand-muted/30 text-brand-deep rounded-xl px-4 py-2 text-sm font-bold shadow-sm outline-none"
        />
      </div>

      {/* Indicadores Top */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center">
          <h3 className="text-brand-muted text-xs font-bold uppercase tracking-wider mb-1">Ventas Brutas</h3>
          <p className="text-3xl font-black text-brand-deep">${totalSales.toLocaleString()}</p>
          <div className="absolute -right-2 -bottom-2 opacity-5 text-slate-100">
            <TrendingUp size={80} />
          </div>
        </div>
        
        <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center">
          <h3 className="text-brand-muted text-xs font-bold uppercase tracking-wider mb-1">Erogaciones / Gastos</h3>
          <p className="text-3xl font-black text-red-400">-${totalExpenses.toLocaleString()}</p>
          <div className="absolute -right-2 -bottom-2 opacity-5 text-slate-100">
            <TrendingDown size={80} />
          </div>
        </div>

        <div className={`p-6 rounded-3xl relative overflow-hidden flex flex-col justify-center border ${netProfit >= 0 ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' : 'bg-red-950/20 border-red-500/20 text-red-400'}`}>
          <h3 className="text-brand-muted text-xs font-bold uppercase tracking-wider mb-1">Resultado Neto</h3>
          <p className="text-4xl font-black">${netProfit.toLocaleString()}</p>
          <div className="absolute -right-2 -bottom-2 opacity-5 text-slate-100">
            <Wallet size={80} />
          </div>
        </div>
      </div>

      {/* Desglose de Caja */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-surface shadow-sm/40 border border-brand-muted/10 p-5 rounded-2xl">
          <h4 className="text-brand-muted text-xs font-bold uppercase mb-2 flex items-center gap-2"><Banknote size={16} className="text-green-500"/> Efectivo Recaudado</h4>
          <p className="text-2xl font-black text-brand-deep">${cashInHand.toLocaleString()}</p>
        </div>
        <div className="bg-bg-surface shadow-sm/40 border border-brand-muted/10 p-5 rounded-2xl">
          <h4 className="text-brand-muted text-xs font-bold uppercase mb-2 flex items-center gap-2"><CreditCard size={16} className="text-brand-navy"/> Transferencias</h4>
          <p className="text-2xl font-black text-brand-deep">${transferCollected.toLocaleString()}</p>
        </div>
        <div className="bg-bg-surface shadow-sm/40 border border-brand-muted/10 p-5 rounded-2xl">
          <h4 className="text-brand-muted text-xs font-bold uppercase mb-2 flex items-center gap-2"><Users size={16} className="text-orange-500"/> A Cuenta Corriente</h4>
          <p className="text-2xl font-black text-brand-deep">${accountAdded.toLocaleString()}</p>
        </div>
      </div>

      {/* Monitoreo de Camionetas en Tiempo Real */}
      <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl p-6">
        <h3 className="text-base font-bold text-brand-deep mb-6 flex items-center gap-2">
          <Activity size={18} className="text-brand-navy animate-pulse"/> Rendimiento de Furgonetas Hoy
        </h3>
        <div className="space-y-4">
          {drivers.map(d => {
            const driverExpenses = todayExpenses
              .filter(e => e.origin === d.full_name)
              .reduce((acc, exp) => acc + exp.amount, 0);
            
            const driverSales = todaySales.filter(s => s.driver_id === d.id);
            const driverCash = driverSales.reduce((acc, s) => acc + s.payment_cash, 0);
            const driverTransfer = driverSales.reduce((acc, s) => acc + s.payment_transfer, 0);
            
            return (
            <div key={d.id} className="bg-bg-app border border-brand-muted/10 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${d.status === 'En Ruta' ? 'bg-brand-navy/10 text-brand-navy' : d.status === 'Finalizado' ? 'bg-green-600/10 text-green-400' : 'bg-brand-muted/10 text-brand-muted'}`}>
                  <Truck size={20} />
                </div>
                <div>
                  <span className="block font-bold text-brand-deep">{d.full_name}</span>
                  <span className="text-xs text-brand-muted/80">Estado: <strong className={d.status === 'En Ruta' ? 'text-brand-navy' : d.status === 'Finalizado' ? 'text-green-400' : 'text-brand-muted'}>{d.status}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-8 justify-between sm:justify-end">
                <div className="text-right">
                  <span className="text-[10px] text-brand-muted/80 block uppercase font-bold">Caja Efectivo</span>
                  <span className="font-bold text-brand-deep/80">${driverCash.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-brand-muted/80 block uppercase font-bold">Caja Transf.</span>
                  <span className="font-bold text-brand-deep/80">${driverTransfer.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-brand-muted/80 block uppercase font-bold">Gastos</span>
                  <span className="font-bold text-red-400">${driverExpenses.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-brand-muted/80 block uppercase font-bold">Ventas Totales</span>
                  <span className="font-black text-brand-navy">${(driverCash + driverTransfer).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )})}
          {drivers.length === 0 && (
            <div className="text-center text-brand-muted/80 py-8">No hay repartidores registrados en el sistema.</div>
          )}

          {/* Tarjeta de Mostrador (Sede Central) */}
          <div className="bg-bg-app border border-brand-navy/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-navy"></div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-navy/10 text-brand-navy flex items-center justify-center font-black">
                <Store size={20} />
              </div>
              <div>
                <span className="block font-bold text-brand-deep">Mostrador Sede Central</span>
                <span className="text-xs text-brand-navy font-bold flex items-center gap-1.5 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-brand-navy animate-pulse"></span> Mostrador Activo</span>
              </div>
            </div>
            <div className="flex items-center gap-8 justify-between sm:justify-end">
              <div className="text-right">
                <span className="text-[10px] text-brand-muted/80 block uppercase font-bold">Tickets</span>
                <span className="font-bold text-brand-deep/80">{todaySales.filter(s => s.driver_id === '00000000-0000-0000-0000-000000000000').length}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-brand-muted/80 block uppercase font-bold">Caja Efectivo</span>
                <span className="font-bold text-brand-deep/80">${todaySales.filter(s => s.driver_id === '00000000-0000-0000-0000-000000000000').reduce((acc, s) => acc + s.payment_cash, 0).toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-brand-muted/80 block uppercase font-bold">Caja Transf.</span>
                <span className="font-bold text-brand-deep/80">${todaySales.filter(s => s.driver_id === '00000000-0000-0000-0000-000000000000').reduce((acc, s) => acc + s.payment_transfer, 0).toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-brand-muted/80 block uppercase font-bold">Ventas Totales</span>
                <span className="font-black text-brand-navy">${todaySales.filter(s => s.driver_id === '00000000-0000-0000-0000-000000000000').reduce((acc, s) => acc + s.final_total, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// SECCIÓN A.2: PUNTO DE VENTA EN LOCAL (POS)
// ==========================================
const AdminPOS: React.FC<{ setAdminView: (v: 'DASHBOARD' | 'POS' | 'DRIVERS' | 'CLIENTS' | 'EXPENSES' | 'STOCK' | 'PRODUCTS') => void }> = ({ setAdminView }) => {
  const { products, clients } = useStore()
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [cart, setCart] = useState<Record<string, number>>({}) // product_id -> qty
  const [payCash, setPayCash] = useState('')
  const [payTransfer, setPayTransfer] = useState('')
  const [vueltoACuenta, setVueltoACuenta] = useState(false)
  const [includeDebt, setIncludeDebt] = useState(false)
  const [showMobileCatalog, setShowMobileCatalog] = useState(false)

  const activeClient = clients.find(c => c.id === selectedClientId)

  const getPrice = (product: Product) => 
    activeClient && activeClient.price_category === 'A' ? product.price_a : product.price_b

  const subtotalSales = Object.entries(cart).reduce((acc, [id, qty]) => {
    const p = products.find(p => p.id === id)
    return acc + (p ? getPrice(p) * qty : 0)
  }, 0)

  const cashAmt = parseFloat(payCash) || 0
  const transferAmt = parseFloat(payTransfer) || 0
  const totalPaid = cashAmt + transferAmt
  const remainingToPay = subtotalSales - totalPaid

  const handleUpdateQty = (productId: string, delta: number, unitType: string, maxStock: number) => {
    const current = cart[productId] || 0
    const step = unitType === 'kg' ? 0.5 : 1
    let next = current + (delta * step)
    if (next < 0) next = 0
    if (next > maxStock) next = maxStock

    setCart(prev => {
      const n = { ...prev }
      if (next === 0) delete n[productId]
      else n[productId] = next
      return n
    })
  }

  const handleProcess = async () => {
    if ((subtotalSales === 0 && totalPaid === 0) || !selectedClientId) return

    try {
      let finalCash = cashAmt
      let finalAccount = remainingToPay

      if (remainingToPay < 0) {
        if (subtotalSales === 0 || vueltoACuenta) {
           // Si no lleva nada o explícitamente quiere dejarlo a cuenta
           finalCash = cashAmt
           finalAccount = remainingToPay
        } else {
           // Vuelto en mano
           finalCash = cashAmt - Math.abs(remainingToPay)
           finalAccount = 0
        }
      }

      // 1. Registrar venta en Supabase
      const saleId = crypto.randomUUID()
      const newSale = {
        id: saleId,
        client_id: selectedClientId,
        driver_id: '00000000-0000-0000-0000-000000000000', // ID ficticio o ID de admin
        transaction_date: new Date().toISOString(),
        subtotal_sales: subtotalSales,
        total_returns: 0,
        applied_debt: 0,
        final_total: subtotalSales,
        payment_cash: finalCash,
        payment_transfer: transferAmt,
        payment_account: finalAccount
      }

      // Simular driver en Supabase o tener uno por defecto
      // Para evitar fallos si no existe driver_id, buscamos el primer driver de base
      const firstDriverId = useStore.getState().drivers[0]?.id
      if (firstDriverId) {
        newSale.driver_id = firstDriverId
      } else {
        Swal.fire('Error', 'Debes registrar al menos un chofer en la base de datos antes de realizar ventas de mostrador.', 'error')
        return
      }

      const cleanItems = Object.entries(cart).map(([id, qty]) => {
        const p = products.find(prod => prod.id === id)
        return {
          product_id: id,
          operation_type: 'sale',
          quantity: qty,
          unit_price: p ? getPrice(p) : 0
        }
      })

      const payload = {
        ...newSale,
        items: cleanItems
      }

      // Sincronizar llamando al RPC
      const { error } = await supabase.rpc('process_offline_sale', { payload })
      if (error) throw error

      // Descontar del stock local de panadería
      for (const [id, qty] of Object.entries(cart)) {
        const p = products.find(prod => prod.id === id)
        if (p) {
          await supabase.from('products').update({ bakery_stock: Math.max(0, p.bakery_stock - qty) }).eq('id', id)
        }
      }

      setCart({})
      setPayCash('')
      setPayTransfer('')
      setSelectedClientId('')
      useStore.getState().fetchInitialData()

      Swal.fire('Venta Registrada', 'El ticket fue procesado con éxito.', 'success')

    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'No se pudo procesar la venta en mostrador.', 'error')
    }
  }

  return (
    <div className="flex h-full gap-6 max-w-6xl mx-auto relative">
      {/* Overlay para modal en móvil */}
      {showMobileCatalog && (
        <div className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden animate-in fade-in" onClick={() => setShowMobileCatalog(false)} />
      )}

      {/* Catálogo de Mostrador */}
      <div className={`
        flex-1 flex flex-col bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl overflow-hidden
        ${showMobileCatalog ? 'fixed inset-4 z-50 shadow-2xl flex' : 'hidden lg:flex'}
      `}>
        <div className="p-5 border-b border-brand-muted/20 bg-bg-app flex justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-navy/10 text-brand-navy rounded-xl flex items-center justify-center">
              <Store size={20} />
            </div>
            <div>
              <h3 className="font-bold text-brand-deep text-sm">Productos de Panadería</h3>
              <p className="text-xs text-brand-muted/80">Agregue items para venta inmediata en local</p>
            </div>
          </div>
          {showMobileCatalog && (
            <button onClick={() => setShowMobileCatalog(false)} className="w-10 h-10 bg-brand-muted/10 hover:bg-brand-muted/20 text-brand-deep rounded-xl flex items-center justify-center lg:hidden">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(p => {
              const qty = cart[p.id] || 0
              const maxStock = p.bakery_stock
              
              return (
                <div key={p.id} className={`border rounded-2xl p-4 transition-all duration-200 ${qty > 0 ? 'border-brand-navy/30 bg-brand-navy/5' : 'border-brand-muted/20 bg-bg-surface shadow-sm/30 hover:border-brand-muted/30'}`}>
                  <h4 className="font-bold text-brand-deep text-sm truncate">{p.name}</h4>
                  <p className="text-xs font-semibold text-brand-navy mt-0.5">${getPrice(p)} <span className="text-[10px] text-brand-muted/80 font-normal">x {p.unit_type}</span></p>
                  
                  <div className="flex justify-between items-center gap-2 mt-4">
                    <button 
                      onClick={() => handleUpdateQty(p.id, -1, p.unit_type, maxStock)} 
                      className="w-8 h-8 bg-brand-muted/10 border border-brand-muted/30 text-brand-deep/80 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <Minus size={14} />
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
                      className="w-12 h-8 text-center text-sm font-bold text-brand-deep bg-brand-muted/10 border border-brand-muted/30 rounded-lg outline-none" 
                      placeholder="0" 
                    />
                    <button 
                      onClick={() => handleUpdateQty(p.id, 1, p.unit_type, maxStock)} 
                      disabled={qty >= maxStock}
                      className="w-8 h-8 bg-brand-muted/10 border border-brand-muted/30 text-brand-deep/80 rounded-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="text-[9px] text-brand-muted/80 text-center mt-2">Disponible: {maxStock} {p.unit_type}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Carrito POS lateral */}
      <div className="w-full lg:w-[360px] flex-none bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl flex flex-col shadow-xl">
        <div className="p-5 border-b border-brand-muted/20 bg-bg-app shrink-0">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] font-bold text-brand-muted/80 uppercase block">Cliente</label>
            {activeClient && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeClient.current_balance < 0 ? 'bg-red-500/10 text-red-500' : activeClient.current_balance > 0 ? 'bg-green-500/10 text-green-500' : 'bg-brand-muted/10 text-brand-muted'}`}>
                {activeClient.current_balance < 0 ? `Adeuda $${Math.abs(activeClient.current_balance)}` : activeClient.current_balance > 0 ? `A favor $${activeClient.current_balance}` : 'Al día'}
              </span>
            )}
          </div>
          <select 
            value={selectedClientId} 
            onChange={(e) => { 
              if (e.target.value === 'NEW_CLIENT') {
                setAdminView('CLIENTS');
              } else {
                setSelectedClientId(e.target.value); 
                setCart({});
                setPayCash('');
                setPayTransfer('');
                setVueltoACuenta(false);
                setIncludeDebt(false);
              }
            }}
            className="w-full bg-brand-muted/10 border border-brand-muted/30 text-brand-deep rounded-xl p-2.5 font-semibold text-sm outline-none"
          >
            <option value="">-- Seleccionar cliente --</option>
            <option value="NEW_CLIENT" className="text-brand-navy font-bold">+ Agregar nuevo cliente</option>
            <hr className="border-brand-muted/30 my-1" />
            {clients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </select>
          <button 
            onClick={() => setShowMobileCatalog(true)}
            className="mt-3 w-full lg:hidden bg-brand-navy/10 hover:bg-brand-navy/20 text-brand-navy border border-brand-navy/20 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Store size={16} /> Seleccionar Productos
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {Object.keys(cart).length === 0 ? (
            <div className="text-center text-slate-600 py-10 flex flex-col items-center gap-2">
              <ShoppingCart size={32} className="opacity-40" />
              <span className="text-xs">El carrito está vacío</span>
            </div>
          ) : (
            Object.entries(cart).map(([id, qty]) => {
              const p = products.find(prod => prod.id === id)
              if (!p) return null
              return (
                <div key={id} className="flex justify-between items-center bg-bg-app/40 border border-brand-muted/10 p-3 rounded-xl text-xs font-mono">
                  <div>
                    <span className="font-bold text-brand-deep block">{p.name}</span>
                    <span className="text-brand-muted/80">{qty} x ${getPrice(p)}</span>
                  </div>
                  <span className="font-black text-brand-deep">${qty * getPrice(p)}</span>
                </div>
              )
            })
          )}
        </div>

        <div className="p-5 border-t border-brand-muted/20 bg-bg-app rounded-b-3xl space-y-4">
          <div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs font-bold text-brand-muted/80 uppercase tracking-wider">Total Productos</span>
              <span className="text-xl font-black text-brand-navy">${subtotalSales}</span>
            </div>
            
            {activeClient && activeClient.current_balance < 0 && (
              <div className="flex justify-between items-center mb-1 text-red-500">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={includeDebt} 
                    onChange={e => {
                      setIncludeDebt(e.target.checked);
                      if (e.target.checked) setVueltoACuenta(true);
                    }} 
                    className="w-3.5 h-3.5 accent-red-500 rounded-sm" 
                  />
                  <span className="text-xs font-bold uppercase tracking-wider">Deuda Previa</span>
                </label>
                <span className="text-sm font-black">+ ${Math.abs(activeClient.current_balance)}</span>
              </div>
            )}

            {activeClient && activeClient.current_balance < 0 && includeDebt && (
              <div className="flex justify-between items-end mt-2 pt-2 border-t border-brand-muted/20">
                <span className="text-xs font-bold text-brand-deep uppercase tracking-wider">A Cobrar con Deuda</span>
                <span className="text-2xl font-black text-brand-deep">${subtotalSales + Math.abs(activeClient.current_balance)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between bg-bg-surface shadow-sm border border-brand-muted/20 p-2.5 rounded-xl text-xs">
              <span className="font-bold text-brand-deep/80 flex items-center gap-1.5"><Banknote size={14} className="text-green-500"/> Efectivo</span>
              <input 
                type="number" 
                value={payCash} 
                onChange={e => setPayCash(e.target.value)} 
                className="w-20 h-7 px-2 bg-brand-muted/5 border border-brand-muted/30 text-brand-deep rounded-lg text-right font-bold text-xs" 
                placeholder="0" 
              />
            </div>
            <div className="flex items-center justify-between bg-bg-surface shadow-sm border border-brand-muted/20 p-2.5 rounded-xl text-xs">
              <span className="font-bold text-brand-deep/80 flex items-center gap-1.5"><CreditCard size={14} className="text-brand-navy"/> Transf.</span>
              <input 
                type="number" 
                value={payTransfer} 
                onChange={e => setPayTransfer(e.target.value)} 
                className="w-20 h-7 px-2 bg-brand-muted/5 border border-brand-muted/30 text-brand-deep rounded-lg text-right font-bold text-xs" 
                placeholder="0" 
              />
            </div>
          </div>

          {remainingToPay !== 0 && (
            <div className={`p-3 rounded-xl border text-[11px] font-bold flex justify-between items-center ${remainingToPay > 0 ? 'bg-brand-orange/5 border-orange-500/20 text-orange-400' : 'bg-green-500/5 border-green-500/20 text-green-400'}`}>
              <span>
                {remainingToPay > 0 
                  ? 'Falta pagar (a Cuenta Corriente):' 
                  : (subtotalSales === 0 || vueltoACuenta ? 'Pago de Deuda / Saldo a favor:' : 'Vuelto en Mano:')}
              </span>
              <span>${Math.abs(remainingToPay)}</span>
            </div>
          )}

          {remainingToPay < 0 && subtotalSales > 0 && (
            <div className="flex items-center gap-2 px-1">
              <input type="checkbox" id="vueltoACuenta" checked={vueltoACuenta} onChange={e => setVueltoACuenta(e.target.checked)} className="w-3.5 h-3.5 accent-brand-navy rounded-sm" />
              <label htmlFor="vueltoACuenta" className="text-xs font-semibold text-brand-deep cursor-pointer">
                {activeClient && activeClient.current_balance < 0 ? 'Aplicar sobrante para pagar deuda' : 'Dejar vuelto a favor en Cuenta'}
              </label>
            </div>
          )}
          {remainingToPay < 0 && subtotalSales === 0 && (
            <div className="text-[10px] font-bold text-green-500 px-1 text-center">
              Ingreso de dinero para saldo de deuda o a favor
            </div>
          )}

          <button 
            onClick={handleProcess} 
            disabled={
              (!selectedClientId) || 
              (subtotalSales === 0 && totalPaid === 0) || 
              (remainingToPay > 0 && !activeClient?.allow_credit)
            }
            className="w-full bg-brand-navy hover:bg-brand-navy text-white font-bold py-3 rounded-xl active:bg-blue-700 transition-colors disabled:opacity-30 flex justify-center items-center gap-2 text-sm"
          >
            <Printer size={16} /> Procesar Cobro
          </button>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// SECCIÓN A.3: MONITOREO DE REPARTIDORES
// ==========================================
const AdminDrivers: React.FC = () => {
  const { drivers, weeklyRoutes } = useStore()
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [daySales, setDaySales] = useState<any[]>([])

  useEffect(() => {
    const fetchDaySales = async () => {
      try {
        const start = new Date(selectedDate)
        // Adjust for local time
        start.setHours(0, 0, 0, 0)
        const end = new Date(selectedDate)
        end.setHours(23, 59, 59, 999)
        
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .gte('transaction_date', start.toISOString())
          .lte('transaction_date', end.toISOString())
        
        if (error) throw error
        setDaySales(data || [])
      } catch (err) {
        console.error('Error fetching historical sales:', err)
      }
    }
    fetchDaySales()
  }, [selectedDate])

  // Cálculos de Ventas en Local (Sede Central)
  // Asumimos que las ventas locales se registran bajo un ID específico o donde el driver no es un repartidor válido.
  // En este sistema, el ID '00000000-0000-0000-0000-000000000000' se usa para ventas locales.
  const localSales = daySales.filter(s => s.driver_id === '00000000-0000-0000-0000-000000000000')
  const localTotal = localSales.reduce((acc, s) => acc + s.final_total, 0)
  const localCash = localSales.reduce((acc, s) => acc + s.payment_cash, 0)
  const localTransfer = localSales.reduce((acc, s) => acc + s.payment_transfer, 0)

  // Determinar el día de la semana para cruzar con weekly_routes (0=Sunday -> 7=Sunday en BD)
  const dateObj = new Date(selectedDate)
  const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay()

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Header y Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-bg-surface shadow-sm border border-brand-muted/20 p-5 rounded-2xl gap-4">
        <div>
          <h3 className="font-bold text-brand-deep text-lg">Gestión de Flota y Mostrador</h3>
          <p className="text-xs text-brand-muted/80 mt-0.5">Control de rendimiento por repartidor y caja central</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 bg-brand-muted/5 border border-brand-muted/20 rounded-xl px-3 py-1.5">
            <span className="text-[10px] font-bold text-brand-muted uppercase">Fecha:</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-brand-deep outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Grid de Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        
        {/* Tarjeta Sede Central (Ventas Locales) */}
        <div className="bg-white rounded-3xl p-6 border-2 border-brand-navy/10 shadow-sm flex flex-col relative overflow-hidden group hover:border-brand-navy/30 transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-navy opacity-80"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-black text-brand-navy text-lg flex items-center gap-2">
                <Store size={20} /> Ventas en Local
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-brand-navy animate-pulse"></span>
                <span className="text-xs font-semibold text-brand-navy/80">Mostrador Activo</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-brand-muted/60 uppercase flex items-center gap-1">
              <MapPin size={12}/> Sede Central
            </span>
          </div>

          <div className="mb-5">
            <div className="flex justify-between text-[11px] font-bold text-brand-muted uppercase mb-2">
              <span>Tickets Emitidos Hoy</span>
              <span className="text-brand-navy font-black text-sm">{localSales.length}</span>
            </div>
            <div className="w-full bg-brand-muted/10 rounded-full h-2">
              <div className="bg-brand-navy h-2 rounded-full transition-all" style={{ width: localSales.length > 0 ? '100%' : '0%' }}></div>
            </div>
          </div>

          <div className="bg-brand-muted/5 rounded-2xl p-4 mt-auto">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold text-brand-muted/80 uppercase">Total Generado</span>
              <span className="text-xl font-black text-brand-deep">${localTotal.toLocaleString()}</span>
            </div>
            <div className="flex gap-4 border-t border-brand-muted/10 pt-3">
              <div className="flex-1">
                <span className="text-[9px] font-bold text-brand-muted uppercase flex items-center gap-1"><Banknote size={10}/> Efectivo</span>
                <p className="text-sm font-bold text-brand-navy mt-0.5">${localCash.toLocaleString()}</p>
              </div>
              <div className="flex-1">
                <span className="text-[9px] font-bold text-brand-muted uppercase flex items-center gap-1"><CreditCard size={10}/> Transf.</span>
                <p className="text-sm font-bold text-brand-navy mt-0.5">${localTransfer.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjetas de Repartidores de la Flota */}
        {drivers.map(d => {
          const dSales = daySales.filter(s => s.driver_id === d.id)
          const dTotal = dSales.reduce((acc, s) => acc + s.final_total, 0)
          const dCash = dSales.reduce((acc, s) => acc + s.payment_cash, 0)
          const dTransfer = dSales.reduce((acc, s) => acc + s.payment_transfer, 0)
          
          const dRoutes = weeklyRoutes.filter(r => r.driver_id === d.id && r.day_of_week === dayOfWeek)
          const assignedClientsCount = dRoutes.length
          const visitedClientsCount = dSales.length // Asumimos 1 ticket = 1 cliente visitado

          const progressPercent = assignedClientsCount === 0 ? 0 : Math.min(100, Math.round((visitedClientsCount / assignedClientsCount) * 100))
          
          // const statusColor = d.status === 'En Ruta' ? 'bg-brand-orange text-white' : d.status === 'Finalizado' ? 'bg-green-500 text-white' : 'bg-brand-muted text-white'

          const progressColor = progressPercent === 100 ? 'bg-green-500' : 'bg-brand-orange'

          // Para saber hace cuánto fue su última conexión
          let timeAgoStr = 'Hace un momento'
          const diffMs = new Date().getTime() - new Date(d.last_active).getTime()
          const diffMins = Math.floor(diffMs / 60000)
          if (diffMins > 60) timeAgoStr = `Hace ${Math.floor(diffMins/60)} hora(s)`
          else if (diffMins > 0) timeAgoStr = `Hace ${diffMins} min`

          return (
            <div key={d.id} className="bg-white rounded-3xl p-6 shadow-sm border border-brand-muted/10 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-black text-brand-deep text-lg leading-tight">{d.full_name}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`w-2 h-2 rounded-full ${d.status === 'En Ruta' ? 'bg-brand-orange animate-pulse' : 'bg-brand-muted'}`}></span>
                    <span className="text-xs font-semibold text-brand-muted/80">{d.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-brand-muted/60 uppercase flex items-center justify-end gap-1 mb-0.5">
                    <MapPin size={10}/> Base
                  </span>
                  <span className="text-[9px] font-bold text-brand-muted/50 flex items-center justify-end gap-1">
                    <Clock size={10}/> {timeAgoStr}
                  </span>
                </div>
              </div>

              <div className="mb-5">
                <div className="flex justify-between text-[11px] font-bold text-brand-muted uppercase mb-2">
                  <span>Progreso de Ruta (Hoy)</span>
                  <span className={`${progressPercent === 100 ? 'text-green-500' : 'text-brand-orange'} font-black text-sm`}>
                    {visitedClientsCount} / {assignedClientsCount}
                  </span>
                </div>
                <div className="w-full bg-brand-muted/10 rounded-full h-2">
                  <div className={`${progressColor} h-2 rounded-full transition-all duration-1000`} style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>

              <div className="bg-brand-muted/5 rounded-2xl p-4 mt-auto">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-brand-muted/80 uppercase">Total Generado</span>
                  <span className="text-xl font-black text-brand-deep">${dTotal.toLocaleString()}</span>
                </div>
                <div className="flex gap-4 border-t border-brand-muted/10 pt-3">
                  <div className="flex-1">
                    <span className="text-[9px] font-bold text-brand-muted uppercase flex items-center gap-1"><Banknote size={10}/> Efectivo</span>
                    <p className="text-sm font-bold text-green-600 mt-0.5">${dCash.toLocaleString()}</p>
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] font-bold text-brand-muted uppercase flex items-center gap-1"><CreditCard size={10}/> Transf.</span>
                    <p className="text-sm font-bold text-blue-600 mt-0.5">${dTransfer.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {drivers.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-brand-muted/30">
            <Activity className="mx-auto text-brand-muted/30 mb-3" size={32} />
            <p className="font-bold text-brand-muted">No hay repartidores registrados en la flota.</p>
          </div>
        )}

      </div>
    </div>
  )
}

// ==========================================
// SECCIÓN A.4: CLIENTES Y CUENTAS CORRIENTES
// ==========================================

const ClientProfileModal: React.FC<{ client: any, onClose: () => void }> = ({ client, onClose }) => {
  const { products, drivers } = useStore()
  const [sales, setSales] = useState<any[]>([])
  const [saleItems, setSaleItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  useEffect(() => {
    fetchHistory()
  }, [client.id, selectedMonth, selectedYear])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString()
      const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString()

      const { data: salesData, error: salesErr } = await supabase
        .from('sales')
        .select('*')
        .eq('client_id', client.id)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false })

      if (salesErr) throw salesErr

      const saleIds = salesData?.map(s => s.id) || []
      
      let itemsData: any[] = []
      if (saleIds.length > 0) {
        const { data: items, error: itemsErr } = await supabase
          .from('sale_items')
          .select('*')
          .in('sale_id', saleIds)
          
        if (itemsErr) throw itemsErr
        itemsData = items || []
      }

      setSales(salesData || [])
      setSaleItems(itemsData)
    } catch (err) {
      console.error('Error fetching client history:', err)
      Swal.fire('Error', 'No se pudo cargar el historial', 'error')
    } finally {
      setLoading(false)
    }
  }

  const totalSpent = sales.reduce((acc, s) => acc + s.final_total, 0)
  const totalReturns = sales.reduce((acc, s) => acc + s.total_returns, 0)
  
  const productStats = saleItems.reduce((acc, item) => {
    if (item.operation_type === 'sale') {
      const p = products.find(p => p.id === item.product_id)
      const pName = p ? p.name : 'Producto Eliminado'
      acc[pName] = (acc[pName] || 0) + item.quantity
    }
    return acc
  }, {} as Record<string, number>)

  const topProducts = Object.entries(productStats)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-brand-muted/20 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-brand-deep">{client.business_name}</h2>
            <p className="text-brand-muted text-sm mt-1">{client.legal_name || 'Sin Razón Social'} • CUIT: {client.cuit || '-'}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-brand-muted/10 hover:bg-brand-muted/20 rounded-xl text-brand-muted hover:text-brand-deep transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 border-b border-brand-muted/20 flex gap-4 items-center bg-brand-muted/5/50">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-brand-muted/80" />
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-bg-surface shadow-sm border border-brand-muted/30 rounded-xl p-2 text-sm text-brand-deep outline-none focus:border-brand-navy/30"
            >
              {Array.from({length: 12}).map((_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('es', { month: 'long' }).toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-bg-surface shadow-sm border border-brand-muted/30 rounded-xl p-2 text-sm text-brand-deep outline-none focus:border-brand-navy/30"
            >
              {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-brand-muted/80">
              <Activity className="animate-spin mr-2" size={24} /> Cargando datos...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-brand-muted/10/50 border border-brand-muted/30/50 rounded-2xl p-4">
                  <div className="flex items-center gap-3 text-brand-muted mb-2">
                    <Wallet size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Total Comprado</span>
                  </div>
                  <div className="text-2xl font-black text-brand-deep">${totalSpent.toLocaleString()}</div>
                </div>
                <div className="bg-brand-muted/10/50 border border-brand-muted/30/50 rounded-2xl p-4">
                  <div className="flex items-center gap-3 text-red-400 mb-2">
                    <TrendingDown size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Devoluciones</span>
                  </div>
                  <div className="text-2xl font-black text-red-400">${totalReturns.toLocaleString()}</div>
                </div>
                <div className="bg-brand-muted/10/50 border border-brand-muted/30/50 rounded-2xl p-4">
                  <div className="flex items-center gap-3 text-brand-navy mb-2">
                    <History size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Tickets Emitidos</span>
                  </div>
                  <div className="text-2xl font-black text-brand-navy">{sales.length}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-brand-muted/5 border border-brand-muted/20 rounded-2xl p-5 h-fit">
                  <h3 className="font-bold text-brand-deep text-sm flex items-center gap-2 mb-4">
                    <BarChart size={16} className="text-brand-navy" />
                    Top Productos del Mes
                  </h3>
                  {topProducts.length > 0 ? (
                    <div className="space-y-3">
                      {topProducts.map(([name, qty], index) => (
                        <div key={name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-brand-muted/10 flex items-center justify-center text-[10px] font-bold text-brand-muted">{index + 1}</span>
                            <span className="text-sm text-brand-deep/80 truncate max-w-[120px]" title={name}>{name}</span>
                          </div>
                          <span className="font-bold text-brand-deep text-sm">{qty as number} u.</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-brand-muted/80 text-center py-4">No hay compras registradas en este período.</p>
                  )}
                </div>

                <div className="lg:col-span-2 space-y-3">
                  <h3 className="font-bold text-brand-deep text-sm flex items-center gap-2 mb-4">
                    <History size={16} className="text-brand-navy" />
                    Historial de Compras
                  </h3>
                  {sales.length > 0 ? sales.map(sale => (
                    <div key={sale.id} className="bg-brand-muted/5 border border-brand-muted/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Clock size={14} className="text-brand-muted/80" />
                          <span className="text-sm font-bold text-brand-deep">
                            {new Date(sale.transaction_date).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-xs text-brand-muted/80">• {new Date(sale.transaction_date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs text-brand-muted/80">
                          Repartidor: <span className="text-brand-muted">{drivers.find(d => d.id === sale.driver_id)?.full_name || 'Desconocido'}</span>
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {sale.total_returns > 0 && (
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-brand-muted/80 block">Devuelto</span>
                            <span className="text-xs font-bold text-red-400">-${sale.total_returns}</span>
                          </div>
                        )}
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-brand-muted/80 block">Pagado / Deuda</span>
                          <span className="text-xs font-bold text-brand-deep/80">${sale.payment_cash + sale.payment_transfer} / ${sale.payment_account}</span>
                        </div>
                        <div className="text-right bg-brand-navy/10 px-3 py-1.5 rounded-xl border border-brand-navy/30/20">
                          <span className="text-[10px] uppercase font-bold text-brand-navy block">Total Compra</span>
                          <span className="text-sm font-black text-brand-deep">${sale.final_total}</span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="bg-brand-muted/5 border border-brand-muted/20 border-dashed rounded-2xl p-10 text-center">
                      <History size={32} className="text-slate-700 mx-auto mb-3" />
                      <p className="text-sm text-brand-muted/80">No hay tickets registrados para {new Date(2000, selectedMonth - 1).toLocaleString('es', { month: 'long' })} {selectedYear}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const FixedOrderModal: React.FC<{ client: any, onClose: () => void }> = ({ client, onClose }) => {
  const { products, fetchInitialData } = useStore()
  const [order, setOrder] = useState<Record<string, number>>(client.fixed_order || {})

  const handleUpdateQty = (productId: string, delta: number, unitType: string) => {
    const step = unitType === 'kg' ? 0.5 : 1
    const current = order[productId] || 0
    let next = current + delta * step
    if (next < 0) next = 0
    
    setOrder(prev => {
      const n = { ...prev }
      if (next === 0) delete n[productId]
      else n[productId] = next
      return n
    })
  }

  const handleSave = async () => {
    try {
      const { error } = await supabase.from('clients').update({ fixed_order: order }).eq('id', client.id)
      if (error) throw error
      fetchInitialData()
      Swal.fire('Guardado', 'El pedido fijo ha sido actualizado', 'success')
      onClose()
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'No se pudo guardar el pedido fijo', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-brand-muted/20 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-brand-deep">Pedido Fijo</h2>
            <p className="text-brand-muted text-sm mt-1">{client.business_name}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-brand-muted/10 hover:bg-brand-muted/20 rounded-xl text-brand-muted hover:text-brand-deep transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {products.map(p => {
            const qty = order[p.id] || 0
            return (
              <div key={p.id} className="flex justify-between items-center p-3 bg-brand-muted/5 rounded-2xl border border-brand-muted/10">
                <div>
                  <span className="font-bold text-brand-deep block text-sm">{p.name}</span>
                  <span className="text-[10px] uppercase font-bold text-brand-muted/80">{p.unit_type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleUpdateQty(p.id, -1, p.unit_type)} className="p-2 rounded-lg bg-white border border-brand-muted/20 text-brand-deep hover:bg-red-50 hover:text-red-600 transition-colors">
                    <Minus size={14}/>
                  </button>
                  <span className="font-black text-brand-deep w-16 text-center flex items-center justify-center gap-1">
                    {qty} <span className="text-[10px] text-brand-muted/80 font-bold lowercase">{p.unit_type === 'unidad' ? 'u' : p.unit_type === 'docena' ? 'doc' : p.unit_type === 'bolsa' ? 'bolsas' : p.unit_type}</span>
                  </span>
                  <button onClick={() => handleUpdateQty(p.id, 1, p.unit_type)} className="p-2 rounded-lg bg-white border border-brand-muted/20 text-brand-deep hover:bg-green-50 hover:text-green-600 transition-colors">
                    <Plus size={14}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="p-6 border-t border-brand-muted/20 bg-brand-muted/5/50 rounded-b-3xl">
          <button onClick={handleSave} className="w-full bg-brand-navy hover:bg-brand-navy/90 text-white font-bold py-3.5 rounded-xl transition-colors text-sm">
            Guardar Pedido Fijo
          </button>
        </div>
      </div>
    </div>
  )
}

const AdminClients: React.FC = () => {
  const { clients, fetchInitialData } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [clientType, setClientType] = useState<'Comercio' | 'Institución' | 'Empresa'>('Comercio')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [cuit, setCuit] = useState('')
  const [address, setAddress] = useState('')
  const [category, setCategory] = useState<'A' | 'B'>('B')
  const [allowCredit, setAllowCredit] = useState(false)
  const [creditLimit, setCreditLimit] = useState(0)
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<any>(null)
  const [selectedClientForFixedOrder, setSelectedClientForFixedOrder] = useState<any>(null)

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessName.trim() || !address.trim()) return

    try {
      const { error } = await supabase.from('clients').insert([
        { 
          business_name: businessName, 
          legal_name: legalName || null,
          client_type: clientType,
          phone: phone || null,
          email: email || null,
          cuit: cuit || null,
          address, 
          price_category: category, 
          allow_credit: allowCredit, 
          credit_limit: creditLimit > 0 ? creditLimit : null,
          current_balance: 0 
        }
      ])
      if (error) throw error

      setBusinessName('')
      setLegalName('')
      setClientType('Comercio')
      setPhone('')
      setEmail('')
      setCuit('')
      setAddress('')
      setCategory('B')
      setAllowCredit(false)
      setCreditLimit(0)
      setShowForm(false)
      fetchInitialData()

      Swal.fire('Cliente Registrado', 'Se añadió el nuevo comercio exitosamente.', 'success')
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'No se pudo crear el cliente.', 'error')
    }
  }

  const toggleCredit = async (clientId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ allow_credit: !currentStatus })
        .eq('id', clientId)

      if (error) throw error
      fetchInitialData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-bg-surface shadow-sm border border-brand-muted/20 p-5 rounded-2xl">
        <div>
          <h3 className="font-bold text-brand-deep text-base">Cartera de Clientes</h3>
          <p className="text-xs text-brand-muted/80 mt-0.5">Administre clientes, precios y cuentas corrientes</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="bg-brand-navy hover:bg-brand-navy text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
        >
          <Plus size={14} /> Nuevo Cliente
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddClient} className="bg-bg-surface shadow-sm border border-brand-muted/10 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-4">
          <h4 className="font-bold text-brand-deep text-sm">Nuevo Cliente</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Nombre Comercial *</label>
              <input 
                type="text" 
                required
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="Ej: Despensa Los Amigos"
                className="w-full bg-brand-muted/10 border border-brand-muted/30 rounded-xl p-2.5 text-sm text-brand-deep outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Razón Social</label>
              <input 
                type="text" 
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                placeholder="Ej: Los Amigos SRL"
                className="w-full bg-brand-muted/10 border border-brand-muted/30 rounded-xl p-2.5 text-sm text-brand-deep outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Tipo de Cliente</label>
              <select 
                value={clientType} 
                onChange={e => setClientType(e.target.value as any)}
                className="w-full bg-brand-muted/10 border border-brand-muted/30 text-brand-deep rounded-xl p-2.5 text-sm outline-none"
              >
                <option value="Comercio">Comercio</option>
                <option value="Institución">Institución</option>
                <option value="Empresa">Empresa</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Teléfono</label>
              <input 
                type="text" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ej: 549112345678"
                className="w-full bg-brand-muted/10 border border-brand-muted/30 rounded-xl p-2.5 text-sm text-brand-deep outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Ej: contacto@empresa.com"
                className="w-full bg-brand-muted/10 border border-brand-muted/30 rounded-xl p-2.5 text-sm text-brand-deep outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">CUIT</label>
              <input 
                type="text" 
                value={cuit}
                onChange={e => setCuit(e.target.value)}
                placeholder="Ej: 30-12345678-9"
                className="w-full bg-brand-muted/10 border border-brand-muted/30 rounded-xl p-2.5 text-sm text-brand-deep outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Dirección de Entrega *</label>
              <input 
                type="text" 
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Ej: Calle 12 #345"
                className="w-full bg-brand-muted/10 border border-brand-muted/30 rounded-xl p-2.5 text-sm text-brand-deep outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Categoría de Precios</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value as any)}
                className="w-full bg-brand-muted/10 border border-brand-muted/30 text-brand-deep rounded-xl p-2.5 text-sm outline-none"
              >
                <option value="B">Categoría B (Consumo Regular)</option>
                <option value="A">Categoría A (Mayoristas / Élite)</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-brand-muted/80 uppercase block">Límite de Crédito</label>
              <input 
                type="number" 
                value={creditLimit}
                onChange={e => setCreditLimit(parseFloat(e.target.value) || 0)}
                placeholder="Monto máximo permitido"
                disabled={!allowCredit}
                className="w-full bg-brand-muted/10 border border-brand-muted/30 rounded-xl p-2.5 text-sm text-brand-deep outline-none disabled:opacity-50"
              />
            </div>
            <div className="flex items-center gap-2.5 col-span-1 md:col-span-2 lg:col-span-3 pt-2">
              <input 
                type="checkbox" 
                id="allowCreditCheck" 
                checked={allowCredit}
                onChange={e => {
                  setAllowCredit(e.target.checked)
                  if (!e.target.checked) setCreditLimit(0)
                }}
                className="w-4 h-4 rounded text-blue-600 bg-brand-muted/10 border-brand-muted/20"
              />
              <label htmlFor="allowCreditCheck" className="text-xs text-brand-deep/80 font-semibold cursor-pointer">Habilitar Cuenta Corriente (Venta a Crédito)</label>
            </div>
          </div>
          <button type="submit" className="bg-brand-navy hover:bg-brand-navy text-white px-4 py-2 rounded-lg text-xs font-bold mt-4">
            Guardar Cliente
          </button>
        </form>
      )}

      <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-bg-app text-brand-muted/80 border-b border-brand-muted/20/80">
              <th className="px-6 py-4 font-bold uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider">Contacto</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider">Tarifa</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider">Acciones / CC</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Saldo Actual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-brand-muted/5/20 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-bold text-brand-deep block">{c.business_name}</span>
                  <span className="text-[10px] text-brand-muted/80">{c.client_type}</span>
                </td>
                <td className="px-6 py-4 text-brand-muted">
                  <span className="block">{c.phone || '-'}</span>
                  <span className="text-[10px] truncate max-w-[120px]">{c.email}</span>
                </td>
                <td className="px-6 py-4 font-bold text-brand-navy">Cat. {c.price_category}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedClientForHistory(c)}
                      title="Ver Historial y Estadísticas"
                      className="p-1.5 bg-brand-navy/10 text-brand-navy hover:bg-brand-navy/20 rounded-lg transition-colors"
                    >
                      <History size={16} />
                    </button>
                    <button 
                      onClick={() => setSelectedClientForFixedOrder(c)}
                      title="Configurar Pedido Fijo"
                      className="p-1.5 bg-brand-orange/10 text-brand-orange hover:bg-brand-orange/20 rounded-lg transition-colors"
                    >
                      <Package size={16} />
                    </button>
                    <button 
                      onClick={() => toggleCredit(c.id, c.allow_credit)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${c.allow_credit ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-brand-muted/5 text-brand-muted/80 border-brand-muted/20'}`}
                    >
                      {c.allow_credit ? 'Habilitado' : 'Inactivo'}
                    </button>
                  </div>
                </td>
                <td className={`px-6 py-4 text-right font-black ${c.current_balance < 0 ? 'text-red-400' : c.current_balance > 0 ? 'text-green-400' : 'text-brand-muted/80'}`}>
                  ${Math.abs(c.current_balance).toLocaleString()} {c.current_balance < 0 ? '(Deuda)' : c.current_balance > 0 ? '(A favor)' : ''}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-brand-muted/80">No hay clientes creados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedClientForHistory && (
        <ClientProfileModal 
          client={selectedClientForHistory} 
          onClose={() => setSelectedClientForHistory(null)} 
        />
      )}

      {selectedClientForFixedOrder && (
        <FixedOrderModal 
          client={selectedClientForFixedOrder} 
          onClose={() => setSelectedClientForFixedOrder(null)} 
        />
      )}
    </div>
  )
}

// ==========================================
// SECCIÓN A.5: GASTOS OPERATIVOS
// ==========================================
const AdminExpenses: React.FC = () => {
  const { expenseCategories, driverExpenseCategories, fetchInitialData } = useStore()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6')
  const [newDriverCategoryName, setNewDriverCategoryName] = useState('')
  const [newDriverCategoryColor, setNewDriverCategoryColor] = useState('#3b82f6')

  // Seteamos la categoría por defecto cuando cargan las categorías
  useEffect(() => {
    if (expenseCategories.length > 0 && !category) {
      setCategory(expenseCategories[0].name)
    }
  }, [expenseCategories, category])

  // Paleta de colores sugerida para la selección rápida
  const PALETTE = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16']

  const getCategoryColor = (catName: string, index: number) => {
    const cat = expenseCategories.find(c => c.name === catName)
    return cat?.color || PALETTE[index % PALETTE.length]
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(amount)
    if (isNaN(val) || val <= 0 || !description.trim() || !category) return

    try {
      const { error } = await supabase.from('expenses').insert([
        {
          category,
          amount: val,
          description,
          origin: 'Administración Central',
          payment_method: 'transferencia'
        }
      ])
      if (error) throw error

      setAmount('')
      setDescription('')
      await fetchInitialData()
      await fetchMonthly()
      Swal.fire('Gasto Registrado', 'Se guardó la salida de caja de fábrica.', 'success')
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'No se pudo guardar el gasto.', 'error')
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    const catName = newCategoryName.trim()
    if (!catName) return

    try {
      const { error } = await supabase.from('expense_categories').insert([
        { name: catName, color: newCategoryColor }
      ])
      if (error) {
        if (error.code === '23505') throw new Error('La categoría ya existe')
        throw error
      }

      setNewCategoryName('')
      setNewCategoryColor('#3b82f6')
      fetchInitialData()
      setCategory(catName) // Seleccionamos la nueva categoría
      Swal.fire('Categoría Creada', `La categoría "${catName}" ha sido creada.`, 'success')
    } catch (err: any) {
      console.error(err)
      Swal.fire('Error', err.message || 'No se pudo crear la categoría.', 'error')
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar categoría?',
      text: `Se eliminará "${name}". Los gastos ya registrados la conservarán como texto.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('expense_categories').delete().eq('id', id)
        if (error) throw error
        fetchInitialData()
        Swal.fire('Eliminada', 'La categoría ha sido eliminada.', 'success')
      } catch (err) {
        console.error(err)
        Swal.fire('Error', 'No se pudo eliminar la categoría.', 'error')
      }
    }
  }

  const handleAddDriverCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    const catName = newDriverCategoryName.trim()
    if (!catName) return

    try {
      const { error } = await supabase.from('driver_expense_categories').insert([
        { name: catName, color: newDriverCategoryColor }
      ])
      if (error) {
        if (error.code === '23505') throw new Error('La categoría ya existe')
        throw error
      }

      setNewDriverCategoryName('')
      setNewDriverCategoryColor('#3b82f6')
      fetchInitialData()
      Swal.fire('Categoría Creada', `La categoría de repartidor "${catName}" ha sido creada.`, 'success')
    } catch (err: any) {
      console.error(err)
      Swal.fire('Error', err.message || 'No se pudo crear la categoría.', 'error')
    }
  }

  const handleDeleteDriverCategory = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar categoría?',
      text: `Se eliminará la categoría de repartidor "${name}". Los gastos ya registrados por choferes no se verán afectados.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('driver_expense_categories').delete().eq('id', id)
        if (error) throw error
        fetchInitialData()
        Swal.fire('Eliminada', 'La categoría de repartidor ha sido eliminada.', 'success')
      } catch (err) {
        console.error(err)
        Swal.fire('Error', 'No se pudo eliminar la categoría.', 'error')
      }
    }
  }

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([])

  const fetchMonthly = useCallback(async () => {
    const start = new Date(selectedMonth + '-01T00:00:00').toISOString()
    const endDate = new Date(selectedMonth + '-01T00:00:00')
    endDate.setMonth(endDate.getMonth() + 1)
    const end = endDate.toISOString()
    
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', start)
      .lt('expense_date', end)
      .order('expense_date', { ascending: false })
      
    if (!error && data) {
      setMonthlyExpenses(data)
    }
  }, [selectedMonth])

  useEffect(() => {
    fetchMonthly()
  }, [fetchMonthly])

  const totalFiltered = monthlyExpenses.reduce((acc, exp) => acc + exp.amount, 0)

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    monthlyExpenses.forEach(exp => {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount
    })
    return Object.entries(totals).sort((a, b) => b[1] - a[1])
  }, [monthlyExpenses])

  const conicGradient = useMemo(() => {
    if (totalFiltered === 0) return 'conic-gradient(#334155 0% 100%)'
    let stops: string[] = []
    let currentAngle = 0
    categoryTotals.forEach(([cat, amt], index) => {
      const percent = (amt / totalFiltered) * 100
      const color = getCategoryColor(cat, index)
      stops.push(`${color} ${currentAngle}% ${currentAngle + percent}%`)
      currentAngle += percent
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [categoryTotals, totalFiltered, expenseCategories])

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 h-full">
      <div className="flex flex-col gap-6 w-full lg:w-[350px] flex-shrink-0">
        {/* Carga de gasto */}
        <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl p-6 h-fit">
        <h3 className="font-bold text-brand-deep text-base mb-1 flex items-center gap-2"><TrendingDown size={18} className="text-red-500"/> Registrar Salida</h3>
        <p className="text-xs text-brand-muted/80 mb-5">Ingrese un egreso administrativo o de fábrica</p>
        
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Monto ($)</label>
            <input 
              type="number" 
              step="any"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-brand-muted/5 border border-brand-muted/30 rounded-xl p-3 font-bold text-brand-deep text-lg outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Categoría</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-brand-muted/5 border border-brand-muted/30 text-brand-deep rounded-xl p-3 text-sm font-semibold outline-none"
            >
              {expenseCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Descripción</label>
            <input 
              type="text" 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Factura luz Edesur"
              className="w-full bg-brand-muted/5 border border-brand-muted/30 rounded-xl p-3 text-sm text-brand-deep outline-none"
            />
          </div>
          <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl transition-colors text-sm">
            Guardar Gasto
          </button>
        </form>
      </div>

      {/* Carga de nueva categoría */}
      <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl p-6 h-fit">
        <h3 className="font-bold text-brand-deep text-base mb-1 flex items-center gap-2"><Plus size={18} className="text-brand-navy"/> Nueva Categoría</h3>
        <p className="text-xs text-brand-muted/80 mb-5">Agregue un nuevo tipo de gasto al sistema</p>
        
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <input 
              type="text" 
              required
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              placeholder="Ej: Impuestos"
              className="w-full bg-brand-muted/5 border border-brand-muted/30 rounded-xl p-3 text-sm text-brand-deep outline-none mb-3"
            />
            
            <div className="flex flex-wrap gap-2">
              {PALETTE.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCategoryColor(color)}
                  className={`w-6 h-6 rounded-full flex-shrink-0 transition-all ${newCategoryColor === color ? 'ring-2 ring-brand-navy ring-offset-2 scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-brand-navy hover:bg-brand-navy/90 text-white font-bold py-3 rounded-xl transition-colors text-sm">
            Añadir Categoría
          </button>
        </form>

        {/* Lista de Categorías */}
        <div className="mt-6 border-t border-brand-muted/20 pt-4">
          <h4 className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-3">Categorías Registradas</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {expenseCategories.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-bg-app border border-brand-muted/10 p-2.5 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: c.color }}></div>
                  <span className="text-sm font-bold text-brand-deep">{c.name}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => handleDeleteCategory(c.id, c.name)}
                  className="text-red-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100"
                  title="Eliminar categoría"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {expenseCategories.length === 0 && (
              <div className="text-xs text-brand-muted/60 text-center py-2">No hay categorías</div>
            )}
          </div>
        </div>
      </div>

      {/* Carga de nueva categoría de Repartidores */}
      <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl p-6 h-fit">
        <h3 className="font-bold text-brand-deep text-base mb-1 flex items-center gap-2"><Truck size={18} className="text-brand-orange"/> Categorías Repartidores</h3>
        <p className="text-xs text-brand-muted/80 mb-5">Gestione los tipos de gastos disponibles para choferes en ruta</p>
        
        <form onSubmit={handleAddDriverCategory} className="space-y-4">
          <div>
            <input 
              type="text" 
              required
              value={newDriverCategoryName}
              onChange={e => setNewDriverCategoryName(e.target.value)}
              placeholder="Ej: Combustible, Peaje..."
              className="w-full bg-brand-muted/5 border border-brand-muted/30 rounded-xl p-3 text-sm text-brand-deep outline-none mb-3"
            />
            
            <div className="flex flex-wrap gap-2">
              {PALETTE.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewDriverCategoryColor(color)}
                  className={`w-6 h-6 rounded-full flex-shrink-0 transition-all ${newDriverCategoryColor === color ? 'ring-2 ring-brand-orange ring-offset-2 scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-bold py-3 rounded-xl transition-colors text-sm">
            Añadir Categoría
          </button>
        </form>

        {/* Lista de Categorías de Repartidores */}
        <div className="mt-6 border-t border-brand-muted/20 pt-4">
          <h4 className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mb-3">Categorías Registradas</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {driverExpenseCategories?.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-bg-app border border-brand-muted/10 p-2.5 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: c.color }}></div>
                  <span className="text-sm font-bold text-brand-deep">{c.name}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => handleDeleteDriverCategory(c.id, c.name)}
                  className="text-red-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100"
                  title="Eliminar categoría de repartidor"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {(!driverExpenseCategories || driverExpenseCategories.length === 0) && (
              <div className="text-xs text-brand-muted/60 text-center py-2">No hay categorías</div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Gráfico Pizza e Historial */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Selector de Mes */}
        <div className="flex justify-end">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-bg-surface border border-brand-muted/30 text-brand-deep rounded-xl px-4 py-2 text-sm font-bold shadow-sm outline-none"
          />
        </div>

        {/* Gráfico circular */}
        <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-8 shadow-md">
          <div 
            className="w-40 h-40 rounded-full flex items-center justify-center relative flex-shrink-0 transition-all shadow-inner"
            style={{ background: conicGradient }}
          >
            <div className="w-28 h-28 bg-bg-surface shadow-sm rounded-full flex flex-col items-center justify-center absolute">
              <span className="text-[8px] text-brand-muted/80 font-bold uppercase tracking-wider mb-0.5">Egresos</span>
              <span className="font-black text-brand-deep text-base">${totalFiltered.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
            {totalFiltered === 0 ? (
              <div className="text-brand-muted/80 text-xs italic py-6 col-span-2 text-center">No hay gastos ingresados en este mes.</div>
            ) : (
              categoryTotals.map(([cat, amt], index) => {
                const percent = Math.round((amt / totalFiltered) * 100)
                return (
                  <div key={cat} className="flex items-center gap-3 bg-bg-app border border-brand-muted/10 p-3 rounded-xl">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow" style={{ backgroundColor: getCategoryColor(cat, index) }}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-brand-deep/80 truncate">{cat}</p>
                      <p className="text-[9px] text-brand-muted/80">{percent}%</p>
                    </div>
                    <span className="font-bold text-brand-deep text-xs">${amt.toLocaleString()}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Tabla Historial */}
        <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl overflow-hidden shadow-lg flex-1 min-h-[250px] max-h-[500px] flex flex-col">
          <div className="bg-bg-app p-4 border-b border-brand-muted/20/80 shrink-0">
            <h4 className="font-bold text-brand-deep text-xs uppercase tracking-wider">Historial de Salidas</h4>
          </div>
          <div className="overflow-y-auto p-2 flex-1">
            <table className="w-full text-left border-collapse text-[11px] font-mono">
              <thead>
                <tr className="border-b border-brand-muted/10 text-brand-muted/80">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {monthlyExpenses.map(e => (
                  <tr 
                    key={e.id} 
                    className="hover:opacity-80 text-brand-deep/80 transition-opacity"
                    style={{ backgroundColor: getCategoryColor(e.category, 0) + '33' }}
                  >
                    <td className="px-4 py-3 text-brand-muted/80 whitespace-nowrap">{new Date(e.expense_date).toLocaleDateString('es-AR')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded font-bold border text-[9px] ${e.origin.includes('Administración') ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-brand-orange/10 text-orange-400 border-orange-500/20'}`}>
                        {e.origin}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold">{e.category}</td>
                    <td className="px-4 py-3 text-brand-muted">{e.description}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-400">-${e.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {monthlyExpenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-brand-muted/80">No hay egresos cargados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// SECCIÓN A.6: ACTUALIZACIÓN Y MERMAS DE STOCK
// ==========================================
export const AdminStock: React.FC = () => {
  const { products, applyStockUpdate, revertStockUpdate } = useStore()
  const [inputs, setInputs] = useState<Record<string, { added: string, removed: string }>>({})
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('stock_updates')
        .select(`
          id, status, created_at, 
          stock_update_items(product_id, added_quantity, removed_quantity),
          stock_losses(quantity, loss_type)
        `)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (!error && data) {
        setHistory(data)
      }
    } catch(err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const itemsToUpdate: { product_id: string; added_quantity: number; removed_quantity: number }[] = []
      
      for (const [id, vals] of Object.entries(inputs)) {
        const added = parseFloat(vals.added) || 0
        const removed = parseFloat(vals.removed) || 0
        if (added > 0 || removed > 0) {
          itemsToUpdate.push({ product_id: id, added_quantity: added, removed_quantity: removed })
        }
      }

      if (itemsToUpdate.length === 0) {
        Swal.fire('Sin cambios', 'Debes ingresar al menos una cantidad (producción o pérdida).', 'info')
        return
      }

      const confirm = await Swal.fire({
        title: '¿Confirmar actualización?',
        text: `Vas a procesar ${itemsToUpdate.length} productos.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, procesar'
      })

      if (confirm.isConfirmed) {
        await applyStockUpdate(itemsToUpdate)
        setInputs({})
        await loadHistory()
        Swal.fire('Éxito', 'Stock y mermas actualizados correctamente.', 'success')
      }
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'No se pudo actualizar el stock.', 'error')
    }
  }

  const handleRevert = async (id: string) => {
    const confirm = await Swal.fire({
      title: '¿Revertir actualización?',
      text: 'Se desharán todos los ingresos y mermas de este lote.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, deshacer'
    })

    if (confirm.isConfirmed) {
      try {
        await revertStockUpdate(id)
        await loadHistory()
        Swal.fire('Revertido', 'La actualización fue cancelada y los números volvieron a la normalidad.', 'success')
      } catch (err) {
        console.error(err)
        Swal.fire('Error', 'No se pudo revertir.', 'error')
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col xl:flex-row gap-6">
      {/* Formulario de Actualización */}
      <div className="flex-1 bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl overflow-hidden">
        <div className="p-6 bg-brand-orange/5 border-b border-brand-muted/20 flex items-start gap-4">
          <div className="bg-brand-orange/10 p-3 rounded-xl text-brand-orange">
            <ClipboardList size={24} />
          </div>
          <div>
            <h3 className="font-bold text-brand-deep text-base">Actualización de Stock y Mermas</h3>
            <p className="text-xs text-brand-muted/80 mt-1">Registre producción nueva y mermas del día</p>
          </div>
        </div>

        <form onSubmit={handleStockUpdate} className="p-6 space-y-4">
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {products.map(p => (
              <div key={p.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-bg-app border border-brand-muted/10 rounded-2xl">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-brand-deep text-sm flex items-center gap-2">
                    {p.name}
                  </div>
                  <div className="text-xs text-brand-muted mt-0.5">Stock Actual: <span className="font-bold">{p.bakery_stock} {p.unit_type}</span></div>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Pérdida */}
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-red-400 mb-1">Merma (Sobró)</label>
                    <input 
                      type="number" 
                      step={p.unit_type === 'kg' ? 'any' : '1'}
                      min="0"
                      value={inputs[p.id]?.removed || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, [p.id]: { ...prev[p.id], removed: e.target.value } }))}
                      className="w-24 py-2 px-3 bg-red-500/5 border border-red-500/20 rounded-xl text-right font-bold text-xs text-red-500 outline-none focus:border-red-500"
                      placeholder="0"
                    />
                  </div>
                  
                  {/* Nuevo Stock */}
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-green-500 mb-1">Nueva Prod.</label>
                    <input 
                      type="number" 
                      step={p.unit_type === 'kg' ? 'any' : '1'}
                      min="0"
                      value={inputs[p.id]?.added || ''}
                      onChange={(e) => setInputs(prev => ({ ...prev, [p.id]: { ...prev[p.id], added: e.target.value } }))}
                      className="w-24 py-2 px-3 bg-green-500/5 border border-green-500/20 rounded-xl text-right font-bold text-xs text-green-500 outline-none focus:border-green-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button 
            type="submit" 
            className="w-full mt-6 bg-brand-orange hover:bg-orange-500 text-white font-bold py-3.5 rounded-xl transition-colors text-sm"
          >
            Procesar Actualización
          </button>
        </form>
      </div>

      {/* Historial para revertir */}
      <div className="w-full xl:w-[350px] bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl p-6 flex flex-col h-fit">
        <h3 className="font-bold text-brand-deep text-base mb-1">Historial</h3>
        <p className="text-[11px] text-brand-muted/80 mb-5">Últimos movimientos realizados</p>

        <div className="space-y-3">
          {history.length === 0 && !loadingHistory ? (
             <div className="text-center py-6 text-brand-muted/60 text-xs">No hay actualizaciones recientes</div>
          ) : history.map(item => {
             const mermasTotales = item.stock_losses?.reduce((acc: number, l: any) => acc + l.quantity, 0) || 0;
             const ingresado = item.stock_update_items?.reduce((acc: number, l: any) => acc + l.added_quantity, 0) || 0;

             return (
              <div key={item.id} className="p-3 bg-bg-app border border-brand-muted/10 rounded-xl relative">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-brand-muted font-bold">{new Date(item.created_at).toLocaleString('es-AR')}</span>
                  {item.status === 'applied' ? (
                    <span className="text-[9px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded font-bold">Aplicado</span>
                  ) : (
                    <span className="text-[9px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-bold">Cancelado</span>
                  )}
                </div>
                
                <div className="text-[11px] text-brand-deep mb-3 space-y-1">
                  <p>Mermas Totales: <strong className="text-red-400">{mermasTotales}</strong></p>
                  <p>Nueva Prod: <strong className="text-green-500">{ingresado}</strong></p>
                </div>

                {item.status === 'applied' && (
                  <button 
                    onClick={() => handleRevert(item.id)}
                    className="text-[10px] w-full py-1.5 bg-red-500/10 text-red-500 font-bold rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                  >
                    Deshacer/Revertir
                  </button>
                )}
              </div>
             )
          })}
        </div>
      </div>
    </div>
  )
}

// ==========================================
// SECCIÓN A.7: CATÁLOGO DE PRODUCTOS
// ==========================================
const AdminProducts: React.FC = () => {
  const { products, fetchInitialData } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [unitType, setUnitType] = useState<'kg' | 'docena' | 'bolsa' | 'unidad' | 'caja'>('kg')
  const [priceA, setPriceA] = useState('')
  const [priceB, setPriceB] = useState('')

  // Estados para edición
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editName, setEditName] = useState('')
  const [editUnitType, setEditUnitType] = useState<'kg' | 'docena' | 'bolsa' | 'unidad' | 'caja'>('kg')
  const [editPriceA, setEditPriceA] = useState('')
  const [editPriceB, setEditPriceB] = useState('')

  // Estados para ver detalle
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [productStats, setProductStats] = useState<{ totalSold: number; totalEarnings: number } | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    const pA = parseFloat(priceA)
    const pB = parseFloat(priceB)
    if (!name.trim() || isNaN(pA) || isNaN(pB)) return

    try {
      const { error } = await supabase.from('products').insert([
        { name, unit_type: unitType, price_a: pA, price_b: pB, bakery_stock: 0, is_paused: false }
      ])
      if (error) throw error

      setName('')
      setPriceA('')
      setPriceB('')
      setShowForm(false)
      fetchInitialData()

      Swal.fire('Producto Registrado', 'Se añadió el producto al catálogo.', 'success')
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'No se pudo agregar el producto.', 'error')
    }
  }

  const handleDeleteProduct = async (id: string, name: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar producto?',
      text: `Se eliminará "${name}" del catálogo de forma permanente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('products').update({ is_deleted: true }).eq('id', id)
        if (error) throw error
        fetchInitialData()
        Swal.fire('Eliminado', 'El producto ha sido eliminado.', 'success')
      } catch (err) {
        console.error(err)
        Swal.fire('Error', 'No se pudo eliminar el producto.', 'error')
      }
    }
  }

  const handleTogglePauseProduct = async (p: Product) => {
    const newPauseState = !p.is_paused
    try {
      const { error } = await supabase.from('products').update({ is_paused: newPauseState }).eq('id', p.id)
      if (error) throw error
      fetchInitialData()
      const title = newPauseState ? 'Producto Pausado' : 'Producto Activado'
      const text = newPauseState ? 'El producto ya no estará visible para los choferes.' : 'El producto vuelve a estar disponible para los choferes.'
      Swal.fire({
        title,
        text,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'No se pudo cambiar el estado del producto.', 'error')
    }
  }

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return
    const pA = parseFloat(editPriceA)
    const pB = parseFloat(editPriceB)
    if (!editName.trim() || isNaN(pA) || isNaN(pB)) return

    try {
      const { error } = await supabase.from('products').update({
        name: editName,
        unit_type: editUnitType,
        price_a: pA,
        price_b: pB
      }).eq('id', editingProduct.id)
      
      if (error) throw error

      setEditingProduct(null)
      fetchInitialData()
      Swal.fire('Producto Actualizado', 'Los cambios han sido guardados.', 'success')
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'No se pudieron guardar los cambios.', 'error')
    }
  }

  const handleViewProduct = async (p: Product) => {
    setViewingProduct(p)
    setLoadingStats(true)
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select('quantity, operation_type, unit_price')
        .eq('product_id', p.id)
      
      if (error) throw error
      
      let totalSold = 0
      let totalEarnings = 0
      if (data) {
        data.forEach(item => {
          if (item.operation_type === 'sale') {
            totalSold += Number(item.quantity)
            totalEarnings += Number(item.quantity) * Number(item.unit_price)
          } else if (item.operation_type === 'return') {
            totalSold -= Number(item.quantity)
            totalEarnings -= Number(item.quantity) * Number(item.unit_price)
          }
        })
      }
      setProductStats({ totalSold, totalEarnings })
    } catch (err) {
      console.error(err)
      setProductStats({ totalSold: 0, totalEarnings: 0 })
    } finally {
      setLoadingStats(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-bg-surface shadow-sm border border-brand-muted/20 p-5 rounded-2xl">
        <div>
          <h3 className="font-bold text-brand-deep text-base">Catálogo de Productos</h3>
          <p className="text-xs text-brand-muted/80 mt-0.5">Administre precios y unidades de medida</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="bg-brand-navy hover:bg-brand-navy text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
        >
          <Plus size={14} /> Nuevo Producto
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddProduct} className="bg-bg-surface shadow-sm border border-slate-855 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-4">
          <h4 className="font-bold text-brand-deep text-sm">Nuevo Producto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Nombre</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Medialunas de manteca"
                className="w-full bg-brand-muted/10 border border-brand-muted/30 rounded-xl p-2.5 text-sm text-brand-deep outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Unidad de Medida</label>
              <select 
                value={unitType} 
                onChange={e => setUnitType(e.target.value as any)}
                className="w-full bg-brand-muted/10 border border-brand-muted/30 text-brand-deep rounded-xl p-2.5 text-sm outline-none"
              >
                <option value="kg">kilogramo (kg)</option>
                <option value="docena">docena</option>
                <option value="bolsa">bolsa</option>
                <option value="unidad">unidad</option>
                <option value="caja">caja</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Precio Categoría A ($)</label>
              <input 
                type="number" 
                required
                value={priceA}
                onChange={e => setPriceA(e.target.value)}
                placeholder="Ej: 1500"
                className="w-full bg-brand-muted/10 border border-brand-muted/30 rounded-xl p-2.5 text-sm text-brand-deep outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Precio Categoría B ($)</label>
              <input 
                type="number" 
                required
                value={priceB}
                onChange={e => setPriceB(e.target.value)}
                placeholder="Ej: 1300"
                className="w-full bg-brand-muted/10 border border-brand-muted/30 rounded-xl p-2.5 text-sm text-brand-deep outline-none"
              />
            </div>
          </div>
          <button type="submit" className="bg-brand-navy hover:bg-brand-navy text-white px-4 py-2 rounded-lg text-xs font-bold">
            Guardar Producto
          </button>
        </form>
      )}

      <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-bg-app text-brand-muted/80 border-b border-brand-muted/20/80">
              <th className="px-6 py-4 font-bold uppercase tracking-wider">Producto</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider">Unidad</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider">Precio Cat. A</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider">Precio Cat. B</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Stock Fábrica</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {products.map(p => (
              <tr key={p.id} className={`hover:bg-brand-muted/5/20 transition-all ${p.is_paused ? 'opacity-50 bg-slate-900/5' : ''}`}>
                <td className="px-6 py-4 font-bold text-brand-deep">
                  <div className="flex items-center gap-2">
                    {p.name}
                    {p.is_paused && (
                      <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded border border-orange-200">Pausado</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-0.5 bg-brand-muted/10 text-brand-muted rounded-md border border-brand-muted/20 font-semibold">{p.unit_type}</span>
                </td>
                <td className="px-6 py-4 font-bold text-brand-navy">${p.price_a}</td>
                <td className="px-6 py-4 font-bold text-indigo-400">${p.price_b}</td>
                <td className="px-6 py-4 text-right text-brand-muted font-semibold">{p.bakery_stock} {p.unit_type}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleViewProduct(p)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver Detalles"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingProduct(p)
                        setEditName(p.name)
                        setEditUnitType(p.unit_type)
                        setEditPriceA(p.price_a.toString())
                        setEditPriceB(p.price_b.toString())
                      }}
                      className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleTogglePauseProduct(p)}
                      className={`p-1.5 rounded-lg transition-colors ${p.is_paused ? 'text-green-600 hover:bg-green-50' : 'text-orange-500 hover:bg-orange-50'}`}
                      title={p.is_paused ? 'Activar' : 'Pausar'}
                    >
                      {p.is_paused ? <Play size={15} /> : <Pause size={15} />}
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id, p.name)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Borrar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-brand-muted/80">No hay productos cargados en catálogo.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE EDICIÓN */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-bg-surface border border-brand-muted/20 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 text-brand-deep">
            <div className="flex justify-between items-center mb-4 border-b border-brand-muted/10 pb-3">
              <h3 className="font-bold text-brand-deep text-base">Editar Producto</h3>
              <button onClick={() => setEditingProduct(null)} className="p-1.5 hover:bg-brand-muted/10 rounded-lg text-brand-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditProductSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Nombre</label>
                <input 
                  type="text" 
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-brand-muted/5 border border-brand-muted/20 rounded-xl p-2.5 text-sm text-brand-deep outline-none focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Unidad de Medida</label>
                <select 
                  value={editUnitType} 
                  onChange={e => setEditUnitType(e.target.value as any)}
                  className="w-full bg-brand-muted/5 border border-brand-muted/20 text-brand-deep rounded-xl p-2.5 text-sm outline-none focus:border-brand-navy"
                >
                  <option value="kg">kilogramo (kg)</option>
                  <option value="docena">docena</option>
                  <option value="bolsa">bolsa</option>
                  <option value="unidad">unidad</option>
                  <option value="caja">caja</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Precio Categoría A ($)</label>
                <input 
                  type="number" 
                  required
                  value={editPriceA}
                  onChange={e => setEditPriceA(e.target.value)}
                  className="w-full bg-brand-muted/5 border border-brand-muted/20 rounded-xl p-2.5 text-sm text-brand-deep outline-none focus:border-brand-navy"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-brand-muted/80 uppercase block mb-1">Precio Categoría B ($)</label>
                <input 
                  type="number" 
                  required
                  value={editPriceB}
                  onChange={e => setEditPriceB(e.target.value)}
                  className="w-full bg-brand-muted/5 border border-brand-muted/20 rounded-xl p-2.5 text-sm text-brand-deep outline-none focus:border-brand-navy"
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-brand-muted/10">
                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 bg-brand-muted/10 hover:bg-brand-muted/20 text-brand-deep font-bold py-2.5 rounded-xl text-xs transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-brand-navy hover:bg-brand-navy text-white font-bold py-2.5 rounded-xl text-xs transition-colors">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLES */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-bg-surface border border-brand-muted/20 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 text-brand-deep">
            <div className="flex justify-between items-center mb-4 border-b border-brand-muted/10 pb-3">
              <h3 className="font-bold text-brand-deep text-base">Detalles del Producto</h3>
              <button onClick={() => setViewingProduct(null)} className="p-1.5 hover:bg-brand-muted/10 rounded-lg text-brand-muted transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3.5">
              <div className="flex justify-between border-b border-brand-muted/10 pb-2">
                <span className="text-xs text-brand-muted font-bold">Nombre:</span>
                <span className="text-sm font-bold">{viewingProduct.name}</span>
              </div>
              <div className="flex justify-between border-b border-brand-muted/10 pb-2">
                <span className="text-xs text-brand-muted font-bold">Estado:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${viewingProduct.is_paused ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-green-100 text-green-600 border border-green-200'}`}>
                  {viewingProduct.is_paused ? 'Pausado' : 'Activo'}
                </span>
              </div>
              <div className="flex justify-between border-b border-brand-muted/10 pb-2">
                <span className="text-xs text-brand-muted font-bold">Unidad:</span>
                <span className="text-sm font-bold">{viewingProduct.unit_type}</span>
              </div>
              <div className="flex justify-between border-b border-brand-muted/10 pb-2">
                <span className="text-xs text-brand-muted font-bold">Precio Cat. A:</span>
                <span className="text-sm font-black text-brand-navy">${viewingProduct.price_a}</span>
              </div>
              <div className="flex justify-between border-b border-brand-muted/10 pb-2">
                <span className="text-xs text-brand-muted font-bold">Precio Cat. B:</span>
                <span className="text-sm font-black text-indigo-500">${viewingProduct.price_b}</span>
              </div>
              <div className="flex justify-between border-b border-brand-muted/10 pb-2">
                <span className="text-xs text-brand-muted font-bold">Stock en Fábrica:</span>
                <span className="text-sm font-bold">{viewingProduct.bakery_stock} {viewingProduct.unit_type}</span>
              </div>
              
              <div className="mt-6 bg-brand-muted/5 p-4 rounded-2xl border border-brand-muted/10 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-brand-muted">Historial de Ventas</h4>
                {loadingStats ? (
                  <div className="text-center py-4">
                    <span className="text-xs text-brand-muted animate-pulse">Cargando estadísticas...</span>
                  </div>
                ) : productStats ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-brand-muted/15 shadow-sm text-center">
                      <span className="text-[9px] text-brand-muted uppercase font-bold block">Vendidos</span>
                      <span className="text-sm font-black text-brand-navy">{productStats.totalSold} {viewingProduct.unit_type}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-brand-muted/15 shadow-sm text-center">
                      <span className="text-[9px] text-brand-muted uppercase font-bold block">Recaudado</span>
                      <span className="text-sm font-black text-green-600">${productStats.totalEarnings.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-brand-muted text-center py-2">No se pudieron cargar las estadísticas.</div>
                )}
              </div>
            </div>
            <button onClick={() => setViewingProduct(null)} className="w-full mt-6 bg-brand-muted/15 hover:bg-brand-muted/20 text-brand-deep font-bold py-3 rounded-xl text-xs transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ==========================================
// SECCIÓN A.8: RUTAS DIARIAS
// ==========================================

const AdminRoutes: React.FC = () => {
  const { drivers, clients, weeklyRoutes, fetchInitialData } = useStore()
  
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() === 0 ? 7 : new Date().getDay())
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Set default driver if available
  useEffect(() => {
    if (drivers.length > 0 && !selectedDriverId) {
      setSelectedDriverId(drivers[0].id)
    }
  }, [drivers])

  const currentRoute = useMemo(() => {
    if (!selectedDriverId) return []
    return weeklyRoutes
      .filter(r => r.driver_id === selectedDriverId && r.day_of_week === selectedDay && r.stop_type !== 'initial_load')
      .sort((a, b) => a.route_order - b.route_order)
  }, [weeklyRoutes, selectedDriverId, selectedDay])

  const initialLoadStop = useMemo(() => {
    if (!selectedDriverId) return null
    return weeklyRoutes.find(r => r.driver_id === selectedDriverId && r.day_of_week === selectedDay && r.stop_type === 'initial_load') || null
  }, [weeklyRoutes, selectedDriverId, selectedDay])

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return clients.filter(c => 
      c.business_name.toLowerCase().includes(term) || 
      (c.address && c.address.toLowerCase().includes(term))
    )
  }, [clients, searchTerm])

  const handleAddClientToRoute = async (clientId: string) => {
    if (!selectedDriverId) return
    const newOrder = currentRoute.length > 0 ? Math.max(...currentRoute.map(r => r.route_order)) + 1 : 0
    try {
      const { error } = await supabase.from('weekly_routes').insert([
        { driver_id: selectedDriverId, client_id: clientId, day_of_week: selectedDay, route_order: newOrder, stop_type: 'client' }
      ])
      if (error) {
        if (error.code === '23505') Swal.fire('Atención', 'Este cliente ya está en la ruta del día.', 'info')
        else throw error
      } else {
        fetchInitialData()
      }
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'No se pudo agregar el cliente', 'error')
    }
  }

  const handleAddLoadStop = async () => {
    if (!selectedDriverId) return
    const newOrder = currentRoute.length > 0 ? Math.max(...currentRoute.map(r => r.route_order)) + 1 : 0
    try {
      const { error } = await supabase.from('weekly_routes').insert([
        { driver_id: selectedDriverId, day_of_week: selectedDay, route_order: newOrder, stop_type: 'load', planned_load: {} }
      ])
      if (error) throw error
      fetchInitialData()
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'No se pudo agregar la parada de carga', 'error')
    }
  }

  const handleRemoveStop = async (routeId: string) => {
    try {
      const { error } = await supabase.from('weekly_routes').delete().eq('id', routeId)
      if (error) throw error
      fetchInitialData()
    } catch (err) {
      console.error(err)
    }
  }

  const moveStop = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === currentRoute.length - 1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const currentItem = currentRoute[index]
    const swapItem = currentRoute[newIndex]

    try {
      await supabase.from('weekly_routes').update({ route_order: swapItem.route_order }).eq('id', currentItem.id)
      await supabase.from('weekly_routes').update({ route_order: currentItem.route_order }).eq('id', swapItem.id)
      fetchInitialData()
    } catch (err) {
      console.error(err)
    }
  }

  // Calculate suggested load for a load stop
  const getSuggestedLoad = (stopIndex: number) => {
    const suggested: Record<string, number> = {}
    // Look ahead until next load stop or end
    for (let i = stopIndex + 1; i < currentRoute.length; i++) {
      const stop = currentRoute[i]
      if (stop.stop_type === 'load') break
      
      const client = clients.find(c => c.id === stop.client_id)
      if (client && client.fixed_order) {
        Object.entries(client.fixed_order).forEach(([prodId, qty]) => {
          suggested[prodId] = (suggested[prodId] || 0) + (qty as number)
        })
      }
    }
    return suggested
  }

  const [activeLoadModal, setActiveLoadModal] = useState<any>(null)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Selectors */}
      <div className="bg-bg-surface shadow-sm border border-brand-muted/20 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-navy/10 rounded-xl flex items-center justify-center text-brand-navy">
            <Calendar size={20} />
          </div>
          <div>
            <h3 className="font-bold text-brand-deep text-base">Agenda de Rutas</h3>
            <p className="text-xs text-brand-muted/80 mt-0.5">Diseñe la ruta para cada día de la semana.</p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <select 
            value={selectedDay} 
            onChange={e => setSelectedDay(Number(e.target.value))}
            className="flex-1 md:w-48 bg-brand-muted/10 border border-brand-muted/30 text-brand-deep rounded-xl p-2.5 text-sm font-bold outline-none"
          >
            <option value={1}>Lunes</option>
            <option value={2}>Martes</option>
            <option value={3}>Miércoles</option>
            <option value={4}>Jueves</option>
            <option value={5}>Viernes</option>
            <option value={6}>Sábado</option>
            <option value={7}>Domingo</option>
          </select>

          <select 
            value={selectedDriverId} 
            onChange={e => setSelectedDriverId(e.target.value)}
            className="flex-1 md:w-56 bg-brand-muted/10 border border-brand-muted/30 text-brand-deep rounded-xl p-2.5 text-sm font-bold outline-none"
          >
            <option value="">Seleccione repartidor...</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
        {/* Columna Izquierda: Ruta Actual */}
        <div className="bg-white rounded-3xl border border-brand-navy/20 shadow-lg flex flex-col overflow-hidden animate-in slide-in-from-left-4">
          <div className="p-5 border-b border-brand-navy/10 bg-brand-navy/5 flex justify-between items-center">
            <div>
              <h4 className="font-black text-brand-navy text-lg">Ruta Diaria</h4>
              <p className="text-xs text-brand-navy/60 font-semibold">El orden mostrado aquí es como le aparecerá en el móvil.</p>
            </div>
            <span className="bg-brand-navy text-white text-xs font-bold px-3 py-1 rounded-full">
              {currentRoute.length} Paradas
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
            {/* VIRTUAL TOP BLOCK: Carga Inicial */}
            {selectedDriverId && (
              <div className="flex items-stretch rounded-2xl border border-orange-300 bg-orange-100/50 shadow-orange-500/10 overflow-hidden group hover:shadow-md transition-shadow relative">
                <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-orange-500"></div>
                <div className="flex flex-col items-center justify-center px-2 py-3 bg-orange-500/5 border-r border-orange-500/10 gap-1 w-10 flex-shrink-0">
                  <span className="text-[10px] font-black text-orange-600">INC</span>
                </div>
                <div className="flex-1 p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm">
                      <Package size={18} />
                    </div>
                    <div>
                      <h5 className="font-bold text-orange-900">Primera Carga (Fábrica)</h5>
                      <button 
                        onClick={() => setActiveLoadModal({ stop: initialLoadStop || { virtual: true, stop_type: 'initial_load', driver_id: selectedDriverId, day_of_week: selectedDay, route_order: -1 }, suggested: getSuggestedLoad(-1) })}
                        className="text-[11px] text-orange-700 font-bold hover:underline mt-0.5 inline-block bg-orange-500/10 px-2 py-0.5 rounded-md"
                      >
                        Ver / Configurar Carga Inicial
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentRoute.map((stop, index) => {
              const isLoad = stop.stop_type === 'load'
              const client = isLoad ? null : clients.find(c => c.id === stop.client_id)

              return (
                <div key={stop.id} className={`flex items-stretch rounded-2xl border ${isLoad ? 'border-orange-200 bg-orange-50/80 shadow-orange-500/5' : 'border-brand-muted/20 bg-white shadow-sm'} overflow-hidden group hover:shadow-md transition-shadow`}>
                  
                  {/* Controles de orden */}
                  <div className="flex flex-col items-center justify-center px-2 py-3 bg-brand-muted/5 border-r border-brand-muted/10 gap-1 w-10 flex-shrink-0">
                    <button 
                      onClick={() => moveStop(index, 'up')}
                      disabled={index === 0}
                      className="text-brand-muted hover:text-brand-navy disabled:opacity-30 p-1 transition-colors"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <span className="text-[10px] font-black text-brand-navy">{index + 1}</span>
                    <button 
                      onClick={() => moveStop(index, 'down')}
                      disabled={index === currentRoute.length - 1}
                      className="text-brand-muted hover:text-brand-navy disabled:opacity-30 p-1 transition-colors"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  {/* Contenido de la parada */}
                  <div className="flex-1 p-4 flex justify-between items-center">
                    {isLoad ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                          <Package size={18} />
                        </div>
                        <div>
                          <h5 className="font-bold text-orange-900">Parada de Carga (Fábrica)</h5>
                          <button 
                            onClick={() => setActiveLoadModal({ stop, suggested: getSuggestedLoad(index) })}
                            className="text-[11px] text-orange-600 font-bold hover:underline mt-0.5 inline-block"
                          >
                            Ver / Configurar Carga
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-muted/10 text-brand-muted flex items-center justify-center">
                          <MapPin size={14} />
                        </div>
                        <div>
                          <h5 className="font-bold text-brand-deep leading-tight">{client?.business_name || 'Cliente Desconocido'}</h5>
                          <p className="text-[10px] text-brand-muted mt-0.5 max-w-[200px] truncate">{client?.address || 'Sin dirección'}</p>
                        </div>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => handleRemoveStop(stop.id)}
                      className="p-2 text-brand-muted/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Eliminar parada"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
            
            {currentRoute.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-brand-muted/50 py-10">
                <Map size={48} className="mb-4 opacity-30" />
                <p className="font-bold text-brand-muted/70">La ruta está vacía</p>
                <p className="text-[11px] mt-1">Agregá clientes o paradas desde el panel derecho.</p>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Clientes y Cargas */}
        <div className="bg-bg-surface rounded-3xl border border-brand-muted/20 shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right-4">
          <div className="p-5 border-b border-brand-muted/10">
            <h4 className="font-bold text-brand-deep text-base mb-3">Buscar Clientes para Agregar</h4>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Nombre o dirección..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-brand-muted/5 border border-brand-muted/20 rounded-xl pl-4 pr-10 py-2.5 text-sm text-brand-deep outline-none focus:border-brand-navy transition-colors"
              />
            </div>
          </div>
          
          <div className="p-4 border-b border-brand-muted/10 bg-brand-muted/5">
            <button 
              onClick={handleAddLoadStop}
              className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shadow-sm"
            >
              <Package size={16} /> Intercalar Parada de Carga
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredClients.map(c => {
              const isAlreadyInRoute = currentRoute.some(r => r.stop_type === 'client' && r.client_id === c.id)
              
              return (
                <div key={c.id} className="flex justify-between items-center p-3 bg-white border border-brand-muted/10 rounded-2xl hover:border-brand-navy/30 transition-colors shadow-sm">
                  <div className="flex-1 pr-3">
                    <h5 className="font-bold text-brand-deep text-sm leading-tight">{c.business_name}</h5>
                    <p className="text-[10px] text-brand-muted mt-0.5 truncate">{c.address}</p>
                  </div>
                  <button 
                    disabled={isAlreadyInRoute}
                    onClick={() => handleAddClientToRoute(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                      isAlreadyInRoute 
                        ? 'bg-brand-muted/10 text-brand-muted/50 cursor-not-allowed' 
                        : 'bg-brand-navy text-white hover:bg-brand-navy/90 hover:shadow-md'
                    }`}
                  >
                    {isAlreadyInRoute ? 'En Ruta' : '+ Agregar'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {activeLoadModal && (
        <LoadConfigModal 
          stop={activeLoadModal.stop}
          suggested={activeLoadModal.suggested}
          onClose={() => setActiveLoadModal(null)}
        />
      )}
    </div>
  )
}

const LoadConfigModal: React.FC<{ stop: any, suggested: Record<string, number>, onClose: () => void }> = ({ stop, suggested, onClose }) => {
  const { products, fetchInitialData } = useStore()
  
  // Initialize with saved planned_load, desglosando en fixed y extra
  const [load, setLoad] = useState<Record<string, { fixed: number, extra: number }>>(() => {
    const initial: Record<string, { fixed: number, extra: number }> = {}
    products.forEach(p => {
      const saved = stop.planned_load?.[p.id]
      const sugg = suggested[p.id] || 0
      if (saved && typeof saved === 'object') {
        initial[p.id] = {
          fixed: saved.fixed !== undefined ? Number(saved.fixed) : sugg,
          extra: Number(saved.extra) || 0
        }
      } else if (saved !== undefined) {
        // Formato numérico antiguo: lo tomamos como pedidos fijos
        initial[p.id] = {
          fixed: Number(saved) || 0,
          extra: 0
        }
      } else {
        initial[p.id] = {
          fixed: sugg,
          extra: 0
        }
      }
    })
    return initial
  })

  const handleUpdateExtraQty = (productId: string, delta: number, unitType: string) => {
    const step = unitType === 'kg' ? 0.5 : 1
    
    setLoad(prev => {
      const current = prev[productId] || { fixed: suggested[productId] || 0, extra: 0 }
      let nextExtra = current.extra + delta * step
      if (nextExtra < 0) nextExtra = 0
      
      return {
        ...prev,
        [productId]: {
          ...current,
          extra: nextExtra
        }
      }
    })
  }

  const handleSave = async () => {
    try {
      if (stop.virtual) {
        const { error } = await supabase.from('weekly_routes').insert([
          { driver_id: stop.driver_id, day_of_week: stop.day_of_week, route_order: -1, stop_type: 'initial_load', planned_load: load }
        ])
        if (error) throw error
      } else {
        const { error } = await supabase.from('weekly_routes').update({ planned_load: load }).eq('id', stop.id)
        if (error) throw error
      }
      fetchInitialData()
      Swal.fire('Guardado', 'La carga planificada ha sido actualizada', 'success')
      onClose()
    } catch (err) {
      console.error(err)
      Swal.fire('Error', 'No se pudo guardar la carga', 'error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-bg-surface shadow-sm border border-brand-muted/20 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-brand-muted/20 flex justify-between items-start bg-orange-50/80 rounded-t-3xl text-brand-deep">
          <div>
            <h2 className="text-xl font-black text-orange-950 flex items-center gap-2">
              <Package size={20} className="text-orange-600" /> Configurar Carga
            </h2>
            <p className="text-orange-900/80 text-xs mt-1.5 font-semibold leading-relaxed">
              Planifique la mercadería de esta parada. Defina los pedidos fijos sugeridos y agregue la recarga de mostrador para venta libre.
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-orange-100/50 hover:bg-orange-200 rounded-xl text-orange-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
          <div className="grid grid-cols-12 gap-2 text-[10px] font-black text-brand-muted uppercase border-b border-brand-muted/10 pb-2 px-3">
            <span className="col-span-5">Producto</span>
            <span className="col-span-2 text-center">Pedidos Fijos</span>
            <span className="col-span-3 text-center">Carga Mostrador</span>
            <span className="col-span-2 text-right">Total</span>
          </div>

          {products.map(p => {
            const item = load[p.id] || { fixed: suggested[p.id] || 0, extra: 0 }
            const total = item.fixed + item.extra
            
            return (
              <div key={p.id} className={`grid grid-cols-12 gap-2 items-center p-3 rounded-2xl border transition-colors ${total > 0 ? 'bg-orange-50/5 border-orange-200' : 'bg-white border-brand-muted/10'}`}>
                {/* Producto */}
                <div className="col-span-5 text-brand-deep">
                  <span className="font-bold block text-xs truncate" title={p.name}>{p.name}</span>
                  <span className="text-[9px] uppercase font-bold text-brand-muted/70">{p.unit_type}</span>
                </div>

                {/* Pedidos Fijos */}
                <div className="col-span-2 text-center">
                  <span className="font-black text-brand-navy bg-brand-navy/5 border border-brand-navy/10 px-2.5 py-1 rounded text-xs">
                    {item.fixed}
                  </span>
                </div>

                {/* Carga Mostrador (Editable) */}
                <div className="col-span-3 flex items-center justify-center gap-1.5">
                  <button 
                    type="button"
                    onClick={() => handleUpdateExtraQty(p.id, -1, p.unit_type)} 
                    className="p-1 rounded bg-white border border-brand-muted/20 text-brand-deep hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm active:scale-90"
                  >
                    <Minus size={10}/>
                  </button>
                  <span className="font-black text-brand-deep text-xs w-6 text-center">
                    {item.extra}
                  </span>
                  <button 
                    type="button"
                    onClick={() => handleUpdateExtraQty(p.id, 1, p.unit_type)} 
                    className="p-1 rounded bg-white border border-brand-muted/20 text-brand-deep hover:bg-green-50 hover:text-green-600 transition-colors shadow-sm active:scale-90"
                  >
                    <Plus size={10}/>
                  </button>
                </div>

                {/* Total */}
                <div className="col-span-2 text-right text-brand-deep">
                  <span className="font-black text-xs">
                    {total} <span className="text-[8px] text-brand-deep/50 font-bold lowercase">{p.unit_type === 'unidad' ? 'u' : p.unit_type === 'docena' ? 'doc' : p.unit_type === 'bolsa' ? 'bols' : p.unit_type}</span>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="p-5 border-t border-brand-muted/20 bg-white rounded-b-3xl">
          <button onClick={handleSave} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-all text-sm shadow-lg shadow-orange-500/20 active:scale-[0.98]">
            Guardar Plan de Carga
          </button>
        </div>
      </div>
    </div>
  )
}
