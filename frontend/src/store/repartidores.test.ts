import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from './useStore';

global.navigator = { onLine: true } as any;

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

describe('App de Repartidores (Choferes en Ruta)', () => {
  const initialState = useStore.getState();

  beforeEach(() => {
    useStore.setState(initialState, true);
    useStore.setState({
      isOffline: true,
      drivers: [
        { id: 'driver-carlos', user_id: 'u-carlos', full_name: 'Carlos Chofer', status: 'En Base', is_online: false, is_mostrador: false, cash_collected: 0, transfer_collected: 0, location_data: null, last_active: new Date().toISOString() }
      ],
      loads: [
        { id: 'load-1', driver_id: 'driver-carlos', product_id: 'prod-pan', date_loaded: '2026-08-12', initial_quantity: 40, current_quantity: 40, returned_quantity: 0 }
      ],
      products: [
        { id: 'prod-pan', name: 'Pan Comun', unit_type: 'bolsa', price_a: 500, price_b: 600, bakery_stock: 500 }
      ],
      clients: [
        { id: 'client-kiosco', business_name: 'Kiosco El Sol', legal_name: null, client_type: 'Comercio', phone: null, email: null, cuit: null, price_category: 'A', address: 'Calle 10', current_balance: 0, credit_limit: null, allow_credit: true, fixed_order: null, cajones_prestados: 0 }
      ],
      sales: [],
      expenses: [],
      syncQueue: []
    });
  });

  it('Debe iniciar la ruta del chofer cambiando su estado a En Ruta', async () => {
    const { startDriverRoute } = useStore.getState();
    await startDriverRoute('driver-carlos');

    const state = useStore.getState();
    expect(state.drivers[0].status).toBe('En Ruta');
    expect(state.drivers[0].is_online).toBe(true);
  });

  it('Debe descontar stock de la camioneta al realizar venta en ruta', async () => {
    const sale = {
      id: 'sale-ruta-1',
      client_id: 'client-kiosco',
      driver_id: 'driver-carlos',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 5000, // 10 bolsas x $500
      total_returns: 0,
      applied_debt: 0,
      final_total: 5000,
      payment_cash: 5000,
      payment_transfer: 0,
      payment_account: 0,
      client_name: 'Kiosco El Sol',
      driver_name: 'Carlos Chofer',
      items: [
        { product_id: 'prod-pan', operation_type: 'sale' as const, quantity: 10, unit_price: 500, name: 'Pan Comun' }
      ]
    };

    const { addSale } = useStore.getState();
    await addSale(sale);

    const state = useStore.getState();

    // Stock de la camioneta baja de 40 a 30
    expect(state.loads[0].current_quantity).toBe(30);

    // Recaudación en efectivo incrementa a 5000
    expect(state.drivers[0].cash_collected).toBe(5000);
  });

  it('Debe descontar combustible de la caja en efectivo del chofer', async () => {
    // Primero simulamos que el chofer recaudó $10.000
    useStore.setState({
      drivers: [
        { id: 'driver-carlos', user_id: 'u-carlos', full_name: 'Carlos Chofer', status: 'En Ruta', is_online: true, is_mostrador: false, cash_collected: 10000, transfer_collected: 0, location_data: null, last_active: new Date().toISOString() }
      ]
    });

    const expense = {
      id: 'exp-gasoil',
      category: 'Combustible',
      amount: 3000,
      description: 'Carga de Gasoil YPF',
      origin: 'Carlos Chofer',
      payment_method: 'efectivo' as const,
      expense_date: new Date().toISOString()
    };

    const { addExpense } = useStore.getState();
    await addExpense(expense);

    const state = useStore.getState();

    // Caja física en mano disminuye de 10000 a 7000
    expect(state.drivers[0].cash_collected).toBe(7000);
    expect(state.expenses.length).toBe(1);
    expect(state.expenses[0].id).toBe('exp-gasoil');
  });

  it('Debe finalizar la ruta del chofer agregando la acción end_route a la cola', async () => {
    const { endDriverRoute } = useStore.getState();
    await endDriverRoute('driver-carlos');

    const state = useStore.getState();
    expect(state.drivers[0].status).toBe('Finalizado');
    expect(state.drivers[0].is_online).toBe(false);

    // Debe contener el item de sincronización end_route
    const endRouteSyncItem = state.syncQueue.find(q => q.type === 'end_route');
    expect(endRouteSyncItem).toBeDefined();
    expect(endRouteSyncItem?.payload.driver_id).toBe('driver-carlos');
  });
});
