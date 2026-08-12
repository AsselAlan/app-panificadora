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

describe('Cuentas Corrientes y Gestión de Deudas', () => {
  const initialState = useStore.getState();

  beforeEach(() => {
    useStore.setState(initialState, true);
    useStore.setState({
      isOffline: true,
      clients: [
        { id: 'client-deudor', business_name: 'Supermercado Central', legal_name: null, client_type: 'Comercio', phone: null, email: null, cuit: null, price_category: 'A', address: 'Av Mayo 500', current_balance: -8000, credit_limit: 20000, allow_credit: true, fixed_order: null, cajones_prestados: 0 },
        { id: 'client-al-dia', business_name: 'Rotisería Anita', legal_name: null, client_type: 'Comercio', phone: null, email: null, cuit: null, price_category: 'B', address: 'Calle 5', current_balance: 0, credit_limit: 5000, allow_credit: true, fixed_order: null, cajones_prestados: 0 }
      ],
      drivers: [
        { id: 'driver-1', user_id: 'u-1', full_name: 'Pedro Chofer', status: 'En Ruta', is_online: true, is_mostrador: false, cash_collected: 0, transfer_collected: 0, location_data: null, last_active: new Date().toISOString() }
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

  it('Debe registrar una compra a Cuenta Corriente (A Fiado), incrementando la deuda del cliente', async () => {
    const sale = {
      id: 'sale-fiado-1',
      client_id: 'client-al-dia',
      driver_id: 'driver-1',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 3000, // 3 bolsas x 1200 (precio B)
      total_returns: 0,
      applied_debt: 0,
      final_total: 3000,
      payment_cash: 0,
      payment_transfer: 0,
      payment_account: 3000, // Se anota en la cuenta corriente
      client_name: 'Rotisería Anita',
      driver_name: 'Pedro Chofer',
      items: [
        { product_id: 'prod-pan', operation_type: 'sale' as const, quantity: 3, unit_price: 1000, name: 'Pan de Mesa' }
      ]
    };

    const { addSale } = useStore.getState();
    await addSale(sale);

    const state = useStore.getState();

    // El saldo del cliente disminuye en el monto a cuenta (-3000)
    expect(state.clients[1].current_balance).toBe(-3000);
    
    // No entra efectivo ni transferencia en la caja del chofer
    expect(state.drivers[0].cash_collected).toBe(0);
    expect(state.drivers[0].transfer_collected).toBe(0);
  });

  it('Debe registrar el cobro de una deuda previa en efectivo (Sin ítems nuevos)', async () => {
    const saleDeuda = {
      id: 'sale-cobro-deuda-1',
      client_id: 'client-deudor',
      driver_id: 'driver-1',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 0, // No lleva productos nuevos
      total_returns: 0,
      applied_debt: 5000, // Paga $5000 de su deuda previa de $8000
      final_total: 5000,
      payment_cash: 5000,
      payment_transfer: 0,
      payment_account: 0,
      client_name: 'Supermercado Central',
      driver_name: 'Pedro Chofer',
      items: []
    };

    const { addSale } = useStore.getState();
    await addSale(saleDeuda);

    const state = useStore.getState();

    // La caja del chofer incrementa en $5000 de efectivo
    expect(state.drivers[0].cash_collected).toBe(5000);

    // La venta se guardó correctamente
    expect(state.sales.length).toBe(1);
    expect(state.sales[0].applied_debt).toBe(5000);
  });

  it('Debe registrar un cobro mixto: Venta de productos + pago de deuda anterior en efectivo', async () => {
    const saleMixta = {
      id: 'sale-mixta-1',
      client_id: 'client-deudor',
      driver_id: 'driver-1',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 2000, // $2000 en pan
      total_returns: 0,
      applied_debt: 3000, // + $3000 de deuda previa
      final_total: 5000,  // Total a cobrar: $5000
      payment_cash: 5000,
      payment_transfer: 0,
      payment_account: 0,
      client_name: 'Supermercado Central',
      driver_name: 'Pedro Chofer',
      items: [
        { product_id: 'prod-pan', operation_type: 'sale' as const, quantity: 2, unit_price: 1000, name: 'Pan de Mesa' }
      ]
    };

    const { addSale } = useStore.getState();
    await addSale(saleMixta);

    const state = useStore.getState();

    // Stock de camioneta baja de 50 a 48
    expect(state.loads[0].current_quantity).toBe(48);

    // Caja física del chofer recibe los $5000 completos
    expect(state.drivers[0].cash_collected).toBe(5000);
  });
});
