-- Esquema de Base de Datos - Software de Panificadora (v0.1)
-- Diseñado para Supabase (PostgreSQL) con soporte Offline-First

-- ==========================================
-- 1. EXTENSIONES Y CONFIGURACIÓN INICIAL
-- ==========================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- Configuración del Huso Horario
alter database postgres set timezone to 'America/Argentina/Buenos_Aires';

-- ==========================================
-- 2. CREACIÓN DE TABLAS DE CATÁLOGO Y CONFIGURACIÓN
-- ==========================================

-- Tabla de Productos
create table public.products (
    id uuid primary key default uuid_generate_v4(),
    name varchar(150) not null,
    unit_type varchar(20) not null check (unit_type in ('kg', 'docena', 'bolsa', 'unidad', 'caja')),
    price_a numeric(10,2) not null check (price_a >= 0),
    price_b numeric(10,2) not null check (price_b >= 0),
    bakery_stock numeric(10,2) not null default 0,
    is_deleted boolean not null default false,
    is_paused boolean not null default false,
    updated_at timestamptz not null default now()
);

-- Tabla de Clientes
create table public.clients (
    id uuid primary key default uuid_generate_v4(),
    business_name varchar(150) not null,
    legal_name varchar(150),
    client_type varchar(50) not null default 'Comercio' check (client_type in ('Comercio', 'Institución', 'Empresa')),
    phone varchar(50),
    email varchar(150),
    cuit varchar(20),
    price_category char(1) not null default 'B' check (price_category in ('A', 'B')),
    address text,
    current_balance numeric(12,2) not null default 0,
    credit_limit numeric(12,2),
    allow_credit boolean not null default false,
    fixed_order jsonb, -- Almacena { "product_uuid": cantidad }
    cajones_prestados integer not null default 0,
    is_deleted boolean not null default false,
    updated_at timestamptz not null default now()
);

-- Tabla de Repartidores (Perfiles en esquema público referenciando a auth.users)
create table public.drivers (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid unique references auth.users(id) on delete set null,
    full_name varchar(150) not null,
    status varchar(50) not null default 'En Base' check (status in ('En Base', 'En Ruta', 'Finalizado')),
    is_online boolean not null default false,
    cash_collected numeric(12,2) not null default 0 check (cash_collected >= 0),
    transfer_collected numeric(12,2) not null default 0 check (transfer_collected >= 0),
    location_data jsonb, -- { "lat": ..., "lng": ..., "accuracy": ... }
    last_active timestamptz not null default now(),
    is_deleted boolean not null default false,
    updated_at timestamptz not null default now()
);

-- ==========================================
-- 3. CREACIÓN DE TABLAS OPERATIVAS Y LOGÍSTICAS
-- ==========================================

