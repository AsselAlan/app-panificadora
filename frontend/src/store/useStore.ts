import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'
import localforage from 'localforage'
import { supabase } from '../supabaseClient'

// Configuración de localForage como motor IndexedDB
localforage.config({
  name: 'panificadora_pwa',
  storeName: 'app_state'
})

const IndexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await localforage.getItem<string>(name)
    return value || null
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await localforage.setItem(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await localforage.removeItem(name)
  }
}

// ==========================================
// DEFINICIÓN DE INTERFACES DE DATOS
// ==========================================

export interface Product {
  id: string;
  name: string;
  unit_type: 'kg' | 'docena' | 'bolsa' | 'unidad' | 'caja';
  price_a: number;
  price_b: number;
  bakery_stock: number;
  display_order?: number;
  is_deleted?: boolean;
  is_paused?: boolean;
  updated_at?: string;
}

export interface Client {
  id: string;
  business_name: string;
  legal_name: string | null;
  client_type: 'Comercio' | 'Institución' | 'Empresa';
  phone: string | null;
  email: string | null;
  cuit: string | null;
  price_category: 'A' | 'B';
  address: string;
  current_balance: number;
  credit_limit: number | null;
  allow_credit: boolean;
  fixed_order: Record<string, number> | null; // product_id -> qty
  cajones_prestados: number;
  is_deleted?: boolean;
  updated_at?: string;
}

export interface Driver {
  id: string;
  user_id: string | null;
  full_name: string;
  status: 'En Base' | 'En Ruta' | 'Finalizado';
  is_online: boolean;
  cash_collected: number;
  transfer_collected: number;
  location_data: any;
  last_active: string;
}

export interface DriverSettlement {
  id: string;
  driver_id: string;
  settlement_date: string;
  amount_cash: number;
  amount_transfer: number;
  created_at: string;
}

export interface Load {
  id: string;
  driver_id: string;
  product_id: string;
  date_loaded: string;
  initial_quantity: number;
  current_quantity: number;
  returned_quantity?: number;
}

export interface SaleItem {
  product_id: string;
  operation_type: 'sale' | 'return';
  quantity: number;
  unit_price: number;
  name?: string; // Para UI/Tickets
}

export interface Sale {
  id: string;
  client_id: string;
  driver_id: string;
  transaction_date: string;
  subtotal_sales: number;
  total_returns: number;
  applied_debt: number;
  final_total: number;
  payment_cash: number;
  payment_transfer: number;
  payment_account: number;
  items: SaleItem[];
  cajones_left?: number;
  cajones_returned?: number;
  // Auxiliares para ticket de UI
  client_name?: string;
  driver_name?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  origin: string;
  payment_method: 'efectivo' | 'transferencia';
  expense_date: string;
}

export interface SyncItem {
  id: string;
  type: 'sale' | 'expense' | 'end_route';
  payload: any;
}

export interface StockLoss {
  id: string;
  product_id: string;
  quantity: number;
  loss_type: 'devolucion' | 'merma_admin';
  client_id?: string;
  driver_id?: string;
  stock_update_id?: string;
  loss_date: string;
}

export interface StockUpdate {
  id: string;
  user_id: string;
  status: 'applied' | 'cancelled';
  created_at: string;
}

export interface StockUpdateItem {
  id: string;
  update_id: string;
  product_id: string;
  added_quantity: number;
  removed_quantity: number;
}

interface AppState {
  // Datos locales cacheables
  products: Product[];
  clients: Client[];
  drivers: Driver[];
  loads: Load[];
  sales: Sale[];
  weeklyRoutes: any[];
  expenses: Expense[];
  expenseCategories: any[];
  driverExpenseCategories: any[];
  stockUpdates: StockUpdate[];
  stockLosses: StockLoss[];
  settlements: DriverSettlement[];

  // App State
  isOffline: boolean;
  isSyncing: boolean;
  syncQueue: SyncItem[];
  
  // Acciones de Red y Estado Global
  setOffline: (status: boolean) => void;
  setCurrentDriver: (id: string | null) => void;
  clearAllData: () => void;
  
