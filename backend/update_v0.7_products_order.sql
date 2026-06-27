-- Actualización v0.7: Agregar campo de orden a productos
ALTER TABLE public.products ADD COLUMN display_order integer NOT NULL DEFAULT 0;
