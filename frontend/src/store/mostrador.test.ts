import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore, Product, Client, Driver } from './useStore';

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

describe('App de Mostrador (Punto de Venta Presencial)', () => {
  const initialState = useStore.getState();

  beforeEach(() => {
    useStore.setState(initialState, true);
    useStore.setState({
      isOffline: true,
      products: [
        { id: 'prod-pan', name: 'Pan Frances', unit_type: 'kg', price_a: 1000, price_b: 1200, bakery_stock: 100 },
        { id: 'prod-factura', name: 'Factura', unit_type: 'docena', price_a: 3000, price_b: 3500, bakery_stock: 50 }
      ],
      clients: [
        { id: 'client-mostrador', business_name: 'Consumidor Final / Mostrador', legal_name: null, client_type: 'Comercio', phone: null, email: null, cuit: null, price_category: 'B', address: 'Local', current_balance: 0, credit_limit: null, allow_credit: false, fixed_order: null, cajones_prestados: 0 },
        { id: 'client-mayorista', business_name: 'Panadería Central', legal_name: null, client_type: 'Comercio', phone: null, email: null, cuit: null, price_category: 'A', address: 'Av Principal 123', current_balance: 0, credit_limit: 10000, allow_credit: true, fixed_order: null, cajones_prestados: 0 }
      ],
      drivers: [
        { id: 'driver-mostrador', user_id: 'user-m1', full_name: 'Caja Mostrador Turno Mañana', status: 'En Ruta', is_online: true, is_mostrador: true, cash_collected: 5000, transfer_collected: 2000, location_data: null, last_active: new Date().toISOString() }
      ],
      sales: [],
      syncQueue: []
    });
  });

  it('Debe registrar una venta presencial en mostrador usando Lista de Precios B (Minorista)', async () => {
    const sale = {
      id: 'sale-mostrador-1',
      client_id: 'client-mostrador',
      driver_id: 'driver-mostrador',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 3500, // 1 docena de facturas precio B
      total_returns: 0,
      applied_debt: 0,
      final_total: 3500,
      payment_cash: 3500,
      payment_transfer: 0,
      payment_account: 0,
      client_name: 'Consumidor Final',
      driver_name: 'Caja Mostrador',
      items: [
        { product_id: 'prod-factura', operation_type: 'sale' as const, quantity: 1, unit_price: 3500, name: 'Factura' }
      ]
    };

    const { addSale } = useStore.getState();
    await addSale(sale);

    const state = useStore.getState();

    // Suma en caja de efectivo del mostrador (5000 inicial + 3500 venta = 8500)
    expect(state.drivers[0].cash_collected).toBe(8500);

    // Venta agregada a la lista local
    expect(state.sales.length).toBe(1);
    expect(state.sales[0].final_total).toBe(3500);

    // Encolado para sync
    expect(state.syncQueue.length).toBe(1);
    expect(state.syncQueue[0].payload.id).toBe('sale-mostrador-1');
  });

  it('Debe registrar venta en mostrador pagada con Transferencia bancaria', async () => {
    const sale = {
      id: 'sale-mostrador-transfer',
      client_id: 'client-mayorista',
      driver_id: 'driver-mostrador',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 5000, // 5kg Pan Frances precio A
      total_returns: 0,
      applied_debt: 0,
      final_total: 5000,
      payment_cash: 0,
      payment_transfer: 5000,
      payment_account: 0,
      client_name: 'Panadería Central',
      driver_name: 'Caja Mostrador',
      items: [
        { product_id: 'prod-pan', operation_type: 'sale' as const, quantity: 5, unit_price: 1000, name: 'Pan Frances' }
      ]
    };

    const { addSale } = useStore.getState();
    await addSale(sale);

    const state = useStore.getState();

    // Caja de efectivo no cambia, caja de transferencia incrementa (2000 + 5000 = 7000)
    expect(state.drivers[0].cash_collected).toBe(5000);
    expect(state.drivers[0].transfer_collected).toBe(7000);
  });
});
