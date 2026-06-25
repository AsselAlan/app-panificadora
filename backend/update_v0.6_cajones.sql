-- ==========================================
-- ACTUALIZACIÓN V0.6 - GESTIÓN DE CAJONES
-- ==========================================

-- 1. Agregar columna cajones_prestados a la tabla clients
alter table public.clients
add column if not exists cajones_prestados integer not null default 0;

-- 2. Reemplazar la función process_offline_sale para manejar los cajones
create or replace function public.process_offline_sale(payload jsonb)
returns jsonb
security definer
as $$
declare
    v_sale_id uuid;
    v_client_id uuid;
    v_driver_id uuid;
    v_transaction_date timestamptz;
    v_subtotal_sales numeric(12,2);
    v_total_returns numeric(12,2);
    v_applied_debt numeric(12,2);
    v_final_total numeric(12,2);
    v_payment_cash numeric(12,2);
    v_payment_transfer numeric(12,2);
    v_payment_account numeric(12,2);
    v_cajones_left integer;
    v_cajones_returned integer;
    v_item record;
    v_exists boolean;
begin
    -- 1. Extraer datos principales del JSON
    v_sale_id := (payload->>'id')::uuid;
    v_client_id := (payload->>'client_id')::uuid;
    v_driver_id := (payload->>'driver_id')::uuid;
    v_transaction_date := (payload->>'transaction_date')::timestamptz;
    v_subtotal_sales := (payload->>'subtotal_sales')::numeric;
    v_total_returns := (payload->>'total_returns')::numeric;
    v_applied_debt := (payload->>'applied_debt')::numeric;
    v_final_total := (payload->>'final_total')::numeric;
    v_payment_cash := (payload->>'payment_cash')::numeric;
    v_payment_transfer := (payload->>'payment_transfer')::numeric;
    v_payment_account := (payload->>'payment_account')::numeric;
    v_cajones_left := coalesce((payload->>'cajones_left')::integer, 0);
    v_cajones_returned := coalesce((payload->>'cajones_returned')::integer, 0);

    -- 2. Validación de idempotencia (Evita duplicados ante reintentos de red)
    select exists(select 1 from public.sales where id = v_sale_id) into v_exists;
    if v_exists then
        return jsonb_build_object('success', true, 'message', 'Sale already processed (idempotent)', 'sale_id', v_sale_id);
    end if;

    -- 3. Insertar el encabezado de venta
    insert into public.sales (
        id, client_id, driver_id, transaction_date, 
        subtotal_sales, total_returns, applied_debt, final_total, 
        payment_cash, payment_transfer, payment_account
    ) values (
        v_sale_id, v_client_id, v_driver_id, v_transaction_date,
        v_subtotal_sales, v_total_returns, v_applied_debt, v_final_total,
        v_payment_cash, v_payment_transfer, v_payment_account
    );

    -- 4. Procesar ítems y devoluciones (sale_items) y actualizar stock en camioneta (loads)
    for v_item in 
        select 
            (elem->>'product_id')::uuid as product_id,
            (elem->>'operation_type')::varchar as operation_type,
            (elem->>'quantity')::numeric as quantity,
            (elem->>'unit_price')::numeric as unit_price
        from jsonb_array_elements(payload->'items') as elem
    loop
        -- Insertar el detalle
        insert into public.sale_items (
            sale_id, product_id, operation_type, quantity, unit_price
        ) values (
            v_sale_id, v_item.product_id, v_item.operation_type, v_item.quantity, v_item.unit_price
        );

        -- Reconciliar stock de la camioneta (loads) para la fecha de la transacción
        if v_item.operation_type = 'sale' then
            update public.loads
            set current_quantity = current_quantity - v_item.quantity
            where driver_id = v_driver_id 
              and product_id = v_item.product_id 
              and date_loaded = v_transaction_date::date;
        elsif v_item.operation_type = 'return' then
            -- Las devoluciones van directo a pérdida
            insert into public.stock_losses (product_id, quantity, loss_type, client_id, driver_id, loss_date)
            values (v_item.product_id, v_item.quantity, 'devolucion', v_client_id, v_driver_id, v_transaction_date);
        end if;
    end loop;

    -- 5. Actualizar la cuenta corriente en la tabla clients y cajones prestados
    -- Si es a cuenta (deuda nueva), disminuye el balance (hacia negativo).
    update public.clients
    set current_balance = current_balance - v_payment_account,
        cajones_prestados = cajones_prestados + v_cajones_left - v_cajones_returned
    where id = v_client_id;

    -- 6. Acumular las ventas y cobros en el perfil de caja del chofer si la venta es del día
    if v_transaction_date::date = current_date then
        update public.drivers
        set cash_collected = cash_collected + v_payment_cash,
            transfer_collected = transfer_collected + v_payment_transfer,
            last_active = now()
        where id = v_driver_id;
    end if;

    return jsonb_build_object('success', true, 'message', 'Sale processed successfully', 'sale_id', v_sale_id);
exception when others then
    -- Ante cualquier fallo, se hace un ROLLBACK automático de toda la transacción
    raise exception 'Error processing offline sale: %', SQLERRM;
end;
$$ language plpgsql;
