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
  is_deleted?: boolean;
  is_paused?: boolean;
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

export interface Load {
  id: string;
  driver_id: string;
  product_id: string;
  date_loaded: string;
  initial_quantity: number;
  current_quantity: number;
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
  type: 'sale' | 'expense';
  payload: any;
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
  
  // Estado operativo actual
  currentDriverId: string | null;
  isOffline: boolean;
  isSyncing: boolean;
  syncQueue: SyncItem[];
  
  // Acciones de Red y Estado Global
  setOffline: (status: boolean) => void;
  setCurrentDriver: (id: string | null) => void;
  clearAllData: () => void;
  
  // Carga de datos de Supabase
  fetchInitialData: () => Promise<void>;
  fetchDriverData: (driverId: string) => Promise<void>;
  fetchSalesByDate: (dateStr: string) => Promise<void>;

  // Acciones Transaccionales (Offline-First)
  addSale: (sale: Sale) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  startDriverRoute: (driverId: string) => Promise<void>;
  endDriverRoute: (driverId: string) => Promise<void>;
  
  // Sincronización
  processSyncQueue: () => Promise<void>;
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
      currentDriverId: null,
      isOffline: !navigator.onLine,
      isSyncing: false,
      syncQueue: [],

      // Cambiar estado de conexión y gatillar sincronización
      setOffline: (status) => {
        set({ isOffline: status })
        if (!status) {
          get().processSyncQueue()
        }
      },

      setCurrentDriver: (id) => set({ currentDriverId: id }),

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

      // Carga todo desde la base de datos (Usado por Dashboard / Admin)
      fetchInitialData: async () => {
        if (get().isOffline) return

        try {
          const [resProd, resCli, resDriv, resExp, resSal, resCat, resRoutes, resDriverCat] = await Promise.all([
            supabase.from('products').select('*').eq('is_deleted', false).order('name'),
            supabase.from('clients').select('*').eq('is_deleted', false).order('business_name'),
            supabase.from('drivers').select('*').eq('is_deleted', false).order('full_name'),
            supabase.from('expenses').select('*').order('expense_date', { ascending: false }).limit(50),
            supabase.from('sales').select('*').order('transaction_date', { ascending: false }).limit(500),
            supabase.from('expense_categories').select('*').order('name'),
            supabase.from('weekly_routes').select('*'),
            supabase.from('driver_expense_categories').select('*').order('name')
          ])

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
          // 1. Obtener datos del chofer
          const { data: driver, error: errDriv } = await supabase
            .from('drivers')
            .select('*')
            .eq('id', driverId)
            .single()

          if (errDriv) throw errDriv

          // La carga vehicular y los clientes de ruta ahora se leen directamente desde weeklyRoutes y clients de fetchInitialData.
          // Ya no necesitamos sobrescribir clients ni usar la tabla loads.

          // Cargar productos para que el repartidor tenga el catálogo de precios actualizados
          const { data: products, error: errProd } = await supabase
            .from('products')
            .select('*')
            .eq('is_deleted', false)
            .eq('is_paused', false)

          if (errProd) throw errProd

          // Guardar en la caché local del store (Zustand persistido)
          set(state => {
            // Actualizamos la lista de choferes agregando/actualizando el actual
            const updatedDrivers = state.drivers.map(d => d.id === driverId ? { ...d, ...driver } : d)
            if (!updatedDrivers.some(d => d.id === driverId) && driver) {
              updatedDrivers.push(driver)
            }
            return {
              drivers: updatedDrivers,
              products: products || state.products
            }
          })
        } catch (error) {
          console.error('Error al cargar datos del conductor desde Supabase:', error)
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
                return { ...load, current_quantity: load.current_quantity + itemMatch.quantity }
              }
            }
            return load
          })

          // Actualizar deuda local del cliente
          const updatedClients = state.clients.map(c => 
            c.id === sale.client_id ? { ...c, current_balance: c.current_balance - sale.payment_account } : c
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
          drivers: state.drivers.map(d => d.id === driverId ? { ...d, status: 'En Ruta', is_online: true, last_active: new Date().toISOString() } : d)
        }))

        if (!get().isOffline) {
          await supabase.from('drivers').update({ status: 'En Ruta', is_online: true, last_active: new Date() }).eq('id', driverId)
        }
      },

      // Finalizar recorrido del chofer
      endDriverRoute: async (driverId) => {
        set(state => ({
          drivers: state.drivers.map(d => d.id === driverId ? { ...d, status: 'Finalizado', is_online: false, last_active: new Date().toISOString() } : d)
        }))

        if (!get().isOffline) {
          await supabase.from('drivers').update({ status: 'Finalizado', is_online: false, last_active: new Date() }).eq('id', driverId)
        }
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

// Oyente de conectividad del navegador para sincronizar al volver a estar online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useStore.getState().setOffline(false)
  })
  window.addEventListener('offline', () => {
    useStore.getState().setOffline(true)
  })
}
