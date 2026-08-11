-- Update v0.15: Otorga permisos de ejecución de RPCs para rol anon y authenticated
-- Evita errores HTTP 401/400 (Permission Denied) al sincronizar ventas offline cuando expira la sesión de Auth

GRANT EXECUTE ON FUNCTION public.process_offline_sale(jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_driver_end_of_day(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_stock_update(jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revert_stock_update(uuid) TO anon, authenticated, service_role;