  // Autenticación
  userSession: any | null;
  userRole: 'admin' | 'repartidor' | 'mostrador' | null;
  requiresPasswordChange: boolean;
  setSession: (session: any | null, role: 'admin' | 'repartidor' | 'mostrador' | null, requiresPasswordChange?: boolean) => void;
  logout: () => Promise<void>;
  
  // Carga de datos de Supabase
  fetchInitialData: () => Promise<void>;
  fetchDriverData: (driverId: string) => Promise<void>;
  fetchSalesByDate: (dateStr: string) => Promise<void>;
  fetchStockLosses: () => Promise<void>;
  fetchSettlements: () => Promise<void>;
  
  // Acciones de Flota y Choferes
  updateDriverStatus: (id: string, status: 'En Base' | 'En Ruta' | 'Finalizado') => Promise<void>;
  approveSettlement: (driverId: string, amountCash: number, amountTransfer: number, dateStr?: string) => Promise<void>;

  // Acciones Transaccionales (Offline-First)
  addSale: (sale: Sale) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  startDriverRoute: (driverId: string) => Promise<void>;
  endDriverRoute: (driverId: string) => Promise<void>;
  checkAndResetDriverDay: (driverId: string) => Promise<void>;
  fetchDriverSalesHistory: (driverId: string) => Promise<any[]>;
  
  // Sincronización
  processSyncQueue: () => Promise<void>;

  // Acciones de Stock
  applyStockUpdate: (items: { product_id: string; added_quantity: number; removed_quantity: number }[]) => Promise<void>;
  revertStockUpdate: (updateId: string) => Promise<void>;
  
  // Cajones
  returnCajonesAdmin: (clientId: string, quantity: number) => Promise<void>;

  currentDriverId: string | null;
}

