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

describe('Tickets Abiertos y Borradores (Visita Múltiple)', () => {
  const initialState = useStore.getState();

  beforeEach(() => {
    useStore.setState(initialState, true);
    useStore.setState({
      isOffline: true,
      clients: [
        { id: 'client-hotel', business_name: 'Hotel Plaza', legal_name: null, client_type: 'Empresa', phone: null, email: null, cuit: null, price_category: 'A', address: 'Centro', current_balance: 0, credit_limit: 50000, allow_credit: true, fixed_order: null, cajones_prestados: 0 }
      ],
      drivers: [
        { id: 'driver-1', user_id: 'u-1', full_name: 'Juan Chofer', status: 'En Ruta', is_online: true, is_mostrador: false, cash_collected: 1000, transfer_collected: 0, location_data: null, last_active: new Date().toISOString() }
      ],
      products: [
        { id: 'prod-medialuna', name: 'Medialuna', unit_type: 'docena', price_a: 2000, price_b: 2400, bakery_stock: 200 }
      ],
      loads: [
        { id: 'load-1', driver_id: 'driver-1', product_id: 'prod-medialuna', date_loaded: '2026-08-12', initial_quantity: 30, current_quantity: 30 }
      ],
      sales: [],
      syncQueue: []
    });
  });

  it('Debe crear un Ticket Abierto (borrador) descontando stock físico de la camioneta sin impactar la caja ni la cta cte aún', async () => {
    const draftSale = {
      id: 'draft-ticket-101',
      client_id: 'client-hotel',
      driver_id: 'driver-1',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 10000, // 5 docenas x $2000
      total_returns: 0,
      applied_debt: 0,
      final_total: 10000,
      payment_cash: 10000,
      payment_transfer: 0,
      payment_account: 0,
      status: 'draft' as const, // MARCA COMO BORRADOR / TICKET ABIERTO
      client_name: 'Hotel Plaza',
      driver_name: 'Juan Chofer',
      items: [
        { product_id: 'prod-medialuna', operation_type: 'sale' as const, quantity: 5, unit_price: 2000, name: 'Medialuna' }
      ]
    };

    const { addSale } = useStore.getState();
    await addSale(draftSale);

    const state = useStore.getState();

    // 1. Stock de la camioneta SÍ se descuenta de 30 a 25 para reflejar la bajada física de mercadería
    expect(state.loads[0].current_quantity).toBe(25);

    // 2. La caja del chofer NO debe cambiar (permanece en $1000) porque es una entrega preliminar
    expect(state.drivers[0].cash_collected).toBe(1000);

    // 3. El saldo del cliente NO debe ser afectado aún
    expect(state.clients[0].current_balance).toBe(0);

    // 4. El ticket figura en la lista de ventas local marcado como 'draft'
    expect(state.sales.length).toBe(1);
    expect(state.sales[0].status).toBe('draft');
  });

  it('Debe completar un Ticket Abierto previo aplicando el cobro final en caja', async () => {
    // 1. Creamos el borrador inicial
    const draftSale = {
      id: 'draft-ticket-102',
      client_id: 'client-hotel',
      driver_id: 'driver-1',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 6000,
      total_returns: 0,
      applied_debt: 0,
      final_total: 6000,
      payment_cash: 6000,
      payment_transfer: 0,
      payment_account: 0,
      status: 'draft' as const,
      items: [
        { product_id: 'prod-medialuna', operation_type: 'sale' as const, quantity: 3, unit_price: 2000, name: 'Medialuna' }
      ]
    };

    const { addSale } = useStore.getState();
    await addSale(draftSale);

    // 2. Al final de la tarde el chofer cierra el ticket y realiza el cobro ('completed')
    const completedSale = {
      ...draftSale,
      status: 'completed' as const
    };

    await addSale(completedSale);

    const state = useStore.getState();

    // Ahora la caja del chofer incrementa en $6000 (1000 inicial + 6000 = 7000)
    expect(state.drivers[0].cash_collected).toBe(7000);

    // El ticket fue actualizado en el estado
    expect(state.sales[0].status).toBe('completed');
  });
});
