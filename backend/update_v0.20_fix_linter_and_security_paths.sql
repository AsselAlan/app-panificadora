-- ============================================================================
-- ACTUALIZACIÓN V0.20 - CORRECCIÓN DE LINTER SUPABASE & BLINDAJE DE FUNCIONES
-- ============================================================================
-- Resuelve las advertencias del Database Linter de Supabase:
-- 1. function_search_path_mutable: Fija search_path = public, pg_temp en todas las funciones SECURITY DEFINER
-- 2. Protege funciones administrativas (apply_stock_update, revert_stock_update, get_all_users)
-- 3. Mantiene la continuidad operativa de choferes en calle (process_offline_sale)
-- ============================================================================

-- 1. FIJAR SEARCH_PATH EN TODAS LAS FUNCIONES SECURITY DEFINER
ALTER FUNCTION public.process_offline_sale(jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.process_driver_end_of_day(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.apply_stock_update(jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.revert_stock_update(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_all_users() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_auth_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.clear_password_change_flag() SET search_path = public, pg_temp;

-- 2. RESTRINGIR FUNCIONES PURAMENTE ADMINISTRATIVAS
-- Las funciones de gestión global de stock y usuarios solo deben ser invocadas por usuarios autenticados
REVOKE EXECUTE ON FUNCTION public.apply_stock_update(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revert_stock_update(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_users() FROM anon;

GRANT EXECUTE ON FUNCTION public.apply_stock_update(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revert_stock_update(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated, service_role;

-- 3. ASEGURAR CONTINUIDAD OPERATIVA EN CALLE PARA CHOFERES (OFFLINE-FIRST)
-- Los choferes necesitan poder sincronizar ventas y cerrar día incluso si su JWT
-- está en proceso de refresco tras una reconexión de red móvil inestable.
GRANT EXECUTE ON FUNCTION public.process_offline_sale(jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_driver_end_of_day(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clear_password_change_flag() TO authenticated, service_role;

-- Fin de actualización v0.20
