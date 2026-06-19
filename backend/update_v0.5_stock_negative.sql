-- Permitir inventario negativo para ventas de mostrador / ajustes
-- Elimina la restricción que impedía que bakery_stock bajara de 0
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_bakery_stock_check;
