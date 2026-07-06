-- Esquema de Semillero (Seed) y Ajuste de RLS - Software de Panificadora (v0.1)
-- Diseñado para poblar la base de datos con datos de prueba iniciales
-- y ajustar las políticas RLS para permitir la simulación de perfiles sin login real.

-- 1. LIMPIAR DATOS EXISTENTES
truncate table public.sale_items cascade;
truncate table public.sales cascade;
truncate table public.loads cascade;
truncate table public.weekly_routes cascade;
truncate table public.drivers cascade;
truncate table public.clients cascade;
truncate table public.products cascade;
truncate table public.expenses cascade;

-- 2. INSERTAR PRODUCTOS
insert into public.products (id, name, unit_type, price_a, price_b, bakery_stock) values
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pan Francés', 'kg', 1500.00, 1300.00, 200.00),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Facturas Surtidas', 'docena', 4000.00, 3600.00, 50.00),
('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Pan de Miga', 'bolsa', 6500.00, 6000.00, 30.00),
('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Prepizzas', 'unidad', 900.00, 800.00, 40.00),
('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Bizcochitos', 'kg', 3000.00, 2800.00, 20.00),
('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Factura Individual', 'unidad', 400.00, 350.00, 150.00);

-- 3. INSERTAR CLIENTES
insert into public.clients (id, business_name, legal_name, client_type, phone, email, cuit, price_category, address, current_balance, credit_limit, allow_credit, fixed_order) values
('00a12345-6789-abcd-ef01-23456789abcd', 'Consumidor Final', 'Consumidor Final', 'Comercio', '', '', '', 'B', 'Venta en Local', 0.00, 0.00, false, '{}'),
('11a12345-6789-abcd-ef01-23456789abcd', 'Despensa Los Amigos', 'Despensa Los Amigos SRL', 'Comercio', '5491123456781', 'contacto@losamigos.com', '30-12345678-9', 'A', 'Calle 12 #345', -15000.00, 50000.00, true, '{"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11": 15, "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22": 5}'),
('22a12345-6789-abcd-ef01-23456789abcd', 'Supermercado Sol', 'Super Sol S.A.', 'Empresa', '5491123456782', 'super_sol@mail.com', '30-98765432-1', 'B', 'Av. Principal 900', 4500.00, 100000.00, true, '{"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11": 30}'),
('33a12345-6789-abcd-ef01-23456789abcd', 'Kiosco El Paso', 'Kiosco El Paso', 'Comercio', '', 'kioscoelpaso@mail.com', '', 'A', 'Esquina San Martín', 0.00, 0.00, false, '{"d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44": 10, "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55": 2}'),
('44a12345-6789-abcd-ef01-23456789abcd', 'Colegio Nacional', 'Colegio Nacional Nº1', 'Institución', '5491123456784', 'compras@colegionacional.edu.ar', '33-55555555-9', 'B', 'Calle 4 #110', -25000.00, 80000.00, true, '{"b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22": 15, "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66": 20}'),
('55a12345-6789-abcd-ef01-23456789abcd', 'Maxikiosco Centro', 'Maxikiosco Centro', 'Comercio', '5491123456785', '', '', 'A', 'Plaza Principal', 0.00, 10000.00, true, '{}');

-- 4. INSERTAR REPARTIDORES (DRIVERS)
insert into public.drivers (id, full_name, status, is_online, cash_collected, transfer_collected) values
('7d1b827e-85bb-4a57-a36c-2f22b7a94ee8', 'Roberto Sánchez', 'En Base', false, 0.00, 0.00),
('1f9e2b83-ec7d-418b-871d-194e43b17fb3', 'Carlos Ruiz', 'Finalizado', false, 80000.00, 40000.00);

-- 5. INSERTAR RUTAS SEMANALES (1=Lunes, 7=Domingo)
-- Se crean rutas para todos los días de la semana para asegurar que haya datos sin importar cuándo se pruebe
-- Roberto Sánchez (Driver 1) visita Los Amigos (11a...), Sol (22a...) y Colegio (44a...)
insert into public.weekly_routes (driver_id, client_id, day_of_week, route_order)
select '7d1b827e-85bb-4a57-a36c-2f22b7a94ee8', client_id, day_val, idx
from (
  values 
    ('11a12345-6789-abcd-ef01-23456789abcd'::uuid, 1),
    ('22a12345-6789-abcd-ef01-23456789abcd'::uuid, 2),
    ('44a12345-6789-abcd-ef01-23456789abcd'::uuid, 3)
) as client_list(client_id, idx)
cross join generate_series(1, 7) as day_val;

-- Carlos Ruiz (Driver 2) visita El Paso (33a...) y Maxikiosco Centro (55a...)
insert into public.weekly_routes (driver_id, client_id, day_of_week, route_order)
select '1f9e2b83-ec7d-418b-871d-194e43b17fb3', client_id, day_val, idx
from (
  values 
    ('33a12345-6789-abcd-ef01-23456789abcd'::uuid, 1),
    ('55a12345-6789-abcd-ef01-23456789abcd'::uuid, 2)
) as client_list(client_id, idx)
cross join generate_series(1, 7) as day_val;

