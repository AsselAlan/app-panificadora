-- ==========================================
-- UPDATE v0.4: SISTEMA DE STOCK Y MERMAS
-- ==========================================

-- 1. Crear tabla de Historial de Actualizaciones (stock_updates)
create table public.stock_updates (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete set null,
    status varchar(20) not null default 'applied' check (status in ('applied', 'cancelled')),
    created_at timestamptz not null default now()
);

-- 2. Crear tabla de Mermas (stock_losses)
create table public.stock_losses (
    id uuid primary key default uuid_generate_v4(),
    product_id uuid not null references public.products(id) on delete cascade,
    quantity numeric(10,2) not null check (quantity > 0),
    loss_type varchar(50) not null check (loss_type in ('devolucion', 'merma_admin')),
    client_id uuid references public.clients(id) on delete set null,
    driver_id uuid references public.drivers(id) on delete set null,
    stock_update_id uuid references public.stock_updates(id) on delete cascade,
    loss_date timestamptz not null default now()
);

-- 3. Crear tabla de Detalles de Actualización (stock_update_items)
create table public.stock_update_items (
    id uuid primary key default uuid_generate_v4(),
    update_id uuid not null references public.stock_updates(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    added_quantity numeric(10,2) not null default 0 check (added_quantity >= 0),
    removed_quantity numeric(10,2) not null default 0 check (removed_quantity >= 0)
);

-- 4. RLS para nuevas tablas
alter table public.stock_losses enable row level security;
alter table public.stock_updates enable row level security;
alter table public.stock_update_items enable row level security;

create policy "Allow read stock_losses" on public.stock_losses for select to authenticated using (true);
create policy "Allow insert stock_losses" on public.stock_losses for insert to authenticated with check (true);
create policy "Allow read stock_updates" on public.stock_updates for select to authenticated using (true);
create policy "Allow insert/update stock_updates" on public.stock_updates for all to authenticated using (true) with check (true);
create policy "Allow read stock_update_items" on public.stock_update_items for select to authenticated using (true);
create policy "Allow insert/update stock_update_items" on public.stock_update_items for all to authenticated using (true) with check (true);

-- 5. RPC para Finalizar el Día del Repartidor
create or replace function public.process_driver_end_of_day(p_driver_id uuid)
returns jsonb
security definer
as $$
declare
    v_load record;
begin
    -- 1. Devolver el "sobrante bueno" a bakery_stock
    for v_load in 
        select id, product_id, current_quantity 
        from public.loads 
        where driver_id = p_driver_id and current_quantity > 0
    loop
        -- Sumar a bakery_stock
        update public.products
        set bakery_stock = bakery_stock + v_load.current_quantity
        where id = v_load.product_id;
        
        -- Poner la carga a 0 para no duplicar si se llama 2 veces
        update public.loads
        set current_quantity = 0
        where id = v_load.id;
    end loop;

    -- Actualizar estado del driver
    update public.drivers
    set status = 'Finalizado', is_online = false, last_active = now()
    where id = p_driver_id;

    return jsonb_build_object('success', true, 'message', 'Driver day finished and stock returned to bakery');
end;
$$ language plpgsql;

-- 6. RPC para Aplicar Actualización de Stock (Mostrador)
create or replace function public.apply_stock_update(payload jsonb)
returns jsonb
security definer
as $$
declare
    v_update_id uuid;
    v_user_id uuid;
    v_item record;
begin
    v_user_id := auth.uid();
    
    -- Insertar historial de actualizacion
    insert into public.stock_updates (user_id, status)
    values (v_user_id, 'applied')
    returning id into v_update_id;

    -- Procesar los items
    for v_item in 
        select 
            (elem->>'product_id')::uuid as product_id,
            (elem->>'added_quantity')::numeric as added_quantity,
            (elem->>'removed_quantity')::numeric as removed_quantity
        from jsonb_array_elements(payload->'items') as elem
    loop
        -- Insertar el item de la actualizacion
        insert into public.stock_update_items (update_id, product_id, added_quantity, removed_quantity)
        values (v_update_id, v_item.product_id, v_item.added_quantity, v_item.removed_quantity);

        -- Si hay mermas, registrarlas en stock_losses
        if v_item.removed_quantity > 0 then
            insert into public.stock_losses (product_id, quantity, loss_type, stock_update_id, loss_date)
            values (v_item.product_id, v_item.removed_quantity, 'merma_admin', v_update_id, now());
        end if;

        -- Actualizar el stock final en products
        update public.products
        set bakery_stock = bakery_stock + v_item.added_quantity - v_item.removed_quantity
        where id = v_item.product_id;
    end loop;

    return jsonb_build_object('success', true, 'message', 'Stock update applied', 'update_id', v_update_id);
end;
$$ language plpgsql;

-- 7. RPC para Cancelar Actualización de Stock (Mostrador)
create or replace function public.revert_stock_update(p_update_id uuid)
returns jsonb
security definer
as $$
declare
    v_status varchar;
    v_item record;
begin
    -- Verificar estado
    select status into v_status from public.stock_updates where id = p_update_id;
    
    if v_status = 'cancelled' then
        return jsonb_build_object('success', false, 'message', 'Update already cancelled');
    end if;

    -- Revertir el inventario de products
    for v_item in 
        select product_id, added_quantity, removed_quantity 
        from public.stock_update_items 
        where update_id = p_update_id
    loop
        update public.products
        set bakery_stock = bakery_stock - v_item.added_quantity + v_item.removed_quantity
        where id = v_item.product_id;
    end loop;

    -- Marcar como cancelado
    update public.stock_updates
    set status = 'cancelled'
    where id = p_update_id;

    -- Eliminar las mermas generadas por esta actualizacion para no ensuciar la estadística
    delete from public.stock_losses where stock_update_id = p_update_id;

    return jsonb_build_object('success', true, 'message', 'Stock update reverted');
end;
$$ language plpgsql;

-- 8. Modificar process_offline_sale para que las devoluciones vayan directo a stock_losses
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
    v_item record;
    v_exists boolean;
begin
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

    select exists(select 1 from public.sales where id = v_sale_id) into v_exists;
    if v_exists then
        return jsonb_build_object('success', true, 'message', 'Sale already processed (idempotent)', 'sale_id', v_sale_id);
    end if;

    insert into public.sales (
        id, client_id, driver_id, transaction_date, 
        subtotal_sales, total_returns, applied_debt, final_total, 
        payment_cash, payment_transfer, payment_account
    ) values (
        v_sale_id, v_client_id, v_driver_id, v_transaction_date,
        v_subtotal_sales, v_total_returns, v_applied_debt, v_final_total,
        v_payment_cash, v_payment_transfer, v_payment_account
    );

    for v_item in 
        select 
            (elem->>'product_id')::uuid as product_id,
            (elem->>'operation_type')::varchar as operation_type,
            (elem->>'quantity')::numeric as quantity,
            (elem->>'unit_price')::numeric as unit_price
        from jsonb_array_elements(payload->'items') as elem
    loop
        insert into public.sale_items (
            sale_id, product_id, operation_type, quantity, unit_price
        ) values (
            v_sale_id, v_item.product_id, v_item.operation_type, v_item.quantity, v_item.unit_price
        );

        if v_item.operation_type = 'sale' then
            update public.loads
            set current_quantity = current_quantity - v_item.quantity
            where driver_id = v_driver_id 
              and product_id = v_item.product_id 
              and date_loaded = v_transaction_date::date;
        elsif v_item.operation_type = 'return' then
            -- CAMBIO: EN VEZ DE SUMAR AL STOCK DE LA CAMIONETA, VA DIRECTO A PÉRDIDA
            insert into public.stock_losses (product_id, quantity, loss_type, client_id, driver_id, loss_date)
            values (v_item.product_id, v_item.quantity, 'devolucion', v_client_id, v_driver_id, v_transaction_date);
        end if;
    end loop;

    update public.clients
    set current_balance = current_balance - v_payment_account
    where id = v_client_id;

    if v_transaction_date::date = current_date then
        update public.drivers
        set cash_collected = cash_collected + v_payment_cash,
            transfer_collected = transfer_collected + v_payment_transfer,
            last_active = now()
        where id = v_driver_id;
    end if;

    return jsonb_build_object('success', true, 'message', 'Sale processed successfully', 'sale_id', v_sale_id);
end;
$$ language plpgsql;
