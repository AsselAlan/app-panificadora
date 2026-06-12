-- ==========================================
-- ACTUALIZACIÓN V0.2: SISTEMA DE ROLES Y AUTH
-- ==========================================

-- 1. Tabla de Roles de Usuario
create table if not exists public.user_roles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role varchar(50) not null check (role in ('admin', 'repartidor', 'mostrador')),
    created_at timestamptz not null default now()
);

-- 2. Función segura para obtener el rol del usuario actual
create or replace function public.get_auth_role()
returns text
language sql
security definer
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

-- 3. Habilitar RLS en tabla de roles
alter table public.user_roles enable row level security;
drop policy if exists "Allow read user_roles" on public.user_roles;
create policy "Allow read user_roles" on public.user_roles for select to authenticated
    using (user_id = auth.uid() or public.get_auth_role() = 'admin');

drop policy if exists "Allow admin write user_roles" on public.user_roles;
create policy "Allow admin write user_roles" on public.user_roles for all to authenticated
    using (public.get_auth_role() = 'admin')
    with check (public.get_auth_role() = 'admin');

-- 4. Actualizar políticas de RLS en otras tablas
drop policy if exists "Allow admin write products" on public.products;
create policy "Allow admin write products" on public.products for all to authenticated 
    using (public.get_auth_role() = 'admin') 
    with check (public.get_auth_role() = 'admin');

drop policy if exists "Allow admin write clients" on public.clients;
create policy "Allow admin write clients" on public.clients for all to authenticated 
    using (public.get_auth_role() = 'admin') 
    with check (public.get_auth_role() = 'admin');

drop policy if exists "Allow admin or self update drivers" on public.drivers;
create policy "Allow admin or self update drivers" on public.drivers for update to authenticated
    using (auth.uid() = user_id or public.get_auth_role() = 'admin')
    with check (auth.uid() = user_id or public.get_auth_role() = 'admin');

drop policy if exists "Allow admin or assigned driver read loads" on public.loads;
create policy "Allow admin or assigned driver read loads" on public.loads for select to authenticated
    using (driver_id in (select id from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin');

drop policy if exists "Allow admin or assigned driver write loads" on public.loads;
create policy "Allow admin or assigned driver write loads" on public.loads for all to authenticated
    using (driver_id in (select id from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin')
    with check (driver_id in (select id from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin');

drop policy if exists "Allow admin or assigned driver read routes" on public.weekly_routes;
create policy "Allow admin or assigned driver read routes" on public.weekly_routes for select to authenticated
    using (driver_id in (select id from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin');

drop policy if exists "Allow admin write routes" on public.weekly_routes;
create policy "Allow admin write routes" on public.weekly_routes for all to authenticated
    using (public.get_auth_role() = 'admin')
    with check (public.get_auth_role() = 'admin');

drop policy if exists "Allow admin or assigned driver read sales" on public.sales;
create policy "Allow admin or assigned driver read sales" on public.sales for select to authenticated
    using (driver_id in (select id from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin' or public.get_auth_role() = 'mostrador');

drop policy if exists "Allow assigned driver insert sales" on public.sales;
create policy "Allow assigned driver insert sales" on public.sales for insert to authenticated
    with check (driver_id in (select id from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin' or public.get_auth_role() = 'mostrador');

drop policy if exists "Allow admin or assigned driver read sale_items" on public.sale_items;
create policy "Allow admin or assigned driver read sale_items" on public.sale_items for select to authenticated
    using (sale_id in (select id from public.sales where driver_id in (select id from public.drivers where user_id = auth.uid())) or public.get_auth_role() = 'admin' or public.get_auth_role() = 'mostrador');

drop policy if exists "Allow assigned driver insert sale_items" on public.sale_items;
create policy "Allow assigned driver insert sale_items" on public.sale_items for insert to authenticated
    with check (sale_id in (select id from public.sales where driver_id in (select id from public.drivers where user_id = auth.uid())) or public.get_auth_role() = 'admin' or public.get_auth_role() = 'mostrador');

drop policy if exists "Allow admin or self read expenses" on public.expenses;
create policy "Allow admin or self read expenses" on public.expenses for select to authenticated
    using (origin in (select full_name from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin');

drop policy if exists "Allow authenticated insert expenses" on public.expenses;
create policy "Allow authenticated insert expenses" on public.expenses for insert to authenticated
    with check (origin in (select full_name from public.drivers where user_id = auth.uid()) or public.get_auth_role() = 'admin');

-- 5. Crear una función RPC para que el Administrador pueda crear usuarios de manera segura desde la App.
-- Nota: Esta función es necesaria porque crear usuarios con auth.signUp en el frontend cambia la sesión.
-- Al usar SECURITY DEFINER con una clave Service Role o dentro de supabase, se podría crear el usuario.
-- *Para el MVP: Sugeriremos al Admin usar el Dashboard de Supabase para crear usuarios, 
--  y luego insertaremos en user_roles o crearemos la función aquí.*
