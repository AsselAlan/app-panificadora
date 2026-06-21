import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock de navigator para Node
global.navigator = { onLine: true } as any;
import { useStore } from './useStore';

// Mock dependencias externas
vi.mock('localforage', () => ({
  default: {
    config: vi.fn(),
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(null),
    removeItem: vi.fn().mockResolvedValue(null)
  }
}));

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null })
  }
}));

describe('useStore - Testing Lógica Offline-First', () => {
  const initialState = useStore.getState();

  beforeEach(() => {
    // Resetear el store antes de cada prueba
    useStore.setState(initialState, true);
    
    // Inyectar datos iniciales falsos (mock data)
    useStore.setState({
      isOffline: true, // Forzar modo offline para no disparar llamadas a Supabase en addSale/addExpense
      products: [
        { id: 'prod-1', name: 'Pan de Mesa', unit_type: 'bolsa', price_a: 100, price_b: 150, bakery_stock: 50, is_deleted: false, is_paused: false, updated_at: '' }
      ],
      clients: [
        { id: 'client-1', business_name: 'Kiosco Pepe', client_type: 'Comercio', current_balance: 0, allow_credit: true, price_category: 'A', is_deleted: false, updated_at: '' }
      ],
      drivers: [
        { id: 'driver-1', full_name: 'Juan Perez', status: 'En Ruta', is_online: true, cash_collected: 1000, transfer_collected: 500, is_deleted: false, updated_at: '', last_active: '' }
      ],
      loads: [
        { id: 'load-1', driver_id: 'driver-1', product_id: 'prod-1', current_quantity: 10, initial_quantity: 10, date_loaded: '' }
      ],
      sales: [],
      expenses: [],
      syncQueue: []
    });
  });

  it('addExpense debería descontar el monto de la caja del chofer y encolar la acción', async () => {
    const expense = {
      id: 'exp-1',
      category: 'Combustible',
      amount: 200,
      description: 'Nafta',
      origin: 'Juan Perez',
      payment_method: 'efectivo' as const,
      expense_date: new Date().toISOString()
    };

    const { addExpense } = useStore.getState();
    await addExpense(expense);

    const state = useStore.getState();
    
    // Validar descuento en caja efectivo (1000 - 200 = 800)
    expect(state.drivers[0].cash_collected).toBe(800);
    expect(state.drivers[0].transfer_collected).toBe(500); // Transferencia no se toca
    
    // Validar registro del gasto
    expect(state.expenses.length).toBe(1);
    expect(state.expenses[0].id).toBe('exp-1');

    // Validar cola de sincronización
    expect(state.syncQueue.length).toBe(1);
    expect(state.syncQueue[0].type).toBe('expense');
  });

  it('addSale debería descontar stock local, sumar caja y encolar', async () => {
    const sale = {
      id: 'sale-1',
      client_id: 'client-1',
      driver_id: 'driver-1',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 300,
      total_returns: 0,
      applied_debt: 0,
      final_total: 300,
      payment_cash: 300,
      payment_transfer: 0,
      payment_account: 0,
      client_name: 'Kiosco Pepe',
      driver_name: 'Juan Perez',
      items: [
        { product_id: 'prod-1', operation_type: 'sale' as const, quantity: 3, unit_price: 100, name: 'Pan de Mesa' }
      ]
    };

    const { addSale } = useStore.getState();
    await addSale(sale);

    const state = useStore.getState();

    // Validar descuento de stock en camioneta (10 inicial - 3 vendidos = 7)
    expect(state.loads[0].current_quantity).toBe(7);

    // Validar aumento en caja de efectivo (1000 + 300 = 1300)
    expect(state.drivers[0].cash_collected).toBe(1300);

    // Validar venta guardada
    expect(state.sales.length).toBe(1);
    expect(state.sales[0].id).toBe('sale-1');

    // Validar cola de sincronización
    expect(state.syncQueue.length).toBe(1);
    expect(state.syncQueue[0].type).toBe('sale');
  });

});