-- 6. INSERTAR CARGAS VEHICULARES DE HOY (LOADS)
-- Roberto Sánchez: Pan Francés: 50, Facturas: 20, Prepizzas: 25, Factura Indiv: 60
insert into public.loads (driver_id, product_id, date_loaded, initial_quantity, current_quantity) values
('7d1b827e-85bb-4a57-a36c-2f22b7a94ee8', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', current_date, 50.00, 50.00),
('7d1b827e-85bb-4a57-a36c-2f22b7a94ee8', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', current_date, 20.00, 20.00),
('7d1b827e-85bb-4a57-a36c-2f22b7a94ee8', 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', current_date, 25.00, 25.00),
('7d1b827e-85bb-4a57-a36c-2f22b7a94ee8', 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', current_date, 60.00, 60.00);

-- Carlos Ruiz: Pan de Miga: 10, Bizcochitos: 15
insert into public.loads (driver_id, product_id, date_loaded, initial_quantity, current_quantity) values
('1f9e2b83-ec7d-418b-871d-194e43b17fb3', 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', current_date, 10.00, 10.00),
('1f9e2b83-ec7d-418b-871d-194e43b17fb3', 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', current_date, 15.00, 15.00);

-- 7. ACTUALIZACIÓN DE POLÍTICAS DE RLS PARA PERMITIR ACCESO DE USUARIOS ANÓNIMOS (ANON)
-- Esto permite que la simulación de perfiles en el frontend funcione sin necesidad de auth.

-- Tabla PRODUCTS
drop policy if exists "Allow auth read products" on public.products;
drop policy if exists "Allow admin write products" on public.products;
create policy "Allow public read products" on public.products for select using (true);
create policy "Allow public write products" on public.products for all using (true);

-- Tabla CLIENTS
drop policy if exists "Allow auth read clients" on public.clients;
drop policy if exists "Allow admin write clients" on public.clients;
create policy "Allow public read clients" on public.clients for select using (true);
create policy "Allow public write clients" on public.clients for all using (true);

-- Tabla DRIVERS
drop policy if exists "Allow auth read drivers" on public.drivers;
drop policy if exists "Allow admin or self update drivers" on public.drivers;
create policy "Allow public read drivers" on public.drivers for select using (true);
create policy "Allow public write drivers" on public.drivers for all using (true);

-- Tabla LOADS
drop policy if exists "Allow admin or assigned driver read loads" on public.loads;
drop policy if exists "Allow admin or assigned driver write loads" on public.loads;
create policy "Allow public read loads" on public.loads for select using (true);
create policy "Allow public write loads" on public.loads for all using (true);

-- Tabla WEEKLY_ROUTES
drop policy if exists "Allow admin or assigned driver read routes" on public.weekly_routes;
drop policy if exists "Allow admin write routes" on public.weekly_routes;
create policy "Allow public read routes" on public.weekly_routes for select using (true);
create policy "Allow public write routes" on public.weekly_routes for all using (true);

-- Tabla SALES
drop policy if exists "Allow admin or assigned driver read sales" on public.sales;
drop policy if exists "Allow assigned driver insert sales" on public.sales;
create policy "Allow public read sales" on public.sales for select using (true);
create policy "Allow public insert sales" on public.sales for insert with check (true);

-- Tabla SALE_ITEMS
drop policy if exists "Allow admin or assigned driver read sale_items" on public.sale_items;
drop policy if exists "Allow assigned driver insert sale_items" on public.sale_items;
create policy "Allow public read sale_items" on public.sale_items for select using (true);
create policy "Allow public insert sale_items" on public.sale_items for insert with check (true);

-- Tabla EXPENSES
drop policy if exists "Allow admin or self read expenses" on public.expenses;
drop policy if exists "Allow authenticated insert expenses" on public.expenses;
create policy "Allow public read expenses" on public.expenses for select using (true);
create policy "Allow public insert expenses" on public.expenses for insert with check (true);

-- 8. INSERTAR CATEGORÍAS DE GASTOS DE REPARTIDORES
insert into public.driver_expense_categories (name, color) values
('Combustible', '#ef4444'),
('Reparación / Taller', '#f59e0b'),
('Peaje', '#3b82f6'),
('Varios', '#10b981')
on conflict (name) do nothing;

-- 9. AJUSTAR RLS DE CATEGORÍAS DE GASTOS DE REPARTIDORES
drop policy if exists "Allow auth read driver_expense_categories" on public.driver_expense_categories;
drop policy if exists "Allow admin write driver_expense_categories" on public.driver_expense_categories;
create policy "Allow auth read driver_expense_categories" on public.driver_expense_categories for select to authenticated using (true);
create policy "Allow admin write driver_expense_categories" on public.driver_expense_categories for all using (public.get_auth_role() = 'admin');
