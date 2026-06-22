-- ==========================================
-- ACTUALIZACIÓN v0.1.1 - RENDICIONES DE CAJA
-- ==========================================

-- Tabla de Rendiciones de Choferes
create table public.driver_settlements (
    id uuid primary key default uuid_generate_v4(),
    driver_id uuid not null references public.drivers(id) on delete cascade,
    settlement_date date not null default current_date,
    amount_cash numeric(12,2) not null check (amount_cash >= 0),
    amount_transfer numeric(12,2) not null check (amount_transfer >= 0),
    created_at timestamptz not null default now(),
    unique(driver_id, settlement_date)
);

-- Políticas RLS para driver_settlements (Permisivas para MVP)
alter table public.driver_settlements enable row level security;

create policy "Permitir select global para driver_settlements"
on public.driver_settlements for select using (true);

create policy "Permitir insert global para driver_settlements"
on public.driver_settlements for insert with check (true);

create policy "Permitir update global para driver_settlements"
on public.driver_settlements for update using (true);
