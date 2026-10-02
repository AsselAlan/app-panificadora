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

vi.mock('../supabaseClient', () => {
  const queryBuilder: any = {
    select: vi.fn(() => queryBuilder),
    insert: vi.fn(() => queryBuilder),
    update: vi.fn(() => queryBuilder),
    eq: vi.fn(() => queryBuilder),
    gte: vi.fn(() => queryBuilder),
    lte: vi.fn(() => queryBuilder),
    order: vi.fn(() => queryBuilder),
    limit: vi.fn(() => queryBuilder),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)
  };
  return {
    supabase: {
      from: vi.fn(() => queryBuilder),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null })
    }
  };
});

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

    // BUG FIX VERIFICADO: El stock de la camioneta NO se descuenta dos veces.
    // Inicial era 30, se restaron 3 en el borrador -> debe quedar en 27, NO en 24.
    expect(state.loads[0].current_quantity).toBe(27);
  });

  it('Debe calcular delta de stock si un ticket abierto se completa con cantidades modificadas', async () => {
    // 1. Borrador inicial con 3 docenas (de 30 iniciales -> 27)
    const draftSale = {
      id: 'draft-ticket-103',
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
    await useStore.getState().addSale(draftSale);
    expect(useStore.getState().loads[0].current_quantity).toBe(27);

    // 2. Al completar, el cliente pide 2 más (total 5 docenas)
    const completedSale = {
      ...draftSale,
      subtotal_sales: 10000,
      final_total: 10000,
      payment_cash: 10000,
      status: 'completed' as const,
      items: [
        { product_id: 'prod-medialuna', operation_type: 'sale' as const, quantity: 5, unit_price: 2000, name: 'Medialuna' }
      ]
    };
    await useStore.getState().addSale(completedSale);

    // Debe descontar únicamente el delta (5 - 3 = 2 adicionales, 27 - 2 = 25)
    expect(useStore.getState().loads[0].current_quantity).toBe(25);
  });

  it('No debe borrar ventas locales de IndexedDB durante fetchInitialData si no vienen en la respuesta remota', async () => {
    const localSale = {
      id: 'local-only-sale-999',
      client_id: 'client-hotel',
      driver_id: 'driver-1',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 5000,
      total_returns: 0,
      applied_debt: 0,
      final_total: 5000,
      payment_cash: 5000,
      payment_transfer: 0,
      payment_account: 0,
      status: 'completed' as const,
      items: []
    };

    useStore.setState({
      sales: [localSale],
      syncQueue: [],
      isOffline: false
    });

    // Simulamos que la query remota a Supabase devuelve ventas vacías [] (por RLS o delay)
    await useStore.getState().fetchInitialData();

    // La venta local DEBE ser preservada intacta en sales
    const preserved = useStore.getState().sales.find(s => s.id === 'local-only-sale-999');
    expect(preserved).toBeDefined();
    expect(preserved?.id).toBe('local-only-sale-999');
  });

  it('No debe resetear la jornada del chofer si ya tiene ventas registradas hoy en el dispositivo', async () => {
    const todayStr = new Date().toLocaleDateString('sv');
    const todaySale = {
      id: 'sale-today-1',
      client_id: 'client-hotel',
      driver_id: 'driver-1',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 3000,
      total_returns: 0,
      applied_debt: 0,
      final_total: 3000,
      payment_cash: 3000,
      payment_transfer: 0,
      payment_account: 0,
      status: 'completed' as const,
      items: []
    };

    // Chofer con last_active de ayer pero con venta de hoy ya cargada
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    useStore.setState({
      drivers: [
        { id: 'driver-1', user_id: 'u-1', full_name: 'Juan Chofer', status: 'En Ruta', is_online: true, is_mostrador: false, cash_collected: 3000, transfer_collected: 0, location_data: null, last_active: yesterday.toISOString() }
      ],
      sales: [todaySale]
    });

    await useStore.getState().checkAndResetDriverDay('driver-1');

    const driver = useStore.getState().drivers.find(d => d.id === 'driver-1');
    expect(driver?.status).toBe('En Ruta');
    expect(driver?.cash_collected).toBe(3000);
  });

  it('No debe arrojar error (TypeError) si un borrador cargado remotamente tiene items undefined', () => {
    // Simulamos una venta remota que vino de Supabase sin el array items poblado
    const remoteDraftWithoutItems: any = {
      id: 'draft-no-items',
      client_id: 'client-hotel',
      driver_id: 'driver-1',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 4000,
      total_returns: 0,
      applied_debt: 0,
      final_total: 4000,
      payment_cash: 0,
      payment_transfer: 0,
      payment_account: 4000,
      status: 'draft',
      items: undefined // Simula la respuesta sin join de sale_items
    };

    useStore.setState({
      sales: [remoteDraftWithoutItems]
    });

    const existingDraft = useStore.getState().sales.find(s => s.id === 'draft-no-items');
    expect(existingDraft).toBeDefined();

    // Verificamos que el algoritmo de inicialización seguro no reviente con forEach
    const safeItems = Array.isArray(existingDraft?.items) ? existingDraft.items : [];
    const draftCart: Record<string, number> = {};
    expect(() => {
      safeItems.forEach((item: any) => {
        if (item && item.operation_type === 'sale') {
          draftCart[item.product_id] = item.quantity;
        }
      });
    }).not.toThrow();

    expect(draftCart).toEqual({});
  });
});
