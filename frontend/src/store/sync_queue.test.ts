import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from './useStore';
import { supabase } from '../supabaseClient';

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
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null })
  }
}));

describe('Motor de Sincronización Resiliente (Sync Engine)', () => {
  const initialState = useStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState(initialState, true);
    useStore.setState({
      isOffline: false,
      isSyncing: false,
      syncQueue: [],
      clients: [
        { id: 'client-1', business_name: 'Panadería San Cayetano', legal_name: null, client_type: 'Comercio', phone: null, email: null, cuit: null, price_category: 'A', address: 'Calle 1', current_balance: 0, credit_limit: 50000, allow_credit: true, fixed_order: null, cajones_prestados: 0 }
      ],
      drivers: [
        { id: 'driver-1', user_id: 'u-1', full_name: 'Marcos Chofer', status: 'En Ruta', is_online: true, is_mostrador: false, cash_collected: 0, transfer_collected: 0, location_data: null, last_active: new Date().toISOString() }
      ],
      products: [],
      loads: [],
      sales: []
    });
  });

  it('Debe procesar un borrador (draft) enviando payment_account balanceado para satisfacer la constraint de Postgres', async () => {
    const draftSale = {
      id: 'sale-draft-1',
      client_id: 'client-1',
      driver_id: 'driver-1',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 7500,
      total_returns: 0,
      applied_debt: 0,
      final_total: 7500,
      payment_cash: 0,
      payment_transfer: 0,
      payment_account: 0,
      cajones_left: 0,
      cajones_returned: 0,
      status: 'draft' as const,
      items: [
        { product_id: 'prod-1', operation_type: 'sale' as const, quantity: 5, unit_price: 1500, name: 'Pan' }
      ]
    };

    useStore.setState({
      syncQueue: [{ id: draftSale.id, type: 'sale', payload: draftSale }]
    });

    const { processSyncQueue } = useStore.getState();
    const result = await processSyncQueue();

    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(0);
    expect(useStore.getState().syncQueue.length).toBe(0);

    // Verificar que supabase.rpc fue llamado con cleanSale donde payment_account equilibra final_total
    expect(supabase.rpc).toHaveBeenCalledWith('process_offline_sale', {
      payload: expect.objectContaining({
        id: 'sale-draft-1',
        final_total: 7500,
        payment_cash: 0,
        payment_transfer: 0,
        payment_account: 7500, // Equilibra para que cash + transfer + account = final_total
        status: 'draft'
      })
    });
  });

  it('No debe trabar la cola entera si un ítem falla por error de datos; los ítems posteriores deben sincronizarse con éxito', async () => {
    const badSale = {
      id: 'bad-sale-1',
      client_id: 'client-deleted',
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

    const goodSale = {
      id: 'good-sale-2',
      client_id: 'client-1',
      driver_id: 'driver-1',
      transaction_date: new Date().toISOString(),
      subtotal_sales: 4500,
      total_returns: 0,
      applied_debt: 0,
      final_total: 4500,
      payment_cash: 4500,
      payment_transfer: 0,
      payment_account: 0,
      status: 'completed' as const,
      items: []
    };

    // Simulamos que la primera llamada a process_offline_sale arroja error de base de datos
    (supabase.rpc as any).mockImplementationOnce(() => 
      Promise.resolve({ data: null, error: { message: 'violates foreign key constraint "sales_client_id_fkey"' } })
    ).mockImplementationOnce(() =>
      Promise.resolve({ data: { success: true }, error: null })
    );

    useStore.setState({
      syncQueue: [
        { id: badSale.id, type: 'sale', payload: badSale },
        { id: goodSale.id, type: 'sale', payload: goodSale }
      ]
    });

    const { processSyncQueue } = useStore.getState();
    const result = await processSyncQueue();

    // 1 con error y 1 con éxito
    expect(result.errorCount).toBe(1);
    expect(result.successCount).toBe(1);

    const remaining = useStore.getState().syncQueue;
    // Solo badSale queda en la cola
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe('bad-sale-1');
    expect(remaining[0].error).toContain('violates foreign key constraint');
  });

  it('Debe permitir eliminar manualmente un comprobante duplicado o fallido con removeSyncItem', () => {
    useStore.setState({
      syncQueue: [
        { id: 'dup-1', type: 'sale', payload: { id: 'dup-1' }, error: 'Error' },
        { id: 'ok-2', type: 'sale', payload: { id: 'ok-2' } }
      ]
    });

    const { removeSyncItem } = useStore.getState();
    removeSyncItem('dup-1');

    const state = useStore.getState();
    expect(state.syncQueue.length).toBe(1);
    expect(state.syncQueue[0].id).toBe('ok-2');
  });
});