// ==========================================
// IMPLEMENTACIÓN DEL STORE ZUSTAND
// ==========================================

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      products: [],
      clients: [],
      drivers: [],
      loads: [],
      sales: [],
      weeklyRoutes: [],
      expenses: [],
      expenseCategories: [],
      driverExpenseCategories: [],
      stockUpdates: [],
      stockLosses: [],
      settlements: [],
      currentDriverId: null,
      isOffline: !navigator.onLine,
      isSyncing: false,
      syncQueue: [],
      userSession: null,
      userRole: null,
      requiresPasswordChange: false,

      // Autenticación
      setSession: (session, role, requiresPasswordChange = false) => set({ userSession: session, userRole: role, requiresPasswordChange }),
      logout: async () => {
        await supabase.auth.signOut()
        set({ 
          userSession: null, 
          userRole: null,
          requiresPasswordChange: false,
          currentDriverId: null,
          products: [],
          clients: [],
          drivers: [],
          loads: [],
          sales: [],
          weeklyRoutes: [],
          expenses: [],
          syncQueue: []
        })
      },

      // Cambiar estado de conexión y gatillar sincronización
      setOffline: (status) => {
        set({ isOffline: status })
        if (!status) {
          get().processSyncQueue()
        }
      },

      setCurrentDriver: (id) => set({ currentDriverId: id }),

      updateDriverStatus: async (id, status) => {
        set(state => ({
          drivers: state.drivers.map(d => d.id === id ? { ...d, status } : d)
        }))
        if (!get().isOffline) {
          await supabase.from('drivers').update({ status }).eq('id', id)
        }
      },

      clearAllData: () => set({
        products: [],
        clients: [],
        drivers: [],
        loads: [],
        sales: [],
        weeklyRoutes: [],
        expenses: [],
        expenseCategories: [],
        driverExpenseCategories: [],
        currentDriverId: null,
        syncQueue: []
      }),

      fetchStockLosses: async () => {
        try {
          const { data, error } = await supabase.from('stock_losses').select('*')
          if (error) throw error
          set({ stockLosses: data || [] })
        } catch (err) {
          console.error('Error fetching stock losses:', err)
        }
      },

      approveSettlement: async (driverId: string, amountCash: number, amountTransfer: number, dateStr?: string) => {
        try {
          const dateToSave = dateStr || new Date().toLocaleDateString('sv')
          const newSettlement = {
            driver_id: driverId,
            settlement_date: dateToSave,
            amount_cash: amountCash,
            amount_transfer: amountTransfer
          }

          const { data, error } = await supabase.from('driver_settlements').insert([newSettlement]).select().single()
          if (error) throw error

          set(state => ({
            settlements: [...state.settlements, data]
          }))
        } catch (err: any) {
          console.error('Error approving settlement:', err)
          throw err
        }
      },

      fetchSettlements: async () => {
        try {
          const todayStr = new Date().toLocaleDateString('sv')
          const { data, error } = await supabase
            .from('driver_settlements')
            .select('*')
            .eq('settlement_date', todayStr)
          if (error) throw error
          set({ settlements: data || [] })
        } catch (err) {
          console.error('Error fetching driver settlements:', err)
        }
      },

      // Carga todo desde la base de datos (Usado por Dashboard / Admin)
      fetchInitialData: async () => {
        if (get().isOffline) return

        try {
          // Fetch por lotes para evitar ERR_HTTP2_SERVER_REFUSED_STREAM
          const resProd = await supabase.from('products').select('*').eq('is_deleted', false).order('display_order', { ascending: true }).order('name')
          const resCli = await supabase.from('clients').select('*').eq('is_deleted', false).order('business_name')
          const resDriv = await supabase.from('drivers').select('*').eq('is_deleted', false).order('full_name')
          const resExp = await supabase.from('expenses').select('*').order('expense_date', { ascending: false }).limit(50)
          
          const sixtyDaysAgo = new Date()
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
          
          const resSal = await supabase.from('sales').select('*').gte('transaction_date', sixtyDaysAgo.toISOString()).order('transaction_date', { ascending: false })
          const resCat = await supabase.from('expense_categories').select('*').order('name')
          const resRoutes = await supabase.from('weekly_routes').select('*')
          const resDriverCat = await supabase.from('driver_expense_categories').select('*').order('name')

          if (resProd.error) throw resProd.error
          if (resCli.error) throw resCli.error
          if (resDriv.error) throw resDriv.error
          if (resExp.error) throw resExp.error
          if (resRoutes.error) throw resRoutes.error
          if (resDriverCat.error) throw resDriverCat.error

          set({
            products: resProd.data || [],
            clients: resCli.data || [],
            drivers: resDriv.data || [],
            expenses: resExp.data || [],
            sales: resSal.data || [],
            expenseCategories: resCat.data || [],
            weeklyRoutes: resRoutes.data || [],
            driverExpenseCategories: resDriverCat.data || []
          })
          
          await get().fetchStockLosses()
          await get().fetchSettlements()
        } catch (error) {
          console.error('Error cargando datos iniciales de Supabase:', error)
        }
      },

      // Cargar ventas filtradas por un día específico (para historiales)
      fetchSalesByDate: async (dateStr: string) => {
        if (get().isOffline) return
        
        try {
          const startDate = new Date(dateStr)
          startDate.setHours(0, 0, 0, 0)
          
          const endDate = new Date(startDate)
          endDate.setHours(23, 59, 59, 999)
          
          const { data, error } = await supabase
            .from('sales')
            .select('*')
            .gte('transaction_date', startDate.toISOString())
            .lte('transaction_date', endDate.toISOString())
            .order('transaction_date', { ascending: false })
            
          if (error) throw error
          
          set({ sales: data || [] })
        } catch (err) {
          console.error('Error cargando ventas históricas:', err)
        }
      },

      // Carga datos específicos de un Repartidor (Ruta, Carga, Clientes de la ruta)
      fetchDriverData: async (driverId) => {
        if (get().isOffline) return

        try {
          const today = new Date().toISOString().split('T')[0]

          // Consultar datos del chofer, productos y loads del día en paralelo
          const [driverRes, productsRes, loadsRes] = await Promise.all([
            supabase.from('drivers').select('*').eq('id', driverId).single(),
            supabase.from('products').select('*').eq('is_deleted', false).eq('is_paused', false),
            supabase.from('loads').select('*').eq('driver_id', driverId).eq('date_loaded', today)
          ])

          if (driverRes.error) throw driverRes.error
          if (productsRes.error) throw productsRes.error
          // Los loads pueden no existir si aún no inició ruta, no es error crítico

          const driver = driverRes.data
          const products = productsRes.data
          const loadsFromDB = loadsRes.data || []

          set(state => {
            // Actualizar perfil del conductor
            const updatedDrivers = state.drivers.map(d => d.id === driverId ? { ...d, ...driver } : d)
            if (!updatedDrivers.some(d => d.id === driverId) && driver) {
              updatedDrivers.push(driver)
            }

            // Si hay loads registrados hoy en Supabase, los sincronizamos (el admin los cargó)
            // Si no hay loads en BD, mantenemos los locales (el repartidor puede estar offline o aún no inició ruta)
            const updatedLoads = loadsFromDB.length > 0 ? loadsFromDB : state.loads

            return {
              drivers: updatedDrivers,
              products: products || state.products,
              loads: updatedLoads
            }
          })
        } catch (error) {
          console.error('Error al cargar datos del conductor desde Supabase:', error)
        }
      },

      // Verificación de cambio de día para reset automático del conductor
      checkAndResetDriverDay: async (driverId) => {
        const driver = get().drivers.find(d => d.id === driverId);
        if (!driver) return;

        if (driver.last_active) {
          const lastActiveDate = new Date(driver.last_active);
          const today = new Date();
          
          const isDifferentDay = 
            lastActiveDate.getDate() !== today.getDate() ||
            lastActiveDate.getMonth() !== today.getMonth() ||
            lastActiveDate.getFullYear() !== today.getFullYear();

          if (isDifferentDay && (driver.status === 'Finalizado' || driver.status === 'En Ruta')) {
            console.log(`Detectado cambio de día para chofer ${driver.full_name}. Reseteando a 'En Base'.`);
            
            set(state => ({
              drivers: state.drivers.map(d => d.id === driverId ? { 
                ...d, 
                status: 'En Base', 
                is_online: false, 
                cash_collected: 0, 
                transfer_collected: 0,
                last_active: new Date().toISOString()
              } : d)
            }));

            if (!get().isOffline) {
              await supabase.from('drivers').update({ 
                status: 'En Base', 
                is_online: false, 
                cash_collected: 0, 
                transfer_collected: 0,
                last_active: new Date().toISOString()
              }).eq('id', driverId);
            }
          }
        }
      },

      // Obtener el historial de ventas pasadas (agrupadas por día) para la app de repartidor
      fetchDriverSalesHistory: async (driverId) => {
        if (get().isOffline) return [];

        try {
          // Calculamos hace 30 días
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const { data, error } = await supabase
            .from('sales')
            .select('transaction_date, payment_cash, payment_transfer')
            .eq('driver_id', driverId)
            .gte('transaction_date', thirtyDaysAgo.toISOString())
            .order('transaction_date', { ascending: false });

          if (error) throw error;

          // Agrupar por día
          const historyMap: Record<string, { dateStr: string, cash: number, transfer: number }> = {};
          
          if (data) {
            data.forEach((s: any) => {
              const d = new Date(s.transaction_date);
              // Ignorar ventas de hoy para el historial histórico
              if (d.getDate() === new Date().getDate() && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear()) {
                return;
              }
              const dateKey = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });
              
              if (!historyMap[dateKey]) {
                historyMap[dateKey] = { dateStr: dateKey, cash: 0, transfer: 0 };
              }
              historyMap[dateKey].cash += Number(s.payment_cash) || 0;
              historyMap[dateKey].transfer += Number(s.payment_transfer) || 0;
            });
          }

          return Object.values(historyMap);
        } catch (error) {
          console.error('Error al cargar historial de ventas del chofer:', error);
          return [];
        }
      },

      // Registrar Venta (Offline-First)
      addSale: async (sale) => {
        // 1. Guardar localmente en el estado de Zustand (IndexedDB) de forma inmediata
        set(state => {
          // Descontar inventario localmente en loads
          const updatedLoads = state.loads.map(load => {
            const itemMatch = sale.items.find(i => i.product_id === load.product_id)
            if (itemMatch) {
              if (itemMatch.operation_type === 'sale') {
                return { ...load, current_quantity: Math.max(0, load.current_quantity - itemMatch.quantity) }
              } else if (itemMatch.operation_type === 'return') {
                return { ...load, returned_quantity: (load.returned_quantity || 0) + itemMatch.quantity }
              }
            }
            return load
          })

          // Actualizar deuda local del cliente y cajones prestados
          const updatedClients = state.clients.map(c => 
            c.id === sale.client_id ? { 
              ...c, 
              current_balance: c.current_balance - sale.payment_account,
              cajones_prestados: (c.cajones_prestados || 0) + (sale.cajones_left || 0) - (sale.cajones_returned || 0)
            } : c
          )

          // Actualizar caja local del conductor
          const updatedDrivers = state.drivers.map(d => 
            d.id === sale.driver_id ? { 
              ...d, 
              cash_collected: d.cash_collected + sale.payment_cash, 
              transfer_collected: d.transfer_collected + sale.payment_transfer 
            } : d
          )

          return {
            sales: [sale, ...state.sales],
            loads: updatedLoads,
            clients: updatedClients,
            drivers: updatedDrivers,
            syncQueue: [...state.syncQueue, { id: sale.id, type: 'sale', payload: sale }]
          }
        })

        // 2. Si está en línea, procesar la sincronización inmediatamente
        if (!get().isOffline) {
          await get().processSyncQueue()
        }
      },

      // Registrar Gasto (Offline-First)
      addExpense: async (expense) => {
        // 1. Guardar localmente en IndexedDB
        set(state => {
          // Si el gasto proviene de un repartidor en ruta, descontar de su caja física en mano
          const updatedDrivers = state.drivers.map(d => {
            if (d.full_name === expense.origin) {
              return {
                ...d,
                cash_collected: expense.payment_method === 'efectivo' ? Math.max(0, d.cash_collected - expense.amount) : d.cash_collected,
                transfer_collected: expense.payment_method === 'transferencia' ? Math.max(0, d.transfer_collected - expense.amount) : d.transfer_collected
              }
            }
            return d
          })

          return {
            expenses: [expense, ...state.expenses],
            drivers: updatedDrivers,
            syncQueue: [...state.syncQueue, { id: expense.id, type: 'expense', payload: expense }]
          }
        })

        // 2. Si está en línea, procesar sincronización
        if (!get().isOffline) {
          await get().processSyncQueue()
        }
      },

      // Iniciar recorrido del chofer
      startDriverRoute: async (driverId) => {
        set(state => ({
          drivers: state.drivers.map(d => d.id === driverId ? { ...d, status: 'En Ruta', is_online: true, last_active: new Date().toISOString(), cash_collected: 0, transfer_collected: 0 } : d)
        }))

        if (!get().isOffline) {
          await supabase.from('drivers').update({ status: 'En Ruta', is_online: true, last_active: new Date(), cash_collected: 0, transfer_collected: 0 }).eq('id', driverId)
        }
      },

      // Finalizar recorrido del chofer
      endDriverRoute: async (driverId) => {
        const actionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
        set(state => ({
          drivers: state.drivers.map(d => d.id === driverId ? { ...d, status: 'Finalizado', is_online: false, last_active: new Date().toISOString() } : d),
          syncQueue: [...state.syncQueue, { id: actionId, type: 'end_route', payload: { driver_id: driverId } }]
        }))

        if (!get().isOffline) {
          await get().processSyncQueue()
        }
      },

      // Aplicar actualización manual de stock (Admin/Mostrador)
      applyStockUpdate: async (items) => {
        if (get().isOffline) {
          alert('Debes estar conectado a internet para realizar esta acción masiva.');
          return;
        }
        const { error } = await supabase.rpc('apply_stock_update', { payload: { items } });
        if (error) throw error;
        await get().fetchInitialData(); // Refrescar los datos locales de productos
      },

      // Revertir actualización manual de stock (Admin/Mostrador)
      revertStockUpdate: async (updateId) => {
        if (get().isOffline) {
          alert('Debes estar conectado a internet para revertir una actualización.');
          return;
        }
        const { error } = await supabase.rpc('revert_stock_update', { p_update_id: updateId });
        if (error) throw error;
        await get().fetchInitialData();
      },

      // Devolución de cajones desde Admin
      returnCajonesAdmin: async (clientId: string, quantity: number) => {
        if (get().isOffline) {
          alert('Debes estar conectado a internet para realizar esta acción.');
          return;
        }
        
        // Obtener cliente actual para calcular nuevo saldo
        const client = get().clients.find(c => c.id === clientId);
        if (!client) return;
        
        const newCajones = Math.max(0, client.cajones_prestados - quantity);
        
        // Actualizar en base de datos
        const { error } = await supabase
          .from('clients')
          .update({ cajones_prestados: newCajones })
          .eq('id', clientId);
          
        if (error) throw error;
        
        // Actualizar localmente
        set(state => ({
          clients: state.clients.map(c => 
            c.id === clientId ? { ...c, cajones_prestados: newCajones } : c
          )
        }));
      },

      // ==========================================
      // MOTOR DE SINCRONIZACIÓN AUTOMÁTICO (SYNC ENGINE)
      // ==========================================
      processSyncQueue: async () => {
        const state = get()
        if (state.isOffline || state.isSyncing || state.syncQueue.length === 0) return

        set({ isSyncing: true })
        console.log(`Iniciando sincronización. Elementos en cola: ${state.syncQueue.length}`)

        const remainingQueue: SyncItem[] = [...state.syncQueue]

        for (const item of state.syncQueue) {
          try {
            if (item.type === 'sale') {
              // Limpiar metadatos temporales de UI antes de enviar al RPC de Supabase
              const cleanSale = {
                id: item.payload.id,
                client_id: item.payload.client_id,
                driver_id: item.payload.driver_id,
                transaction_date: item.payload.transaction_date,
                subtotal_sales: item.payload.subtotal_sales,
                total_returns: item.payload.total_returns,
                applied_debt: item.payload.applied_debt,
                final_total: item.payload.final_total,
                payment_cash: item.payload.payment_cash,
                payment_transfer: item.payload.payment_transfer,
                payment_account: item.payload.payment_account,
                cajones_left: item.payload.cajones_left,
                cajones_returned: item.payload.cajones_returned,
                items: item.payload.items.map((i: any) => ({
                  product_id: i.product_id,
                  operation_type: i.operation_type,
                  quantity: i.quantity,
                  unit_price: i.unit_price
                }))
              }

              // Llamada al RPC transaccional que actualiza la venta, stock, deudas y cajas
              const { error } = await supabase.rpc('process_offline_sale', { payload: cleanSale })
              if (error) throw error

            } else if (item.type === 'expense') {
              const { error } = await supabase.from('expenses').insert([{
                id: item.payload.id,
                category: item.payload.category,
                amount: item.payload.amount,
                description: item.payload.description,
                origin: item.payload.origin,
                payment_method: item.payload.payment_method,
                expense_date: item.payload.expense_date
              }])
              if (error) throw error
              
              // Descontar caja en Supabase si el origin coincide con el nombre de un chofer activo
              const driverObj = state.drivers.find(d => d.full_name === item.payload.origin)
              if (driverObj) {
                const { data: currentDriver } = await supabase.from('drivers').select('cash_collected, transfer_collected').eq('id', driverObj.id).single()
                if (currentDriver) {
                  const updates: any = {}
                  if (item.payload.payment_method === 'efectivo') {
                    updates.cash_collected = Math.max(0, currentDriver.cash_collected - item.payload.amount)
                  } else {
                    updates.transfer_collected = Math.max(0, currentDriver.transfer_collected - item.payload.amount)
                  }
                  await supabase.from('drivers').update(updates).eq('id', driverObj.id)
                }
              }
            } else if (item.type === 'end_route') {
              const { error } = await supabase.rpc('process_driver_end_of_day', { p_driver_id: item.payload.driver_id });
              if (error) throw error;
            }

            // Si se procesó correctamente, lo quitamos de la lista
            const index = remainingQueue.findIndex(q => q.id === item.id)
            if (index > -1) remainingQueue.splice(index, 1)

          } catch (error) {
            console.error(`Error sincronizando elemento ${item.id} (${item.type}):`, error)
            // Detenemos la sincronización si hay error de conexión. Quedará en la cola.
            break
          }
        }

        set({ syncQueue: remainingQueue, isSyncing: false })
        console.log(`Sincronización finalizada. Elementos pendientes en cola: ${remainingQueue.length}`)
      }
    }),
    {
      name: 'panificadora_state_store', // Nombre clave en IndexedDB
      storage: createJSONStorage(() => IndexedDBStorage),
      version: 1
    }
  )
)