-- Tabla de Cargas de Furgoneta (Inventario Vehicular Diario)
create table public.loads (
    id uuid primary key default uuid_generate_v4(),
    driver_id uuid not null references public.drivers(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    date_loaded date not null default current_date,
    initial_quantity numeric(10,2) not null check (initial_quantity >= 0),
    current_quantity numeric(10,2) not null check (current_quantity >= 0),
    unique(driver_id, product_id, date_loaded)
);

-- Tabla de Rutas Semanales (Enrutamiento de visitas diarias)
create table public.weekly_routes (
    id uuid primary key default uuid_generate_v4(),
    driver_id uuid not null references public.drivers(id) on delete cascade,
    client_id uuid references public.clients(id) on delete cascade,
    day_of_week integer not null check (day_of_week between 1 and 7), -- 1=Lunes, 7=Domingo
    route_order integer not null default 0,
    stop_type varchar(20) not null default 'client' check (stop_type in ('client', 'load', 'initial_load')),
    planned_load jsonb, -- { "product_uuid": cantidad } (solo para stop_type='load')
    unique(driver_id, client_id, day_of_week)
);

-- ==========================================
-- 4. CREACIÓN DE TABLAS DE TRANSACCIONES Y FINANZAS
-- ==========================================

-- Tabla de Ventas (Encabezado)
create table public.sales (
    id uuid primary key, -- Se genera en el cliente para asegurar idempotencia offline
    client_id uuid not null references public.clients(id),
    driver_id uuid not null references public.drivers(id),
    transaction_date timestamptz not null default now(),
    subtotal_sales numeric(12,2) not null check (subtotal_sales >= 0),
    total_returns numeric(12,2) not null check (total_returns >= 0),
    applied_debt numeric(12,2) not null default 0,
    final_total numeric(12,2) not null,
    payment_cash numeric(12,2) not null default 0 check (payment_cash >= 0),
    payment_transfer numeric(12,2) not null default 0 check (payment_transfer >= 0),
    payment_account numeric(12,2) not null default 0, -- Saldo acumulado a cuenta corriente (+/-)
    check (payment_cash + payment_transfer + payment_account = final_total)
);

-- Tabla de Ítems de Venta (Detalles de Venta y Devoluciones/Mermas)
create table public.sale_items (
    id uuid primary key default uuid_generate_v4(),
    sale_id uuid not null references public.sales(id) on delete cascade,
    product_id uuid not null references public.products(id),
    operation_type varchar(10) not null check (operation_type in ('sale', 'return')),
    quantity numeric(10,2) not null check (quantity > 0),
    unit_price numeric(10,2) not null check (unit_price >= 0)
);

-- Tabla de Gastos / Erogaciones Operativas
create table public.expenses (
    id uuid primary key default uuid_generate_v4(),
    category varchar(100) not null,
    amount numeric(12,2) not null check (amount > 0),
    description text not null,
    origin varchar(100) not null, -- Nombre del repartidor o 'Administración Central'
    payment_method varchar(50) not null check (payment_method in ('efectivo', 'transferencia')),
    expense_date timestamptz not null default now()
);

-- Tabla de Historial de Actualizaciones (stock_updates)
create table public.stock_updates (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete set null,
    status varchar(20) not null default 'applied' check (status in ('applied', 'cancelled')),
    created_at timestamptz not null default now()
);

-- Tabla de Mermas (stock_losses)
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

-- Tabla de Detalles de Actualización (stock_update_items)
create table public.stock_update_items (
    id uuid primary key default uuid_generate_v4(),
    update_id uuid not null references public.stock_updates(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    added_quantity numeric(10,2) not null default 0 check (added_quantity >= 0),
    removed_quantity numeric(10,2) not null default 0 check (removed_quantity >= 0)
);

-- ==========================================
-- 5. ÍNDICES PARA ALTO RENDIMIENTO Y BÚSQUEDA DIFUSA
-- ==========================================
create index idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
create index idx_clients_business_name_trgm on public.clients using gin (business_name gin_trgm_ops);
create index idx_sales_transaction_date on public.sales (transaction_date desc);
create index idx_sale_items_sale_id on public.sale_items (sale_id);
create index idx_loads_driver_date on public.loads (driver_id, date_loaded);
create index idx_weekly_routes_driver_day on public.weekly_routes (driver_id, day_of_week);

-- ==========================================
-- 6. TRIGGERS DE AUDITORÍA (UPDATED_AT)
-- ==========================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_products_modtime before update on public.products for each row execute function public.handle_updated_at();
create trigger update_clients_modtime before update on public.clients for each row execute function public.handle_updated_at();
create trigger update_drivers_modtime before update on public.drivers for each row execute function public.handle_updated_at();

-- ==========================================
-- 7. CAPA TRANSACCIONAL API: RPC OFFLINE-FIRST
-- ==========================================

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

create or replace function public.process_driver_end_of_day(p_driver_id uuid)
returns jsonb
security definer
as $$
declare
    v_load record;
begin
    for v_load in 
        select id, product_id, current_quantity 
        from public.loads 
        where driver_id = p_driver_id and current_quantity > 0
    loop
        update public.products
        set bakery_stock = bakery_stock + v_load.current_quantity
        where id = v_load.product_id;
        
        update public.loads
        set current_quantity = 0
        where id = v_load.id;
    end loop;

    update public.drivers
    set status = 'Finalizado', is_online = false, last_active = now()
    where id = p_driver_id;

    return jsonb_build_object('success', true, 'message', 'Driver day finished and stock returned to bakery');
end;
$$ language plpgsql;

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
    
    insert into public.stock_updates (user_id, status)
    values (v_user_id, 'applied')
    returning id into v_update_id;

    for v_item in 
        select 
            (elem->>'product_id')::uuid as product_id,
            (elem->>'added_quantity')::numeric as added_quantity,
            (elem->>'removed_quantity')::numeric as removed_quantity
        from jsonb_array_elements(payload->'items') as elem
    loop
        insert into public.stock_update_items (update_id, product_id, added_quantity, removed_quantity)
        values (v_update_id, v_item.product_id, v_item.added_quantity, v_item.removed_quantity);

        if v_item.removed_quantity > 0 then
            insert into public.stock_losses (product_id, quantity, loss_type, stock_update_id, loss_date)
            values (v_item.product_id, v_item.removed_quantity, 'merma_admin', v_update_id, now());
        end if;

        update public.products
        set bakery_stock = bakery_stock + v_item.added_quantity - v_item.removed_quantity
        where id = v_item.product_id;
    end loop;

    return jsonb_build_object('success', true, 'message', 'Stock update applied', 'update_id', v_update_id);
end;
$$ language plpgsql;

create or replace function public.revert_stock_update(p_update_id uuid)
returns jsonb
security definer
as $$
declare
    v_status varchar;
    v_item record;
begin
    select status into v_status from public.stock_updates where id = p_update_id;
    
    if v_status = 'cancelled' then
        return jsonb_build_object('success', false, 'message', 'Update already cancelled');
    end if;

    for v_item in 
        select product_id, added_quantity, removed_quantity 
        from public.stock_update_items 
        where update_id = p_update_id
    loop
        update public.products
        set bakery_stock = bakery_stock - v_item.added_quantity + v_item.removed_quantity
        where id = v_item.product_id;
    end loop;

    update public.stock_updates
    set status = 'cancelled'
    where id = p_update_id;

    delete from public.stock_losses where stock_update_id = p_update_id;

    return jsonb_build_object('success', true, 'message', 'Stock update reverted');
end;
$$ language plpgsql;

-- ==========================================
-- 8. POLÍTICAS DE SEGURIDAD RLS (ROW LEVEL SECURITY)
-- ==========================================

-- Tabla de Roles de Usuario
create table public.user_roles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role varchar(50) not null check (role in ('admin', 'repartidor', 'mostrador')),
    created_at timestamptz not null default now()
);

-- Función segura para obtener el rol del usuario actual (evita recursión RLS)
create or replace function public.get_auth_role()
returns text
language sql
security definer
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

-- Habilitar RLS en tabla de roles
alter table public.user_roles enable row level security;
create policy "Allow read user_roles" on public.user_roles for select to authenticated
    using (user_id = auth.uid() or public.get_auth_role() = 'admin');
create policy "Allow admin write user_roles" on public.user_roles for all to authenticated
    using (public.get_auth_role() = 'admin')
    with check (public.get_auth_role() = 'admin');

-- Habilitar RLS en las tablas
alter table public.products enable row level security;
alter table public.clients enable row level security;
alter table public.drivers enable row level security;
alter table public.loads enable row level security;
alter table public.weekly_routes enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.expenses enable row level security;

-- Políticas para Productos y Clientes:
-- Lectura pública para cualquier usuario autenticado, escritura exclusiva para admin.
create policy "Allow auth read products" on public.products for select to authenticated using (true);
create policy "Allow admin write products" on public.products for all to authenticated 
    using (public.get_auth_role() = 'admin') 
    with check (public.get_auth_role() = 'admin');

create policy "Allow auth read clients" on public.clients for select to authenticated using (true);
create policy "Allow admin write clients" on public.clients for all to authenticated 
    using (public.get_auth_role() = 'admin') 
    with check (public.get_auth_role() = 'admin');

-- Políticas para Drivers:
-- Lectura pública para autenticados (ver su estado), pero escritura solo del mismo chofer o admin.
create policy "Allow auth read drivers" on public.drivers for select to authenticated using (true);
create policy "Allow admin or self update drivers" on public.drivers for update to authenticated
    using (auth.uid() = user_id or public.get_auth_role() = 'admin')
    with check (auth.uid() = user_id or public.get_auth_role() = 'admin');

-- Políticas para Cargas (Loads) y Rutas:
-- Filtradas para el chofer de la ruta, o acceso completo para admin.
create policy "Allow admin or assigned driver read loads" on public.loads for select to authenticated
    using (driver_id in (select id from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin');
create policy "Allow admin or assigned driver write loads" on public.loads for all to authenticated
    using (driver_id in (select id from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin')
    with check (driver_id in (select id from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin');

create policy "Allow admin or assigned driver read routes" on public.weekly_routes for select to authenticated
    using (driver_id in (select id from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin');
create policy "Allow admin write routes" on public.weekly_routes for all to authenticated
    using (public.get_auth_role() = 'admin')
    with check (public.get_auth_role() = 'admin');

-- Políticas para Transacciones Sensibles (sales, sale_items, expenses):
-- Los conductores solo pueden ver y crear sus propias transacciones. El admin y el mostrador ven lo que necesitan.
create policy "Allow admin or assigned driver read sales" on public.sales for select to authenticated
    using (driver_id in (select id from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin' or public.get_auth_role() = 'mostrador');
create policy "Allow assigned driver insert sales" on public.sales for insert to authenticated
    with check (driver_id in (select id from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin' or public.get_auth_role() = 'mostrador');

create policy "Allow admin or assigned driver read sale_items" on public.sale_items for select to authenticated
    using (sale_id in (select id from public.sales where driver_id in (select id from public.drivers where user_id = auth.uid())) or public.get_auth_role() = 'admin' or public.get_auth_role() = 'mostrador');
create policy "Allow assigned driver insert sale_items" on public.sale_items for insert to authenticated
    with check (sale_id in (select id from public.sales where driver_id in (select id from public.drivers where user_id = auth.uid())) or public.get_auth_role() = 'admin' or public.get_auth_role() = 'mostrador');

-- Para gastos:
create policy "Allow admin or self read expenses" on public.expenses for select to authenticated
    using (origin in (select full_name from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin');
create policy "Allow authenticated insert expenses" on public.expenses for insert to authenticated
    with check (origin in (select full_name from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin');

-- ==========================================
-- 9. CATEGORÍAS DE GASTOS DINÁMICAS
-- ==========================================

create table public.expense_categories (
    id uuid primary key default uuid_generate_v4(),
    name varchar(100) not null unique,
    color varchar(7) not null default '#3b82f6',
    created_at timestamptz not null default now()
);

alter table public.expense_categories enable row level security;
create policy "Allow auth read expense_categories" on public.expense_categories for select to authenticated using (true);
create policy "Allow admin write expense_categories" on public.expense_categories for all
    using (public.get_auth_role() = 'admin') 
    with check (public.get_auth_role() = 'admin');

-- Categorías de gastos de repartidores
create table public.driver_expense_categories (
    id uuid primary key default uuid_generate_v4(),
    name varchar(100) not null unique,
    color varchar(7) not null default '#ef4444',
    created_at timestamptz not null default now()
);

alter table public.driver_expense_categories enable row level security;
create policy "Allow auth read driver_expense_categories" on public.driver_expense_categories for select to authenticated using (true);
create policy "Allow admin write driver_expense_categories" on public.driver_expense_categories for all
    using (public.get_auth_role() = 'admin')
    with check (public.get_auth_role() = 'admin');
\ n - -   1 0 .   A g r e g a d o s   R e c i e n t e s   ( d r i v e r _ s e t t l e m e n t s ,   g e t _ a l l _ u s e r s ,   p r o d u c t s . d i s p l a y _ o r d e r ) \ n C R E A T E   T A B L E   I F   N O T   E X I S T S   p u b l i c . d r i v e r _ s e t t l e m e n t s   ( \ n     i d   u u i d   D E F A U L T   g e n _ r a n d o m _ u u i d ( )   P R I M A R Y   K E Y , \ n     d r i v e r _ i d   u u i d   R E F E R E N C E S   p u b l i c . d r i v e r s ( i d )   O N   D E L E T E   C A S C A D E , \ n     s e t t l e m e n t _ d a t e   d a t e   N O T   N U L L , \ n     a m o u n t _ c a s h   n u m e r i c ( 1 0 , 2 )   D E F A U L T   0 , \ n     a m o u n t _ t r a n s f e r   n u m e r i c ( 1 0 , 2 )   D E F A U L T   0 , \ n     c r e a t e d _ a t   t i m e s t a m p   w i t h   t i m e   z o n e   D E F A U L T   t i m e z o n e ( ' u t c ' : : t e x t ,   n o w ( ) )   N O T   N U L L \ n ) ; \ n A L T E R   T A B L E   p u b l i c . d r i v e r _ s e t t l e m e n t s   E N A B L E   R O W   L E V E L   S E C U R I T Y ; \ n C R E A T E   P O L I C Y   \  
 A l l o w  
 p u b l i c  
 r e a d  
 s e t t l e m e n t s \   O N   p u b l i c . d r i v e r _ s e t t l e m e n t s   F O R   S E L E C T   U S I N G   ( t r u e ) ; \ n C R E A T E   P O L I C Y   \ A l l o w  
 p u b l i c  
 i n s e r t  
 s e t t l e m e n t s \   O N   p u b l i c . d r i v e r _ s e t t l e m e n t s   F O R   I N S E R T   W I T H   C H E C K   ( t r u e ) ; \ n \ n A L T E R   T A B L E   p u b l i c . p r o d u c t s   A D D   C O L U M N   I F   N O T   E X I S T S   d i s p l a y _ o r d e r   i n t e g e r   D E F A U L T   0 ; \ n \ n C R E A T E   O R   R E P L A C E   F U N C T I O N   p u b l i c . g e t _ a l l _ u s e r s ( ) \ n R E T U R N S   T A B L E ( i d   u u i d ,   e m a i l   v a r c h a r ,   c r e a t e d _ a t   t i m e s t a m p   w i t h   t i m e   z o n e ,   r o l e   t e x t ,   r e q u i r e s _ p a s s w o r d _ c h a n g e   b o o l e a n ) \ n S E C U R I T Y   D E F I N E R \ n A S   \ $ \ $ \ n B E G I N \ n     R E T U R N   Q U E R Y   \ n     S E L E C T   a u . i d ,   a u . e m a i l : : v a r c h a r ,   a u . c r e a t e d _ a t ,   u r . r o l e ,   u r . r e q u i r e s _ p a s s w o r d _ c h a n g e   \ n     F R O M   a u t h . u s e r s   a u \ n     L E F T   J O I N   p u b l i c . u s e r _ r o l e s   u r   O N   u r . u s e r _ i d   =   a u . i d ; \ n E N D ; \ n \ $ \ $   L A N G U A G E   p l p g s q l ; \ n  
 \ n - -   1 1 .   F u n c i o n   p a r a   l i m p i a r   e l   f l a g   d e   c a m b i o   d e   c l a v e   o b l i g a t o r i a \ n C R E A T E   O R   R E P L A C E   F U N C T I O N   p u b l i c . c l e a r _ p a s s w o r d _ c h a n g e _ f l a g ( ) \ n R E T U R N S   v o i d \ n L A N G U A G E   p l p g s q l \ n S E C U R I T Y   D E F I N E R \ n A S   \ $ \ $ \ n B E G I N \ n     U P D A T E   p u b l i c . u s e r _ r o l e s \ n     S E T   r e q u i r e s _ p a s s w o r d _ c h a n g e   =   f a l s e \ n     W H E R E   u s e r _ i d   =   a u t h . u i d ( ) ; \ n E N D ; \ n \ $ \ $ ; \ n  
 