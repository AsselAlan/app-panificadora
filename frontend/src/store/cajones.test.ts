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

describe('Control de Cajones y Envases Prestados', () => {
  const initialState = useStore.getState();

  beforeEach(() => {
    useStore.setState(initialState, true);
    useStore.setState({
      isOffline: true,
      clients: [
        { id: 'client-almacen', business_name: 'Almacén Don Mario', legal_name: null, client_type: 'Comercio', phone: null, email: null, cuit: null, price_category: 'A', address: 'Av San Martin', current_balance: 0, credit_limit: null, allow_credit: true, fixed_order: null, cajones_prestados: 10 }
      ],
      drivers: [
        { id: 'driver-1', user_id: 'u-1', full_name: 'Esteban Chofer', status: 'En Ruta', is_online: true, is_mostrador: false, cash_collected: 0, transfer_collected: 0, location_data: null, last_active: new Date().toISOString() }
      ],
      products: [
        { id: 'prod-pan', name: 'Pan de Mesa', unit_type: 'bolsa', price_a: 1000, price_b: 1200, bakery_stock: 100 }
      ],
      loads: [
        { id: 'load-1', driver_id: 'driver-1', product_id: 'prod-pan', date_loaded: '2026-08-12', initial_quantity: 50, current_quantity: 50 }
      ],
      sales: [],
      syncQueue: []
    });
  });

  it('Debe actualizar el saldo de cajones prestados al entregar y recibir envases durante una venta', async () => {
    const sale = {
      id: 'sale-cajones-1',
      client_id: 'client-almacen',
      driver_id: 'driver-1',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 5000,
      total_returns: 0,
      applied_debt: 0,
      final_total: 5000,
      payment_cash: 5000,
      payment_transfer: 0,
      payment_account: 0,
      cajones_left: 6,     // Entrega 6 cajones llenos
      cajones_returned: 2, // Recupera 2 cajones vacíos
      client_name: 'Almacén Don Mario',
      driver_name: 'Esteban Chofer',
      items: [
        { product_id: 'prod-pan', operation_type: 'sale' as const, quantity: 5, unit_price: 1000, name: 'Pan de Mesa' }
      ]
    };

    const { addSale } = useStore.getState();
    await addSale(sale);

    const state = useStore.getState();

    // Saldo inicial de cajones prestados: 10
    // Entregó +6, devolvió -2 => Neto: +4
    // Nuevo saldo: 10 + 4 = 14
    expect(state.clients[0].cajones_prestados).toBe(14);
  });

  it('Debe descontar cajones devueltos en administración mediante returnCajonesAdmin', async () => {
    // Para probar returnCajonesAdmin deshabilitamos isOffline y mockeamos la respuesta de Supabase
    useStore.setState({ isOffline: false });

    const { returnCajonesAdmin } = useStore.getState();
    await returnCajonesAdmin('client-almacen', 4);

    const state = useStore.getState();

    // Saldo inicial de cajones prestados: 10. Se devuelven 4 => Quedan 6
    expect(state.clients[0].cajones_prestados).toBe(6);
  });
});
